const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const pdfPath = path.join(__dirname, 'public', 'swingtrade ryan filbert.pdf');
const buf = fs.readFileSync(pdfPath);

pdfParse(buf).then(data => {
  const out = data.text.substring(0, 20000);
  fs.writeFileSync(path.join(__dirname, 'pdf_extracted.txt'), data.text, 'utf8');
  console.log('Pages:', data.numpages);
  console.log('Text length:', data.text.length);
  console.log('=== FIRST 15000 chars ===');
  console.log(out);
}).catch(e => {
  console.error('Error:', e.message);
});

