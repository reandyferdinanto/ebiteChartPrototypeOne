// ============================================================================
// EBITE CHART — Chart Image Generator for Telegram
// Uses QuickChart.io — IMPORTANT: NO function callbacks in config (JSON only)
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

// ── Build QuickChart config (NO function callbacks — pure JSON serialisable) ──
// Uses floating bar to simulate candlesticks:
//   Wick layer : barPercentage 0.15  [low, high]
//   Body layer : barPercentage 0.6   [min(o,c), max(o,c)]
export function buildChartConfig(opts: ChartImageOptions): object {
  const { title, data, slLevel, tpLevel, entryLevel, sr = [] } = opts;

  // Use last 40 candles for readability (keeps URL / POST body smaller)
  const candles = data.slice(-40);
  const N = candles.length;

  const labels  = candles.map(d => formatDate(d.time));
  const closes  = candles.map(d => d.close);
  const vols    = candles.map(d => d.volume ?? 0);

  const ma20 = calcMA(closes, 20);
  const ma50 = calcMA(closes, 50);

  // Price range
  const allPx = candles.flatMap(c => [c.high, c.low]);
  if (slLevel)    allPx.push(slLevel);
  if (tpLevel)    allPx.push(tpLevel);
  if (entryLevel) allPx.push(entryLevel);
  const pxMin = Math.min(...allPx) * 0.992;
  const pxMax = Math.max(...allPx) * 1.008;

  // Per-candle colors
  const bullBody = 'rgba(0,200,100,1)';
  const bearBody = 'rgba(235,60,60,1)';
  const bullWick = 'rgba(0,200,100,0.55)';
  const bearWick = 'rgba(235,60,60,0.55)';

  const bodyColors = candles.map(c => c.close >= c.open ? bullBody : bearBody);
  const wickColors = candles.map(c => c.close >= c.open ? bullWick : bearWick);

  const wickData = candles.map(c => [c.low, c.high]);
  const bodyData = candles.map(c => [
    parseFloat(Math.min(c.open, c.close).toFixed(2)),
    parseFloat(Math.max(c.open, c.close).toFixed(2)),
  ]);

  // Volume bars scaled to bottom 12% of price axis
  const maxVol   = Math.max(...vols, 1);
  const volRange = (pxMax - pxMin) * 0.12;
  const volData  = vols.map(v => parseFloat((pxMin + (v / maxVol) * volRange).toFixed(2)));
  const volColors = candles.map(c =>
    c.close >= c.open ? 'rgba(0,184,148,0.28)' : 'rgba(214,48,49,0.28)'
  );

  // ── Annotation lines ─────────────────────────────────────────────────────
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

  // ── Build final Chart.js config (ZERO function callbacks) ─────────────────
  return {
    type: 'bar',
    data: {
      labels,
      datasets: [
        // 1. Wick
        {
          label: 'Wick',
          data: wickData,
          backgroundColor: wickColors,
          borderColor: wickColors,
          borderWidth: 0,
          barPercentage: 0.15,
          categoryPercentage: 1.0,
          yAxisID: 'y',
          order: 4,
        },
        // 2. Body
        {
          label: 'Body',
          data: bodyData,
          backgroundColor: bodyColors,
          borderColor: bodyColors,
          borderWidth: 0,
          barPercentage: 0.6,
          categoryPercentage: 1.0,
          yAxisID: 'y',
          order: 3,
        },
        // 3. MA20
        {
          type: 'line',
          label: 'MA20',
          data: ma20,
          borderColor: '#ffd600',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.3,
          yAxisID: 'y',
          order: 2,
          spanGaps: true,
        },
        // 4. MA50
        {
          type: 'line',
          label: 'MA50',
          data: ma50,
          borderColor: '#e040fb',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.3,
          yAxisID: 'y',
          order: 2,
          spanGaps: true,
        },
        // 5. Volume overlay
        {
          type: 'bar',
          label: 'Volume',
          data: volData,
          backgroundColor: volColors,
          borderWidth: 0,
          barPercentage: 0.9,
          categoryPercentage: 1.0,
          yAxisID: 'y',
          order: 5,
          base: pxMin,
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
          padding: { bottom: 4 },
        },
        legend: {
          display: true,
          position: 'top',
          labels: {
            // NOTE: No callback functions — filter removed to stay JSON-safe
            color: '#aaa',
            font: { size: 10 },
            boxWidth: 14,
            padding: 8,
            // Only show MA lines in legend by hiding others via dataset hidden property
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
            // NOTE: No callback — QuickChart will format numbers automatically
          },
          grid: { color: 'rgba(255,255,255,0.05)' },
        },
      },
      layout: {
        padding: { left: 4, right: 80, top: 4, bottom: 4 },
      },
    },
    // tell QuickChart the background color
    backgroundColor: '#131722',
  };
}

