const fs = require('fs');
const path = require('path');

const pdfPath = path.join(__dirname, 'public', 'swingtrade ryan filbert.pdf');
const buf = fs.readFileSync(pdfPath);

// Try to extract readable text from PDF binary
const content = buf.toString('latin1');
const textBlocks = [];

// Extract text between BT (Begin Text) and ET (End Text) markers
const btEtRegex = /BT([\s\S]*?)ET/g;
let match;
while ((match = btEtRegex.exec(content)) !== null) {
  // Extract strings in parentheses (Tj/TJ operators)
  const block = match[1];
  const strRegex = /\(([^)]+)\)/g;
  let sm;
  while ((sm = strRegex.exec(block)) !== null) {
    const t = sm[1].replace(/\\n/g, '\n').replace(/\\r/g, '').trim();
    if (t.length > 2) textBlocks.push(t);
  }
}

// Combine and show
const fullText = textBlocks.join(' ');
console.log('=== PDF TEXT (first 8000 chars) ===');
console.log(fullText.substring(0, 8000));
console.log('\n\n=== TOTAL TEXT LENGTH ===', fullText.length);

