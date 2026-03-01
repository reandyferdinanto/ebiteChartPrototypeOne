// ============================================================================
// EBITE CHART — Chart Image Generator for Telegram
// Uses QuickChart.io to render candlestick charts with MA, S/R, SL/TP
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
  // Subtract WIB offset (+7h) that was added when fetching
  const d = new Date((timestamp - 7 * 3600) * 1000);
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

// ── Build Chart.js config for QuickChart ─────────────────────────────────────
export function buildChartConfig(opts: ChartImageOptions): object {
  const { title, data, slLevel, tpLevel, entryLevel, sr = [] } = opts;

  // Use last 60 candles for clarity
  const candles = data.slice(-60);
  const N = candles.length;

  const labels = candles.map(d => formatDate(d.time));
  const closes = candles.map(d => d.close);
  const opens  = candles.map(d => d.open);
  const highs  = candles.map(d => d.high);
  const lows   = candles.map(d => d.low);
  const vols   = candles.map(d => d.volume ?? 0);

  // Moving averages
  const ma20raw = calcMA(closes, 20);
  const ma50raw = calcMA(closes, 50);
  const ma20 = ma20raw.map(v => v ?? null);
  const ma50 = ma50raw.map(v => v ?? null);

  // Calculate price range for y-axis
  const allPrices = [...highs, ...lows];
  if (slLevel) allPrices.push(slLevel);
  if (tpLevel) allPrices.push(tpLevel);
  if (entryLevel) allPrices.push(entryLevel);
  const priceMin = Math.min(...allPrices) * 0.995;
  const priceMax = Math.max(...allPrices) * 1.005;

  // Build candlestick data as OHLC for financial chart
  // QuickChart supports 'candlestick' chart type via chartjs-chart-financial plugin
  const ohlcData = candles.map((c, i) => ({
    x: i,
    o: c.open,
    h: c.high,
    l: c.low,
    c: c.close,
  }));

  // Annotation lines for SL, TP, Entry, MA levels
  const annotations: any = {};

  if (entryLevel) {
    annotations.entryLine = {
      type: 'line',
      yMin: entryLevel,
      yMax: entryLevel,
      borderColor: '#00b894',
      borderWidth: 2,
      borderDash: [6, 3],
      label: {
        display: true,
        content: `Entry: ${Math.round(entryLevel).toLocaleString('id-ID')}`,
        position: 'end',
        backgroundColor: 'rgba(0,184,148,0.8)',
        color: '#fff',
        font: { size: 11, weight: 'bold' },
      },
    };
  }

  if (slLevel) {
    annotations.slLine = {
      type: 'line',
      yMin: slLevel,
      yMax: slLevel,
      borderColor: '#d63031',
      borderWidth: 2,
      borderDash: [4, 4],
      label: {
        display: true,
        content: `SL: ${Math.round(slLevel).toLocaleString('id-ID')}`,
        position: 'end',
        backgroundColor: 'rgba(214,48,49,0.85)',
        color: '#fff',
        font: { size: 11, weight: 'bold' },
      },
    };
  }

  if (tpLevel) {
    annotations.tpLine = {
      type: 'line',
      yMin: tpLevel,
      yMax: tpLevel,
      borderColor: '#0984e3',
      borderWidth: 2,
      borderDash: [4, 4],
      label: {
        display: true,
        content: `TP: ${Math.round(tpLevel).toLocaleString('id-ID')}`,
        position: 'end',
        backgroundColor: 'rgba(9,132,227,0.85)',
        color: '#fff',
        font: { size: 11, weight: 'bold' },
      },
    };
  }

  // Support / Resistance zones
  sr.slice(0, 4).forEach((zone, i) => {
    const isSupport = zone.type === 'support';
    annotations[`sr_${i}`] = {
      type: 'line',
      yMin: zone.level,
      yMax: zone.level,
      borderColor: isSupport ? 'rgba(0,184,148,0.7)' : 'rgba(214,48,49,0.7)',
      borderWidth: 1,
      borderDash: [3, 3],
      label: {
        display: true,
        content: `${isSupport ? 'SUP' : 'RES'}: ${Math.round(zone.level).toLocaleString('id-ID')}`,
        position: 'start',
        backgroundColor: isSupport ? 'rgba(0,184,148,0.6)' : 'rgba(214,48,49,0.6)',
        color: '#fff',
        font: { size: 9 },
      },
    };
  });

  // We use a line chart for price (OHLC approximate via close) since QuickChart
  // financial charts need specific setup. Let's use a mixed line + bar approach
  // for clear visualization on Telegram.

  // Color each candle close bar
  const candleColors = candles.map(c => c.close >= c.open ? 'rgba(0,184,148,0.85)' : 'rgba(214,48,49,0.85)');
  const candleBorders = candles.map(c => c.close >= c.open ? '#00b894' : '#d63031');

  // Volume colors
  const volColors = candles.map(c => c.close >= c.open ? 'rgba(0,184,148,0.3)' : 'rgba(214,48,49,0.3)');

  const maxVol = Math.max(...vols);
  // Scale volume to fit on chart (10% of price range)
  const priceRange = priceMax - priceMin;
  const volScale = (priceRange * 0.15) / (maxVol || 1);
  const scaledVols = vols.map(v => priceMin + v * volScale);

  return {
    type: 'bar',
    data: {
      labels,
      datasets: [
        // High-Low wicks (line)
        {
          type: 'line',
          label: 'High',
          data: highs,
          borderColor: 'rgba(120,120,120,0.6)',
          backgroundColor: 'transparent',
          borderWidth: 1,
          pointRadius: 0,
          tension: 0,
          yAxisID: 'y',
          order: 5,
        },
        {
          type: 'line',
          label: 'Low',
          data: lows,
          borderColor: 'rgba(120,120,120,0.6)',
          backgroundColor: 'transparent',
          borderWidth: 1,
          pointRadius: 0,
          tension: 0,
          yAxisID: 'y',
          order: 5,
        },
        // Close price bars (simulate candle body)
        {
          type: 'bar',
          label: 'Candle',
          data: closes,
          backgroundColor: candleColors,
          borderColor: candleBorders,
          borderWidth: 1,
          barPercentage: 0.6,
          yAxisID: 'y',
          order: 3,
          base: opens,
        },
        // MA 20
        {
          type: 'line',
          label: 'MA20',
          data: ma20,
          borderColor: '#f39c12',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          yAxisID: 'y',
          order: 2,
          spanGaps: true,
        },
        // MA 50
        {
          type: 'line',
          label: 'MA50',
          data: ma50,
          borderColor: '#9b59b6',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          yAxisID: 'y',
          order: 2,
          spanGaps: true,
        },
        // Volume (scaled to bottom 15% of chart)
        {
          type: 'bar',
          label: 'Volume',
          data: scaledVols,
          backgroundColor: volColors,
          borderWidth: 0,
          barPercentage: 0.8,
          yAxisID: 'y',
          order: 10,
          base: priceMin,
        },
      ],
    },
    options: {
      responsive: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        title: {
          display: true,
          text: title,
          color: '#e0e0e0',
          font: { size: 16, weight: 'bold' },
          padding: { bottom: 8 },
        },
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#a0a0a0',
            font: { size: 11 },
            filter: (item: any) => ['MA20', 'MA50'].includes(item.text),
            boxWidth: 20,
          },
        },
        annotation: {
          annotations,
        },
      },
      scales: {
        x: {
          ticks: {
            color: '#888',
            maxTicksLimit: 10,
            maxRotation: 0,
            font: { size: 10 },
          },
          grid: { color: 'rgba(255,255,255,0.05)' },
        },
        y: {
          min: priceMin,
          max: priceMax,
          position: 'right',
          ticks: {
            color: '#888',
            font: { size: 10 },
            callback: (val: number) => {
              if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
              return val.toFixed(0);
            },
          },
          grid: { color: 'rgba(255,255,255,0.07)' },
        },
      },
      layout: { padding: { left: 10, right: 80, top: 10, bottom: 10 } },
    },
    backgroundColor: '#1a1a2e',
  };
}

// ── Generate chart image URL via QuickChart.io ────────────────────────────────
export function buildChartImageUrl(opts: ChartImageOptions): string {
  const config = buildChartConfig(opts);
  const configStr = JSON.stringify(config);
  const encoded = encodeURIComponent(configStr);
  // QuickChart.io free API — 800x400 px
  return `https://quickchart.io/chart?c=${encoded}&w=800&h=450&bkg=%231a1a2e&f=png&v=4`;
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
    const imageUrl = buildChartImageUrl(opts);

    const res = await fetch(`${TELEGRAM_API}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: imageUrl,
        caption: caption.slice(0, 1024),
        parse_mode: 'HTML',
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Telegram sendPhoto error:', res.status, errText);

      // Fallback: try sending as document (sometimes works for large images)
      await fetch(`${TELEGRAM_API}/sendDocument`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          document: imageUrl,
          caption: caption.slice(0, 1024),
          parse_mode: 'HTML',
        }),
        signal: AbortSignal.timeout(20000),
      });
    }
  } catch (e: any) {
    console.error('sendChartPhoto exception:', e.message);
  }
}

