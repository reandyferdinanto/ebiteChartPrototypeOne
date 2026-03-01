import { writeFileSync } from 'fs';

// Test 1: dead-simple single line chart
const N = 15;
const labels = Array.from({ length: N }, (_, i) => `${String(i + 1).padStart(2, '0')}/01`);
const closes  = Array.from({ length: N }, (_, i) => 5000 + i * 15 + (i % 3 === 0 ? -30 : 0));

const cfg1 = {
  type: 'line',
  data: {
    labels,
    datasets: [{ label: 'Price', data: closes, borderColor: '#00d069', borderWidth: 2, pointRadius: 0, fill: false }]
  },
  options: { responsive: false, scales: { y: { position: 'right' } } },
  backgroundColor: '#131722'
};

// Test 2: multi-segment colored line (our approach)
const segs = [];
for (let i = 1; i < N; i++) {
  const isUp  = closes[i] >= closes[i - 1];
  const color = isUp ? '#00d069' : '#eb3c3c';
  const d     = new Array(N).fill(null);
  d[i - 1]    = closes[i - 1];
  d[i]        = closes[i];
  segs.push({ type: 'line', label: `_s${i}`, data: d, borderColor: color, borderWidth: 2, pointRadius: 0, tension: 0, spanGaps: false });
}
// MA20
const ma20 = closes.map((_, i) => {
  if (i < 19) return null;
  return closes.slice(i - 19, i + 1).reduce((a, b) => a + b, 0) / 20;
});

const cfg2 = {
  type: 'bar',
  data: {
    labels,
    datasets: [
      { type: 'bar', label: 'Vol', data: closes.map((_, i) => 100000 + i * 5000), backgroundColor: 'rgba(0,184,148,0.2)', yAxisID: 'y1', order: 20 },
      { type: 'line', label: 'MA20', data: ma20, borderColor: 'rgba(200,200,200,0.6)', borderWidth: 1.5, borderDash: [4, 3], pointRadius: 0, spanGaps: true, yAxisID: 'y', order: 3 },
      ...segs,
    ]
  },
  options: {
    responsive: false,
    animation: false,
    plugins: {
      title: { display: true, text: 'BBCA Test Chart', color: '#e8e8e8', font: { size: 13 } },
      legend: { display: false },
    },
    scales: {
      x: { ticks: { color: '#666', font: { size: 8 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
      y: { min: 4800, max: 5300, position: 'right', ticks: { color: '#999', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.06)' } },
      y1: { min: 0, max: 800000, position: 'left', ticks: { color: '#444', font: { size: 7 }, maxTicksLimit: 3 }, grid: { drawOnChartArea: false } },
    },
    layout: { padding: { right: 50 } }
  },
  backgroundColor: '#131722'
};

async function test(name, config) {
  const body = JSON.stringify({ width: 900, height: 520, backgroundColor: '#131722', format: 'png', chart: config });
  console.log(`[${name}] Sending ${body.length} bytes...`);
  const res = await fetch('https://quickchart.io/chart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: AbortSignal.timeout(20000)
  });
  const ct = res.headers.get('content-type') ?? '';
  if (res.ok && ct.includes('image')) {
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(`test-${name}.png`, buf);
    console.log(`[${name}] OK — ${buf.length} bytes → test-${name}.png`);
    return true;
  }
  const txt = await res.text();
  console.log(`[${name}] FAIL ${res.status}: ${txt.slice(0, 300)}`);
  return false;
}

await test('simple', cfg1);
await test('multiseg', cfg2);

