// Test new chart generation with green/red segments
import { writeFileSync } from 'fs';

// Simulate OHLCV data - 60 days
const generateData = () => {
  const data = [];
  let price = 5000;
  const baseTime = Math.floor(Date.now() / 1000) - (60 * 24 * 60 * 60);

  for (let i = 0; i < 60; i++) {
    const change = (Math.random() - 0.48) * 100; // Slight bullish bias
    price = Math.max(4000, price + change);
    const open = price - (Math.random() * 30);
    const high = Math.max(price, open) + Math.random() * 20;
    const low = Math.min(price, open) - Math.random() * 20;

    data.push({
      time: baseTime + (i * 24 * 60 * 60),
      open: Math.round(open),
      high: Math.round(high),
      low: Math.round(low),
      close: Math.round(price),
      volume: Math.floor(Math.random() * 10000000) + 1000000
    });
  }
  return data;
};

// Build chart config manually (matching lib/chart-image.ts logic)
function formatDate(ts) {
  const d = new Date(ts * 1000);
  return `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}`;
}

function calcMA(closes, period) {
  return closes.map((_, i) => {
    if (i < period - 1) return null;
    let s = 0;
    for (let j = i - period + 1; j <= i; j++) s += closes[j];
    return Math.round((s / period) * 10) / 10;
  });
}

function flatLine(label, value, N, color, dash = [], width = 2) {
  return {
    type: 'line',
    label,
    data: new Array(N).fill(value),
    borderColor: color,
    backgroundColor: 'transparent',
    borderWidth: width,
    borderDash: dash,
    pointRadius: 0,
    tension: 0,
    spanGaps: true,
    yAxisID: 'y',
    order: 1,
  };
}

const data = generateData();
const candles = data.slice(-60);
const N = candles.length;

const labels = candles.map(c => formatDate(c.time));
const closes = candles.map(c => c.close);

// Price range
const allPx = candles.flatMap(c => [c.high, c.low]);
const slLevel = closes[N-1] * 0.95;
const tpLevel = closes[N-1] * 1.10;
const entryLevel = closes[N-1];
allPx.push(slLevel, tpLevel, entryLevel);
const pxMin = Math.min(...allPx) * 0.985;
const pxMax = Math.max(...allPx) * 1.015;

// MA
const ma20 = calcMA(closes, 20);
const ma50 = calcMA(closes, 50);

// Build green/red segments
const greenData = new Array(N).fill(null);
const redData = new Array(N).fill(null);

for (let i = 0; i < N; i++) {
  if (i === 0) {
    greenData[i] = closes[i];
  } else {
    const isBullish = closes[i] >= closes[i - 1];
    if (isBullish) {
      greenData[i - 1] = closes[i - 1];
      greenData[i] = closes[i];
    } else {
      redData[i - 1] = closes[i - 1];
      redData[i] = closes[i];
    }
  }
}

const datasets = [];

// MA50
datasets.push({
  type: 'line',
  label: 'MA50',
  data: ma50,
  borderColor: '#666666',
  backgroundColor: 'transparent',
  borderWidth: 1.5,
  pointRadius: 0,
  tension: 0.2,
  spanGaps: true,
  yAxisID: 'y',
  order: 5,
});

// MA20
datasets.push({
  type: 'line',
  label: 'MA20',
  data: ma20,
  borderColor: '#999999',
  backgroundColor: 'transparent',
  borderWidth: 1.2,
  borderDash: [4, 2],
  pointRadius: 0,
  tension: 0.2,
  spanGaps: true,
  yAxisID: 'y',
  order: 5,
});

// SL
datasets.push(flatLine(`⛔ SL ${Math.round(slLevel).toLocaleString('id-ID')}`, slLevel, N, '#ff3333', [6, 3], 2.5));

// TP
datasets.push(flatLine(`🎯 TP ${Math.round(tpLevel).toLocaleString('id-ID')}`, tpLevel, N, '#00ddff', [6, 3], 2.5));

// Entry
datasets.push(flatLine(`➤ Entry ${Math.round(entryLevel).toLocaleString('id-ID')}`, entryLevel, N, '#ffcc00', [], 2.5));

// Green line (naik)
datasets.push({
  type: 'line',
  label: '📈 Naik',
  data: greenData,
  borderColor: '#00dd77',
  backgroundColor: 'transparent',
  borderWidth: 2.5,
  pointRadius: 0,
  tension: 0,
  spanGaps: false,
  yAxisID: 'y',
  order: 2,
});

// Red line (turun)
datasets.push({
  type: 'line',
  label: '📉 Turun',
  data: redData,
  borderColor: '#ff4444',
  backgroundColor: 'transparent',
  borderWidth: 2.5,
  pointRadius: 0,
  tension: 0,
  spanGaps: false,
  yAxisID: 'y',
  order: 2,
});

// Current price marker
const lastClose = closes[N - 1];
const prevClose = closes[N - 2];
const isLastBullish = lastClose >= prevClose;
datasets.push({
  type: 'line',
  label: `Harga ${Math.round(lastClose).toLocaleString('id-ID')}`,
  data: closes.map((_, i) => i === N - 1 ? lastClose : null),
  borderColor: 'transparent',
  backgroundColor: 'transparent',
  borderWidth: 0,
  pointRadius: 8,
  pointBackgroundColor: isLastBullish ? '#00ff88' : '#ff5555',
  pointBorderColor: '#ffffff',
  pointBorderWidth: 2,
  yAxisID: 'y',
  order: 1,
});

const config = {
  type: 'line',
  data: { labels, datasets },
  options: {
    responsive: false,
    animation: false,
    plugins: {
      title: {
        display: true,
        text: 'BBCA — Test Chart',
        color: '#ffffff',
        font: { size: 14, weight: 'bold' },
        padding: { top: 8, bottom: 8 },
      },
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#cccccc',
          font: { size: 9 },
          boxWidth: 14,
          padding: 8,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#888888',
          maxTicksLimit: 8,
          maxRotation: 0,
          autoSkip: true,
          font: { size: 9 },
        },
        grid: { color: 'rgba(255,255,255,0.08)' },
      },
      y: {
        min: pxMin,
        max: pxMax,
        position: 'right',
        ticks: {
          color: '#aaaaaa',
          font: { size: 10 },
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

// Send to QuickChart
const body = JSON.stringify({
  width: 900,
  height: 480,
  backgroundColor: '#1a1a2e',
  format: 'png',
  chart: config,
});

console.log('Sending', body.length, 'bytes to QuickChart...');

try {
  const res = await fetch('https://quickchart.io/chart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: AbortSignal.timeout(25000),
  });

  const ct = res.headers.get('content-type') || '';
  console.log('Response:', res.status, 'Content-Type:', ct);

  const buf = Buffer.from(await res.arrayBuffer());
  console.log('Buffer size:', buf.length, 'bytes');

  // Check if starts with PNG magic bytes
  const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
  console.log('Is PNG:', isPng);

  if (isPng && buf.length > 1000) {
    writeFileSync('test-chart-new.png', buf);
    console.log('SUCCESS: saved to test-chart-new.png');
  } else {
    console.log('FAILED: Not a valid PNG or too small');
    console.log('First 50 bytes:', buf.slice(0, 50).toString('utf8'));
  }
} catch (e) {
  console.log('ERROR:', e.message);
}

