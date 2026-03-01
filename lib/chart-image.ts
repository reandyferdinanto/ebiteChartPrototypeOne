// ============================================================================
// EBITE CHART — Chart Image Generator for Telegram
// Uses QuickChart.io candlestick chart with MA, S/R, SL/TP
// QuickChart v2 supports chartjs-chart-financial (candlestick/ohlc)
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

// ── Format date label (short DD/MM) ─────────────────────────────────────────
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
    return Math.round((sum / period) * 100) / 100;
  });
}

// ── Build QuickChart config using floating bar candlestick simulation ─────────
// QuickChart free tier uses Chart.js 4 without chartjs-chart-financial.
// We simulate candlesticks with two stacked bar layers:
//   1. Wick bars  [low, high]  — thin, semi-transparent candle color
//   2. Body bars  [open, close] — solid candle color
export function buildChartConfig(opts: ChartImageOptions): object {
  const { title, data, slLevel, tpLevel, entryLevel, sr = [] } = opts;

  // Use last 50 candles for readability
  const candles = data.slice(-50);

  const labels = candles.map(d => formatDate(d.time));
  const closes = candles.map(d => d.close);
  const highs  = candles.map(d => d.high);
  const lows   = candles.map(d => d.low);
  const vols   = candles.map(d => d.volume ?? 0);

  // Moving averages
  const ma20raw = calcMA(closes, 20);
  const ma50raw = calcMA(closes, 50);

  // Price range for y-axis padding
  const allPrices = [...highs, ...lows];
  if (slLevel)    allPrices.push(slLevel);
  if (tpLevel)    allPrices.push(tpLevel);
  if (entryLevel) allPrices.push(entryLevel);
  const priceMin = Math.min(...allPrices) * 0.993;
  const priceMax = Math.max(...allPrices) * 1.007;

  // Candle colors
  const bullColor = 'rgba(0,200,100,1)';
  const bearColor = 'rgba(235,60,60,1)';
  const bullFade  = 'rgba(0,200,100,0.5)';
  const bearFade  = 'rgba(235,60,60,0.5)';

  const bodyColors = candles.map(c => c.close >= c.open ? bullColor : bearColor);
  const wickColors = candles.map(c => c.close >= c.open ? bullFade  : bearFade);

  // Floating bar data: [lo, hi] for wicks, [open, close] for bodies
  const wickData = candles.map(c => [c.low, c.high]);
  const bodyData = candles.map(c => [
    Math.min(c.open, c.close),
    Math.max(c.open, c.close),
  ]);

  // Volume: scale to bottom 15% of price axis for overlay
  const maxVol  = Math.max(...vols, 1);
  const volRange = (priceMax - priceMin) * 0.15;
  const scaledVols = vols.map(v => priceMin + (v / maxVol) * volRange);
  const volColors  = candles.map(c =>
    c.close >= c.open ? 'rgba(0,184,148,0.3)' : 'rgba(214,48,49,0.3)'
  );

  // ── Annotation lines ──────────────────────────────────────────────────────
  const annotations: Record<string, any> = {};

  if (entryLevel) {
    annotations.entryLine = {
      type: 'line',
      yMin: entryLevel, yMax: entryLevel,
      borderColor: '#00e676', borderWidth: 2, borderDash: [6, 3],
      label: {
        enabled: true,
        content: `Entry ${Math.round(entryLevel).toLocaleString('id-ID')}`,
        position: 'end',
        backgroundColor: 'rgba(0,230,118,0.85)',
        color: '#000',
        font: { size: 10, weight: 'bold' },
        padding: { x: 4, y: 2 },
      },
    };
  }

  if (slLevel) {
    annotations.slLine = {
      type: 'line',
      yMin: slLevel, yMax: slLevel,
      borderColor: '#ff5252', borderWidth: 2, borderDash: [5, 4],
      label: {
        enabled: true,
        content: `SL ${Math.round(slLevel).toLocaleString('id-ID')}`,
        position: 'end',
        backgroundColor: 'rgba(255,82,82,0.9)',
        color: '#fff',
        font: { size: 10, weight: 'bold' },
        padding: { x: 4, y: 2 },
      },
    };
  }

  if (tpLevel) {
    annotations.tpLine = {
      type: 'line',
      yMin: tpLevel, yMax: tpLevel,
      borderColor: '#40c4ff', borderWidth: 2, borderDash: [5, 4],
      label: {
        enabled: true,
        content: `TP ${Math.round(tpLevel).toLocaleString('id-ID')}`,
        position: 'end',
        backgroundColor: 'rgba(64,196,255,0.9)',
        color: '#000',
        font: { size: 10, weight: 'bold' },
        padding: { x: 4, y: 2 },
      },
    };
  }

  // S/R zones (max 4)
  const usedLevels = new Set<string>();
  [slLevel, tpLevel, entryLevel].forEach(l => { if (l) usedLevels.add(Math.round(l).toString()); });
  sr.slice(0, 4).forEach((zone, i) => {
    const key = Math.round(zone.level).toString();
    if (usedLevels.has(key)) return;
    usedLevels.add(key);
    const isSup = zone.type === 'support';
    annotations[`sr_${i}`] = {
      type: 'line',
      yMin: zone.level, yMax: zone.level,
      borderColor: isSup ? 'rgba(0,230,118,0.6)' : 'rgba(255,82,82,0.6)',
      borderWidth: 1, borderDash: [3, 4],
      label: {
        enabled: true,
        content: `${isSup ? 'SUP' : 'RES'} ${Math.round(zone.level).toLocaleString('id-ID')}`,
        position: 'start',
        backgroundColor: isSup ? 'rgba(0,230,118,0.5)' : 'rgba(255,82,82,0.5)',
        color: '#fff', font: { size: 9 }, padding: { x: 3, y: 1 },
      },
    };
  });

  return {
    type: 'bar',
    data: {
      labels,
      datasets: [
        // 1. Wick bars — thin [low, high]
        {
          label: 'Wick',
          data: wickData,
          backgroundColor: wickColors,
          borderColor: wickColors,
          borderWidth: 0,
          barPercentage: 0.2,       // thin wick
          categoryPercentage: 1.0,
          yAxisID: 'y',
          order: 3,
        },
        // 2. Body bars — [open, close]
        {
          label: 'Body',
          data: bodyData,
          backgroundColor: bodyColors,
          borderColor: bodyColors,
          borderWidth: 0,
          barPercentage: 0.65,      // wider body
          categoryPercentage: 1.0,
          yAxisID: 'y',
          order: 2,
        },
        // 3. MA 20
        {
          type: 'line',
          label: 'MA20',
          data: ma20raw,
          borderColor: '#ffd600',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.3,
          yAxisID: 'y',
          order: 1,
          spanGaps: true,
        },
        // 4. MA 50
        {
          type: 'line',
          label: 'MA50',
          data: ma50raw,
          borderColor: '#e040fb',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.3,
          yAxisID: 'y',
          order: 1,
          spanGaps: true,
        },
        // 5. Volume overlay (scaled to bottom 15%)
        {
          type: 'bar',
          label: 'Volume',
          data: scaledVols,
          backgroundColor: volColors,
          borderWidth: 0,
          barPercentage: 0.9,
          categoryPercentage: 1,
          yAxisID: 'y',
          order: 5,
          base: priceMin,
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
            color: '#aaa',
            font: { size: 10 },
            filter: (item: any) => ['MA20', 'MA50'].includes(item.text),
            boxWidth: 14, padding: 8,
          },
        },
        annotation: { annotations },
      },
      scales: {
        x: {
          ticks: {
            color: '#666',
            maxTicksLimit: 10,
            maxRotation: 0,
            font: { size: 9 },
            autoSkip: true,
          },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
        y: {
          min: priceMin,
          max: priceMax,
          position: 'right',
          ticks: {
            color: '#888',
            font: { size: 9 },
            maxTicksLimit: 8,
            callback: (val: number) => {
              if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M';
              if (val >= 1_000)    return (val / 1_000).toFixed(1) + 'K';
              return val.toFixed(0);
            },
          },
          grid: { color: 'rgba(255,255,255,0.06)' },
        },
      },
      layout: {
        padding: { left: 6, right: 90, top: 4, bottom: 6 },
      },
    },
    backgroundColor: '#131722',
  };
}

