const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// First try to install pdf-parse
try {
  execSync('npm install pdf-parse', {
    cwd: path.join(__dirname),
    stdio: 'ignore'
  });
} catch(e) {}

// Now try to use it
try {
  const pdfParse = require('./node_modules/pdf-parse');
  const buf = fs.readFileSync(path.join(__dirname, 'public', 'swingtrade ryan filbert.pdf'));

  pdfParse(buf).then(data => {
    fs.writeFileSync(path.join(__dirname, 'pdf_text.txt'), data.text, 'utf8');
    const out = [
      `PAGES: ${data.numpages}`,
      `LENGTH: ${data.text.length}`,
      '=== TEXT ===',
      data.text.substring(0, 30000)
    ].join('\n');
    fs.writeFileSync(path.join(__dirname, 'pdf_preview.txt'), out, 'utf8');
    console.log('SUCCESS - wrote pdf_text.txt and pdf_preview.txt');
    console.log('Pages:', data.numpages, 'Length:', data.text.length);
  }).catch(e => {
    fs.writeFileSync(path.join(__dirname, 'pdf_err.txt'), 'PARSE_ERR: ' + e.message, 'utf8');
  });
} catch(e) {
  // Fallback: raw binary extraction
  const buf = fs.readFileSync(path.join(__dirname, 'public', 'swingtrade ryan filbert.pdf'));
  const raw = buf.toString('binary');

  // Extract printable ASCII runs of 4+ chars
  let texts = [];
  let cur = '';
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i);
    if (c >= 32 && c <= 126) {
      cur += raw[i];
    } else {
      if (cur.length >= 4) texts.push(cur);
      cur = '';
    }
  }

  const joined = texts.filter(t => /[a-zA-Z]{3,}/.test(t)).join(' ');
  fs.writeFileSync(path.join(__dirname, 'pdf_raw.txt'), joined.substring(0, 50000), 'utf8');
  fs.writeFileSync(path.join(__dirname, 'pdf_err.txt'), 'Module err: ' + e.message + '\nUsed raw fallback', 'utf8');
  console.log('Used raw fallback, wrote pdf_raw.txt');
}

