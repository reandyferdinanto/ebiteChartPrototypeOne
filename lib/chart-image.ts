// ============================================================================
// EBITE CHART — Chart Image Generator for Telegram
// Strategy: SEGMENTED LINE CHART
//   - Price line dengan warna hijau (naik) / merah (turun) per segment
//   - MA20 & MA50 garis abu-abu
//   - SL / TP / Entry sebagai garis horizontal
//   - Tanpa volume bar (lebih bersih)
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
  width = 2,
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

/**
 * Buat array warna segment berdasarkan perubahan harga
 * Hijau jika harga naik dari kemarin, merah jika turun
 * (Catatan: Tidak digunakan langsung karena QuickChart tidak support segment callback)
 */
// function getSegmentColors(closes: number[]): string[] { ... }

// ── Build QuickChart config ───────────────────────────────────────────────────
export function buildChartConfig(opts: ChartImageOptions, maxCandles = 90): object {
  const { title, data, slLevel, tpLevel, entryLevel, sr = [] } = opts;

  const candles = data.slice(-maxCandles);
  const N       = candles.length;
  if (N === 0) return {};

  const labels = candles.map(c => formatDate(c.time));
  const closes = candles.map(c => c.close);

  // ── Price range ───────────────────────────────────────────────────────────
  const allPx = candles.flatMap(c => [c.high, c.low]);
  if (slLevel)    allPx.push(slLevel);
  if (tpLevel)    allPx.push(tpLevel);
  if (entryLevel) allPx.push(entryLevel);
  sr.forEach(z => allPx.push(z.level));
  const pxMin = Math.min(...allPx) * 0.985;
  const pxMax = Math.max(...allPx) * 1.015;

  // ── MA ────────────────────────────────────────────────────────────────────
  const ma20 = calcMA(closes, Math.min(20, N));
  const ma50 = calcMA(closes, Math.min(50, N));

  // ── Build green/red price segments ────────────────────────────────────────
  // QuickChart doesn't support segment colors callback, so we create separate datasets
  // for green (bullish) and red (bearish) segments
  const greenData: (number | null)[] = new Array(N).fill(null);
  const redData: (number | null)[] = new Array(N).fill(null);

  for (let i = 0; i < N; i++) {
    if (i === 0) {
      greenData[i] = closes[i];
    } else {
      const isBullish = closes[i] >= closes[i - 1];
      if (isBullish) {
        greenData[i - 1] = closes[i - 1]; // Connect from previous point
        greenData[i] = closes[i];
      } else {
        redData[i - 1] = closes[i - 1]; // Connect from previous point
        redData[i] = closes[i];
      }
    }
  }

  // ── Datasets ─────────────────────────────────────────────────────────────
  const datasets: object[] = [];

  // 1. MA50 - garis abu-abu solid
  datasets.push({
    type:            'line',
    label:           'MA50',
    data:            ma50,
    borderColor:     '#666666',
    backgroundColor: 'transparent',
    borderWidth:     1.5,
    pointRadius:     0,
    tension:         0.2,
    spanGaps:        true,
    yAxisID:         'y',
    order:           5,
  });

  // 2. MA20 - garis abu-abu putus-putus
  datasets.push({
    type:            'line',
    label:           'MA20',
    data:            ma20,
    borderColor:     '#999999',
    backgroundColor: 'transparent',
    borderWidth:     1.2,
    borderDash:      [4, 2],
    pointRadius:     0,
    tension:         0.2,
    spanGaps:        true,
    yAxisID:         'y',
    order:           5,
  });

  // 3. S/R zones
  const srToRender = sr.slice(0, 2);
  srToRender.forEach((zone) => {
    const isSup  = zone.type === 'support';
    const color  = isSup ? '#00cc66' : '#ff6666';
    datasets.push(flatLine(
      `${isSup ? 'S' : 'R'} ${Math.round(zone.level).toLocaleString('id-ID')}`,
      zone.level, N, color, [4, 4], 1.5
    ));
  });

  // 4. Stop Loss line (red dashed) - prominent
  if (slLevel && slLevel > 0) {
    datasets.push(flatLine(
      `⛔ SL ${Math.round(slLevel).toLocaleString('id-ID')}`,
      slLevel, N,
      '#ff3333', [6, 3], 2.5,
    ));
  }

  // 5. Take Profit line (cyan dashed) - prominent
  if (tpLevel && tpLevel > 0) {
    datasets.push(flatLine(
      `🎯 TP ${Math.round(tpLevel).toLocaleString('id-ID')}`,
      tpLevel, N,
      '#00ddff', [6, 3], 2.5,
    ));
  }

  // 6. Entry line (yellow solid) - prominent
  if (entryLevel && entryLevel > 0) {
    datasets.push(flatLine(
      `➤ Entry ${Math.round(entryLevel).toLocaleString('id-ID')}`,
      entryLevel, N,
      '#ffcc00', [], 2.5,
    ));
  }

  // 7. Price line - GREEN segments (naik)
  datasets.push({
    type:            'line',
    label:           '📈 Naik',
    data:            greenData,
    borderColor:     '#00dd77',
    backgroundColor: 'transparent',
    borderWidth:     2.5,
    pointRadius:     0,
    tension:         0,
    spanGaps:        false,
    yAxisID:         'y',
    order:           2,
  });

  // 8. Price line - RED segments (turun)
  datasets.push({
    type:            'line',
    label:           '📉 Turun',
    data:            redData,
    borderColor:     '#ff4444',
    backgroundColor: 'transparent',
    borderWidth:     2.5,
    pointRadius:     0,
    tension:         0,
    spanGaps:        false,
    yAxisID:         'y',
    order:           2,
  });

  // 9. Current price marker (last point)
  const lastClose = closes[N - 1];
  const prevClose = closes[N - 2] ?? lastClose;
  const isLastBullish = lastClose >= prevClose;
  datasets.push({
    type:            'line',
    label:           `Harga ${Math.round(lastClose).toLocaleString('id-ID')}`,
    data:            closes.map((_, i) => i === N - 1 ? lastClose : null),
    borderColor:     'transparent',
    backgroundColor: 'transparent',
    borderWidth:     0,
    pointRadius:     8,
    pointBackgroundColor: isLastBullish ? '#00ff88' : '#ff5555',
    pointBorderColor:     '#ffffff',
    pointBorderWidth:     2,
    yAxisID:         'y',
    order:           1,
  });

  // ── Filter hidden labels ──────────────────────────────────────────────────
  const patchedDatasets = (datasets as any[]).map(ds => {
    if (typeof ds.label === 'string' && ds.label.startsWith('_')) {
      return { ...ds, label: undefined };
    }
    return ds;
  });

  return {
    type: 'line',
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
          color:    '#ffffff',
          font:     { size: 14, weight: 'bold' },
          padding:  { top: 8, bottom: 8 },
        },
        legend: {
          display:  true,
          position: 'top',
          labels: {
            color:         '#cccccc',
            font:          { size: 9 },
            boxWidth:      14,
            padding:       8,
            usePointStyle: false,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color:         '#888888',
            maxTicksLimit: 8,
            maxRotation:   0,
            autoSkip:      true,
            font:          { size: 9 },
          },
          grid: { color: 'rgba(255,255,255,0.08)' },
        },
        y: {
          min:      pxMin,
          max:      pxMax,
          position: 'right',
          ticks: {
            color:         '#aaaaaa',
            font:          { size: 10 },
            maxTicksLimit: 8,
          },
          grid: { color: 'rgba(255,255,255,0.1)' },
        },
      },
      layout: {
        padding: { left: 8, right: 12, top: 8, bottom: 8 },
      },
    },
    backgroundColor: '#1a1a2e',
  };
}

// ── Build URL fallback ────────────────────────────────────────────────────────
export function buildChartImageUrl(opts: ChartImageOptions, maxCandles = 50): string {
  const config  = buildChartConfig(opts, maxCandles);
  const encoded = encodeURIComponent(JSON.stringify(config));
  const url     = `https://quickchart.io/chart?c=${encoded}&w=900&h=480&bkg=%231a1a2e&f=png`;
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
  const config = buildChartConfig(opts, 60); // 60 candles for cleaner chart
  try {
    const body = JSON.stringify({
      width:           900,
      height:          480,
      backgroundColor: '#1a1a2e',
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

    console.log('[Chart] QC response:', res.status);

    const buf = Buffer.from(await res.arrayBuffer());

    // Check PNG magic bytes (89 50 4E 47)
    const isPng = buf.length > 100 &&
                  buf[0] === 0x89 && buf[1] === 0x50 &&
                  buf[2] === 0x4E && buf[3] === 0x47;

    if (isPng && buf.length > 2000) {
      console.log('[Chart] Valid PNG:', buf.length, 'bytes');
      return buf;
    }

    console.error('[Chart] Invalid PNG or too small:', buf.length);
    return null;
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
