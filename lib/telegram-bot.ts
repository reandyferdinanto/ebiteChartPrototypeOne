// ============================================================================
// EBITE CHART — TELEGRAM BOT SERVICE
// Commands (Bahasa Indonesia):
//   /analisa [saham] — Analisis lengkap 3-in-1 (RF + Candle Power + VSA)
//   /besok   [saham] — Prediksi candle besok (Candle Power)
//   /cek     [saham] — Analisis mendalam VCP + Wyckoff + VSA
//   /rf      [saham] — Analisis gaya Ryan Filbert (swing trade)
//   /mulai          — Panduan & daftar perintah
//   /bantuan        — Sama dengan /mulai
// ============================================================================

import {
  calculateAllIndicators,
  ChartData,
} from './indicators';
import { sendChartPhoto } from './chart-image';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8605664472:AAGUfoi3Toe89UaJMFAfEL9afE7lp6H6e6s';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ── Deduplication: prevent processing same update_id twice (Telegram retries) ──
const processedUpdates = new Set<number>();
export function isAlreadyProcessed(updateId: number): boolean {
  if (processedUpdates.has(updateId)) return true;
  processedUpdates.add(updateId);
  if (processedUpdates.size > 500) {
    const first = processedUpdates.values().next().value;
    if (first !== undefined) processedUpdates.delete(first);
  }
  return false;
}

// ── Fetch OHLCV directly from Yahoo Finance v8 chart API ──────────────────
// Using raw HTTP — no library dependency, no self-call (avoids Vercel circular issues)
async function fetchOHLCV(symbol: string, interval: string = '1d', days: number = 400): Promise<ChartData[]> {
  try {
    // Map interval to Yahoo Finance range
    let range = '2y';
    if (interval === '5m')  range = '5d';
    else if (interval === '15m') range = '10d';
    else if (interval === '1h')  range = '60d';
    else if (interval === '1d')  {
      // Use period1/period2 for more control
      range = '2y';
    }

    const period1 = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000);
    const period2 = Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000);

    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&period1=${period1}&period2=${period2}&includePrePost=false&events=div%2Csplits`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      // Retry with query1
      const url2 = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&period1=${period1}&period2=${period2}&includePrePost=false`;
      const res2 = await fetch(url2, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(20000),
      });
      if (!res2.ok) {
        console.error('Yahoo Finance HTTP error:', res.status, symbol);
        return [];
      }
      return parseYahooResponse(await res2.json());
    }

    return parseYahooResponse(await res.json());
  } catch (err: any) {
    console.error('Telegram fetchOHLCV error:', symbol, err.message);
    return [];
  }
}

function parseYahooResponse(json: any): ChartData[] {
  try {
    if (!json?.chart?.result?.[0]) return [];
    const result = json.chart.result[0];
    const timestamps: number[] = result.timestamp ?? [];
    const quote = result.indicators?.quote?.[0];
    if (!quote || !timestamps.length) return [];

    const data: ChartData[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const close = quote.close?.[i];
      const open  = quote.open?.[i];
      const high  = quote.high?.[i];
      const low   = quote.low?.[i];
      const vol   = quote.volume?.[i];
      if (close == null || close === 0) continue;
      // Add WIB offset (+7h) to match app chart
      data.push({
        time: timestamps[i] + 7 * 3600,
        open:   open  ?? close,
        high:   high  ?? close,
        low:    low   ?? close,
        close,
        volume: vol   ?? 0,
      });
    }
    return data;
  } catch {
    return [];
  }
}

// ── Normalize symbol ───────────────────────────────────────────────────────
function normalizeSymbol(input: string): string {
  let s = input.toUpperCase().replace(/^IDX[:\s]/, '').trim();
  if (s === 'IHSG') return '^JKSE';
  if (!s.endsWith('.JK') && !s.startsWith('^')) s += '.JK';
  return s;
}

function displaySymbol(symbol: string): string {
  return symbol.replace('.JK', '').replace('^JKSE', 'IHSG');
}

// ── Format currency ────────────────────────────────────────────────────────
function fmtRp(val: number): string {
  return 'Rp\u00A0' + Math.round(val).toLocaleString('id-ID');
}

// ── Bar chart helper ────────────────────────────────────────────────────────
function asciiBar(score: number, max: number = 100, len: number = 8): string {
  const filled = Math.round((score / max) * len);
  return '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, len - filled));
}

