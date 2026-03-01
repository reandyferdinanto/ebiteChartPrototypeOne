// ============================================================================
// EBITE CHART — Chart Image Generator for Telegram
// Uses QuickChart.io with native "candlestick" chart type (chartjs-chart-financial)
// POST strategy: send JSON body to QuickChart, upload buffer to Telegram
// URL fallback: direct URL for Telegram to fetch itself
// ============================================================================

import { ChartData } from './indicators';

export interface ChartImageOptions {
  title: string;
  data: ChartData[];
  slLevel?: number;
  tpLevel?: number;
  entryLevel?: number;
  sr?: { level: number; type: 'support' | 'resistance' }[];
}

// ── Format date label ────────────────────────────────────────────────────────
function formatDate(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  const day   = d.getUTCDate().toString().padStart(2, '0');
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  return `${day}/${month}`;
}

// ── Calculate MA ─────────────────────────────────────────────────────────────
function calcMA(closes: number[], period: number): (number | null)[] {
  return closes.map((_, i) => {
    if (i < period - 1) return null;
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += closes[j];
    return parseFloat((sum / period).toFixed(2));
  });
}

// ── Build chart config using float bar (wick + body) approach ────────────────
// The native "candlestick" type from chartjs-chart-financial is unreliable on
// QuickChart (returns error image). Instead we use two "bar" datasets with
// floating bars [min,max]:
//   - Wicks: thin bar spanning [low, high]
//   - Bodies: wider bar spanning [min(open,close), max(open,close)]
// This produces a proper candlestick look and is 100% reliable.
export function buildChartConfig(opts: ChartImageOptions, maxCandles: number = 40): object {
  const { title, data, slLevel, tpLevel, entryLevel, sr = [] } = opts;

  // Limit candles to keep URL/POST body small
  const candles = data.slice(-maxCandles);
  const N = candles.length;

  const labels  = candles.map(c => formatDate(c.time));
  const closes  = candles.map(d => d.close);
  const vols    = candles.map(d => d.volume ?? 0);

  const ma20Arr = calcMA(closes, Math.min(20, N));
  const ma50Arr = calcMA(closes, Math.min(50, N));

  // Candle colors
  const bullColor = 'rgba(0,200,100,1)';
  const bearColor = 'rgba(235,60,60,1)';
  const bullWick  = 'rgba(0,200,100,0.85)';
  const bearWick  = 'rgba(235,60,60,0.85)';

  const candleColors = candles.map(c => c.close >= c.open ? bullColor : bearColor);
  const wickColors   = candles.map(c => c.close >= c.open ? bullWick : bearWick);

  // Floating bar data: [low, high] for wicks and [open/close min, open/close max] for bodies
  const wickData = candles.map(c => [
    parseFloat(c.low.toFixed(2)),
    parseFloat(c.high.toFixed(2)),
  ]);
  const bodyData = candles.map(c => [
    parseFloat(Math.min(c.open, c.close).toFixed(2)),
    parseFloat(Math.max(c.open, c.close).toFixed(2)),
  ]);

  // MA line data (y values, null for undefined)
  const ma20Data = ma20Arr.map(v => v);
  const ma50Data = ma50Arr.map(v => v);

  // Price range for y-axis padding
  const allPx = candles.flatMap(c => [c.high, c.low]);
  if (slLevel)    allPx.push(slLevel);
  if (tpLevel)    allPx.push(tpLevel);
  if (entryLevel) allPx.push(entryLevel);
  const pxMin = Math.min(...allPx) * 0.991;
  const pxMax = Math.max(...allPx) * 1.009;

  // Volume scaled to bottom 18% of price axis
  const maxVol   = Math.max(...vols, 1);
  const volRange = (pxMax - pxMin) * 0.18;
  const volData  = vols.map(v => parseFloat((pxMin + (v / maxVol) * volRange).toFixed(2)));
  const volColors = candles.map(c =>
    c.close >= c.open ? 'rgba(0,184,148,0.25)' : 'rgba(214,48,49,0.25)'
  );

  // ── Annotation lines (SL, TP, Entry, S/R) ────────────────────────────────
  const annotations: Record<string, any> = {};

  if (entryLevel) {
    annotations.entryLine = {
      type: 'line',
      yMin: entryLevel, yMax: entryLevel,
      borderColor: 'rgba(0,230,118,0.9)', borderWidth: 2,
      borderDash: [6, 3],
      label: {
        enabled: true,
        content: `Entry ${Math.round(entryLevel).toLocaleString('id-ID')}`,
        position: 'end',
        backgroundColor: 'rgba(0,200,100,0.85)',
        color: '#000', font: { size: 9, weight: 'bold' },
        padding: { x: 4, y: 2 },
      },
    };
  }

  if (slLevel) {
    annotations.slLine = {
      type: 'line',
      yMin: slLevel, yMax: slLevel,
      borderColor: 'rgba(255,82,82,0.9)', borderWidth: 2,
      borderDash: [5, 4],
      label: {
        enabled: true,
        content: `SL ${Math.round(slLevel).toLocaleString('id-ID')}`,
        position: 'end',
        backgroundColor: 'rgba(255,60,60,0.9)',
        color: '#fff', font: { size: 9, weight: 'bold' },
        padding: { x: 4, y: 2 },
      },
    };
  }

  if (tpLevel) {
    annotations.tpLine = {
      type: 'line',
      yMin: tpLevel, yMax: tpLevel,
      borderColor: 'rgba(64,196,255,0.9)', borderWidth: 2,
      borderDash: [5, 4],
      label: {
        enabled: true,
        content: `TP ${Math.round(tpLevel).toLocaleString('id-ID')}`,
        position: 'end',
        backgroundColor: 'rgba(30,150,230,0.9)',
        color: '#fff', font: { size: 9, weight: 'bold' },
        padding: { x: 4, y: 2 },
      },
    };
  }

  const usedLevels = new Set<number>();
  [slLevel, tpLevel, entryLevel].forEach(l => { if (l) usedLevels.add(Math.round(l)); });

  sr.slice(0, 3).forEach((zone, i) => {
    const rounded = Math.round(zone.level);
    if (usedLevels.has(rounded)) return;
    usedLevels.add(rounded);
    const isSup  = zone.type === 'support';
    const color  = isSup ? 'rgba(0,200,100,0.55)' : 'rgba(255,60,60,0.55)';
    const bgCol  = isSup ? 'rgba(0,200,100,0.45)' : 'rgba(255,60,60,0.45)';
    annotations[`sr${i}`] = {
      type: 'line',
      yMin: zone.level, yMax: zone.level,
      borderColor: color, borderWidth: 1, borderDash: [3, 5],
      label: {
        enabled: true,
        content: `${isSup ? 'SUP' : 'RES'} ${rounded.toLocaleString('id-ID')}`,
        position: 'start',
        backgroundColor: bgCol,
        color: '#fff', font: { size: 8 },
        padding: { x: 3, y: 1 },
      },
    };
  });

  // ── Float Bar approach: wicks (thin) + bodies (wide) = realistic candlestick ──
  // This is the proven reliable approach (candlestick type fails on QuickChart)
  return {
    type: 'bar',
    data: {
      labels,
      datasets: [
        // 1. Wicks — thin bars spanning [low, high]
        {
          label: 'Wick',
          data: wickData,
          backgroundColor: wickColors,
          borderWidth: 0,
          barPercentage: 0.12,
          categoryPercentage: 1.0,
          order: 3,
        },
        // 2. Bodies — wider bars spanning [min(o,c), max(o,c)]
        {
          label: title,
          data: bodyData,
          backgroundColor: candleColors,
          borderWidth: 0,
          barPercentage: 0.65,
          categoryPercentage: 1.0,
          order: 2,
        },
        // 3. Volume — short bars at bottom of chart
        {
          label: 'Vol',
          data: volData,
          backgroundColor: volColors,
          borderWidth: 0,
          barPercentage: 0.75,
          categoryPercentage: 1.0,
          base: pxMin,
          order: 10,
        },
        // 4. MA20
        {
          type: 'line',
          label: 'MA20',
          data: ma20Data,
          borderColor: '#ffd600',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.3,
          spanGaps: true,
          order: 1,
        },
        // 5. MA50
        {
          type: 'line',
          label: 'MA50',
          data: ma50Data,
          borderColor: '#e040fb',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.3,
          spanGaps: true,
          order: 1,
        },
      ],
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        title: {
          display: true,
          text: title,
          color: '#e8e8e8',
          font: { size: 13, weight: 'bold' },
          padding: { bottom: 4 },
        },
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#aaa',
            font: { size: 10 },
            boxWidth: 12,
            padding: 8,
            filter: (item: any) => item.text !== 'Wick' && item.text !== 'Vol',
          },
        },
        annotation: { annotations },
      },
      scales: {
        x: {
          ticks: {
            color: '#777',
            maxTicksLimit: 10,
            maxRotation: 0,
            font: { size: 9 },
            autoSkip: true,
          },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
        y: {
          min: pxMin,
          max: pxMax,
          position: 'right',
          ticks: {
            color: '#888',
            font: { size: 9 },
            maxTicksLimit: 8,
          },
          grid: { color: 'rgba(255,255,255,0.05)' },
        },
      },
      layout: {
        padding: { left: 4, right: 80, top: 4, bottom: 4 },
      },
    },
    backgroundColor: '#131722',
  };
}