// ── Generate chart image URL via QuickChart.io (GET fallback) ─────────────────
export function buildChartImageUrl(opts: ChartImageOptions): string {
  const config    = buildChartConfig(opts);
  const encoded   = encodeURIComponent(JSON.stringify(config));
  return `https://quickchart.io/chart?c=${encoded}&w=800&h=450&bkg=%23131722&f=png`;
}

// ── Fetch chart image as Buffer via QuickChart POST ───────────────────────────
export async function fetchChartImageBuffer(opts: ChartImageOptions): Promise<Buffer | null> {
  const config = buildChartConfig(opts);

  try {
    const body = JSON.stringify({
      width:           800,
      height:          450,
      backgroundColor: '#131722',
      format:          'png',
      chart:           config,
    });

    console.log('[Chart] POST to QuickChart, body size:', body.length, 'bytes');

    const res = await fetch('https://quickchart.io/chart', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Chart] QuickChart error:', res.status, errText.slice(0, 300));
      return null;
    }

    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('image')) {
      const errText = await res.text();
      console.error('[Chart] QuickChart returned non-image:', ct, errText.slice(0, 300));
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
//   1. Fetch PNG from QuickChart (POST)
//   2. Upload binary to Telegram sendPhoto via multipart
//   3. Fallback: send QuickChart URL directly (if buffer fails)
export async function sendChartPhoto(
  chatId: number | string,
  opts: ChartImageOptions,
  caption: string = '',
  botToken: string,
): Promise<void> {
  const TELEGRAM_API = `https://api.telegram.org/bot${botToken}`;
  const safeCaption  = caption.slice(0, 1024);

  try {
    // ── Step 1: Get PNG buffer from QuickChart ────────────────────────────
    const imgBuffer = await fetchChartImageBuffer(opts);

    if (imgBuffer && imgBuffer.length > 1000) {
      // ── Step 2: Send binary image to Telegram via multipart/form-data ──
      // Build multipart manually using boundary (compatible with all Node versions)
      const boundary = '----EbiteBoundary' + Date.now().toString(16);
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
        // @ts-ignore — fetch body accepts Buffer in Node.js
        body:   multipart,
        signal: AbortSignal.timeout(30000),
      });

      if (teleRes.ok) {
        console.log('[Chart] sendPhoto multipart OK for chat', chatId);
        return;
      }

      const errText = await teleRes.text();
      console.error('[Chart] Telegram multipart error:', teleRes.status, errText.slice(0, 300));
    }

    // ── Step 3: Fallback — send QuickChart URL directly to Telegram ──────
    console.log('[Chart] Trying URL fallback for chat', chatId);
    const imageUrl = buildChartImageUrl(opts);
    console.log('[Chart] Fallback URL length:', imageUrl.length);

    // If URL is too long for Telegram, trim to 30 candles
    const finalOpts = imageUrl.length > 4096
      ? { ...opts, data: opts.data.slice(-30) }
      : opts;
    const finalUrl  = imageUrl.length > 4096 ? buildChartImageUrl(finalOpts) : imageUrl;

    const res2 = await fetch(`${TELEGRAM_API}/sendPhoto`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        chat_id:    chatId,
        photo:      finalUrl,
        caption:    safeCaption,
        parse_mode: 'HTML',
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (res2.ok) {
      console.log('[Chart] sendPhoto URL fallback OK for chat', chatId);
    } else {
      const errText = await res2.text();
      console.error('[Chart] Telegram URL fallback error:', res2.status, errText.slice(0, 300));
    }
  } catch (e: any) {
    console.error('[Chart] sendChartPhoto exception:', e.message);
  }
}
