// ============================================================================
// EBITE CHART — Chart Image Generator for Telegram
// Approach: Single-line price chart with per-point colors (green/red per day)
//   + MA20 grey dashed + MA50 grey solid
//   + S/R shaded boxes via chartjs-plugin-annotation
//   + SL/TP/Entry horizontal lines
//   + Volume bars on y1 (no overlap)
// Rules for QuickChart compatibility:
//   ✅ NO JavaScript callback functions (they don't serialize to JSON)
//   ✅ Use string-based tick format or none
//   ✅ Keep total datasets low
//   ✅ Use only core Chart.js features + annotation plugin
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

// ── Build QuickChart config (pure JSON — no callbacks) ────────────────────────
export function buildChartConfig(opts: ChartImageOptions, maxCandles = 90): object {
  const { title, data, slLevel, tpLevel, entryLevel, sr = [] } = opts;

  const candles = data.slice(-maxCandles);
  const N       = candles.length;
  if (N === 0) return {};

  const labels = candles.map(c => formatDate(c.time));
  const closes = candles.map(c => c.close);
  const vols   = candles.map(c => c.volume ?? 0);

  // Per-point colors: green if >= prev close, red if lower
  const pointBg: string[] = closes.map((c, i) => {
    if (i === 0) return '#64b5f6';
    return c >= closes[i - 1] ? '#00d069' : '#eb3c3c';
  });
  // Last point is bigger dot, rest hidden
  const pointRadius: number[] = closes.map((_, i) => i === N - 1 ? 5 : 0);
  // Border color for last dot
  const pointBorder: string[] = closes.map((_, i) => i === N - 1 ? '#ffffff' : 'transparent');

  // ── Price range ───────────────────────────────────────────────────────────
  const allPx = candles.flatMap(c => [c.high, c.low]);
  if (slLevel)    allPx.push(slLevel);
  if (tpLevel)    allPx.push(tpLevel);
  if (entryLevel) allPx.push(entryLevel);
  sr.forEach(z => allPx.push(z.level));
  const pxMin = Math.min(...allPx) * 0.990;
  const pxMax = Math.max(...allPx) * 1.010;

  // ── MA ────────────────────────────────────────────────────────────────────
  const ma20 = calcMA(closes, Math.min(20, N));
  const ma50 = calcMA(closes, Math.min(50, N));

  // ── Volume ────────────────────────────────────────────────────────────────
  const maxVol    = Math.max(...vols, 1);
  const volAxisMax = maxVol * 4;

  // ── Annotations ──────────────────────────────────────────────────────────
  const annotations: Record<string, object> = {};

  // ATR approximation for S/R zone half-width
  const pxRange   = pxMax - pxMin;
  const zoneHalf  = Math.max(pxRange * 0.008, 10);

  sr.slice(0, 4).forEach((zone, i) => {
    const isSup = zone.type === 'support';
    annotations[`sr${i}`] = {
      type:            'box',
      yMin:            zone.level - zoneHalf,
      yMax:            zone.level + zoneHalf,
      backgroundColor: isSup ? 'rgba(0,208,105,0.13)' : 'rgba(235,60,60,0.13)',
      borderColor:     isSup ? 'rgba(0,208,105,0.55)' : 'rgba(235,60,60,0.55)',
      borderWidth:     1,
    };
    // Label as a separate line annotation at zone center
    annotations[`srLbl${i}`] = {
      type:        'line',
      yMin:        zone.level,
      yMax:        zone.level,
      borderColor: 'transparent',
      borderWidth: 0,
      label: {
        enabled:         true,
        content:         `${isSup ? 'SUP' : 'RES'} ${Math.round(zone.level).toLocaleString('id-ID')}`,
        position:        'start',
        backgroundColor: isSup ? 'rgba(0,160,80,0.75)' : 'rgba(180,40,40,0.75)',
        color:           '#fff',
        font:            { size: 8, weight: 'bold' },
        padding:         { x: 4, y: 2 },
        xAdjust:         4,
      },
    };
  });

  if (entryLevel) {
    annotations.entry = {
      type: 'line', yMin: entryLevel, yMax: entryLevel,
      borderColor: '#00e676', borderWidth: 2, borderDash: [6, 3],
      label: { enabled: true, content: `Entry ${Math.round(entryLevel).toLocaleString('id-ID')}`, position: 'end', backgroundColor: '#00c853', color: '#000', font: { size: 9, weight: 'bold' }, padding: { x: 4, y: 2 } },
    };
  }
  if (slLevel) {
    annotations.sl = {
      type: 'line', yMin: slLevel, yMax: slLevel,
      borderColor: '#ff5252', borderWidth: 2, borderDash: [5, 4],
      label: { enabled: true, content: `SL ${Math.round(slLevel).toLocaleString('id-ID')}`, position: 'end', backgroundColor: '#d32f2f', color: '#fff', font: { size: 9, weight: 'bold' }, padding: { x: 4, y: 2 } },
    };
  }
  if (tpLevel) {
    annotations.tp = {
      type: 'line', yMin: tpLevel, yMax: tpLevel,
      borderColor: '#40c4ff', borderWidth: 2, borderDash: [5, 4],
      label: { enabled: true, content: `TP ${Math.round(tpLevel).toLocaleString('id-ID')}`, position: 'end', backgroundColor: '#0288d1', color: '#fff', font: { size: 9, weight: 'bold' }, padding: { x: 4, y: 2 } },
    };
  }

  // ── Final config (NO JS callbacks anywhere) ───────────────────────────────
  return {
    type: 'bar',  // mixed chart needs 'bar' as base
    data: {
      labels,
      datasets: [
        // 1. Volume bars — y1, rendered last (behind)
        {
          type:               'bar',
          label:              'Volume',
          data:               vols,
          backgroundColor:    candles.map(c => c.close >= c.open ? 'rgba(0,184,148,0.22)' : 'rgba(214,48,49,0.22)'),
          borderWidth:        0,
          barPercentage:      0.9,
          categoryPercentage: 1.0,
          yAxisID:            'y1',
          order:              10,
        },
        // 2. MA50 — solid grey
        {
          type:            'line',
          label:           'MA50',
          data:            ma50,
          borderColor:     'rgba(150,150,150,0.75)',
          backgroundColor: 'transparent',
          borderWidth:     1.8,
          pointRadius:     0,
          tension:         0.3,
          spanGaps:        true,
          yAxisID:         'y',
          order:           4,
        },
        // 3. MA20 — dashed lighter grey
        {
          type:            'line',
          label:           'MA20',
          data:            ma20,
          borderColor:     'rgba(210,210,210,0.50)',
          backgroundColor: 'transparent',
          borderWidth:     1.4,
          borderDash:      [5, 3],
          pointRadius:     0,
          tension:         0.3,
          spanGaps:        true,
          yAxisID:         'y',
          order:           3,
        },
        // 4. Price line — single dataset, per-point colors
        {
          type:                   'line',
          label:                  'Harga',
          data:                   closes,
          borderColor:            '#64b5f6',  // default (overridden per-segment below)
          backgroundColor:        'transparent',
          borderWidth:            2,
          pointRadius:            pointRadius,
          pointBackgroundColor:   pointBg,
          pointBorderColor:       pointBorder,
          pointBorderWidth:       1.5,
          tension:                0,
          spanGaps:               false,
          yAxisID:                'y',
          order:                  2,
          // segment coloring — QuickChart supports this via function string
          // But since callbacks don't work in JSON, we use pointBackgroundColor
          // and accept that line segments will be a single base color (#64b5f6).
          // The dots on each point show green/red to indicate up/down.
        },
      ],
    },
    options: {
      responsive: false,
      animation:  false,
      plugins: {
        title: {
          display:  true,
          text:     title,
          color:    '#e0e0e0',
          font:     { size: 14, weight: 'bold' },
          padding:  { bottom: 6 },
        },
        legend: {
          display:  true,
          position: 'top',
          labels: {
            color:    '#aaaaaa',
            font:     { size: 9 },
            boxWidth: 14,
            padding:  10,
            usePointStyle: false,
          },
        },
        annotation: {
          annotations,
        },
      },
      scales: {
        x: {
          ticks: {
            color:         '#555555',
            maxTicksLimit: 12,
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
            maxTicksLimit: 7,
          },
          grid: { color: 'rgba(255,255,255,0.07)' },
        },
        y1: {
          min:      0,
          max:      volAxisMax,
          position: 'left',
          display:  true,
          ticks: {
            color:         '#444444',
            font:          { size: 7 },
            maxTicksLimit: 3,
          },
          grid: { drawOnChartArea: false },
        },
      },
      layout: {
        padding: { left: 4, right: 70, top: 4, bottom: 4 },
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
export async function fetchChartImageBuffer(opts: ChartImageOptions, timeoutMs = 22000): Promise<Buffer | null> {
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
      console.error('[Chart] QuickChart error body:', errTxt.slice(0, 400));
      return null;
    }
    if (!ct.includes('image')) {
      const errTxt = await res.text();
      console.error('[Chart] Non-image response:', errTxt.slice(0, 400));
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    console.log('[Chart] Buffer size:', buf.length, 'bytes');
    return buf;
  } catch (e: any) {
    console.error('[Chart] fetchChartImageBuffer exception:', e.message);
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

  // Strategy 1: POST buffer as multipart
  const imgBuffer = await fetchChartImageBuffer(opts, 22000);
  if (imgBuffer && imgBuffer.length > 5000) {
    const boundary  = `EbiteBdy${Date.now().toString(16)}`;
    const CRLF      = '\r\n';
    const part      = (name: string, value: string) =>
      `--${boundary}${CRLF}Content-Disposition: form-data; name="${name}"${CRLF}${CRLF}${value}${CRLF}`;

    const textPart  = Buffer.from(
      part('chat_id', String(chatId)) +
      part('caption', safeCaption) +
      part('parse_mode', 'HTML'),
      'utf8',
    );
    const filePart  = Buffer.from(
      `--${boundary}${CRLF}Content-Disposition: form-data; name="photo"; filename="chart.png"${CRLF}Content-Type: image/png${CRLF}${CRLF}`,
      'utf8',
    );
    const footer    = Buffer.from(`${CRLF}--${boundary}--${CRLF}`, 'utf8');
    const multipart = Buffer.concat([textPart, filePart, imgBuffer, footer]);

    try {
      const r = await fetch(`${API}/sendPhoto`, {
        method:  'POST',
        headers: {
          'Content-Type':   `multipart/form-data; boundary=${boundary}`,
          'Content-Length': String(multipart.length),
        },
        // @ts-ignore — Buffer is valid body in Node.js fetch
        body:   multipart,
        signal: AbortSignal.timeout(30000),
      });
      if (r.ok) {
        console.log('[Chart] sendPhoto multipart OK');
        return;
      }
      const errBody = await r.text();
      console.warn('[Chart] sendPhoto multipart fail:', r.status, errBody.slice(0, 200));
    } catch (e: any) {
      console.warn('[Chart] sendPhoto multipart exception:', e.message);
    }
  }

  // Strategy 2: Send URL directly to Telegram (Telegram fetches the image)
  console.log('[Chart] Falling back to URL strategy...');
  try {
    const url = buildChartImageUrl(opts, 60);
    console.log('[Chart] URL length:', url.length);
    const r = await fetch(`${API}/sendPhoto`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ chat_id: chatId, photo: url, caption: safeCaption, parse_mode: 'HTML' }),
      signal:  AbortSignal.timeout(15000),
    });
    if (r.ok) {
      console.log('[Chart] URL sendPhoto OK');
      return;
    }
    const errBody = await r.text();
    console.warn('[Chart] URL sendPhoto fail:', r.status, errBody.slice(0, 200));
  } catch (e: any) {
    console.warn('[Chart] URL strategy exception:', e.message);
  }

  // Strategy 3: Send text-only message to signal chart failed
  console.error('[Chart] All chart strategies failed — sending text fallback');
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
