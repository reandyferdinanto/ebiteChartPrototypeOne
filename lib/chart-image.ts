// ============================================================================
// EBITE CHART — Chart Image Generator for Telegram
// Uses QuickChart.io with float-bar candlestick approach (reliable)
// - Main price panel: candlestick bodies + wicks + MA lines + S/R annotations
// - Separate volume panel: dual y-axis (y1) so volume NEVER overlaps price
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

// ── Format volume label ───────────────────────────────────────────────────────
function fmtVol(v: number): string {
  if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K';
  return String(v);
}

// ── Build chart config: candlestick (float bar) + separate volume axis ────────
// maxCandles: number of candles to show (60 default for good history view)
export function buildChartConfig(opts: ChartImageOptions, maxCandles: number = 60): object {
  const { title, data, slLevel, tpLevel, entryLevel, sr = [] } = opts;

  // Use up to maxCandles most recent candles
  const candles = data.slice(-maxCandles);
  const N = candles.length;

  const labels = candles.map(c => formatDate(c.time));
  const closes = candles.map(d => d.close);
  const vols   = candles.map(d => d.volume ?? 0);

  // ── MA lines ──────────────────────────────────────────────────────────────
  const ma20Arr = calcMA(closes, Math.min(20, N));
  const ma50Arr = calcMA(closes, Math.min(50, N));

  // ── Candle float bar data ─────────────────────────────────────────────────
  const bullColor = 'rgba(0,210,105,1)';
  const bearColor = 'rgba(235,60,60,1)';
  const bullWick  = 'rgba(0,210,105,0.9)';
  const bearWick  = 'rgba(235,60,60,0.9)';

  const bodyData = candles.map(c => [
    parseFloat(Math.min(c.open, c.close).toFixed(2)),
    parseFloat(Math.max(c.open, c.close).toFixed(2)),
  ]);
  const wickData = candles.map(c => [
    parseFloat(c.low.toFixed(2)),
    parseFloat(c.high.toFixed(2)),
  ]);
  const candleColors = candles.map(c => c.close >= c.open ? bullColor : bearColor);
  const wickColors   = candles.map(c => c.close >= c.open ? bullWick : bearWick);

  // ── Price axis range (y) — tight fit with padding ─────────────────────────
  const allPx = candles.flatMap(c => [c.high, c.low]);
  if (slLevel)    allPx.push(slLevel);
  if (tpLevel)    allPx.push(tpLevel);
  if (entryLevel) allPx.push(entryLevel);
  const pxMin = Math.min(...allPx) * 0.993;
  const pxMax = Math.max(...allPx) * 1.007;

  // ── Volume axis (y1) — completely separate, scale from 0 to 3× maxVol ────
  // This guarantees volume bars never overlap with candles.
  // We set y1.max = maxVol * 4 so bars only use bottom ~25% visually.
  const maxVol = Math.max(...vols, 1);
  const volAxisMax = maxVol * 4; // bars take bottom 25% of y1 axis

  // ── Annotation lines (SL, TP, Entry, S/R) ────────────────────────────────
  const annotations: Record<string, any> = {};

  if (entryLevel) {
    annotations.entryLine = {
      type: 'line',
      yMin: entryLevel, yMax: entryLevel,
      borderColor: 'rgba(0,230,118,0.95)', borderWidth: 2,
      borderDash: [6, 3],
      label: {
        enabled: true,
        content: `Entry ${Math.round(entryLevel).toLocaleString('id-ID')}`,
        position: 'end',
        backgroundColor: 'rgba(0,200,100,0.9)',
        color: '#000', font: { size: 9, weight: 'bold' },
        padding: { x: 4, y: 2 },
      },
    };
  }

  if (slLevel) {
    annotations.slLine = {
      type: 'line',
      yMin: slLevel, yMax: slLevel,
      borderColor: 'rgba(255,82,82,0.95)', borderWidth: 2,
      borderDash: [5, 4],
      label: {
        enabled: true,
        content: `SL ${Math.round(slLevel).toLocaleString('id-ID')}`,
        position: 'end',
        backgroundColor: 'rgba(255,60,60,0.95)',
        color: '#fff', font: { size: 9, weight: 'bold' },
        padding: { x: 4, y: 2 },
      },
    };
  }

  if (tpLevel) {
    annotations.tpLine = {
      type: 'line',
      yMin: tpLevel, yMax: tpLevel,
      borderColor: 'rgba(64,196,255,0.95)', borderWidth: 2,
      borderDash: [5, 4],
      label: {
        enabled: true,
        content: `TP ${Math.round(tpLevel).toLocaleString('id-ID')}`,
        position: 'end',
        backgroundColor: 'rgba(30,150,230,0.95)',
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
    const isSup = zone.type === 'support';
    annotations[`sr${i}`] = {
      type: 'line',
      yMin: zone.level, yMax: zone.level,
      borderColor: isSup ? 'rgba(0,200,100,0.6)' : 'rgba(255,60,60,0.6)',
      borderWidth: 1, borderDash: [4, 4],
      label: {
        enabled: true,
        content: `${isSup ? 'SUP' : 'RES'} ${rounded.toLocaleString('id-ID')}`,
        position: 'start',
        backgroundColor: isSup ? 'rgba(0,200,100,0.5)' : 'rgba(255,60,60,0.5)',
        color: '#fff', font: { size: 8 },
        padding: { x: 3, y: 1 },
      },
    };
  });

  return {
    type: 'bar',
    data: {
      labels,
      datasets: [
        // ── 1. Candle wicks (thin floating bars, yAxisID: y) ──
        {
          label: 'Wick',
          data: wickData,
          backgroundColor: wickColors,
          borderWidth: 0,
          barPercentage: 0.15,
          categoryPercentage: 1.0,
          yAxisID: 'y',
          order: 4,
        },
        // ── 2. Candle bodies (wider floating bars, yAxisID: y) ──
        {
          label: title,
          data: bodyData,
          backgroundColor: candleColors,
          borderWidth: 0,
          barPercentage: 0.7,
          categoryPercentage: 1.0,
          yAxisID: 'y',
          order: 3,
        },
        // ── 3. Volume bars (yAxisID: y1 — completely separate axis) ──
        {
          type: 'bar',
          label: 'Vol',
          data: vols,
          backgroundColor: candles.map(c =>
            c.close >= c.open ? 'rgba(0,184,148,0.35)' : 'rgba(214,48,49,0.35)'
          ),
          borderWidth: 0,
          barPercentage: 0.8,
          categoryPercentage: 1.0,
          yAxisID: 'y1',
          order: 10,
        },
        // ── 4. MA20 (yAxisID: y) ──
        {
          type: 'line',
          label: 'MA20',
          data: ma20Arr,
          borderColor: '#ffd600',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.2,
          spanGaps: true,
          yAxisID: 'y',
          order: 1,
        },
        // ── 5. MA50 (yAxisID: y) ──
        {
          type: 'line',
          label: 'MA50',
          data: ma50Arr,
          borderColor: '#e040fb',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.2,
          spanGaps: true,
          yAxisID: 'y',
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
          font: { size: 14, weight: 'bold' },
          padding: { bottom: 6 },
        },
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#bbb',
            font: { size: 10 },
            boxWidth: 14,
            padding: 10,
            // Only show MA20, MA50, and the ticker name; hide Wick and Vol
            filter: (item: any) => item.text !== 'Wick' && item.text !== 'Vol',
          },
        },
        annotation: { annotations },
      },
      scales: {
        x: {
          ticks: {
            color: '#666',
            maxTicksLimit: 12,
            maxRotation: 0,
            font: { size: 8 },
            autoSkip: true,
          },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
        // ── y: price axis (right side) ──
        y: {
          min: pxMin,
          max: pxMax,
          position: 'right',
          ticks: {
            color: '#999',
            font: { size: 9 },
            maxTicksLimit: 7,
            callback: (val: number) => Math.round(val).toLocaleString('id-ID'),
          },
          grid: { color: 'rgba(255,255,255,0.06)' },
        },
        // ── y1: volume axis (left side, hidden ticks) ──
        // min=0, max=volAxisMax ensures bars only appear at the bottom
        y1: {
          min: 0,
          max: volAxisMax,
          position: 'left',
          display: true,
          ticks: {
            color: '#555',
            font: { size: 8 },
            maxTicksLimit: 3,
            callback: (val: number) => fmtVol(val),
          },
          grid: { drawOnChartArea: false }, // don't draw gridlines for volume axis
        },
      },
      layout: {
        padding: { left: 4, right: 70, top: 4, bottom: 4 },
      },
    },
    backgroundColor: '#131722',
  };
}

