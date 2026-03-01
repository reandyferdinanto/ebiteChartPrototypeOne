import { writeFileSync, appendFileSync } from 'fs';

const log = (msg) => { appendFileSync('qc-debug.txt', msg + '\n'); };

// Minimal single-line chart test
const cfg = {
  type: 'line',
  data: {
    labels: ['01/01','02/01','03/01','04/01','05/01','06/01','07/01','08/01','09/01','10/01'],
    datasets: [{
      label: 'BBCA',
      data: [5000, 5050, 5020, 5080, 5100, 5060, 5120, 5150, 5130, 5200],
      borderColor: '#00d069',
      borderWidth: 2,
      pointRadius: 0,
      fill: false
    }]
  },
  options: { responsive: false },
  backgroundColor: '#131722'
};

const body = JSON.stringify({ width: 800, height: 400, backgroundColor: '#131722', format: 'png', chart: cfg });
log(`Sending ${body.length} bytes to QuickChart...`);

try {
  const res = await fetch('https://quickchart.io/chart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: AbortSignal.timeout(20000)
  });
  const ct = res.headers.get('content-type') ?? 'none';
  log(`Response: status=${res.status} ct=${ct}`);
  if (res.ok && ct.includes('image')) {
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync('qc-test-ok.png', buf);
    log(`SUCCESS: ${buf.length} bytes saved to qc-test-ok.png`);
  } else {
    const txt = await res.text();
    log(`FAILED: ${txt.slice(0, 500)}`);
  }
} catch(e) {
  log(`EXCEPTION: ${e.message}`);
}

log('Done.');