// ── Build chart URL (GET) — tries 30 candles, falls back to fewer ───────────
export function buildChartImageUrl(opts: ChartImageOptions, maxCandles: number = 30): string {
  const config  = buildChartConfig(opts, maxCandles);
  const encoded = encodeURIComponent(JSON.stringify(config));
  const url = `https://quickchart.io/chart?c=${encoded}&w=800&h=500&bkg=%23131722&f=png`;

  // If URL is too long, retry with fewer candles
  if (url.length > 8000 && maxCandles > 12) {
    return buildChartImageUrl(opts, Math.floor(maxCandles * 0.7));
  }
  return url;
}

// ── Fetch chart image as Buffer via QuickChart POST ───────────────────────────
export async function fetchChartImageBuffer(opts: ChartImageOptions, timeoutMs: number = 18000): Promise<Buffer | null> {
  // Use 40 candles for POST (no URL length limit)
  const config = buildChartConfig(opts, 40);

  try {
    const body = JSON.stringify({
      width:           800,
      height:          500,
      backgroundColor: '#131722',
      format:          'png',
      chart:           config,
    });

    console.log('[Chart] POST to QuickChart, body size:', body.length, 'bytes');

    const res = await fetch('https://quickchart.io/chart', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Chart] QuickChart error:', res.status, errText.slice(0, 400));
      return null;
    }

    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('image')) {
      const errText = await res.text();
      console.error('[Chart] QuickChart returned non-image:', ct, errText.slice(0, 400));
      return null;
    }

    const arrayBuf = await res.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    console.log('[Chart] QuickChart OK, image size:', buf.length, 'bytes');
    return buf;
  } catch (e: any) {
    console.error('[Chart] fetchChartImageBuffer error:', e.message);
    return null;
  }
}

