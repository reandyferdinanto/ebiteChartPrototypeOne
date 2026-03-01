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
  const vsaMrk = indicators.vsaMarkers;

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
    'STRONG_SUSTAINED':  'Candle besar, naik kuat & bertahan',
    'MODERATE_SUSTAINED':'Candle sedang, naik bertahan',
    'WEAK_FLASH':        'Naik sesaat, body kecil / wick panjang',
    'REVERSAL_UP':       'Hammer / reversal — potensi balik naik',
    'BEARISH_SUSTAINED': 'Candle merah besar, turun berlanjut',
    'BEARISH_FLASH':     'Turun sesaat, body kecil',
    'DISTRIBUTION_TRAP': 'Jebakan naik (wick atas panjang)',
    'NEUTRAL':           'Flat / konsolidasi',
  };
  const nextCandleLabel = cp ? qLabels[qKey] ?? '—' : '—';
  const nextCandleDetail = cp?.nextCandleDetail ?? '—';

  // ── Bagian 3: Kesimpulan akhir ───────────────────────────────────────────
  // Gabungkan sinyal RF + CP + Wyckoff untuk keputusan akhir
  const rfBull = rf && (rf.signal === 'BUY' || rf.setupQuality === 'PERFECT' || rf.setupQuality === 'GOOD');
  const rfBear = rf && rf.signal === 'AVOID';
  const cpBull = cppBias === 'BULLISH' && powerNum >= 60;
  const cpBear = cppBias === 'BEARISH' && powerNum <= 40;
  const wyBull = wyckoffPhase.includes('MARKUP') || wyckoffPhase.includes('ACCUMULATION');
  const wyBear = wyckoffPhase.includes('DISTRIBUTION') || wyckoffPhase.includes('MARKDOWN');

  const bullCount = (rfBull ? 1 : 0) + (cpBull ? 1 : 0) + (wyBull ? 1 : 0);
  const bearCount = (rfBear ? 1 : 0) + (cpBear ? 1 : 0) + (wyBear ? 1 : 0);

  let finalEmoji = '⬜', finalAction = '', finalDetail = '';
  if (bullCount >= 2 && bearCount === 0) {
    finalEmoji  = '🟢';
    finalAction = 'PERTIMBANGKAN BELI / HOLD';
    finalDetail = `${bullCount}/3 sinyal bullish selaras. ${rfConclusion ? rfConclusion.replace(/<[^>]+>/g, '') : ''} Candle besok: ${nextCandleLabel}.`;
  } else if (bullCount >= 2 && bearCount === 1) {
    finalEmoji  = '🟡';
    finalAction = 'HATI-HATI / SELEKTIF';
    finalDetail = `Mayoritas sinyal bullish tapi ada satu yang bearish. Masuk hanya jika ada konfirmasi volume. Pasang stop loss ketat.`;
  } else if (bearCount >= 2 && bullCount === 0) {
    finalEmoji  = '🔴';
    finalAction = 'HINDARI / KURANGI POSISI';
    finalDetail = `${bearCount}/3 sinyal bearish selaras. Risiko turun lebih besar. Jika pegang saham ini, pastikan stop loss terpasang.`;
  } else if (bearCount >= 1 && bullCount === 0) {
    finalEmoji  = '🟠';
    finalAction = 'TUNGGU DULU';
    finalDetail = `Sinyal bearish lebih dominan. Lebih baik menunggu setup yang lebih jelas daripada masuk sekarang.`;
  } else {
    finalEmoji  = '⬜';
    finalAction = 'NETRAL / PANTAU';
    finalDetail = `Sinyal campuran. Pasar sedang konsolidasi atau transisi. Simpan di watchlist dan tunggu konfirmasi.`;
  }

  // ── Predicta V4 ringkas ──────────────────────────────────────────────────
  let p4Str = '';
  if (p4) {
    const p4Status = p4.longPerfect  ? '⚡ PERFECT BELI' :
                     p4.shortPerfect ? '⚡ PERFECT JUAL' :
                     p4.verdict === 'STRONG_BULL' ? '🟢 Sangat Bullish' :
                     p4.verdict === 'BULL'        ? '🟢 Bullish' :
                     p4.verdict === 'BEAR'        ? '🔴 Bearish' :
                     p4.verdict === 'STRONG_BEAR' ? '🔴 Sangat Bearish' : '⬜ Netral';
    p4Str = `\n<b>🔮 Predicta V4:</b> ${p4Status} — Long ${p4.longPct}% | Short ${p4.shortPct}% | Confluence ${p4.confluenceLong}/8`;
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
${powerEmoji} Power: <b>${powerNum}/100</b> | ${biasEmoji} CPP: <b>${cppScore > 0 ? '+' : ''}${cppScore}</b>
Jenis candle besok: <b>${nextCandleLabel}</b>
<i>${nextCandleDetail !== '—' ? nextCandleDetail : ''}</i>${p4Str}

━━━━━━━━━━━━━━━━━━━━
<b>🌊 3. WYCKOFF / VSA</b>
━━━━━━━━━━━━━━━━━━━━
Fase Wyckoff: <b>${wyckoffPhase}</b>
Sinyal VSA  : ${vsaSignal}

━━━━━━━━━━━━━━━━━━━━
<b>💬 KESIMPULAN AKHIR</b>
━━━━━━━━━━━━━━━━━━━━
${finalEmoji} <b>${finalAction}</b>
${finalDetail}

<i>⚠️ Analisis teknikal, bukan rekomendasi investasi. Selalu gunakan stop loss.</i>`;

  await sendTelegramMessage(chatId, msg);
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

  if (!rf) {
    await sendTelegramMessage(chatId, `❌ Gagal menghitung indikator untuk <b>${display}</b>. Coba beberapa saat lagi.`);
    return;
  }

  const price  = data[data.length - 1].close;
  const prev   = data[data.length - 2]?.close ?? price;
  const chgPct = ((price - prev) / prev * 100);
  const chgStr = (chgPct >= 0 ? '+' : '') + chgPct.toFixed(2) + '%';

  const phaseEmoji   = rf.phase === 2 ? '🚀' : rf.phase === 1 ? '🏗️' : rf.phase === 3 ? '⚠️' : '📉';
  const qualityEmoji = rf.setupQuality === 'PERFECT' ? '✨' : rf.setupQuality === 'GOOD' ? '👍' : rf.setupQuality === 'FAIR' ? '⚡' : '⛔';
  const chk = (v: boolean) => v ? '✅' : '❌';

  // Volume dry-up meter
  const volBar    = asciiBar(Math.max(0, 100 - rf.displayVolPct), 100, 10);
  const volStatus = rf.displayVolPct <= rf.volDryUpTarget
    ? `✅ KERING (${Math.round(rf.displayVolPct)}% — penjual sudah habis!)`
    : `❌ ${Math.round(rf.displayVolPct)}% → harus turun ke bawah ${rf.volDryUpTarget}%`;

  // Missing criteria with plain explanations
  const missing: string[] = [];
  if (!rf.aboveMA150)              missing.push(`Harga masih di bawah MA150 — saham belum dalam tren naik jangka menengah`);
  if (!rf.aboveMA200)              missing.push(`Harga masih di bawah MA200 — belum uptrend jangka panjang`);
  if (!rf.ma50Rising)              missing.push(`MA50 belum naik — momentum harga belum terbentuk`);
  if (!rf.ma150AboveMA200)         missing.push(`MA150 masih di bawah MA200 — struktur tren belum kuat`);
  if (!rf.baseVolumeDryUp)         missing.push(`Volume belum kering: saat ini ${Math.round(rf.displayVolPct)}%, tunggu turun ke bawah ${rf.volDryUpTarget}%`);
  if (!rf.breakoutVolumeConfirmed) missing.push(`Belum ada lonjakan volume breakout — harga belum benar-benar breakout`);

  // Plain-language conclusion
  let conclusion = '';
  let conclusionEmoji = '';
  if (rf.signal === 'BUY' && rf.setupQuality === 'PERFECT') {
    conclusionEmoji = '🟢';
    conclusion = `<b>${display} SIAP DIBELI!</b> Semua kriteria Ryan Filbert terpenuhi. Saham ini sedang uptrend kuat, volume penjual sudah habis, dan harga mendekati titik breakout. Masuk di pivot ${fmtRp(rf.pivotEntry)}, stop loss di ${fmtRp(rf.stopLoss)}, target ${fmtRp(rf.targetPrice)} (R:R ${rf.riskReward}x).`;
  } else if (rf.signal === 'BUY' && rf.setupQuality === 'GOOD') {
    conclusionEmoji = '🟢';
    conclusion = `<b>${display} LAYAK DIPERHATIKAN.</b> Setup sudah bagus, saham dalam uptrend dan hampir memenuhi semua syarat. Siapkan modal, tunggu konfirmasi breakout di atas ${fmtRp(rf.pivotEntry)} dengan volume tinggi. Stop loss di ${fmtRp(rf.stopLoss)}.`;
  } else if (rf.signal === 'WAIT') {
    conclusionEmoji = '🟡';
    const firstMissing = missing[0] ?? 'Beberapa kriteria belum terpenuhi';
    conclusion = `<b>${display} MASIH PERLU DITUNGGU.</b> Trennya ${rf.phase === 2 ? 'sudah bagus' : 'belum cukup kuat'} tapi belum semua syarat terpenuhi. Poin terpenting yang kurang: ${firstMissing}. Simpan di watchlist dan pantau setiap hari.`;
  } else {
    conclusionEmoji = '🔴';
    conclusion = `<b>${display} HINDARI DULU.</b> ${rf.phaseDesc} Lebih baik tunggu sampai saham masuk Fase 2 (uptrend) dengan setup yang lebih bersih.`;
  }

  let msg = `<b>📊 RYAN FILBERT — ${display}</b>
Harga: <b>${fmtRp(price)}</b> <i>(${chgStr} hari ini)</i>

━━━━━━━━━━━━━━━━━━━━
<b>📈 ANALISIS TEKNIKAL</b>
━━━━━━━━━━━━━━━━━━━━

${phaseEmoji} <b>Fase Stan Weinstein: Fase ${rf.phase} — ${rf.phaseLabel}</b>
<i>${rf.phaseDesc}</i>

${qualityEmoji} <b>Kualitas Setup: ${rf.setupQuality}</b>
Score: <b>${rf.score}/100</b> | Base: <b>${rf.baseLabel}</b> | RS: <b>${rf.relativeStrength}</b>

<b>✔️ Checklist Kriteria Ryan Filbert:</b>
${chk(rf.aboveMA150)} Harga &gt; MA150 <i>(tren menengah)</i>
${chk(rf.aboveMA200)} Harga &gt; MA200 <i>(tren panjang)</i>
${chk(rf.ma50Rising)} MA50 sedang naik <i>(momentum aktif)</i>
${chk(rf.ma150AboveMA200)} MA150 &gt; MA200 <i>(struktur uptrend kuat)</i>

<b>📉 Volume Dry-Up:</b>
${volBar}
${volStatus}
<i>Volume 5-hari harus &lt;${rf.volDryUpTarget}% dari rata-rata historis — artinya penjual sudah habis dan saham siap meledak naik.</i>

${chk(rf.breakoutVolumeConfirmed)} Volume Breakout <i>(lonjakan volume saat harga naik)</i>

<b>🎯 Level Harga:</b>
Entry Pivot : <b>${fmtRp(rf.pivotEntry)}</b>
Stop Loss   : <b>${fmtRp(rf.stopLoss)}</b>
Target      : <b>${fmtRp(rf.targetPrice)}</b>
R:R         : <b>${rf.riskReward}x</b>`;

  if (missing.length > 0) {
    msg += `\n\n<b>⏳ Yang masih kurang:</b>`;
    missing.forEach(m => { msg += `\n• ${m}`; });
  }

  msg += `

━━━━━━━━━━━━━━━━━━━━
<b>💬 KESIMPULAN</b>
━━━━━━━━━━━━━━━━━━━━
${conclusionEmoji} ${conclusion}

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
  const price     = data[data.length - 1].close;
  const prevPrice = data[data.length - 2]?.close ?? price;
  const change    = ((price - prevPrice) / prevPrice * 100);
  const changeStr = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';

  // Parse power from analysis string
  const powerMatch = cpAnalysis.match(/Power:\s*(\d+)/);
  const power      = powerMatch ? parseInt(powerMatch[1]) : 50;
  const powerEmoji = power >= 80 ? '🟢' : power >= 60 ? '🟡' : power >= 40 ? '🟠' : '🔴';
  const biasEmoji  = cppBias === 'BULLISH' ? '📈' : cppBias === 'BEARISH' ? '📉' : '➡️';

  // Power interpretation
  let powerLabel = '';
  if      (power >= 90) powerLabel = 'SANGAT KUAT — Pembeli sangat dominan';
  else if (power >= 75) powerLabel = 'KUAT — Tekanan beli tinggi';
  else if (power >= 60) powerLabel = 'CUKUP KUAT — Pembeli sedikit unggul';
  else if (power >= 45) powerLabel = 'NETRAL — Kekuatan seimbang';
  else if (power >= 30) powerLabel = 'LEMAH — Penjual mulai dominan';
  else                  powerLabel = 'SANGAT LEMAH — Penjual sangat dominan';

  // CPP narrative (plain language)
  let cppNarrative = '';
  if      (cppScore > 1.5)  cppNarrative = 'Momentum beli 5 hari terakhir sangat kuat. Besar kemungkinan candle besok <b>HIJAU</b>.';
  else if (cppScore > 0.5)  cppNarrative = 'Tekanan beli lebih dominan dari jual. Candle besok cenderung <b>NAIK</b>.';
  else if (cppScore > -0.5) cppNarrative = 'Kekuatan beli dan jual seimbang. Arah candle besok <b>BELUM PASTI</b> (konsolidasi/sideways).';
  else if (cppScore > -1.5) cppNarrative = 'Tekanan jual lebih dominan. Candle besok cenderung <b>TURUN</b>.';
  else                      cppNarrative = 'Momentum jual 5 hari terakhir sangat kuat. Waspadai candle besok <b>MERAH</b>.';

  // Power bar
  const powerBar = asciiBar(power, 100, 10);

  // Predicta V4 details
  let predictaStr = '';
  if (pv4) {
    const pStatus = pv4.longPerfect  ? '⚡ PERFECT TIME BELI' :
                    pv4.shortPerfect ? '⚡ PERFECT TIME JUAL' :
                    pv4.verdict === 'STRONG_BULL' ? '🟢 Sangat Bullish' :
                    pv4.verdict === 'BULL'        ? '🟢 Bullish' :
                    pv4.verdict === 'BEAR'        ? '🔴 Bearish' :
                    pv4.verdict === 'STRONG_BEAR' ? '🔴 Sangat Bearish' : '⬜ Netral';

    // ADX: trend strength
    const adxLabel = pv4.adxValue > 35 ? 'Sangat Kuat' : pv4.adxValue > 25 ? 'Kuat' : pv4.adxValue > 20 ? 'Sedang' : 'Lemah';
    // Delta
    const deltaLabel = pv4.volumeDeltaValue > 0 ? 'Pembeli lebih aktif (net beli)' : 'Penjual lebih aktif (net jual)';
    // Trend
    const trendLabel = pv4.isUptrend ? 'Uptrend — harga di atas jalur naik' : 'Downtrend — harga di bawah jalur turun';

    predictaStr = `
<b>🔮 Predicta V4 — Konfirmasi Multi-Indikator:</b>
Status   : <b>${pStatus}</b>
Peluang  : Long ${pv4.longPct}% | Short ${pv4.shortPct}%
Confluence: ${pv4.confluenceLong}/8 indikator bullish | ${pv4.confluenceShort}/8 bearish
RSI      : ${pv4.rsiValue.toFixed(1)} ${pv4.rsiValue > 50 ? '↑ (zona beli)' : '↓ (zona jual)'}
ADX      : ${pv4.adxValue.toFixed(1)} — Tren ${adxLabel}
Volume   : ${pv4.volRatio.toFixed(1)}x rata-rata
Delta Vol: ${deltaLabel}
Tren     : ${trendLabel}`;
  }

  // Plain-language conclusion for /cp
  let conclusion = '';
  let conclusionEmoji = '';
  const nextCandle = cppBias === 'BULLISH' ? 'NAIK / HIJAU' : cppBias === 'BEARISH' ? 'TURUN / MERAH' : 'SIDEWAYS';

  if (cppBias === 'BULLISH' && power >= 70) {
    conclusionEmoji = '🟢';
    conclusion = `<b>Kemungkinan besar besok ${display} NAIK.</b> Candle Power kuat (${power}/100) dan momentum beli 5 hari terakhir positif (CPP +${cppScore}). Jika kamu sudah punya posisi, pertimbangkan untuk hold. Jika belum masuk, tunggu konfirmasi volume di awal sesi.`;
  } else if (cppBias === 'BULLISH' && power >= 50) {
    conclusionEmoji = '🟡';
    conclusion = `<b>Ada kecenderungan besok ${display} NAIK, tapi belum terlalu kuat.</b> Power moderat (${power}/100), momentum masih positif. Jaga posisi tapi waspada jika volume besok masih rendah.`;
  } else if (cppBias === 'BEARISH' && power < 35) {
    conclusionEmoji = '🔴';
    conclusion = `<b>Hati-hati, besok ${display} cenderung TURUN.</b> Candle Power lemah (${power}/100) dan momentum jual dominan (CPP ${cppScore}). Jika kamu pegang saham ini, pertimbangkan untuk pasang stop loss yang ketat atau kurangi posisi.`;
  } else if (cppBias === 'BEARISH') {
    conclusionEmoji = '🟠';
    conclusion = `<b>Besok ${display} cenderung melemah.</b> Tekanan jual lebih besar dari beli. Tidak ideal untuk masuk baru. Jika sudah punya posisi, pastikan stop loss terpasang.`;
  } else {
    conclusionEmoji = '⬜';
    conclusion = `<b>Arah besok ${display} belum jelas (sideways).</b> Kekuatan beli dan jual seimbang. Lebih baik tunggu sampai ada sinyal lebih kuat — jangan ambil risiko besar dalam kondisi ini.`;
  }

  const msg = `<b>🕯️ CANDLE POWER — ${display}</b>
Harga: <b>${fmtRp(price)}</b> <i>(${changeStr} hari ini)</i>

━━━━━━━━━━━━━━━━━━━━
<b>📈 ANALISIS TEKNIKAL</b>
━━━━━━━━━━━━━━━━━━━━

${powerEmoji} <b>Candle Power Score: ${power}/100</b>
${powerBar}
<i>${powerLabel}</i>

<b>📊 CPP — Momentum 5 Hari Terakhir:</b>
Score: <b>${cppScore > 0 ? '+' : ''}${cppScore}</b> | Bias: <b>${biasEmoji} ${cppBias}</b>
<i>CPP positif = lebih banyak candle hijau bervolume tinggi dalam 5 hari terakhir</i>

<b>🔍 Analisis VSA/Wyckoff (candle terakhir):</b>
${cpAnalysis.replace(/Power:\s*\d+\s*/, '').trim()}${predictaStr}

<b>🔮 Prediksi Candle Besok:</b>
${biasEmoji} <b>${nextCandle}</b>
<i>${cppNarrative}</i>

━━━━━━━━━━━━━━━━━━━━
<b>💬 KESIMPULAN</b>
━━━━━━━━━━━━━━━━━━━━
${conclusionEmoji} ${conclusion}

<b>📖 Panduan Baca:</b>
• Power &gt;70 → Potensi naik besok
• Power &lt;35 → Potensi turun besok
• CPP &gt;+0.5 → Momentum beli aktif
• CPP &lt;-0.5 → Momentum jual aktif

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
  const price     = data[data.length - 1].close;
  const prevPrice = data[data.length - 2]?.close ?? price;
  const change    = ((price - prevPrice) / prevPrice * 100);
  const changeStr = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';

  // Wyckoff phase emoji + plain label
  const wyEmoji = wyckoffPhase.includes('MARKUP') || wyckoffPhase.includes('ACCUMULATION') ? '🟢' :
                  wyckoffPhase.includes('DISTRIBUTION') || wyckoffPhase.includes('MARKDOWN') ? '🔴' : '🟡';

  // Wyckoff plain explanation
  let wyPlain = '';
  if (wyckoffPhase.includes('MARKUP'))        wyPlain = 'Harga sedang dalam fase naik yang sehat. Ini fase terbaik untuk hold atau beli pullback.';
  else if (wyckoffPhase.includes('ACCUMULATION')) wyPlain = 'Uang besar (institusi) sedang diam-diam mengumpulkan saham ini. Harga masih sideways tapi ada tanda pembelian tersembunyi.';
  else if (wyckoffPhase.includes('DISTRIBUTION')) wyPlain = 'Institusi mulai menjual saham ini ke publik. Harga mungkin masih naik tapi bahaya mengintai — berhati-hati.';
  else if (wyckoffPhase.includes('MARKDOWN'))  wyPlain = 'Harga sedang dalam tren turun. Hindari beli, tunggu sampai ada tanda berhenti turun.';
  else wyPlain = 'Fase belum jelas. Pasar sedang konsolidasi atau transisi.';

  // EVR interpretation
  const evrEmoji = evrScore > 0.3 ? '🟢' : evrScore < -0.3 ? '🔴' : '🟡';
  let evrPlain = '';
  if      (evrScore > 0.5)  evrPlain = 'Volume besar tapi harga tidak turun jauh → Pembeli menyerap semua tekanan jual (sangat bullish)';
  else if (evrScore > 0.2)  evrPlain = 'Ada tanda penyerapan oleh pembeli kuat';
  else if (evrScore < -0.5) evrPlain = 'Volume besar tapi harga tidak naik jauh → Penjual menekan kenaikan (bearish)';
  else if (evrScore < -0.2) evrPlain = 'Ada tanda distribusi tersembunyi';
  else                      evrPlain = 'Upaya dan hasil seimbang — belum ada anomali signifikan';

  // Latest breakout delta
  const bvd = indicators.latestBreakoutDelta;
  let bvdStr = '';
  if (bvd) {
    const bvdLabel = bvd.isRealBreakout ? '✅ BREAKOUT VALID — Volume beli dominan' :
                     bvd.isFakeBreakout ? '⚠️ BREAKOUT PALSU — Volume jual mendominasi saat harga naik' :
                     '📊 Breakout Terdeteksi';
    bvdStr = `
<b>🔷 Breakout Volume Delta:</b>
${bvdLabel}
Beli: ${(bvd.bullPct * 100).toFixed(1)}% | Jual: ${(bvd.bearPct * 100).toFixed(1)}% | Level: ${fmtRp(bvd.level)}
<i>${bvd.isRealBreakout ? 'Breakout ini didukung volume beli yang kuat — lebih meyakinkan.' : bvd.isFakeBreakout ? 'Hati-hati! Harga naik tapi volume jual dominan — bisa jadi jebakan.' : ''}</i>`;
  }

  // VSA markers summary (last 3)
  const recentVSA = indicators.vsaMarkers.slice(-3);
  let vsaMarkersStr = '';
  if (recentVSA.length > 0) {
    vsaMarkersStr = '\n<b>🏷️ Sinyal VSA 3 Candle Terakhir:</b>\n';
    recentVSA.forEach(m => { vsaMarkersStr += `• ${m.text}\n`; });
  }

  // Support & Resistance
  const srZones = indicators.supportResistance.zones.slice(0, 4);
  let srStr = '';
  if (srZones.length > 0) {
    srStr = '\n<b>📐 Support &amp; Resistance Terdekat:</b>\n';
    srZones.forEach(z => {
      const emoji = z.type === 'support' ? '🟢 SUP' : '🔴 RES';
      srStr += `${emoji}: ${fmtRp(z.level)}\n`;
    });
  }

  // Fibonacci levels
  const fibs = indicators.fibonacci;
  const fib382 = fibs.f382[fibs.f382.length - 1]?.value ?? 0;
  const fib500 = fibs.f500[fibs.f500.length - 1]?.value ?? 0;
  const fib618 = fibs.f618[fibs.f618.length - 1]?.value ?? 0;

  // Action recommendation
  let action = '';
  let actionEmoji = '';
  let actionPlain = '';
  if (vsaSignal.includes('VCP PIVOT') || vsaSignal.includes('SNIPER') || vsaSignal.includes('DRY-UP')) {
    action = 'PERTIMBANGKAN BELI';
    actionEmoji = '🎯';
    actionPlain = 'Setup VCP terbentuk dan volume penjual mengering. Risiko kecil, potensi besar. Ideal untuk entry dengan stop loss ketat.';
  } else if (vsaSignal.includes('Selling Climax') || vsaSignal.includes('No Supply') || wyckoffPhase.includes('ACCUMULATION')) {
    action = 'AKUMULASI / WATCH';
    actionEmoji = '🟢';
    actionPlain = 'Ada tanda uang besar masuk diam-diam (smart money accumulation). Pantau terus — jika ada konfirmasi volume, ini bisa jadi entry yang bagus.';
  } else if (vsaSignal.includes('Distribusi') || vsaSignal.includes('Upthrust') || vsaSignal.includes('Buying Climax')) {
    action = 'WASPADA / KURANGI';
    actionEmoji = '🔴';
    actionPlain = 'Ada tanda distribusi — institusi mulai menjual. Jangan beli baru, dan jika sudah punya, pertimbangkan pasang stop loss lebih ketat atau ambil sebagian profit.';
  } else if (wyckoffPhase.includes('MARKUP')) {
    action = 'HOLD';
    actionEmoji = '📈';
    actionPlain = 'Tren naik masih aktif. Jika sudah punya, hold dan biarkan profit berkembang. Pasang trailing stop untuk proteksi.';
  } else {
    action = 'TUNGGU';
    actionEmoji = '⏳';
    actionPlain = 'Belum ada sinyal kuat. Sabar tunggu sampai ada setup yang lebih jelas — lebih baik ketinggalan daripada masuk di waktu yang salah.';
  }

  const msg = `<b>🔬 VCP + WYCKOFF + VSA — ${display}</b>
Harga: <b>${fmtRp(price)}</b> <i>(${changeStr} hari ini)</i>

━━━━━━━━━━━━━━━━━━━━
<b>📈 ANALISIS TEKNIKAL</b>
━━━━━━━━━━━━━━━━━━━━

${wyEmoji} <b>Fase Wyckoff:</b> ${wyckoffPhase}
<i>${wyPlain}</i>

<b>📊 Status VCP:</b>
${vcpStatus}

<b>⚡ Effort vs Result (EVR): ${evrScore > 0 ? '+' : ''}${evrScore.toFixed(2)}</b>
${evrEmoji} ${evrPlain}

<b>💡 Sinyal VSA Terbaru:</b>
${vsaSignal}

<b>📅 Candle Power (prediksi besok):</b>
${cppBias === 'BULLISH' ? '📈' : cppBias === 'BEARISH' ? '📉' : '➡️'} CPP: ${cppScore > 0 ? '+' : ''}${cppScore} → <b>${cppBias === 'BULLISH' ? 'Cenderung NAIK' : cppBias === 'BEARISH' ? 'Cenderung TURUN' : 'NETRAL/SIDEWAYS'}</b>${vsaMarkersStr}${bvdStr}${srStr}
<b>📐 Fibonacci Retracement:</b>
38.2%: ${fmtRp(fib382)} | 50.0%: ${fmtRp(fib500)} | 61.8%: ${fmtRp(fib618)}
<i>Support potensial jika harga pullback dari puncak</i>

━━━━━━━━━━━━━━━━━━━━
<b>💬 KESIMPULAN</b>
━━━━━━━━━━━━━━━━━━━━
${actionEmoji} <b>${action} — ${display}</b>
${actionPlain}

<i>⚠️ Analisis teknikal, bukan rekomendasi investasi. Selalu gunakan stop loss dan manajemen risiko yang baik.</i>`;

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

