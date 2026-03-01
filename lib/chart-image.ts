// ============================================================================
// EBITE CHART — Chart Image Generator for Telegram
// Strategy: HYBRID
//   - Price line, MA20, MA50 → Chart.js line datasets (guaranteed to work)
//   - SL / TP / Entry / SR levels → EXTRA LINE DATASETS with fill:false
//     (does NOT rely on chartjs-plugin-annotation at all — 100% reliable)
//   - Volume → bar dataset on y1
// ============================================================================

import { ChartData } from './indicators';

export interface ChartImageOptions {
  title:        string;
  data:         ChartData[];
  slLevel?:     number;
  tpLevel?:     number;
  entryLevel?:  number;
  sr?:          { level: number; type: 'support' | 'resistance' }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(ts: number): string {
  const d = new Date(ts * 1000);
  return `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}`;
}

function calcMA(closes: number[], period: number): (number | null)[] {
  return closes.map((_, i) => {
    if (i < period - 1) return null;
    let s = 0;
    for (let j = i - period + 1; j <= i; j++) s += closes[j];
    return Math.round((s / period) * 10) / 10;
  });
}

/** Build a flat horizontal line dataset (same value for all N points) */
function flatLine(
  label: string,
  value: number,
  N: number,
  color: string,
  dash: number[] = [],
  width = 1.5,
): object {
  return {
    type:            'line',
    label,
    data:            new Array(N).fill(value),
    borderColor:     color,
    backgroundColor: 'transparent',
    borderWidth:     width,
    borderDash:      dash,
    pointRadius:     0,
    tension:         0,
    spanGaps:        true,
    yAxisID:         'y',
    order:           1,
  };
}

// ── Build QuickChart config ───────────────────────────────────────────────────
export function buildChartConfig(opts: ChartImageOptions, maxCandles = 90): object {
  const { title, data, slLevel, tpLevel, entryLevel, sr = [] } = opts;

  const candles = data.slice(-maxCandles);
  const N       = candles.length;
  if (N === 0) return {};

  const labels = candles.map(c => formatDate(c.time));
  const closes = candles.map(c => c.close);
  const vols   = candles.map(c => c.volume ?? 0);

  // ── Price range ───────────────────────────────────────────────────────────
  const allPx = candles.flatMap(c => [c.high, c.low]);
  if (slLevel)    allPx.push(slLevel);
  if (tpLevel)    allPx.push(tpLevel);
  if (entryLevel) allPx.push(entryLevel);
  sr.forEach(z => allPx.push(z.level));
  const pxMin = Math.min(...allPx) * 0.988;
  const pxMax = Math.max(...allPx) * 1.012;

  // ── MA ────────────────────────────────────────────────────────────────────
  const ma20 = calcMA(closes, Math.min(20, N));
  const ma50 = calcMA(closes, Math.min(50, N));

  // ── Volume scale ──────────────────────────────────────────────────────────
  const maxVol    = Math.max(...vols, 1);
  const volAxisMax = maxVol * 4;

  // ── Per-point colors for price ────────────────────────────────────────────
  const pointBg: string[] = closes.map((c, i) =>
    i === 0 ? '#64b5f6' : (c >= closes[i - 1] ? '#00d069' : '#eb3c3c')
  );
  const pointRadius: number[] = closes.map((_, i) => i === N - 1 ? 6 : 0);

  // ── Datasets ─────────────────────────────────────────────────────────────
  const datasets: object[] = [];

  // 1. Volume bars (y1 — behind everything)
  datasets.push({
    type:               'bar',
    label:              'Volume',
    data:               vols,
    backgroundColor:    candles.map(c =>
      c.close >= c.open ? 'rgba(0,184,148,0.18)' : 'rgba(214,48,49,0.18)'
    ),
    borderWidth:        0,
    barPercentage:      0.95,
    categoryPercentage: 1.0,
    yAxisID:            'y1',
    order:              20,
  });

  // 2. S/R zones — rendered as narrow flat bands (2 lines per zone)
  const srToRender = sr.slice(0, 3);
  srToRender.forEach((zone, i) => {
    const isSup  = zone.type === 'support';
    const color  = isSup ? 'rgba(0,208,105,0.70)' : 'rgba(235,60,60,0.70)';
    const half   = Math.max((pxMax - pxMin) * 0.006, closes[N-1] * 0.003);
    // Upper and lower bound of zone
    datasets.push(flatLine(`${isSup ? 'SUP' : 'RES'} ${Math.round(zone.level)}`, zone.level + half, N, color, [3, 3], 1));
    datasets.push(flatLine(`_${i}`, zone.level - half, N, color, [3, 3], 1));
  });

  // 3. MA50
  datasets.push({
    type:            'line',
    label:           'MA50',
    data:            ma50,
    borderColor:     'rgba(130,130,130,0.80)',
    backgroundColor: 'transparent',
    borderWidth:     1.5,
    pointRadius:     0,
    tension:         0.3,
    spanGaps:        true,
    yAxisID:         'y',
    order:           5,
  });

  // 4. MA20
  datasets.push({
    type:            'line',
    label:           'MA20',
    data:            ma20,
    borderColor:     'rgba(200,200,200,0.55)',
    backgroundColor: 'transparent',
    borderWidth:     1.2,
    borderDash:      [5, 3],
    pointRadius:     0,
    tension:         0.3,
    spanGaps:        true,
    yAxisID:         'y',
    order:           5,
  });

  // 5. Entry line (green solid)
  if (entryLevel && entryLevel > 0) {
    datasets.push(flatLine(
      `⮞ Entry ${Math.round(entryLevel).toLocaleString('id-ID')}`,
      entryLevel, N,
      '#00e676', [8, 4], 2.0,
    ));
  }

  // 6. Stop Loss line (red dashed)
  if (slLevel && slLevel > 0) {
    datasets.push(flatLine(
      `⛔ SL ${Math.round(slLevel).toLocaleString('id-ID')}`,
      slLevel, N,
      '#ff5252', [6, 4], 1.8,
    ));
  }

  // 7. Take Profit line (blue dashed)
  if (tpLevel && tpLevel > 0) {
    datasets.push(flatLine(
      `🎯 TP ${Math.round(tpLevel).toLocaleString('id-ID')}`,
      tpLevel, N,
      '#40c4ff', [6, 4], 1.8,
    ));
  }

  // 8. Price line (on top)
  datasets.push({
    type:                   'line',
    label:                  'Harga',
    data:                   closes,
    borderColor:            '#64b5f6',
    backgroundColor:        'transparent',
    borderWidth:            2,
    pointRadius:            pointRadius,
    pointBackgroundColor:   pointBg,
    pointBorderColor:       '#ffffff',
    pointBorderWidth:       1,
    tension:                0,
    spanGaps:               false,
    yAxisID:                'y',
    order:                  2,
  });

  // ── Legend filter: hide _idx mirror lines ─────────────────────────────────
  // Note: we CAN'T use callback functions in QuickChart JSON.
  // Instead, prefix hidden labels with '_' and we rely on legend showing them
  // (minor clutter) OR we skip it entirely by marking them display:false:
  // Actually — just set 'hidden: true' at the dataset level to hide from legend.
  // Let's patch: add 'hidden: true' to the mirror SR lines
  const patchedDatasets = (datasets as any[]).map(ds => {
    if (typeof ds.label === 'string' && ds.label.startsWith('_')) {
      return { ...ds, label: undefined, legendText: '' };
    }
    return ds;
  });

  return {
    type: 'bar',
    data: {
      labels,
      datasets: patchedDatasets,
    },
    options: {
      responsive: false,
      animation:  false,
      plugins: {
        title: {
          display:  true,
          text:     title,
          color:    '#e0e0e0',
          font:     { size: 13, weight: 'bold' },
          padding:  { top: 4, bottom: 4 },
        },
        legend: {
          display:  true,
          position: 'top',
          labels: {
            color:         '#aaaaaa',
            font:          { size: 8 },
            boxWidth:      12,
            padding:       6,
            usePointStyle: false,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color:         '#555555',
            maxTicksLimit: 10,
            maxRotation:   0,
            autoSkip:      true,
            font:          { size: 8 },
          },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
        y: {
          min:      pxMin,
          max:      pxMax,
          position: 'right',
          ticks: {
            color:         '#888888',
            font:          { size: 9 },
            maxTicksLimit: 8,
          },
          grid: { color: 'rgba(255,255,255,0.06)' },
        },
        y1: {
          min:      0,
          max:      volAxisMax,
          position: 'left',
          display:  true,
          ticks: {
            color:         '#333333',
            font:          { size: 7 },
            maxTicksLimit: 3,
          },
          grid: { drawOnChartArea: false },
        },
      },
      layout: {
        padding: { left: 4, right: 8, top: 4, bottom: 4 },
      },
    },
    backgroundColor: '#131722',
  };
}

// ── Build URL fallback ────────────────────────────────────────────────────────
export function buildChartImageUrl(opts: ChartImageOptions, maxCandles = 60): string {
  const config  = buildChartConfig(opts, maxCandles);
  const encoded = encodeURIComponent(JSON.stringify(config));
  const url     = `https://quickchart.io/chart?c=${encoded}&w=900&h=520&bkg=%23131722&f=png`;
  if (url.length > 7500 && maxCandles > 15) {
    return buildChartImageUrl(opts, Math.floor(maxCandles * 0.75));
  }
  return url;
}

// ── Fetch buffer via POST ─────────────────────────────────────────────────────
export async function fetchChartImageBuffer(
  opts: ChartImageOptions,
  timeoutMs = 22000,
): Promise<Buffer | null> {
  const config = buildChartConfig(opts, 90);
  try {
    const body = JSON.stringify({
      width:           900,
      height:          520,
      backgroundColor: '#131722',
      format:          'png',
      chart:           config,
    });
    console.log('[Chart] POST QuickChart, body size:', body.length);

    const res = await fetch('https://quickchart.io/chart', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal:  AbortSignal.timeout(timeoutMs),
    });

    const ct = res.headers.get('content-type') ?? '';
    console.log('[Chart] QC response:', res.status, ct);

    if (!res.ok) {
      const errTxt = await res.text();
      console.error('[Chart] QC error:', errTxt.slice(0, 400));
      return null;
    }
    if (!ct.includes('image')) {
      const errTxt = await res.text();
      console.error('[Chart] Non-image response:', errTxt.slice(0, 400));
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    console.log('[Chart] Buffer:', buf.length, 'bytes');
    return buf;
  } catch (e: any) {
    console.error('[Chart] exception:', e.message);
    return null;
  }
}

// ── Send chart photo to Telegram ──────────────────────────────────────────────
export async function sendChartPhoto(
  chatId:   number | string,
  opts:     ChartImageOptions,
  caption:  string,
  botToken: string,
): Promise<void> {
  const API         = `https://api.telegram.org/bot${botToken}`;
  const safeCaption = caption.slice(0, 1024);

  // Strategy 1: POST buffer → multipart to Telegram
  const imgBuffer = await fetchChartImageBuffer(opts, 22000);
  if (imgBuffer && imgBuffer.length > 5000) {
    const boundary = `EbiteBdy${Date.now().toString(16)}`;
    const CRLF     = '\r\n';
    const part     = (name: string, value: string) =>
      `--${boundary}${CRLF}Content-Disposition: form-data; name="${name}"${CRLF}${CRLF}${value}${CRLF}`;

    const textPart = Buffer.from(
      part('chat_id', String(chatId)) +
      part('caption', safeCaption) +
      part('parse_mode', 'HTML'),
      'utf8',
    );
    const filePart = Buffer.from(
      `--${boundary}${CRLF}Content-Disposition: form-data; name="photo"; filename="chart.png"${CRLF}Content-Type: image/png${CRLF}${CRLF}`,
      'utf8',
    );
    const footer   = Buffer.from(`${CRLF}--${boundary}--${CRLF}`, 'utf8');
    const mp       = Buffer.concat([textPart, filePart, imgBuffer, footer]);

    try {
      const r = await fetch(`${API}/sendPhoto`, {
        method:  'POST',
        headers: {
          'Content-Type':   `multipart/form-data; boundary=${boundary}`,
          'Content-Length': String(mp.length),
        },
        // @ts-ignore
        body:   mp,
        signal: AbortSignal.timeout(30000),
      });
      if (r.ok) { console.log('[Chart] sendPhoto multipart OK'); return; }
      const eb = await r.text();
      console.warn('[Chart] multipart fail:', r.status, eb.slice(0, 200));
    } catch (e: any) {
      console.warn('[Chart] multipart exception:', e.message);
    }
  }

  // Strategy 2: URL → Telegram fetches it
  console.log('[Chart] Falling back to URL strategy…');
  try {
    const url = buildChartImageUrl(opts, 60);
    console.log('[Chart] URL len:', url.length);
    const r = await fetch(`${API}/sendPhoto`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ chat_id: chatId, photo: url, caption: safeCaption, parse_mode: 'HTML' }),
      signal:  AbortSignal.timeout(15000),
    });
    if (r.ok) { console.log('[Chart] URL sendPhoto OK'); return; }
    const eb = await r.text();
    console.warn('[Chart] URL fail:', r.status, eb.slice(0, 200));
  } catch (e: any) {
    console.warn('[Chart] URL exception:', e.message);
  }

  // Strategy 3: Text fallback
  console.error('[Chart] All strategies failed — sending text fallback');
  try {
    await fetch(`${API}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        chat_id:    chatId,
        text:       `📊 <b>Chart tidak tersedia</b>\n${safeCaption}`,
        parse_mode: 'HTML',
      }),
      signal: AbortSignal.timeout(10000),
    });
  } catch { /* silent */ }
}