// ── Send chart photo to Telegram ─────────────────────────────────────────────
// Strategy:
//   1. POST buffer (QuickChart POST → PNG buffer → Telegram multipart)
//   2. Fallback: send QuickChart URL (Telegram fetches image itself)
export async function sendChartPhoto(
  chatId: number | string,
  opts: ChartImageOptions,
  caption: string = '',
  botToken: string,
): Promise<void> {
  const TELEGRAM_API = `https://api.telegram.org/bot${botToken}`;
  const safeCaption  = caption.replace(/<[^>]+>/g, '').slice(0, 1024);

  // ── Strategy 1: POST buffer (most reliable, native candlestick) ──────────
  try {
    const imgBuffer = await fetchChartImageBuffer(opts, 18000);

    if (imgBuffer && imgBuffer.length > 5000) {
      const boundary = `EbiteBoundary${Date.now().toString(16)}`;
      const CRLF     = '\r\n';

      const buildPart = (name: string, value: string): string =>
        `--${boundary}${CRLF}Content-Disposition: form-data; name="${name}"${CRLF}${CRLF}${value}${CRLF}`;

      const textParts = [
        buildPart('chat_id',    String(chatId)),
        buildPart('caption',    safeCaption),
        buildPart('parse_mode', 'HTML'),
      ].join('');

      const fileHeader =
        `--${boundary}${CRLF}` +
        `Content-Disposition: form-data; name="photo"; filename="chart.png"${CRLF}` +
        `Content-Type: image/png${CRLF}${CRLF}`;

      const footer = `${CRLF}--${boundary}--${CRLF}`;

      const textBuf   = Buffer.from(textParts, 'utf8');
      const headerBuf = Buffer.from(fileHeader, 'utf8');
      const footerBuf = Buffer.from(footer, 'utf8');
      const multipart = Buffer.concat([textBuf, headerBuf, imgBuffer, footerBuf]);

      const teleRes = await fetch(`${TELEGRAM_API}/sendPhoto`, {
        method:  'POST',
        headers: {
          'Content-Type':   `multipart/form-data; boundary=${boundary}`,
          'Content-Length': String(multipart.length),
        },
        // @ts-ignore — fetch body accepts Buffer in Node.js runtime
        body:   multipart,
        signal: AbortSignal.timeout(25000),
      });

      if (teleRes.ok) {
        console.log('[Chart] sendPhoto multipart OK for chat', chatId);
        return;
      }

      const errText = await teleRes.text();
      console.warn('[Chart] Telegram multipart error:', teleRes.status, errText.slice(0, 300));
      // Fall through to URL strategy
    }
  } catch (e: any) {
    console.warn('[Chart] POST strategy exception:', e.message);
  }

  // ── Strategy 2: URL-only (Telegram fetches PNG itself) ──────────────────
  try {
    const imageUrl = buildChartImageUrl(opts, 30);
    console.log('[Chart] Trying URL sendPhoto, URL length:', imageUrl.length);

    const res = await fetch(`${TELEGRAM_API}/sendPhoto`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        chat_id:    chatId,
        photo:      imageUrl,
        caption:    safeCaption,
        parse_mode: 'HTML',
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (res.ok) {
      console.log('[Chart] sendPhoto URL OK for chat', chatId);
      return;
    }

    const errText = await res.text();
    console.warn('[Chart] URL sendPhoto failed:', res.status, errText.slice(0, 200));
  } catch (e: any) {
    console.warn('[Chart] URL sendPhoto exception:', e.message);
  }

  console.error('[Chart] All chart strategies failed for chat', chatId);
}
