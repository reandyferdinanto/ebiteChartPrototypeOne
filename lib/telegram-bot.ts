// ============================================================================
// EBITE CHART — TELEGRAM BOT SERVICE
// Commands: /rf, /cp, /vcp, /start, /help
// ============================================================================

import {
  calculateAllIndicators,
  ChartData,
} from './indicators';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8605664472:AAGUfoi3Toe89UaJMFAfEL9afE7lp6H6e6s';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ── Fetch historical data from Yahoo Finance (server-side) ─────────────────
async function fetchOHLCV(symbol: string, interval: string = '1d', days: number = 365): Promise<ChartData[]> {
  try {
    const YahooFinanceModule = (await import('yahoo-finance2')).default;
    const yf = new YahooFinanceModule();

    const period1 = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const period2 = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const result: any = await yf.chart(symbol, {
      period1,
      period2,
      interval: interval as any,
    });

    if (!result?.quotes?.length) return [];

    return result.quotes
      .filter((q: any) => q.date && q.close != null)
      .map((q: any) => ({
        time: Math.floor(new Date(q.date).getTime() / 1000),
        open: q.open ?? q.close,
        high: q.high ?? q.close,
        low: q.low ?? q.close,
        close: q.close,
        volume: q.volume ?? 0,
      }));
  } catch (err: any) {
    console.error('Telegram fetchOHLCV error:', err.message);
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
  try {
    const url = `${TELEGRAM_API}/sendMessage`;
    const body = {
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: true,
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('Telegram sendMessage error:', err);
    }
  } catch (e: any) {
    console.error('Telegram sendMessage exception:', e.message);
  }
}

// ── /start handler ─────────────────────────────────────────────────────────
export function buildStartMessage(): string {
  return `<b>🤖 Ebite Chart — Stock Analysis Bot</b>

Selamat datang! Bot ini menganalisis saham Indonesia menggunakan:
• Teori Wyckoff &amp; VSA
• VCP (Volatility Contraction Pattern)
• Ryan Filbert Swing Framework
• Predicta V4 (Next Candle Predictor)

<b>📋 Perintah tersedia:</b>

/rf [TICKER] — Analisis Ryan Filbert
<i>Contoh: /rf BBCA</i>

/cp [TICKER] — Candle Power &amp; Prediksi Candle Besok
<i>Contoh: /cp TLKM</i>

/vcp [TICKER] — Analisis VCP + Wyckoff + VSA
<i>Contoh: /vcp ASII</i>

/help — Tampilkan bantuan ini

<i>💡 Ticker tanpa .JK, contoh: BBCA, BBRI, TLKM, ASII</i>
<i>Untuk IHSG ketik: /rf IHSG</i>`;
}

// ── /rf [ticker] — Ryan Filbert Analysis ──────────────────────────────────
export async function handleRFCommand(ticker: string, chatId: number | string): Promise<void> {
  const symbol = normalizeSymbol(ticker);
  const display = displaySymbol(symbol);

  await sendTelegramMessage(chatId, `⏳ Menganalisis <b>${display}</b> dengan metode Ryan Filbert...`);

  const data = await fetchOHLCV(symbol, '1d', 500);
  if (data.length < 50) {
    await sendTelegramMessage(chatId, `❌ Data tidak cukup untuk <b>${display}</b>. Pastikan kode saham benar.\nContoh: /rf BBCA`);
    return;
  }

  const indicators = calculateAllIndicators(data);
  const rf = indicators.ryanFilbert;

  if (!rf) {
    await sendTelegramMessage(chatId, `❌ Gagal menghitung indikator untuk <b>${display}</b>.`);
    return;
  }

  const price = data[data.length - 1].close;
  const phaseEmoji = rf.phase === 2 ? '🚀' : rf.phase === 1 ? '🏗️' : rf.phase === 3 ? '⚠️' : '📉';
  const signalEmoji = rf.signal === 'BUY' ? '🟢' : rf.signal === 'WAIT' ? '🟡' : '🔴';
  const qualityEmoji = rf.setupQuality === 'PERFECT' ? '✨' : rf.setupQuality === 'GOOD' ? '👍' : rf.setupQuality === 'FAIR' ? '⚡' : '⛔';

  // Criteria checklist
  const chk = (v: boolean) => v ? '✅' : '❌';

  // Missing criteria list
  const missing: string[] = [];
  if (!rf.aboveMA150) missing.push('Harga di bawah MA150');
  if (!rf.aboveMA200) missing.push('Harga di bawah MA200');
  if (!rf.ma50Rising) missing.push('MA50 belum naik');
  if (!rf.ma150AboveMA200) missing.push('MA150 belum di atas MA200');
  if (!rf.baseVolumeDryUp) missing.push(`Volume base belum kering (${Math.round(rf.displayVolPct)}% dari normal, target <${rf.volDryUpTarget}%)`);
  if (!rf.breakoutVolumeConfirmed) missing.push('Belum ada volume breakout tinggi');

  const volBar = asciiBar(Math.max(0, 100 - rf.displayVolPct), 100, 10);
  const volStatus = rf.displayVolPct <= rf.volDryUpTarget
    ? `✅ KERING (${Math.round(rf.displayVolPct)}%)`
    : `❌ ${Math.round(rf.displayVolPct)}% (target <${rf.volDryUpTarget}%)`;

  let msg = `<b>📊 RYAN FILBERT — ${display}</b>
Harga: <b>${fmtRp(price)}</b>

${phaseEmoji} <b>Stan Weinstein: Fase ${rf.phase} — ${rf.phaseLabel}</b>
<i>${rf.phaseDesc}</i>

${qualityEmoji} Setup: <b>${rf.setupQuality}</b>
Score: <b>${rf.score}/100</b>
Base: <b>${rf.baseLabel}</b>  |  RS: <b>${rf.relativeStrength}</b>

<b>📋 Kriteria Checklist:</b>
${chk(rf.aboveMA150)} Harga &gt; MA150
${chk(rf.aboveMA200)} Harga &gt; MA200
${chk(rf.ma50Rising)} MA50 sedang naik
${chk(rf.ma150AboveMA200)} MA150 &gt; MA200

<b>📊 Volume Dry-Up (Ryan Filbert):</b>
${volBar} ${volStatus}
<i>Base avg vol vs 50-hari avg. Target: &lt;${rf.volDryUpTarget}% = volume kering</i>

${chk(rf.breakoutVolumeConfirmed)} Volume Breakout Konfirmasi

<b>🎯 Level Trading:</b>
Entry Pivot : <b>${fmtRp(rf.pivotEntry)}</b>
Stop Loss   : <b>${fmtRp(rf.stopLoss)}</b>
Target (2R) : <b>${fmtRp(rf.targetPrice)}</b>
R:R         : <b>${rf.riskReward}x</b>

${signalEmoji} <b>Sinyal: ${rf.signal}</b>
<i>${rf.signalReason}</i>`;

  if (missing.length > 0) {
    msg += `\n\n<b>⚠️ Kriteria belum terpenuhi:</b>\n`;
    missing.forEach(m => { msg += `• ${m}\n`; });
  }

  msg += `\n\n<i>💡 Ryan Filbert: Beli di Fase 2 B1/B2, volume kering, breakout di atas pivot dengan volume besar.</i>`;

  await sendTelegramMessage(chatId, msg);
}

// ── /cp [ticker] — Candle Power (Next Candle Prediction) ──────────────────
export async function handleCPCommand(ticker: string, chatId: number | string): Promise<void> {
  const symbol = normalizeSymbol(ticker);
  const display = displaySymbol(symbol);

  await sendTelegramMessage(chatId, `⏳ Menghitung Candle Power untuk <b>${display}</b>...`);

  const data = await fetchOHLCV(symbol, '1d', 365);
  if (data.length < 50) {
    await sendTelegramMessage(chatId, `❌ Data tidak cukup untuk <b>${display}</b>.`);
    return;
  }

  const indicators = calculateAllIndicators(data);
  const { cppScore, cppBias } = indicators.signals;
  const cpAnalysis = indicators.candlePowerAnalysis;
  const pv4 = indicators.predictaV4;
  const price = data[data.length - 1].close;
  const prevPrice = data[data.length - 2]?.close ?? price;
  const change = ((price - prevPrice) / prevPrice * 100);
  const changeStr = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';

  // Parse power from analysis string
  const powerMatch = cpAnalysis.match(/Power:\s*(\d+)/);
  const power = powerMatch ? parseInt(powerMatch[1]) : 50;

  // Determine colors / labels
  const powerEmoji = power >= 80 ? '🟢' : power >= 60 ? '🟡' : power >= 40 ? '🟠' : '🔴';
  const biasEmoji = cppBias === 'BULLISH' ? '📈' : cppBias === 'BEARISH' ? '📉' : '➡️';

  // CPP narrative
  let cppNarrative = '';
  if (cppScore > 1.5) cppNarrative = 'Momentum beli sangat kuat, besar kemungkinan candle besok HIJAU.';
  else if (cppScore > 0.5) cppNarrative = 'Tekanan beli dominan, candle besok cenderung naik.';
  else if (cppScore > -0.5) cppNarrative = 'Kekuatan seimbang, arah candle besok belum pasti (konsolidasi).';
  else if (cppScore > -1.5) cppNarrative = 'Tekanan jual dominan, candle besok cenderung turun.';
  else cppNarrative = 'Momentum jual sangat kuat, waspadai penurunan lebih lanjut.';

  // Power bar
  const powerBar = asciiBar(power, 100, 10);

  // Predicta V4 short summary
  let predictaStr = '';
  if (pv4) {
    const pEmoji = pv4.longPerfect ? '⚡ PERFECT TIME LONG' : pv4.shortPerfect ? '⚡ PERFECT TIME SHORT' :
                   pv4.verdict === 'STRONG_BULL' ? '🟢 STRONG BULL' :
                   pv4.verdict === 'BULL' ? '🟢 BULL' :
                   pv4.verdict === 'BEAR' ? '🔴 BEAR' :
                   pv4.verdict === 'STRONG_BEAR' ? '🔴 STRONG BEAR' : '⬜ NEUTRAL';

    predictaStr = `
<b>🔮 Predicta V4 (Multi-Indicator Confluence):</b>
Status: <b>${pEmoji}</b>
Long: ${pv4.longPct}% | Short: ${pv4.shortPct}%
Confluence: ${pv4.confluenceLong}/8 Long | ${pv4.confluenceShort}/8 Short
RSI: ${pv4.rsiValue.toFixed(1)} | ADX: ${pv4.adxValue.toFixed(1)} | Vol: ${pv4.volRatio.toFixed(1)}x
Delta: ${pv4.volumeDeltaValue > 0 ? '📈 BUY' : '📉 SELL'} | Trend: ${pv4.isUptrend ? '↗️ UP' : '↘️ DOWN'}`;
  }

  const msg = `<b>🕯️ CANDLE POWER — ${display}</b>
Harga: <b>${fmtRp(price)}</b> (${changeStr})

${powerEmoji} <b>Power Score: ${power}/100</b>
${powerBar}

<b>📊 CPP (Cumulative Power Prediction):</b>
Score: <b>${cppScore > 0 ? '+' : ''}${cppScore}</b>
Bias: <b>${biasEmoji} ${cppBias}</b>

<b>🔍 Analisis VSA/Wyckoff:</b>
${cpAnalysis.replace('Power: ' + power, '').trim()}

<b>📅 Prediksi Candle Besok:</b>
${biasEmoji} <b>${cppBias === 'BULLISH' ? 'NAIK' : cppBias === 'BEARISH' ? 'TURUN' : 'SIDEWAYS'}</b>
<i>${cppNarrative}</i>${predictaStr}

<b>📖 Cara Baca:</b>
• Power &gt;70 → Kemungkinan besok HIJAU/naik
• Power &lt;30 → Kemungkinan besok MERAH/turun
• CPP &gt;+0.5 → Momentum beli aktif
• CPP &lt;-0.5 → Momentum jual aktif

<i>⚠️ Bukan rekomendasi investasi. Selalu gunakan manajemen risiko.</i>`;

  await sendTelegramMessage(chatId, msg);
}

// ── /vcp [ticker] — VCP + Wyckoff + VSA Analysis ──────────────────────────
export async function handleVCPCommand(ticker: string, chatId: number | string): Promise<void> {
  const symbol = normalizeSymbol(ticker);
  const display = displaySymbol(symbol);

  await sendTelegramMessage(chatId, `⏳ Menganalisis VCP &amp; Wyckoff untuk <b>${display}</b>...`);

  const data = await fetchOHLCV(symbol, '1d', 365);
  if (data.length < 50) {
    await sendTelegramMessage(chatId, `❌ Data tidak cukup untuk <b>${display}</b>.`);
    return;
  }

  const indicators = calculateAllIndicators(data);
  const { bandar: vsaSignal, wyckoffPhase, vcpStatus, evrScore, cppScore, cppBias } = indicators.signals;
  const price = data[data.length - 1].close;
  const prevPrice = data[data.length - 2]?.close ?? price;
  const change = ((price - prevPrice) / prevPrice * 100);
  const changeStr = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';

  // Latest breakout delta
  const bvd = indicators.latestBreakoutDelta;
  let bvdStr = '';
  if (bvd) {
    const bvdEmoji = bvd.isRealBreakout ? '✅ REAL BREAKOUT' : bvd.isFakeBreakout ? '⚠️ FAKE BREAKOUT' : '📊 Breakout Detected';
    bvdStr = `
<b>🔷 Breakout Volume Delta:</b>
${bvdEmoji}
Bull Vol: ${(bvd.bullPct * 100).toFixed(1)}% | Bear Vol: ${(bvd.bearPct * 100).toFixed(1)}%
Level: ${fmtRp(bvd.level)}`;
  }

  // Wyckoff phase emoji
  const wyEmoji = wyckoffPhase.includes('MARKUP') || wyckoffPhase.includes('ACCUMULATION') ? '🟢' :
                  wyckoffPhase.includes('DISTRIBUTION') || wyckoffPhase.includes('MARKDOWN') ? '🔴' : '🟡';

  // EVR Score interpretation
  const evrStr = evrScore > 0.3 ? '🟢 Upaya besar → Hasil kecil (Absorpsi/Akumulasi)' :
                 evrScore < -0.3 ? '🔴 Upaya besar → Resistance kuat (Distribusi)' : '🟡 Seimbang';

  // VCP Fibonacci levels
  const fibs = indicators.fibonacci;
  const fib382 = fibs.f382[fibs.f382.length - 1]?.value ?? 0;
  const fib500 = fibs.f500[fibs.f500.length - 1]?.value ?? 0;
  const fib618 = fibs.f618[fibs.f618.length - 1]?.value ?? 0;

  // VSA markers summary (last 3)
  const recentVSA = indicators.vsaMarkers.slice(-3);
  let vsaMarkersStr = '';
  if (recentVSA.length > 0) {
    vsaMarkersStr = '\n<b>🏷️ Sinyal VSA Terbaru:</b>\n';
    recentVSA.forEach(m => {
      vsaMarkersStr += `• ${m.text}\n`;
    });
  }

  // Support & Resistance
  const srZones = indicators.supportResistance.zones.slice(0, 4);
  let srStr = '';
  if (srZones.length > 0) {
    srStr = '\n<b>📐 Support &amp; Resistance:</b>\n';
    srZones.forEach(z => {
      const emoji = z.type === 'support' ? '🟢 SUP' : '🔴 RES';
      srStr += `${emoji}: ${fmtRp(z.level)}\n`;
    });
  }

  // Action recommendation
  let action = '';
  let actionEmoji = '';
  if (vsaSignal.includes('VCP PIVOT') || vsaSignal.includes('SNIPER') || vsaSignal.includes('DRY-UP')) {
    action = 'PERTIMBANGKAN BELI — Setup VCP terbentuk, risiko rendah.';
    actionEmoji = '🎯';
  } else if (vsaSignal.includes('Selling Climax') || vsaSignal.includes('No Supply') || wyckoffPhase.includes('ACCUMULATION')) {
    action = 'AKUMULASI — Tanda Smart Money masuk. Monitor konfirmasi.';
    actionEmoji = '🟢';
  } else if (vsaSignal.includes('Distribusi') || vsaSignal.includes('Upthrust') || vsaSignal.includes('Buying Climax')) {
    action = 'WASPADA — Tanda distribusi/jebakan. Kurangi posisi.';
    actionEmoji = '🔴';
  } else if (wyckoffPhase.includes('MARKUP')) {
    action = 'HOLD — Trend naik aktif. Pasang trailing stop.';
    actionEmoji = '📈';
  } else {
    action = 'TUNGGU — Belum ada sinyal kuat. Pantau konfirmasi.';
    actionEmoji = '⏳';
  }

  const msg = `<b>🔬 VCP + WYCKOFF + VSA — ${display}</b>
Harga: <b>${fmtRp(price)}</b> (${changeStr})

${wyEmoji} <b>Wyckoff Phase:</b>
${wyckoffPhase}

<b>📊 VCP Status:</b>
${vcpStatus}

<b>⚡ Effort vs Result (EVR):</b>
Score: ${evrScore > 0 ? '+' : ''}${evrScore.toFixed(2)} → ${evrStr}

<b>💡 VSA Signal:</b>
${vsaSignal}

<b>📅 Candle Power Prediction:</b>
CPP: ${cppScore > 0 ? '+' : ''}${cppScore} → ${cppBias === 'BULLISH' ? '📈 Cenderung NAIK' : cppBias === 'BEARISH' ? '📉 Cenderung TURUN' : '➡️ NETRAL'}${vsaMarkersStr}${bvdStr}${srStr}
<b>📐 Fibonacci Retracement (100-bar):</b>
38.2%: ${fmtRp(fib382)}
50.0%: ${fmtRp(fib500)}
61.8%: ${fmtRp(fib618)}

${actionEmoji} <b>Rekomendasi:</b>
${action}

<i>⚠️ Analisis teknikal. Bukan rekomendasi investasi. Selalu gunakan stop loss.</i>`;

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
        await sendTelegramMessage(chatId, buildStartMessage());
        break;

      case 'help':
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

      default:
        // Ignore unknown commands / plain messages
        break;
    }
  } catch (err: any) {
    console.error('Telegram handler error:', err.message);
    await sendTelegramMessage(chatId, `⚠️ Terjadi kesalahan: ${err.message}`);
  }
}