// ── Generate chart image URL via QuickChart.io ────────────────────────────────
// Using v2 endpoint which supports chartjs-chart-financial (candlestick)
export function buildChartImageUrl(opts: ChartImageOptions): string {
  const config = buildChartConfig(opts);
  const configStr = JSON.stringify(config);
  const encoded   = encodeURIComponent(configStr);
  // QuickChart v2 — supports candlestick, 800x450, dark background
  return `https://quickchart.io/chart?c=${encoded}&w=800&h=450&bkg=%23131722&f=png`;
}

// ── Fetch chart image as buffer via QuickChart POST ───────────────────────────
// POST avoids URL length limits and ensures candlestick plugin is loaded
export async function fetchChartImageBuffer(opts: ChartImageOptions): Promise<Buffer | null> {
  const config = buildChartConfig(opts);

  try {
    const res = await fetch('https://quickchart.io/chart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        width:           800,
        height:          450,
        backgroundColor: '#131722',
        format:          'png',
        chart:           config,
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('QuickChart POST error:', res.status, errText.slice(0, 200));
      return null;
    }

    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch (e: any) {
    console.error('fetchChartImageBuffer error:', e.message);
    return null;
  }
}

// ── Send chart photo to Telegram ─────────────────────────────────────────────
export async function sendChartPhoto(
  chatId: number | string,
  opts: ChartImageOptions,
  caption: string = '',
  botToken: string,
): Promise<void> {
  const TELEGRAM_API = `https://api.telegram.org/bot${botToken}`;

  try {
    // 1. First try POST to QuickChart to get binary image buffer
    const imgBuffer = await fetchChartImageBuffer(opts);

    if (imgBuffer) {
      // Send as multipart/form-data using native FormData (Node 18+ / Edge runtime)
      const form = new FormData();
      const blob = new Blob([new Uint8Array(imgBuffer)], { type: 'image/png' });
      form.append('chat_id',    String(chatId));
      form.append('photo',      blob, 'chart.png');
      form.append('caption',    caption.slice(0, 1024));
      form.append('parse_mode', 'HTML');

      const res = await fetch(`${TELEGRAM_API}/sendPhoto`, {
        method: 'POST',
        body:   form,
        signal: AbortSignal.timeout(30000),
      });

      if (res.ok) return;
      const errText = await res.text();
      console.error('Telegram multipart sendPhoto error:', res.status, errText.slice(0, 200));
    }

    // 2. Fallback: send URL directly (GET-encoded)
    const imageUrl = buildChartImageUrl(opts);
    const res2 = await fetch(`${TELEGRAM_API}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id:    chatId,
        photo:      imageUrl,
        caption:    caption.slice(0, 1024),
        parse_mode: 'HTML',
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res2.ok) {
      const errText = await res2.text();
      console.error('Telegram sendPhoto URL fallback error:', res2.status, errText.slice(0, 200));
    }
  } catch (e: any) {
    console.error('sendChartPhoto exception:', e.message);
  }
}
