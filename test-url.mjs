import { writeFileSync } from 'fs';

const results = {};

/
/ QuickChart candlestick — data must use {x: timestamp or string label, o, h, l, c}
// But for older chartjs-chart-financial, data is arrays [o,h,l,c] with labels
const N = 20;
const labels = [];
const ohlcData = [];

for (let i = 0; i < N; i++) {
  const day = String(i + 1).padStart(2, '0');
  labels.push(`${day}/01`);
  const o = 5000 + i * 10;
  const c = i % 3 === 0 ? o - 20 : o + 20;
  const h = Math.max(o, c) + 30;
  const l = Math.min(o, c) - 25;
  ohlcData.push({ x: `${day}/01`, o, h, l, c });
}

const pxMin = 4960, pxMax = 5310;

// Test 1: candlestick with {x,o,h,l,c} objects
const config1 = {
  type: 'candlestick',
  data: {
    datasets: [{
      label: 'BBCA',
      data: ohlcData,
    }]
  },
  options: {
    responsive: false,
    scales: {
      y: { min: pxMin, max: pxMax }
    }
  }
};

// Test 2: bar chart with floating bars (the reliable approach)
const config2 = {
  type: 'bar',
  data: {
    labels,
    datasets: [
      // Wicks (thin, full range)
      {
        label: 'Wick',
        data: ohlcData.map(d => [d.l, d.h]),
        backgroundColor: ohlcData.map(d => d.c >= d.o ? 'rgba(0,200,100,0.7)' : 'rgba(235,60,60,0.7)'),
        borderWidth: 0,
        barPercentage: 0.12,
        categoryPercentage: 1.0,
        order: 2,
      },
      // Bodies
      {
        label: 'Body',
        data: ohlcData.map(d => [Math.min(d.o, d.c), Math.max(d.o, d.c)]),
        backgroundColor: ohlcData.map(d => d.c >= d.o ? 'rgba(0,200,100,1)' : 'rgba(235,60,60,1)'),
        borderWidth: 0,
        barPercentage: 0.6,
        categoryPercentage: 1.0,
        order: 1,
      },
    ]
  },
  options: {
    responsive: false,
    plugins: { title: { display: true, text: 'BBCA - Float Bar Test', color: '#e8e8e8' }, legend: { display: false } },
    scales: {
      x: { ticks: { color: '#777', maxTicksLimit: 10, maxRotation: 0, font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
      y: { min: pxMin, max: pxMax, position: 'right', ticks: { color: '#888', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
    },
  },
  backgroundColor: '#131722',
};

async function testConfig(name, config) {
  const postBody = JSON.stringify({ width: 800, height: 500, backgroundColor: '#131722', format: 'png', chart: config });
  try {
    const res = await fetch('https://quickchart.io/chart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: postBody,
      signal: AbortSignal.timeout(15000)
    });
    const ct = res.headers.get('content-type') ?? '';
    if (res.ok && ct.includes('image')) {
      const buf = await res.arrayBuffer();
      return { status: res.status, success: true, bytes: buf.byteLength };
    } else {
      const text = await res.text();
      return { status: res.status, success: false, error: text.slice(0, 200) };
    }
  } catch(e) {
    return { success: false, error: e.message };
  }
}

results.candlestickType = await testConfig('candlestick', config1);
results.floatBarType = await testConfig('floatBar', config2);

writeFileSync('test-result.json', JSON.stringify(results, null, 2));
console.log('Done:', JSON.stringify(results, null, 2));