// ── Build chart URL (GET) — tries 60 candles, reduces if URL too long ────────
export function buildChartImageUrl(opts: ChartImageOptions, maxCandles: number = 60): string {
  const config  = buildChartConfig(opts, maxCandles);
  const encoded = encodeURIComponent(JSON.stringify(config));
  const url = `https://quickchart.io/chart?c=${encoded}&w=900&h=520&bkg=%23131722&f=png`;

  // Reduce candles if URL too long (Telegram limit ~8KB URL)
  if (url.length > 7500 && maxCandles > 15) {
    return buildChartImageUrl(opts, Math.floor(maxCandles * 0.75));
  }
  return url;
}

// ── Fetch chart image as Buffer via QuickChart POST ───────────────────────────
export async function fetchChartImageBuffer(opts: ChartImageOptions, timeoutMs: number = 20000): Promise<Buffer | null> {
  // POST supports larger payloads — use 75 candles for rich history
  const config = buildChartConfig(opts, 75);

  try {
    const body = JSON.stringify({
      width:           900,
      height:          520,
      backgroundColor: '#131722',
      format:          'png',
      chart:           config,
    });

    console.log('[Chart] POST to QuickChart, body size:', body.length, 'bytes, candles: 75');

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
// Strategy 1: POST buffer to QuickChart → send as multipart to Telegram
// Strategy 2: Fallback to URL (Telegram fetches image itself)
export async function sendChartPhoto(
  chatId: number | string,
  opts: ChartImageOptions,
  caption: string = '',
  botToken: string,
): Promise<void> {
  const TELEGRAM_API = `https://api.telegram.org/bot${botToken}`;
  const safeCaption  = caption.replace(/<[^>]+>/g, '').slice(0, 1024);

  // ── Strategy 1: POST buffer ───────────────────────────────────────────────
  try {
    const imgBuffer = await fetchChartImageBuffer(opts, 20000);

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
    }
  } catch (e: any) {
    console.warn('[Chart] POST strategy exception:', e.message);
  }

  // ── Strategy 2: URL-only ─────────────────────────────────────────────────
  try {
    const imageUrl = buildChartImageUrl(opts, 60);
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