// ── Send message helper ────────────────────────────────────────────────────
export async function sendTelegramMessage(chatId: number | string, text: string, parseMode: 'HTML' | 'Markdown' = 'HTML'): Promise<void> {
  // Telegram max message length is 4096 characters
  const MAX_LEN = 4000;
  const msgToSend = text.length > MAX_LEN ? text.slice(0, MAX_LEN) + '\n\n<i>[Pesan dipotong]</i>' : text;

  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: msgToSend,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('Telegram sendMessage error:', res.status, errText);
      // If HTML parse error, retry as plain text
      if (res.status === 400 && errText.includes('parse')) {
        await fetch(`${TELEGRAM_API}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: msgToSend.replace(/<[^>]+>/g, ''), disable_web_page_preview: true }),
          signal: AbortSignal.timeout(10000),
        });
      }
    }
  } catch (e: any) {
    console.error('Telegram sendMessage exception:', e.message);
  }
}

// ── /start handler ─────────────────────────────────────────────────────────
export function buildStartMessage(): string {
  return `<b>🤖 Ebite Chart — Asisten Analisa Saham Indonesia</b>

Halo! Saya membantu menganalisis saham IDX secara otomatis menggunakan metode Wyckoff, VSA, VCP, dan Ryan Filbert.

<b>📋 Daftar Perintah:</b>

<code>/analisa BBCA</code>
→ <i>✨ Analisis <b>LENGKAP</b> — gabungan Ryan Filbert + Candle Power + VSA</i>
→ <i>Cocok untuk pemula maupun trader berpengalaman</i>

<code>/besok TLKM</code>
→ <i>🕯️ Prediksi candle <b>BESOK</b> — apakah akan naik, turun, atau sideways?</i>
→ <i>Menggunakan Candle Power (CPP + 8 indikator konfluens)</i>

<code>/cek ASII</code>
→ <i>🔬 Analisis <b>MENDALAM</b> — Wyckoff, VCP, VSA, support &amp; resistance</i>
→ <i>Cocok untuk swing trader yang ingin detail pergerakan harga</i>

<code>/rf BMRI</code>
→ <i>📊 Analisis <b>Ryan Filbert</b> — untuk swing trade 1–4 minggu</i>
→ <i>Cek Fase Weinstein, volume kering, pivot entry, dan setup breakout</i>

<code>/bantuan</code> — Tampilkan panduan ini lagi

<b>💡 Cara pakai:</b>
• Ketik kode saham <b>tanpa</b> ".JK" — contoh: <code>BBCA</code>, <code>BMRI</code>, <code>TLKM</code>
• Untuk IHSG: ketik <code>/analisa IHSG</code>

<b>🔑 Pilih perintah yang tepat:</b>
• Mau tahu <i>besok naik atau turun?</i> → gunakan <code>/besok</code>
• Mau tahu <i>saham layak beli atau tidak?</i> → gunakan <code>/rf</code>
• Mau <i>semua analisis sekaligus?</i> → gunakan <code>/analisa</code>
• Mau <i>detail teknikal lengkap?</i> → gunakan <code>/cek</code>

<i>⚠️ Semua analisis bersifat teknikal, bukan rekomendasi investasi. Selalu gunakan stop loss.</i>`;
}

// ── Helper: Smart Money / Accumulation / Distribution detector ───────────────
function detectSmartMoney(data: ChartData[]): {
  status: 'ACCUMULATION' | 'DISTRIBUTION' | 'MARKUP' | 'MARKDOWN' | 'NEUTRAL';
  detail: string;
  waitArea: string | null;
  emoji: string;
} {
  const N = data.length;
  if (N < 30) return { status: 'NEUTRAL', detail: 'Data tidak cukup', waitArea: null, emoji: '⬜' };

  // Last 10 bars analysis
  let buyVol = 0, sellVol = 0, totalVol = 0;
  for (let i = N - 10; i < N; i++) {
    const v = data[i].volume ?? 0;
    totalVol += v;
    if (data[i].close > data[i].open) buyVol += v;
    else if (data[i].close < data[i].open) sellVol += v;
  }
  const accRatio = buyVol / (sellVol || 1);

  // Volume average
  let volSum = 0;
  for (let i = N - 20; i < N; i++) volSum += (data[i].volume ?? 0);
  const volAvg = volSum / 20;

  // Recent price action
  const recent10High = Math.max(...data.slice(-10).map(d => d.high));
  const recent10Low  = Math.min(...data.slice(-10).map(d => d.low));
  const priceRange10 = recent10High - recent10Low;
  const lastClose    = data[N - 1].close;
  const prevClose    = data[N - 10].close;
  const priceChg10   = (lastClose - prevClose) / prevClose;

  // MA20
  let ma20Sum = 0;
  for (let i = N - 20; i < N; i++) ma20Sum += data[i].close;
  const ma20 = ma20Sum / 20;

  // Spread of last 5 candles vs avg
  let spread5 = 0;
  for (let i = N - 5; i < N; i++) spread5 += (data[i].high - data[i].low);
  const spreadAvg5 = spread5 / 5;
  let spreadAvg20Sum = 0;
  for (let i = N - 20; i < N; i++) spreadAvg20Sum += (data[i].high - data[i].low);
  const spreadAvg20 = spreadAvg20Sum / 20;

  // Smart money indicators
  const isNarrowSpread = spreadAvg5 < spreadAvg20 * 0.65;
  const isLowVol5 = (data.slice(-5).reduce((s, d) => s + (d.volume ?? 0), 0) / 5) < volAvg * 0.75;
  const isHigherClose = lastClose > prevClose;
  const isAboveMA20 = lastClose > ma20;

  // Check for absorption: high vol + narrow range + close middle/upper
  let absorptionCount = 0;
  for (let i = N - 5; i < N; i++) {
    const spread = data[i].high - data[i].low;
    const volR = (data[i].volume ?? 0) / (volAvg || 1);
    const closePos = spread > 0 ? (data[i].close - data[i].low) / spread : 0.5;
    if (volR > 1.3 && spread < spreadAvg20 * 0.8 && closePos > 0.4) absorptionCount++;
  }

  let status: 'ACCUMULATION' | 'DISTRIBUTION' | 'MARKUP' | 'MARKDOWN' | 'NEUTRAL' = 'NEUTRAL';
  let detail = '';
  let waitArea: string | null = null;
  let emoji = '⬜';

  if (priceChg10 > 0.03 && accRatio > 1.3 && isAboveMA20) {
    status = 'MARKUP';
    emoji = '🚀';
    detail = `Fase MARKUP aktif. Harga naik ${(priceChg10 * 100).toFixed(1)}% dalam 10 hari dengan volume beli dominan (rasio beli/jual = ${accRatio.toFixed(1)}x). Uang besar sedang menaikkan harga.`;
  } else if (priceChg10 < -0.03 && accRatio < 0.7) {
    status = 'MARKDOWN';
    emoji = '📉';
    detail = `Fase MARKDOWN — tekanan jual dominan (rasio beli/jual = ${accRatio.toFixed(1)}x). Harga turun ${Math.abs(priceChg10 * 100).toFixed(1)}% dalam 10 hari. Smart money menjual.`;
    // Wait area: support zone
    waitArea = `Area tunggu jika ingin beli: ${fmtRp(recent10Low)} - ${fmtRp(recent10Low * 1.02)} (dekat low 10 hari)`;
  } else if (isNarrowSpread && isLowVol5 && accRatio > 1.1 && isAboveMA20) {
    status = 'ACCUMULATION';
    emoji = '🏦';
    detail = `Pola AKUMULASI DIAM-DIAM terdeteksi — spread menyempit (${(spreadAvg5 / spreadAvg20 * 100).toFixed(0)}% dari normal), volume mengering, namun rasio beli/jual ${accRatio.toFixed(1)}x mengindikasikan smart money mengumpulkan posisi.`;
    waitArea = `Area tunggu ideal: ${fmtRp(ma20 * 0.98)} - ${fmtRp(ma20)} (dekat MA20 = support terkuat)`;
  } else if (absorptionCount >= 2 && isAboveMA20) {
    status = 'ACCUMULATION';
    emoji = '🧲';
    detail = `PENYERAPAN (Absorption) terdeteksi — ${absorptionCount} candle menunjukkan volume besar tapi range sempit. Ini ciri khas institusi menyerap tekanan jual tanpa membiarkan harga turun banyak.`;
    waitArea = `Area ideal masuk: ${fmtRp(recent10Low)} - ${fmtRp(recent10Low * 1.015)}`;
  } else if (!isAboveMA20 && priceChg10 < 0 && accRatio < 0.8) {
    status = 'DISTRIBUTION';
    emoji = '⚠️';
    detail = `Sinyal DISTRIBUSI — harga di bawah MA20, tekanan jual lebih besar (rasio ${accRatio.toFixed(1)}x). Kemungkinan smart money sedang melepas posisi ke publik.`;
    waitArea = `Jika ingin beli, tunggu harga stabil di atas MA20 (${fmtRp(ma20)}) terlebih dahulu.`;
  } else if (isNarrowSpread && isHigherClose && !isLowVol5) {
    status = 'ACCUMULATION';
    emoji = '🔍';
    detail = `Konsolidasi wajar di atas MA20. Spread mengecil namun volume belum terlalu rendah. Belum ada sinyal kuat, tapi posisi aman untuk hold.`;
  } else {
    status = 'NEUTRAL';
    emoji = '⬜';
    detail = `Belum ada pola smart money yang jelas. Pasar sedang transisi atau tidak ada aktivitas institusional signifikan.`;
  }

  return { status, detail, waitArea, emoji };
}

// ── /analisa [ticker] — Analisis Lengkap 3-in-1 ───────────────────────────
export async function handleAnalisaCommand(ticker: string, chatId: number | string): Promise<void> {
  const symbol = normalizeSymbol(ticker);
  const display = displaySymbol(symbol);

  await sendTelegramMessage(chatId, `⏳ Sedang menganalisis <b>${display}</b> secara lengkap... Mohon tunggu sebentar.`);

  const data = await fetchOHLCV(symbol, '1d', 500);
  if (data.length < 50) {
    await sendTelegramMessage(chatId, `❌ Kode saham <b>${display}</b> tidak ditemukan atau data tidak cukup.\nPastikan kode benar, contoh: <code>/analisa BBCA</code>`);
    return;
  }

  const indicators = calculateAllIndicators(data);
  const rf  = indicators.ryanFilbert;
  const cp  = indicators.candlePower;
  const p4  = indicators.predictaV4;
  const { cppScore, cppBias, wyckoffPhase, bandar: vsaSignal } = indicators.signals;
  const sm  = detectSmartMoney(data);

  const price  = data[data.length - 1].close;
  const prev   = data[data.length - 2]?.close ?? price;
  const chgPct = ((price - prev) / prev * 100);
  const chgStr = (chgPct >= 0 ? '+' : '') + chgPct.toFixed(2) + '%';
  const chgEmoji = chgPct >= 1 ? '🟢' : chgPct <= -1 ? '🔴' : '🟡';

  // ── Bagian 1: Ryan Filbert ringkas ──────────────────────────────────────
  const chk = (v: boolean) => v ? '✅' : '❌';
  let rfStr = '❓ Data Ryan Filbert tidak tersedia';
  let rfSignalEmoji = '⬜';
  let rfConclusion = '';
  if (rf) {
    const phEmoji = rf.phase === 2 ? '🚀' : rf.phase === 1 ? '🏗️' : rf.phase === 3 ? '⚠️' : '📉';
    const qEmoji  = rf.setupQuality === 'PERFECT' ? '✨' : rf.setupQuality === 'GOOD' ? '👍' : rf.setupQuality === 'FAIR' ? '⚡' : '⛔';
    rfSignalEmoji = rf.signal === 'BUY' ? '🟢' : rf.signal === 'WAIT' ? '🟡' : '🔴';

    rfStr = `${phEmoji} Fase ${rf.phase} — ${rf.phaseLabel} | ${qEmoji} Setup: <b>${rf.setupQuality}</b> (${rf.score}/100)
${chk(rf.aboveMA150)} MA150  ${chk(rf.aboveMA200)} MA200  ${chk(rf.ma50Rising)} MA50↑  ${chk(rf.baseVolumeDryUp)} Vol Kering
Entry: <b>${fmtRp(rf.pivotEntry)}</b> | SL: ${fmtRp(rf.stopLoss)} | TP: ${fmtRp(rf.targetPrice)} | R:R <b>${rf.riskReward}x</b>`;

    if (rf.signal === 'BUY' && rf.setupQuality === 'PERFECT') {
      rfConclusion = `✅ <b>Layak beli!</b> Semua kriteria Ryan Filbert terpenuhi.`;
    } else if (rf.signal === 'BUY' && rf.setupQuality === 'GOOD') {
      rfConclusion = `👍 <b>Hampir siap.</b> Setup bagus, tunggu konfirmasi breakout di ${fmtRp(rf.pivotEntry)}.`;
    } else if (rf.signal === 'WAIT') {
      rfConclusion = `⏳ <b>Belum saatnya.</b> Pantau di watchlist, ${rf.baseVolumeDryUp ? 'tunggu breakout' : 'volume belum kering'}.`;
    } else {
      rfConclusion = `🚫 <b>Hindari dulu.</b> ${rf.phaseDesc}`;
    }
  }

  // ── Bagian 2: Candle Power ringkas ──────────────────────────────────────
  const powerNum = parseInt(indicators.candlePowerAnalysis.match(/Power: (\d+)/)?.[1] ?? '50');
  const powerEmoji = powerNum >= 80 ? '🟢' : powerNum >= 60 ? '🟡' : powerNum >= 40 ? '🟠' : '🔴';
  const biasEmoji  = cppBias === 'BULLISH' ? '📈' : cppBias === 'BEARISH' ? '📉' : '➡️';
  const qKey = cp?.nextCandleQuality ?? 'NEUTRAL';
  const qLabels: Record<string, string> = {
    'STRONG_SUSTAINED':  'Naik kuat & bertahan (body besar hijau)',
    'MODERATE_SUSTAINED':'Naik bertahan (body sedang)',
    'WEAK_FLASH':        'Naik sesaat, ekor panjang (wick)',
    'REVERSAL_UP':       'Hammer/reversal — potensi balik naik',
    'BEARISH_SUSTAINED': 'Turun berlanjut (body besar merah)',
    'BEARISH_FLASH':     'Turun sesaat, body kecil',
    'DISTRIBUTION_TRAP': 'Jebakan naik — ekor atas panjang (upper wick)',
    'NEUTRAL':           'Flat / konsolidasi',
  };
  const nextCandleLabel = cp ? qLabels[qKey] ?? '—' : '—';

  // Predicta V4 ringkas
  let p4Str = '';
  if (p4) {
    const p4Status = p4.longPerfect  ? '⚡ PERFECT BELI' :
                     p4.shortPerfect ? '⚡ PERFECT JUAL' :
                     p4.verdict === 'STRONG_BULL' ? '🟢 Kuat Naik' :
                     p4.verdict === 'BULL'        ? '🟢 Bullish' :
                     p4.verdict === 'BEAR'        ? '🔴 Bearish' :
                     p4.verdict === 'STRONG_BEAR' ? '🔴 Kuat Turun' : '⬜ Netral';
    p4Str = `\n${p4Status} — Peluang naik ${p4.longPct}% | turun ${p4.shortPct}% | ${p4.confluenceLong}/8 indikator bullish`;
  }

  // ── Bagian 3: Kesimpulan akhir ───────────────────────────────────────────
  const rfBull = rf && (rf.signal === 'BUY' || rf.setupQuality === 'PERFECT' || rf.setupQuality === 'GOOD');
  const rfBear = rf && rf.signal === 'AVOID';
  const cpBull = cppBias === 'BULLISH' && powerNum >= 60;
  const cpBear = cppBias === 'BEARISH' && powerNum <= 40;
  const smBull = sm.status === 'ACCUMULATION' || sm.status === 'MARKUP';
  const smBear = sm.status === 'DISTRIBUTION' || sm.status === 'MARKDOWN';

  const bullCount = (rfBull ? 1 : 0) + (cpBull ? 1 : 0) + (smBull ? 1 : 0);
  const bearCount = (rfBear ? 1 : 0) + (cpBear ? 1 : 0) + (smBear ? 1 : 0);

  let finalEmoji = '⬜', finalAction = '', finalTeknikal = '', finalPlain = '';

  if (bullCount >= 2 && bearCount === 0) {
    finalEmoji     = '🟢';
    finalAction    = 'PERTIMBANGKAN BELI / HOLD';
    finalTeknikal  = `${bullCount}/3 sistem selaras bullish: ${smBull ? sm.status : ''} ${rfBull ? '+ RF Setup Bagus' : ''} ${cpBull ? `+ CP Power ${powerNum}` : ''}.`;
    finalPlain     = `Saham ini menunjukkan tanda-tanda positif dari berbagai sisi. Jika belum punya, ini bisa jadi waktu yang tepat untuk mulai masuk — tapi tetap gunakan stop loss! Candle besok diprediksi: <b>${nextCandleLabel}</b>.`;
  } else if (bullCount >= 2 && bearCount === 1) {
    finalEmoji     = '🟡';
    finalAction    = 'SELEKTIF — MASUK HANYA DENGAN KONFIRMASI';
    finalTeknikal  = `Mayoritas sinyal bullish (${bullCount}/3) tapi ada sinyal berlawanan.`;
    finalPlain     = `Situasinya tidak 100% ideal — ada sinyal yang belum selaras. Aman masuk kecil dulu dan tambah posisi jika volume naik konfirmasi.`;
  } else if (bearCount >= 2 && bullCount === 0) {
    finalEmoji     = '🔴';
    finalAction    = 'HINDARI / KURANGI POSISI';
    finalTeknikal  = `${bearCount}/3 sistem selaras bearish: ${smBear ? sm.status : ''} ${rfBear ? '+ RF AVOID' : ''} ${cpBear ? `+ CP Power lemah (${powerNum})` : ''}.`;
    finalPlain     = `Kondisi saham ini kurang sehat saat ini. Jika kamu sudah punya, pertimbangkan untuk pasang stop loss ketat atau kurangi posisi. Lebih baik hindari beli baru sampai ada sinyal pemulihan.`;
  } else if (sm.status === 'DISTRIBUTION') {
    finalEmoji     = '🟠';
    finalAction    = 'WASPADA DISTRIBUSI';
    finalTeknikal  = `Smart money menunjukkan pola distribusi. Volume jual dominan meski harga belum turun besar.`;
    finalPlain     = `Hati-hati! Ada indikasi uang besar sedang menjual pelan-pelan. Harga bisa terlihat normal sekarang tapi berisiko turun lebih lanjut. Jangan tambah posisi, pantau ketat.`;
  } else {
    finalEmoji     = '⬜';
    finalAction    = 'NETRAL / PANTAU';
    finalTeknikal  = `Sinyal campuran atau belum ada pola yang dominan.`;
    finalPlain     = `Belum ada sinyal kuat ke arah mana pun. Simpan di watchlist dan tunggu konfirmasi lebih jelas sebelum ambil keputusan.`;
  }

  const msg = `<b>🧠 ANALISIS LENGKAP — ${display}</b>
${chgEmoji} Harga: <b>${fmtRp(price)}</b> <i>(${chgStr} hari ini)</i>

━━━━━━━━━━━━━━━━━━━━
<b>📊 1. RYAN FILBERT (Swing Trade)</b>
━━━━━━━━━━━━━━━━━━━━
${rfSignalEmoji} ${rfStr}
${rfConclusion}

━━━━━━━━━━━━━━━━━━━━
<b>🕯️ 2. PREDIKSI CANDLE BESOK</b>
━━━━━━━━━━━━━━━━━━━━
${powerEmoji} Candle Power: <b>${powerNum}/100</b> | ${biasEmoji} CPP: <b>${cppScore > 0 ? '+' : ''}${cppScore}</b>
Prediksi besok: <b>${nextCandleLabel}</b>${p4Str}

━━━━━━━━━━━━━━━━━━━━
<b>🏦 3. SMART MONEY — AKUMULASI/DISTRIBUSI</b>
━━━━━━━━━━━━━━━━━━━━
${sm.emoji} Status: <b>${sm.status}</b>
${sm.detail}
${sm.waitArea ? `\n⏰ <b>Area Tunggu:</b> <i>${sm.waitArea}</i>` : ''}

<b>Wyckoff:</b> ${wyckoffPhase}
<b>VSA:</b> ${vsaSignal}

━━━━━━━━━━━━━━━━━━━━
<b>💬 KESIMPULAN AKHIR</b>
━━━━━━━━━━━━━━━━━━━━
${finalEmoji} <b>${finalAction}</b>

<i>📐 Analisis teknikal:</i>
${finalTeknikal}

<i>💬 Penjelasan mudah:</i>
${finalPlain}

<i>⚠️ Analisis teknikal, bukan rekomendasi investasi. Selalu gunakan stop loss.</i>`;

  await sendTelegramMessage(chatId, msg);

  // Send chart image with MA + S/R + SL/TP (if RF data available)
  try {
    const srZones = indicators.supportResistance?.zones?.slice(0, 4) ?? [];
    await sendChartPhoto(
      chatId,
      {
        title: `${display} — Analisis Lengkap`,
        data,
        slLevel: rf?.stopLoss,
        tpLevel: rf?.targetPrice,
        entryLevel: rf?.pivotEntry,
        sr: srZones.map(z => ({ level: z.level, type: z.type as 'support' | 'resistance' })),
      },
      `🧠 <b>${display}</b> | ${finalEmoji} ${finalAction}${rf ? ` | Entry: Rp ${Math.round(rf.pivotEntry).toLocaleString('id-ID')} | SL: Rp ${Math.round(rf.stopLoss).toLocaleString('id-ID')} | TP: Rp ${Math.round(rf.targetPrice).toLocaleString('id-ID')}` : ''} | CP: ${powerNum}/100`,
      BOT_TOKEN,
    );
  } catch (e: any) {
    console.error('Analisa chart image error:', e.message);
  }
}

// ── /rf [ticker] — Ryan Filbert Analysis ──────────────────────────────────
export async function handleRFCommand(ticker: string, chatId: number | string): Promise<void> {
  const symbol = normalizeSymbol(ticker);
  const display = displaySymbol(symbol);

  await sendTelegramMessage(chatId, `⏳ Sedang menganalisis <b>${display}</b>... Mohon tunggu sebentar.`);

  const data = await fetchOHLCV(symbol, '1d', 500);
  if (data.length < 50) {
    await sendTelegramMessage(chatId, `❌ Kode saham <b>${display}</b> tidak ditemukan atau data tidak cukup.\nPastikan kode benar, contoh: <code>/rf BBCA</code>`);
    return;
  }

  const indicators = calculateAllIndicators(data);
  const rf = indicators.ryanFilbert;
  const sm = detectSmartMoney(data);

  if (!rf) {
    await sendTelegramMessage(chatId, `❌ Gagal menghitung indikator untuk <b>${display}</b>. Coba beberapa saat lagi.`);
    return;
  }

  const price  = data[data.length - 1].close;
  const prev   = data[data.length - 2]?.close ?? price;
  const chgPct = ((price - prev) / prev * 100);
  const chgStr = (chgPct >= 0 ? '+' : '') + chgPct.toFixed(2) + '%';
  const chgEmoji = chgPct >= 1 ? '🟢' : chgPct <= -1 ? '🔴' : '🟡';

  const phaseEmoji   = rf.phase === 2 ? '🚀' : rf.phase === 1 ? '🏗️' : rf.phase === 3 ? '⚠️' : '📉';
  const qualityEmoji = rf.setupQuality === 'PERFECT' ? '✨' : rf.setupQuality === 'GOOD' ? '👍' : rf.setupQuality === 'FAIR' ? '⚡' : '⛔';
  const chk = (v: boolean) => v ? '✅' : '❌';

  // Volume dry-up meter
  const volBar    = asciiBar(Math.max(0, 100 - rf.displayVolPct), 100, 10);
  const volStatus = rf.displayVolPct <= rf.volDryUpTarget
    ? `✅ KERING (${Math.round(rf.displayVolPct)}% dari normal — penjual sudah habis!)`
    : `❌ ${Math.round(rf.displayVolPct)}% dari normal → harus turun ke bawah ${rf.volDryUpTarget}%`;

  // Missing criteria
  const missing: string[] = [];
  if (!rf.aboveMA150)              missing.push(`Harga masih di bawah MA150 — belum uptrend jangka menengah`);
  if (!rf.aboveMA200)              missing.push(`Harga masih di bawah MA200 — belum uptrend jangka panjang`);
  if (!rf.ma50Rising)              missing.push(`MA50 belum naik — momentum belum terbentuk`);
  if (!rf.ma150AboveMA200)         missing.push(`MA150 < MA200 — struktur tren belum kuat`);
  if (!rf.baseVolumeDryUp)         missing.push(`Volume masih ${Math.round(rf.displayVolPct)}%, harus turun ke <${rf.volDryUpTarget}%`);
  if (!rf.breakoutVolumeConfirmed) missing.push(`Belum ada lonjakan volume breakout`);

  // Smart money enhanced conclusion
  const smBull = sm.status === 'ACCUMULATION' || sm.status === 'MARKUP';
  const smBear = sm.status === 'DISTRIBUTION' || sm.status === 'MARKDOWN';

  // Bilingual conclusion
  let teknikal = '', plain = '', conclusionEmoji = '';

  if (rf.signal === 'BUY' && rf.setupQuality === 'PERFECT') {
    conclusionEmoji = '🟢';
    teknikal = `Fase ${rf.phase} Weinstein aktif. MA50/150/200 alignment bullish. Vol Dry-Up confirmed. Score ${rf.score}/100.${smBull ? ` ${sm.emoji} Smart money: ${sm.status}.` : ''}`;
    plain    = `<b>${display} SIAP DIBELI!</b> Saham ini sudah memenuhi semua syarat Ryan Filbert — tren naik kuat, volume penjual sudah habis. Masuk di sekitar <b>${fmtRp(rf.pivotEntry)}</b>, pasang stop loss di ${fmtRp(rf.stopLoss)}, dan target ${fmtRp(rf.targetPrice)} (potensi untung ${rf.riskReward}x dari risiko).`;
  } else if (rf.signal === 'BUY' && rf.setupQuality === 'GOOD') {
    conclusionEmoji = '🟢';
    teknikal = `Fase ${rf.phase} Weinstein. Sebagian besar kriteria RF terpenuhi. Score ${rf.score}/100.${smBull ? ` ${sm.emoji} Smart money: ${sm.status}.` : ''}`;
    plain    = `<b>${display} HAMPIR SIAP.</b> Saham ini trennya sudah bagus dan hampir memenuhi semua syarat. Tunggu harga tembus ${fmtRp(rf.pivotEntry)} disertai volume besar — itu tanda breakout nyata. Siapkan modal tapi jangan masuk dulu sebelum konfirmasi.`;
  } else if (rf.signal === 'WAIT' && rf.phase === 2) {
    conclusionEmoji = '🟡';
    teknikal = `Fase 2 Weinstein aktif tapi ${missing.length} kriteria belum terpenuhi. ${smBull ? `${sm.emoji} ${sm.status} terdeteksi.` : smBear ? `${sm.emoji} Perhatian: ${sm.status} terdeteksi.` : ''}`;
    plain    = `<b>${display} UPTREND TAPI BELUM SEMPURNA.</b> Tren saham ini sudah naik, tapi belum semua syarat Ryan Filbert terpenuhi. Hal yang paling penting untuk ditunggu: ${missing[0] ?? 'lihat checklist di atas'}.\n${sm.waitArea ? `\n⏰ <b>Area tunggu:</b> ${sm.waitArea}` : ''}`;
  } else if (rf.signal === 'WAIT') {
    conclusionEmoji = '🟡';
    teknikal = `Fase ${rf.phase} Weinstein. ${missing.length} kriteria belum terpenuhi. Score ${rf.score}/100.`;
    plain    = `<b>${display} BELUM SAATNYA.</b> Saham ini belum dalam kondisi ideal untuk beli. Simpan di watchlist dan pantau setiap hari. Prioritas nantikan: ${missing[0] ?? 'volume kering + breakout'}.\n${sm.waitArea ? `\n⏰ <b>Area tunggu jika masih bisa turun:</b> ${sm.waitArea}` : ''}`;
  } else {
    conclusionEmoji = '🔴';
    teknikal = `Fase ${rf.phase} Weinstein — ${rf.phaseLabel}. Tidak memenuhi kriteria minimum RF. ${smBear ? `${sm.emoji} ${sm.status} terdeteksi.` : ''}`;
    plain    = `<b>${display} HINDARI DULU.</b> ${rf.phaseDesc} Saham ini belum dalam tren naik yang sehat. Lebih baik cari saham lain yang lebih siap, atau tunggu sampai ada perubahan struktural.\n${sm.waitArea ? `\n⏰ <b>Jika tetap ingin pantau:</b> ${sm.waitArea}` : ''}`;
  }

  let msg = `<b>📊 RYAN FILBERT — ${display}</b>
${chgEmoji} Harga: <b>${fmtRp(price)}</b> <i>(${chgStr} hari ini)</i>

━━━━━━━━━━━━━━━━━━━━
<b>📈 ANALISIS TEKNIKAL</b>
━━━━━━━━━━━━━━━━━━━━

${phaseEmoji} <b>Fase Stan Weinstein: Fase ${rf.phase} — ${rf.phaseLabel}</b>
<i>${rf.phaseDesc}</i>

${qualityEmoji} <b>Kualitas Setup: ${rf.setupQuality}</b>
Score: <b>${rf.score}/100</b> | Base: <b>${rf.baseLabel}</b> | RS: <b>${rf.relativeStrength}</b>

<b>✔️ Checklist Ryan Filbert:</b>
${chk(rf.aboveMA150)} Harga &gt; MA150 <i>— tren jangka menengah</i>
${chk(rf.aboveMA200)} Harga &gt; MA200 <i>— tren jangka panjang</i>
${chk(rf.ma50Rising)} MA50 naik <i>— momentum aktif</i>
${chk(rf.ma150AboveMA200)} MA150 &gt; MA200 <i>— struktur uptrend kuat</i>

<b>📉 Volume Dry-Up (Penjual Habis?):</b>
${volBar}
${volStatus}
<i>Artinya: Volume 5 hari rata-rata dibanding 50 hari. Jika sudah &lt;${rf.volDryUpTarget}%, penjual sudah tidak aktif — saham siap naik.</i>

${chk(rf.breakoutVolumeConfirmed)} Volume Breakout <i>— lonjakan volume saat naik</i>

<b>🎯 Level Trading:</b>
Entry Pivot : <b>${fmtRp(rf.pivotEntry)}</b>
Stop Loss   : <b>${fmtRp(rf.stopLoss)}</b>
Target      : <b>${fmtRp(rf.targetPrice)}</b>
R:R         : <b>${rf.riskReward}x</b>`;

  // Smart money section
  msg += `

<b>🏦 Smart Money:</b>
${sm.emoji} ${sm.status} — ${sm.detail}`;
  if (sm.waitArea) msg += `\n⏰ ${sm.waitArea}`;

  if (missing.length > 0) {
    msg += `\n\n<b>⏳ Yang masih perlu ditunggu:</b>`;
    missing.forEach(m => { msg += `\n• ${m}`; });
  }

  msg += `

━━━━━━━━━━━━━━━━━━━━
<b>💬 KESIMPULAN</b>
━━━━━━━━━━━━━━━━━━━━
${conclusionEmoji} <i>📐 Teknikal:</i>
${teknikal}

${conclusionEmoji} <i>💬 Penjelasan:</i>
${plain}

<i>⚠️ Analisis teknikal, bukan rekomendasi investasi. Selalu pasang stop loss.</i>`;

  await sendTelegramMessage(chatId, msg);
}

// ── /cp [ticker] — Candle Power (Next Candle Prediction) ──────────────────
export async function handleCPCommand(ticker: string, chatId: number | string): Promise<void> {
  const symbol = normalizeSymbol(ticker);
  const display = displaySymbol(symbol);

  await sendTelegramMessage(chatId, `⏳ Sedang menghitung prediksi candle untuk <b>${display}</b>...`);

  const data = await fetchOHLCV(symbol, '1d', 365);
  if (data.length < 50) {
    await sendTelegramMessage(chatId, `❌ Data tidak cukup untuk <b>${display}</b>.\nContoh: <code>/cp BBCA</code>`);
    return;
  }

  const indicators = calculateAllIndicators(data);
  const { cppScore, cppBias } = indicators.signals;
  const cpAnalysis = indicators.candlePowerAnalysis;
  const pv4 = indicators.predictaV4;
  const sm  = detectSmartMoney(data);
  const cp  = indicators.candlePower;
  const price     = data[data.length - 1].close;
  const prevPrice = data[data.length - 2]?.close ?? price;
  const change    = ((price - prevPrice) / prevPrice * 100);
  const changeStr = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
  const chgEmoji  = change >= 1 ? '🟢' : change <= -1 ? '🔴' : '🟡';

  // Parse power
  const powerMatch = cpAnalysis.match(/Power:\s*(\d+)/);
  const power      = powerMatch ? parseInt(powerMatch[1]) : 50;
  const powerEmoji = power >= 80 ? '🟢' : power >= 60 ? '🟡' : power >= 40 ? '🟠' : '🔴';
  const biasEmoji  = cppBias === 'BULLISH' ? '📈' : cppBias === 'BEARISH' ? '📉' : '➡️';

  const powerBar = asciiBar(power, 100, 10);

  // Power interpretation
  let powerLabel = '';
  if      (power >= 90) powerLabel = 'SANGAT KUAT — Pembeli sangat dominan';
  else if (power >= 75) powerLabel = 'KUAT — Tekanan beli tinggi';
  else if (power >= 60) powerLabel = 'CUKUP KUAT — Pembeli sedikit unggul';
  else if (power >= 45) powerLabel = 'NETRAL — Kekuatan seimbang';
  else if (power >= 30) powerLabel = 'LEMAH — Penjual mulai dominan';
  else                  powerLabel = 'SANGAT LEMAH — Penjual sangat dominan';

  // CPP narrative
  let cppNarrative = '';
  if      (cppScore > 1.5)  cppNarrative = 'Momentum beli 5 hari terakhir sangat kuat';
  else if (cppScore > 0.5)  cppNarrative = 'Tekanan beli lebih dominan dari jual';
  else if (cppScore > -0.5) cppNarrative = 'Kekuatan beli dan jual seimbang — konsolidasi';
  else if (cppScore > -1.5) cppNarrative = 'Tekanan jual lebih dominan dari beli';
  else                      cppNarrative = 'Momentum jual 5 hari terakhir sangat kuat';

  // Next candle type
  const qKey = cp?.nextCandleQuality ?? 'NEUTRAL';
  const qLabels: Record<string, string> = {
    'STRONG_SUSTAINED':  'Naik kuat & bertahan (body besar hijau) 📗',
    'MODERATE_SUSTAINED':'Naik bertahan, body sedang 🟢',
    'WEAK_FLASH':        'Naik sesaat — body kecil, wick panjang ⚠️',
    'REVERSAL_UP':       'Hammer / reversal — potensi balik naik ⬆️',
    'BEARISH_SUSTAINED': 'Turun berlanjut — body besar merah 📕',
    'BEARISH_FLASH':     'Turun sesaat — body kecil 🟠',
    'DISTRIBUTION_TRAP': 'Jebakan naik — upper wick panjang (hati-hati!) ⚠️',
    'NEUTRAL':           'Sideways / konsolidasi ↔️',
  };
  const nextCandleLabel = cp ? qLabels[qKey] ?? '—' : '—';
  const nextCandleDetail = cp?.nextCandleDetail ?? '';

  // Predicta V4
  let pv4Str = '';
  if (pv4) {
    const pStatus = pv4.longPerfect  ? '⚡ PERFECT TIME BELI' :
                    pv4.shortPerfect ? '⚡ PERFECT TIME JUAL' :
                    pv4.verdict === 'STRONG_BULL' ? '🟢 Sangat Bullish' :
                    pv4.verdict === 'BULL'        ? '🟢 Bullish' :
                    pv4.verdict === 'BEAR'        ? '🔴 Bearish' :
                    pv4.verdict === 'STRONG_BEAR' ? '🔴 Sangat Bearish' : '⬜ Netral';

    const adxLabel  = pv4.adxValue > 35 ? 'Tren Sangat Kuat' : pv4.adxValue > 25 ? 'Tren Kuat' : pv4.adxValue > 20 ? 'Tren Sedang' : 'Tren Lemah';
    const deltaLabel = pv4.volumeDeltaValue > 0 ? 'Net beli (pembeli lebih aktif)' : 'Net jual (penjual lebih aktif)';
    const trendLabel = pv4.isUptrend ? 'Uptrend aktif' : 'Downtrend aktif';

    pv4Str = `
<b>🔮 Candle Power V4 — Konfirmasi 8 Indikator:</b>
Status    : <b>${pStatus}</b>
Peluang   : Naik ${pv4.longPct}% | Turun ${pv4.shortPct}%
Conf Naik : ${pv4.confluenceLong}/8 | Conf Turun: ${pv4.confluenceShort}/8
RSI ${pv4.rsiValue.toFixed(0)} ${pv4.rsiValue > 50 ? '↑ zona beli' : '↓ zona jual'} | ADX ${pv4.adxValue.toFixed(0)} ${adxLabel}
Vol: ${pv4.volRatio.toFixed(1)}x | Delta: ${deltaLabel}
Tren: ${trendLabel}`;
  }

  // Bilingual conclusion
  let teknikal = '', plain = '', conclusionEmoji = '', waitAreaText = '';

  if (cppBias === 'BULLISH' && power >= 75) {
    conclusionEmoji = '🟢';
    teknikal = `CPP +${cppScore} bullish kuat. Power ${power}/100. ${sm.emoji} Smart money: ${sm.status}. ${pv4 ? `Predicta V4: ${pv4.verdict}.` : ''}`;
    plain    = `<b>Kemungkinan besar besok ${display} NAIK.</b> Candle Power kuat dan momentum beli 5 hari positif. Jika sudah punya posisi → <b>hold</b>. Jika belum masuk → tunggu konfirmasi volume di awal sesi besok.`;
    if (sm.status === 'ACCUMULATION') plain += `\n🏦 <i>Bonus: Smart money sedang diam-diam mengumpulkan. Tanda kuat untuk hold jangka menengah.</i>`;
  } else if (cppBias === 'BULLISH' && power >= 55) {
    conclusionEmoji = '🟡';
    teknikal = `CPP +${cppScore} bullish moderat. Power ${power}/100. ${sm.emoji} Smart money: ${sm.status}.`;
    plain    = `<b>Ada kecenderungan besok ${display} NAIK, tapi belum terlalu kuat.</b> Power moderat — momentum masih positif tapi volume belum meyakinkan. Aman untuk hold posisi kecil, tapi hindari tambah besar-besaran.`;
    if (sm.waitArea) waitAreaText = `\n⏰ <b>Area masuk lebih ideal:</b> ${sm.waitArea}`;
  } else if (cppBias === 'BEARISH' && power < 30) {
    conclusionEmoji = '🔴';
    teknikal = `CPP ${cppScore} bearish kuat. Power ${power}/100 sangat lemah. ${sm.emoji} Smart money: ${sm.status}.`;
    plain    = `<b>Hati-hati! Besok ${display} cenderung TURUN.</b> Candle Power lemah dan momentum jual dominan. Jika punya posisi → pertimbangkan pasang stop loss ketat atau kurangi posisi.`;
    if (sm.waitArea) waitAreaText = `\n⏰ <b>Area tunggu jika ingin beli lebih murah:</b> ${sm.waitArea}`;
  } else if (cppBias === 'BEARISH') {
    conclusionEmoji = '🟠';
    teknikal = `CPP ${cppScore} bearish moderat. Power ${power}/100. ${sm.emoji} Smart money: ${sm.status}.`;
    plain    = `<b>Besok ${display} cenderung melemah.</b> Tekanan jual lebih besar dari beli. Tidak ideal untuk masuk baru. Pastikan stop loss terpasang.`;
    if (sm.waitArea) waitAreaText = `\n⏰ <b>Jika ingin beli, tunggu di:</b> ${sm.waitArea}`;
  } else {
    conclusionEmoji = '⬜';
    teknikal = `CPP ${cppScore} netral. Power ${power}/100 seimbang. ${sm.emoji} Smart money: ${sm.status}.`;
    plain    = `<b>Arah besok ${display} belum jelas (sideways).</b> Kekuatan beli dan jual hampir sama. Lebih baik tunggu sampai ada sinyal lebih kuat sebelum tambah posisi.`;
  }

  const msg = `<b>🕯️ CANDLE POWER — ${display}</b>
${chgEmoji} Harga: <b>${fmtRp(price)}</b> <i>(${changeStr} hari ini)</i>

━━━━━━━━━━━━━━━━━━━━
<b>📈 ANALISIS TEKNIKAL</b>
━━━━━━━━━━━━━━━━━━━━

${powerEmoji} <b>Candle Power Score: ${power}/100</b>
${powerBar}
<i>${powerLabel}</i>

<b>📊 CPP — Momentum 5 Hari:</b>
Score: <b>${cppScore > 0 ? '+' : ''}${cppScore}</b> | Bias: ${biasEmoji} <b>${cppBias}</b>
<i>${cppNarrative}</i>

<b>🔍 Analisis Candle Terakhir:</b>
${cpAnalysis.replace(/Power:\s*\d+\s*/, '').trim()}

<b>🏦 Smart Money:</b>
${sm.emoji} ${sm.status} — ${sm.detail}

<b>🔮 Prediksi Candle Besok:</b>
${biasEmoji} <b>${nextCandleLabel}</b>
${nextCandleDetail ? `<i>${nextCandleDetail}</i>` : ''}${pv4Str}

━━━━━━━━━━━━━━━━━━━━
<b>💬 KESIMPULAN</b>
━━━━━━━━━━━━━━━━━━━━
${conclusionEmoji} <i>📐 Teknikal:</i>
${teknikal}

${conclusionEmoji} <i>💬 Penjelasan:</i>
${plain}${waitAreaText}

<b>📖 Panduan baca cepat:</b>
Power &gt;70 = potensi naik | Power &lt;35 = potensi turun
CPP &gt;+0.5 = momentum beli | CPP &lt;-0.5 = momentum jual

<i>⚠️ Prediksi probabilistik, bukan kepastian. Selalu gunakan stop loss.</i>`;

  await sendTelegramMessage(chatId, msg);
}

// ── /vcp [ticker] — VCP + Wyckoff + VSA Analysis ──────────────────────────
export async function handleVCPCommand(ticker: string, chatId: number | string): Promise<void> {
  const symbol = normalizeSymbol(ticker);
  const display = displaySymbol(symbol);

  await sendTelegramMessage(chatId, `⏳ Sedang menganalisis VCP &amp; Wyckoff untuk <b>${display}</b>...`);

  const data = await fetchOHLCV(symbol, '1d', 365);
  if (data.length < 50) {
    await sendTelegramMessage(chatId, `❌ Data tidak cukup untuk <b>${display}</b>.\nContoh: <code>/vcp ASII</code>`);
    return;
  }

  const indicators = calculateAllIndicators(data);
  const { bandar: vsaSignal, wyckoffPhase, vcpStatus, evrScore, cppScore, cppBias } = indicators.signals;
  const sm      = detectSmartMoney(data);
  const price     = data[data.length - 1].close;
  const prevPrice = data[data.length - 2]?.close ?? price;
  const change    = ((price - prevPrice) / prevPrice * 100);
  const changeStr = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
  const chgEmoji  = change >= 1 ? '🟢' : change <= -1 ? '🔴' : '🟡';

  // Wyckoff phase
  const wyEmoji = wyckoffPhase.includes('MARKUP') || wyckoffPhase.includes('ACCUMULATION') ? '🟢' :
                  wyckoffPhase.includes('DISTRIBUTION') || wyckoffPhase.includes('MARKDOWN') ? '🔴' : '🟡';
  let wyPlain = '';
  if (wyckoffPhase.includes('MARKUP'))            wyPlain = 'Harga dalam fase naik sehat. Ideal untuk hold atau beli pullback.';
  else if (wyckoffPhase.includes('ACCUMULATION')) wyPlain = 'Institusi mengumpulkan saham diam-diam. Harga sideways tapi ada pembelian tersembunyi.';
  else if (wyckoffPhase.includes('DISTRIBUTION')) wyPlain = 'Institusi mulai menjual ke publik. Harga bisa masih naik tapi bahaya mengintai.';
  else if (wyckoffPhase.includes('MARKDOWN'))     wyPlain = 'Tren turun aktif. Hindari beli, tunggu tanda berhenti turun.';
  else wyPlain = 'Fase transisi / belum jelas.';

  // EVR interpretation
  const evrEmoji = evrScore > 0.3 ? '🟢' : evrScore < -0.3 ? '🔴' : '🟡';
  let evrTeknikal = '', evrPlain = '';
  if      (evrScore > 0.5)  { evrTeknikal = 'Effort tinggi, result kecil turun → Absorption'; evrPlain = 'Volume besar tapi harga tidak turun jauh = pembeli menyerap tekanan jual (sangat bullish)'; }
  else if (evrScore > 0.2)  { evrTeknikal = 'Divergensi positif volume/harga'; evrPlain = 'Ada tanda penyerapan oleh pembeli kuat'; }
  else if (evrScore < -0.5) { evrTeknikal = 'Effort tinggi, result kecil naik → Distribusi'; evrPlain = 'Volume besar tapi harga tidak naik jauh = penjual menekan kenaikan (bearish)'; }
  else if (evrScore < -0.2) { evrTeknikal = 'Divergensi negatif volume/harga'; evrPlain = 'Ada tanda distribusi tersembunyi'; }
  else                      { evrTeknikal = 'Upaya dan hasil seimbang'; evrPlain = 'Belum ada anomali signifikan'; }

  // Breakout delta
  const bvd = indicators.latestBreakoutDelta;
  let bvdStr = '';
  if (bvd) {
    const bvdLabel = bvd.isRealBreakout
      ? `✅ BREAKOUT VALID — Beli ${(bvd.bullPct * 100).toFixed(1)}% vs Jual ${(bvd.bearPct * 100).toFixed(1)}% → Institusi masuk serius`
      : bvd.isFakeBreakout
      ? `⚠️ BREAKOUT PALSU — Jual dominan ${(bvd.bearPct * 100).toFixed(1)}% → Kemungkinan jebakan`
      : `📊 Breakout level: ${fmtRp(bvd.level)}`;
    bvdStr = `\n<b>🔷 Breakout Volume Delta:</b>\n${bvdLabel}`;
  }

  // VSA markers
  const recentVSA = indicators.vsaMarkers.slice(-3);
  let vsaMarkersStr = '';
  if (recentVSA.length > 0) {
    vsaMarkersStr = '\n<b>🏷️ Sinyal VSA 3 Candle Terakhir:</b>\n';
    recentVSA.forEach(m => { vsaMarkersStr += `• ${m.text}\n`; });
  }

  // SR Zones
  const srZones = indicators.supportResistance.zones.slice(0, 4);
  let srStr = '';
  if (srZones.length > 0) {
    srStr = '\n<b>📐 Support &amp; Resistance:</b>\n';
    srZones.forEach(z => {
      const em = z.type === 'support' ? '🟢 SUP' : '🔴 RES';
      srStr += `${em}: ${fmtRp(z.level)}\n`;
    });
  }

  // Fibonacci
  const fibs = indicators.fibonacci;
  const fib382 = fibs.f382[fibs.f382.length - 1]?.value ?? 0;
  const fib500 = fibs.f500[fibs.f500.length - 1]?.value ?? 0;
  const fib618 = fibs.f618[fibs.f618.length - 1]?.value ?? 0;

  // Bilingual action
  let actionEmoji = '', actionTeknikal = '', actionPlain = '', waitAreaText = '';

  if (sm.status === 'ACCUMULATION' && evrScore > 0.2) {
    actionEmoji    = '🎯';
    actionTeknikal = `Accumulation Wyckoff terkonfirmasi (EVR +${evrScore.toFixed(2)}). VCP: ${vcpStatus}. Smart money aktif mengumpulkan.`;
    actionPlain    = `<b>MOMEN ENTRY BAGUS!</b> Ada tanda uang besar sedang diam-diam mengumpulkan saham ini dengan volume tinggi tapi harga tidak banyak bergerak — ini ciri khas Wyckoff Spring atau Absorption. Masuk kecil dulu, tambah saat ada konfirmasi naik dengan volume besar.`;
    if (sm.waitArea) waitAreaText = `\n⏰ <b>Area beli ideal:</b> ${sm.waitArea}`;
  } else if (sm.status === 'MARKUP' && cppBias === 'BULLISH') {
    actionEmoji    = '📈';
    actionTeknikal = `Markup aktif. CPP +${cppScore} bullish. VSA: ${vsaSignal}.`;
    actionPlain    = `<b>TREN NAIK AKTIF — HOLD!</b> Saham ini sedang dalam fase markup (tren naik yang sehat). Jika sudah punya, pertahankan posisi dan biarkan profit berkembang. Pasang trailing stop untuk proteksi.`;
  } else if (vsaSignal.includes('VCP PIVOT') || vsaSignal.includes('SNIPER') || vsaSignal.includes('DRY-UP')) {
    actionEmoji    = '🎯';
    actionTeknikal = `VCP setup terdeteksi. VSA: ${vsaSignal}. EVR ${evrScore > 0 ? '+' : ''}${evrScore.toFixed(2)}.`;
    actionPlain    = `<b>SETUP VCP TERDETEKSI!</b> Volume penjual mengering dan harga kontraksi. Ini kondisi "sebelum meledak" versi Minervini/Ryan Filbert. Entry konservatif: tunggu breakout di atas pivot dengan volume besar.`;
    if (sm.waitArea) waitAreaText = `\n⏰ <b>Area tunggu sebelum breakout:</b> ${sm.waitArea}`;
  } else if (sm.status === 'DISTRIBUTION' || vsaSignal.includes('Distribusi') || vsaSignal.includes('Upthrust')) {
    actionEmoji    = '🔴';
    actionTeknikal = `Distribusi terdeteksi. Smart money: ${sm.status}. VSA: ${vsaSignal}. EVR ${evrScore.toFixed(2)}.`;
    actionPlain    = `<b>WASPADA DISTRIBUSI!</b> Ada tanda institusi sedang menjual pelan-pelan. Harga bisa terlihat normal sekarang tapi risiko turun mengintai. Jangan tambah posisi, dan jika sudah punya, siapkan stop loss ketat.`;
    waitAreaText   = sm.waitArea ? `\n⏰ <b>Jika tetap mau beli, tunggu di:</b> ${sm.waitArea}` : '';
  } else if (sm.status === 'MARKDOWN' || wyckoffPhase.includes('MARKDOWN')) {
    actionEmoji    = '📉';
    actionTeknikal = `MARKDOWN aktif. Smart money: ${sm.status}. Wyckoff: ${wyckoffPhase}.`;
    actionPlain    = `<b>HINDARI — TREN TURUN!</b> Saham ini sedang dalam tren turun yang dipimpin penjual besar. Lebih baik tidak masuk sekarang. Tunggu sampai ada tanda pembalikan yang jelas.`;
    waitAreaText   = sm.waitArea ? `\n⏰ <b>Area support potensial untuk pantau:</b> ${sm.waitArea}` : '';
  } else {
    actionEmoji    = '⏳';
    actionTeknikal = `Belum ada sinyal dominan. Wyckoff: ${wyckoffPhase}. Smart money: ${sm.status}.`;
    actionPlain    = `<b>TUNGGU SINYAL LEBIH JELAS.</b> Belum ada setup yang cukup kuat untuk masuk. Simpan di watchlist dan pantau volume — ketika volume meledak disertai harga naik, itu konfirmasi yang ditunggu.`;
    waitAreaText   = sm.waitArea ? `\n⏰ <b>Area ideal untuk masuk lebih murah:</b> ${sm.waitArea}` : '';
  }

  const msg = `<b>🔬 VCP + WYCKOFF + VSA — ${display}</b>
${chgEmoji} Harga: <b>${fmtRp(price)}</b> <i>(${changeStr} hari ini)</i>

━━━━━━━━━━━━━━━━━━━━
<b>📈 ANALISIS TEKNIKAL</b>
━━━━━━━━━━━━━━━━━━━━

${wyEmoji} <b>Fase Wyckoff: ${wyckoffPhase}</b>
<i>${wyPlain}</i>

<b>⚡ Effort vs Result (EVR): ${evrScore > 0 ? '+' : ''}${evrScore.toFixed(2)}</b>
${evrEmoji} <i>Teknikal: ${evrTeknikal}</i>
<i>Artinya: ${evrPlain}</i>

<b>📊 VCP Status:</b>
${vcpStatus}

<b>🏦 Smart Money Footprint:</b>
${sm.emoji} <b>${sm.status}</b> — ${sm.detail}

<b>💡 VSA Signal Terbaru:</b>
${vsaSignal}

<b>📅 Candle Power (prediksi besok):</b>
${cppBias === 'BULLISH' ? '📈' : cppBias === 'BEARISH' ? '📉' : '➡️'} CPP ${cppScore > 0 ? '+' : ''}${cppScore} → <b>${cppBias === 'BULLISH' ? 'Cenderung NAIK' : cppBias === 'BEARISH' ? 'Cenderung TURUN' : 'NETRAL'}</b>${vsaMarkersStr}${bvdStr}${srStr}
<b>📐 Fibonacci Retracement:</b>
38.2%: ${fmtRp(fib382)} | 50.0%: ${fmtRp(fib500)} | 61.8%: ${fmtRp(fib618)}
<i>Area pullback ideal jika harga koreksi setelah naik</i>

━━━━━━━━━━━━━━━━━━━━
<b>💬 KESIMPULAN</b>
━━━━━━━━━━━━━━━━━━━━
${actionEmoji} <i>📐 Teknikal:</i>
${actionTeknikal}

${actionEmoji} <i>💬 Penjelasan:</i>
${actionPlain}${waitAreaText}

<i>⚠️ Analisis teknikal, bukan rekomendasi investasi. Selalu gunakan stop loss.</i>`;

  await sendTelegramMessage(chatId, msg);
}

// ── Main dispatcher ─────────────────────────────────────────────────────────
export async function handleTelegramUpdate(update: any): Promise<void> {
  const message = update.message || update.edited_message;
  if (!message?.text) return;

  const chatId = message.chat.id;
  const text = (message.text as string).trim();
  const parts = text.split(/\s+/);
  const cmd = parts[0].toLowerCase().replace(/^\//, '').split('@')[0]; // strip @botname
  const arg = parts.slice(1).join(' ').trim();

  try {
    switch (cmd) {
      case 'start':
      case 'mulai':
        await sendTelegramMessage(chatId, buildStartMessage());
        break;

      case 'help':
      case 'bantuan':
        await sendTelegramMessage(chatId, buildStartMessage());
        break;

      case 'rf':
        if (!arg) {
          await sendTelegramMessage(chatId, '❌ Masukkan kode saham.\nContoh: /rf BBCA');
        } else {
          await handleRFCommand(arg, chatId);
        }
        break;

      case 'cp':
        if (!arg) {
          await sendTelegramMessage(chatId, '❌ Masukkan kode saham.\nContoh: /cp TLKM');
        } else {
          await handleCPCommand(arg, chatId);
        }
        break;

      case 'vcp':
        if (!arg) {
          await sendTelegramMessage(chatId, '❌ Masukkan kode saham.\nContoh: /vcp ASII');
        } else {
          await handleVCPCommand(arg, chatId);
        }
        break;

      case 'analisa':
        if (!arg) {
          await sendTelegramMessage(chatId, '❌ Masukkan kode saham.\nContoh: /analisa BBCA');
        } else {
          await handleAnalisaCommand(arg, chatId);
        }
        break;

      case 'besok':
        if (!arg) {
          await sendTelegramMessage(chatId, '❌ Masukkan kode saham.\nContoh: /besok TLKM');
        } else {
          await handleCPCommand(arg, chatId);
        }
        break;

      case 'cek':
        if (!arg) {
          await sendTelegramMessage(chatId, '❌ Masukkan kode saham.\nContoh: /cek ASII');
        } else {
          await handleVCPCommand(arg, chatId);
        }
        break;

      default:
        // Ignore unknown commands / plain messages
        break;
    }
  } catch (err: any) {
    console.error('Telegram handler error:', err.message);
    await sendTelegramMessage(chatId, `⚠️ Terjadi kesalahan: ${err.message}`);
  }
}

