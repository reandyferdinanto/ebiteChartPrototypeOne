// Test chart URL length with 50 candles
const labels = [];
const candles = [];
for (let i = 0; i < 50; i++) {
  labels.push(String(i+1).padStart(2,'0') + '/01');
  candles.push({ o: 1000+i*2, h: 1010+i*2, l: 995+i*2, c: 1005+i*2 });
}
const bodyColors = candles.map(c => c.c >= c.o ? 'rgba(0,200,100,1)' : 'rgba(235,60,60,1)');
const wickColors = candles.map(c => c.c >= c.o ? 'rgba(0,200,100,0.5)' : 'rgba(235,60,60,0.5)');
const config = {
  type: 'bar',
  data: {
    labels,
    datasets: [
      { label:'Wick', data: candles.map(c=>[c.l,c.h]), backgroundColor: wickColors, barPercentage: 0.2, cgit add ategoryPercentage: 1.0 },
      { label:'Body', data: candles.map(c=>[Math.min(c.o,c.c), Math.max(c.o,c.c)]), backgroundColor: bodyColors, barPercentage: 0.65, categoryPercentage: 1.0 }
    ]
  },
  options: { scales: { y: { min: 990, max: 1110 } } },
  backgroundColor: '#131722'
};
const encoded = encodeURIComponent(JSON.stringify(config));
const url = 'https://quickchart.io/chart?c=' + encoded + '&w=800&h=450';
console.log('50-candle URL length:', url.length);
console.log('Exceeds 8000 chars?', url.length > 8000);

// Test POST body size
const postBody = JSON.stringify({ width:800, height:450, backgroundColor:'#131722', format:'png', chart: config });
console.log('POST body size:', postBody.length, 'chars');

// Test QuickChart POST
console.log('\nTesting QuickChart POST...');
try {
  const res = await fetch('https://quickchart.io/chart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: postBody,
    signal: AbortSignal.timeout(15000)
  });
  console.log('Status:', res.status, res.headers.get('content-type'));
  if (!res.ok) {
    const text = await res.text();
    console.log('Error body:', text.slice(0, 300));
  } else {
    const buf = await res.arrayBuffer();
    console.log('Image buffer size:', buf.byteLength, 'bytes - SUCCESS!');
  }
} catch(e) {
  console.log('Fetch error:', e.message);
}

