'use client';

import { useState } from 'react';
import Link from 'next/link';

// ── Types ────────────────────────────────────────────────────────────────────
interface AnalysisResult {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  // Wyckoff
  wyckoffPhase: string;
  wyckoffDetail: string;
  // VSA
  vsaSignal: string;
  vsaDetail: string;
  // VCP
  vcpStatus: string;
  vcpDetail: string;
  // CPP
  cppScore: number;
  cppBias: string;
  // Power
  candlePower: number;
  // EVR
  evrScore: number;
  // Suggestion
  suggestion: 'BUY' | 'WAIT' | 'SELL' | 'WATCH';
  confidence: number;   // 0-100
  reasons: string[];
  stopLoss?: number;
  target?: number;
  // Raw metrics
  ma20: number; ma50: number; ma200: number;
  volRatio: number; accRatio: number; rmv: number;
  momentum: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function calcSMA(arr: number[], period: number, i: number): number {
  if (i < period - 1) return 0;
  let s = 0;
  for (let j = i - period + 1; j <= i; j++) s += arr[j];
  return s / period;
}

function calcATR(H: number[], L: number[], C: number[], period: number, i: number): number {
  if (i < period) return H[i] - L[i];
  let s = 0;
  for (let j = i - period + 1; j <= i; j++) {
    const pc = C[j - 1] ?? C[j];
    s += Math.max(H[j] - L[j], Math.abs(H[j] - pc), Math.abs(L[j] - pc));
  }
  return s / period;
}

function calcCPP(C: number[], O: number[], H: number[], L: number[], V: number[], i: number): number {
  if (i < 14) return 0;
  let volSum = 0;
  for (let k = 0; k < 10; k++) volSum += V[i - k];
  const vSMA10 = volSum / 10 || 1;
  let cpp = 0;
  const lb = 5;
  for (let j = 0; j < lb; j++) {
    const k = i - j;
    const range = H[k] - L[k];
    const safeRange = range === 0 ? 0.0001 : range;
    const cbd = (C[k] - O[k]) / safeRange;
    const vam = V[k] / vSMA10;
    cpp += cbd * vam * ((lb - j) / lb);
  }
  return cpp;
}

function calcRMV(H: number[], L: number[], C: number[], i: number): number {
  if (i < 25) return 50;
  const vals: number[] = [];
  for (let k = i - 19; k <= i; k++) vals.push(calcATR(H, L, C, 5, k));
  const cur = vals[vals.length - 1];
  const mn = Math.min(...vals), mx = Math.max(...vals);
  if (mx === mn) return 50;
  return ((cur - mn) / (mx - mn)) * 100;
}

// ── MAIN ANALYSIS ENGINE ─────────────────────────────────────────────────────
function analyzeStock(data: any[], symbol: string, price: number, change: number, changePct: number): AnalysisResult {
  // Build OHLCV arrays
  const C: number[] = [], O: number[] = [], H: number[] = [], L: number[] = [], V: number[] = [];
  for (const d of data) {
    if (d.close !== null && d.volume > 0) {
      C.push(d.close); O.push(d.open); H.push(d.high); L.push(d.low); V.push(d.volume);
    }
  }
  const n = C.length;
  if (n < 50) {
    return {
      symbol, price, change, changePercent: changePct,
      wyckoffPhase: 'UNKNOWN', wyckoffDetail: 'Insufficient data',
      vsaSignal: 'UNKNOWN', vsaDetail: 'Need at least 50 candles',
      vcpStatus: 'UNKNOWN', vcpDetail: '',
      cppScore: 0, cppBias: 'NEUTRAL',
      candlePower: 50, evrScore: 0,
      suggestion: 'WATCH', confidence: 0,
      reasons: ['Insufficient historical data for analysis'],
      ma20: 0, ma50: 0, ma200: 0,
      volRatio: 1, accRatio: 1, rmv: 50, momentum: 0,
    };
  }

  const i = n - 1;

  // ── Core Indicators ───────────────────────────────────────────────────────
  const ma5   = calcSMA(C, 5,   i);
  const ma20  = calcSMA(C, 20,  i);
  const ma50  = calcSMA(C, 50,  i);
  const ma200 = calcSMA(C, 200, i);
  const atr14 = calcATR(H, L, C, 14, i);
  const rmv   = calcRMV(H, L, C, i);
  const cpp   = calcCPP(C, O, H, L, V, i);

  let volSum = 0, spSum = 0;
  for (let k = i - 19; k <= i; k++) { volSum += V[k]; spSum += H[k] - L[k]; }
  const volAvg20 = volSum / 20;
  const spAvg20  = spSum  / 20;

  const curC = C[i], curO = O[i], curH = H[i], curL = L[i], curV = V[i];
  const spread   = curH - curL;
  const body     = Math.abs(curC - curO);
  const isGreen  = curC >= curO;
  const volRatio = curV / (volAvg20 || 1);
  const spRatio  = spread / (spAvg20 || 1);
  const closePos = spread > 0 ? (curC - curL) / spread : 0.5;
  const upperWick = curH - Math.max(curO, curC);
  const lowerWick = Math.min(curO, curC) - curL;

  // Buying / selling pressure over last 10 bars
  let buyVol = 0, sellVol = 0;
  for (let k = i - 9; k <= i; k++) {
    if (C[k] > O[k]) buyVol  += V[k];
    else if (C[k] < O[k]) sellVol += V[k];
  }
  const accRatio = buyVol / (sellVol || 1);

  // Momentum (10-bar price change %)
  const momentum = ((C[i] - C[i - 10]) / C[i - 10]) * 100;

  // CPP bias
  const cppBias = cpp > 0.5 ? 'BULLISH' : cpp < -0.5 ? 'BEARISH' : 'NEUTRAL';
  const cppScore = parseFloat(cpp.toFixed(2));
  const candlePower = Math.max(0, Math.min(100, Math.round(50 + (cpp / 1.5) * 45)));

  // EVR — Effort vs Result  (positive = result > effort → effortless advance = bullish)
  const effort = volRatio;
  const result = spRatio;
  const evrScore = parseFloat((result - effort).toFixed(2));

  // ── WYCKOFF PHASE ─────────────────────────────────────────────────────────
  const inUptrend    = curC > ma20 && curC > ma50 && ma20 > ma50;
  const inDowntrend  = curC < ma20 && curC < ma50 && ma20 < ma50;
  const nearMA20Sup  = curL <= ma20 * 1.03 && curC >= ma20 * 0.97;
  const nearMA50Sup  = curL <= ma50 * 1.03 && curC >= ma50 * 0.97;

  let wyckoffPhase: string;
  let wyckoffDetail: string;

  if (inUptrend && curC > ma200) {
    wyckoffPhase = 'MARKUP';
    wyckoffDetail = 'Price above MA5/20/50 in uptrend. Composite Man is marking up prices.';
  } else if (inDowntrend) {
    wyckoffPhase = 'MARKDOWN';
    wyckoffDetail = 'Price below MA20/50 in downtrend. Smart money distributing or markdown active.';
  } else if (!inUptrend && !inDowntrend && curC > ma20 * 0.92) {
    // Accumulation: price consolidating near support, volatility decreasing
    wyckoffPhase = 'ACCUMULATION';
    wyckoffDetail = 'Price building base. Possible Wyckoff accumulation (Spring/Test phase).';
  } else if (inUptrend && curC < ma200 * 0.98) {
    wyckoffPhase = 'RE-ACCUMULATION';
    wyckoffDetail = 'Mid-trend consolidation. Smart money re-loading positions.';
  } else {
    wyckoffPhase = 'DISTRIBUTION';
    wyckoffDetail = 'Price weakening. Possible supply zone or distribution area.';
  }

  // Wyckoff sub-events
  const isSellingClimax = spread > atr14 * 2 && volRatio > 2.5 && !isGreen && closePos > 0.4;
  const isBuyingClimax  = spread > atr14 * 2 && volRatio > 2.5 && isGreen  && closePos < 0.4;
  const isSpring        = curL < ma50 && isGreen && lowerWick > body * 1.5 && volRatio < 0.8;
  const isUpthrust      = spread > atr14 * 1.5 && volRatio > 1.5 && closePos < 0.3 && !isGreen;
  const isNoDemand      = isGreen && spread < atr14 && volRatio < 0.8;
  const isNoSupply      = !isGreen && spread < atr14 && volRatio < 0.8;
  const isStoppingVol   = spread > atr14 * 1.5 && volRatio > 2.0 && closePos > 0.6 && !isGreen;
  const isSOS           = isGreen && volRatio > 1.5 && spRatio > 1.2 && accRatio > 1.3; // Sign of Strength
  const isSOW           = !isGreen && volRatio > 1.5 && spRatio > 1.2 && accRatio < 0.7; // Sign of Weakness

  if (isSellingClimax) { wyckoffPhase = 'SELLING CLIMAX'; wyckoffDetail = 'Wyckoff SC: Panic sell on high vol + close near top. Institutional absorption. Reversal likely.'; }
  if (isBuyingClimax)  { wyckoffPhase = 'BUYING CLIMAX';  wyckoffDetail = 'Wyckoff BC: Euphoria buy on high vol + close near bottom. Distribution likely.'; }
  if (isSpring)        { wyckoffPhase = 'SPRING';         wyckoffDetail = 'Wyckoff Spring: Brief dip below support on low vol then recovery. Strong buy setup!'; }
  if (isUpthrust)      { wyckoffPhase = 'UPTHRUST';       wyckoffDetail = 'Wyckoff UT: False breakout on high vol rejected. Trap for bulls. Distribution.'; }
  if (isStoppingVol)   { wyckoffPhase = 'STOPPING VOL';   wyckoffDetail = 'Wyckoff Stopping Volume: Smart money stopping the decline. Accumulation beginning.'; }

  // ── VSA SIGNAL ────────────────────────────────────────────────────────────
  const isDryUp    = (!isGreen || body < spread * 0.3) && volRatio <= 0.60 && accRatio > 0.8;
  const isIceberg  = volRatio > 1.2 && spRatio < 0.75 && accRatio > 1.2;
  const isHammer   = lowerWick > body * 1.2 && upperWick < body * 0.6 && (lowerWick / (spread || 1)) > 0.5;

  let vsaSignal = 'NEUTRAL';
  let vsaDetail = '';

  if (isSellingClimax)  { vsaSignal = 'SELLING CLIMAX'; vsaDetail = 'SC: Capitulation detected. Ultra-high vol red candle with mid-high close = institutions absorbing panic sells.'; }
  else if (isSpring)    { vsaSignal = 'SPRING';         vsaDetail = 'Spring: Price briefly below support then recovered. Low vol confirms no real selling = perfect re-entry.'; }
  else if (isStoppingVol){ vsaSignal='STOPPING VOL';    vsaDetail = 'SV: High vol on down candle but wide-range + decent close = demand absorbing supply.'; }
  else if (isSOS)       { vsaSignal = 'SIGN OF STRENGTH'; vsaDetail = 'SOS: High vol + wide spread + strong close + buying dominance = institutional demand.'; }
  else if (isNoSupply)  { vsaSignal = 'NO SUPPLY';      vsaDetail = 'NS: Low vol on pullback = supply exhausted. Smart money not selling = continuation likely.'; }
  else if (isDryUp)     { vsaSignal = 'DRY UP';         vsaDetail = 'DU: Low vol contraction = no interest from sellers. Price being held up by strong hands.'; }
  else if (isIceberg)   { vsaSignal = 'ICEBERG';        vsaDetail = 'IB: High vol but narrow spread = hidden accumulation. Smart money absorbing quietly.'; }
  else if (isHammer)    { vsaSignal = 'HAMMER';         vsaDetail = 'HMR: Long lower wick = strong rejection of lower prices. Buyer demand at support.'; }
  else if (isUpthrust)  { vsaSignal = 'UPTHRUST';       vsaDetail = 'UT: Rejected above resistance on high vol = trap. Smart money distributing.'; }
  else if (isBuyingClimax){ vsaSignal='BUYING CLIMAX';  vsaDetail = 'BC: Euphoria candle with closing near lows = distribution at peak.'; }
  else if (isSOW)       { vsaSignal = 'SIGN OF WEAKNESS'; vsaDetail = 'SOW: Wide spread down candle + high vol + weak close = institutions dumping.'; }
  else if (isNoDemand)  { vsaSignal = 'NO DEMAND';      vsaDetail = 'ND: Narrow green bar on low vol = lack of conviction. Potential reversal down.'; }
  else { vsaSignal = 'NEUTRAL'; vsaDetail = 'No clear VSA pattern. Market in equilibrium.'; }

  // ── VCP STATUS ────────────────────────────────────────────────────────────
  const last30High = Math.max(...H.slice(Math.max(0, i - 29), i + 1));
  const isNearHigh = curC > last30High * 0.80;
  let sp5 = 0, vl5 = 0;
  for (let k = Math.max(0, i - 4); k <= i; k++) { sp5 += H[k] - L[k]; vl5 += V[k]; }
  const isVCP = isNearHigh && (sp5 / 5) < spAvg20 * 0.75 && (vl5 / 5) < volAvg20 * 0.85;
  const isVCPPivot = isVCP && rmv <= 20;

  // Count contractions (simplified: look for progressively smaller pullbacks)
  let contractionCount = 0;
  let prevDepth = 0;
  for (let k = i - 40; k < i - 2; k++) {
    if (k < 0) continue;
    const localHigh = Math.max(...H.slice(Math.max(0, k - 5), k + 1));
    const localLow  = Math.min(...L.slice(k, Math.min(n, k + 5)));
    const depth = (localHigh - localLow) / localHigh * 100;
    if (prevDepth > 0 && depth < prevDepth * 0.7 && depth < 15) contractionCount++;
    prevDepth = depth;
  }

  let vcpStatus = 'NO VCP';
  let vcpDetail = '';
  if (isVCPPivot) {
    vcpStatus = 'VCP PIVOT';
    vcpDetail = `RMV=${Math.round(rmv)} (≤20 = pivot zone). ${contractionCount} contractions detected. Breakout imminent. Optimal entry point.`;
  } else if (isVCP) {
    vcpStatus = 'VCP BASE';
    vcpDetail = `Volatility contracting (RMV=${Math.round(rmv)}). Price near 30-day high. Vol drying up. Building base.`;
  } else if (contractionCount >= 2) {
    vcpStatus = 'CONTRACTING';
    vcpDetail = `${contractionCount} pullback contractions detected. VCP pattern forming but not yet at pivot.`;
  } else {
    vcpStatus = 'NO VCP';
    vcpDetail = 'No Volatility Contraction Pattern detected. Price not consolidating constructively.';
  }

  // ── HAKA COOLDOWN ─────────────────────────────────────────────────────────
  let hakaIdx = -1, hakaVolR = 0;
  for (let k = Math.max(0, i - 15); k < i - 1; k++) {
    const sp_k = H[k] - L[k];
    const bd_k = Math.abs(C[k] - O[k]);
    const vr_k = V[k] / (volAvg20 || 1);
    const bp_k = sp_k > 0 ? (C[k] - L[k]) / sp_k : 0;
    const m20k  = calcSMA(C, 20, k);
    if (C[k] > O[k] && vr_k > 1.8 && bd_k > sp_k * 0.55 && bp_k > 0.65 && C[k] > m20k && vr_k > hakaVolR) {
      hakaIdx = k; hakaVolR = vr_k;
    }
  }
  const cooldownBars = hakaIdx >= 0 ? i - hakaIdx : 0;
  let cooldownSell = 0, cooldownTotal = 0;
  if (hakaIdx >= 0) {
    for (let k = hakaIdx + 1; k <= i; k++) {
      if (C[k] < O[k]) cooldownSell += V[k];
      cooldownTotal += V[k];
    }
  }
  const cdRatio = cooldownTotal > 0 ? cooldownSell / cooldownTotal : 0;
  const isHaka = hakaIdx >= 0 && cooldownBars >= 2 && cooldownBars <= 8 &&
    curC > ma20 && cdRatio < 0.40 && cppBias !== 'BEARISH' &&
    (C[hakaIdx] - curC) / C[hakaIdx] * 100 < 5;

  // ── FINAL SUGGESTION ENGINE ───────────────────────────────────────────────
  let bullScore = 0, bearScore = 0;
  const reasons: string[] = [];

  // Wyckoff scoring
  if (['MARKUP', 'SPRING', 'SELLING CLIMAX', 'STOPPING VOL', 'ACCUMULATION', 'RE-ACCUMULATION'].includes(wyckoffPhase)) {
    bullScore += wyckoffPhase === 'SPRING' ? 3 : wyckoffPhase === 'SELLING CLIMAX' ? 2 : 1;
    reasons.push(`Wyckoff: ${wyckoffPhase} — ${wyckoffDetail.split('.')[0]}`);
  }
  if (['MARKDOWN', 'DISTRIBUTION', 'UPTHRUST', 'BUYING CLIMAX'].includes(wyckoffPhase)) {
    bearScore += wyckoffPhase === 'UPTHRUST' ? 3 : wyckoffPhase === 'BUYING CLIMAX' ? 2 : 1;
    reasons.push(`Wyckoff: ${wyckoffPhase} — ${wyckoffDetail.split('.')[0]}`);
  }

  // VSA scoring
  const bullVSA = ['SELLING CLIMAX','SPRING','STOPPING VOL','SIGN OF STRENGTH','NO SUPPLY','DRY UP','ICEBERG','HAMMER'];
  const bearVSA = ['UPTHRUST','BUYING CLIMAX','SIGN OF WEAKNESS','NO DEMAND'];
  if (bullVSA.includes(vsaSignal)) {
    bullScore += vsaSignal === 'SIGN OF STRENGTH' || vsaSignal === 'SPRING' ? 3 : 2;
    reasons.push(`VSA: ${vsaSignal} — ${vsaDetail.split('.')[0]}`);
  }
  if (bearVSA.includes(vsaSignal)) {
    bearScore += vsaSignal === 'UPTHRUST' || vsaSignal === 'SIGN OF WEAKNESS' ? 3 : 2;
    reasons.push(`VSA: ${vsaSignal} — ${vsaDetail.split('.')[0]}`);
  }

  // VCP scoring
  if (vcpStatus === 'VCP PIVOT') { bullScore += 3; reasons.push(`VCP: PIVOT formed — ${vcpDetail.split('.')[0]}`); }
  else if (vcpStatus === 'VCP BASE') { bullScore += 1; reasons.push(`VCP: Base building — ${vcpDetail.split('.')[0]}`); }
  else if (vcpStatus === 'CONTRACTING') { bullScore += 1; reasons.push(`VCP: Contracting pattern`); }

  // CPP / PDI
  if (cppBias === 'BULLISH') { bullScore += 2; reasons.push(`CPP +${cppScore} — Next candle bullish bias (momentum building)`); }
  if (cppBias === 'BEARISH') { bearScore += 2; reasons.push(`CPP ${cppScore} — Next candle bearish bias (momentum fading)`); }

  // EVR
  if (evrScore > 0.3 && isGreen) { bullScore += 1; reasons.push(`EVR +${evrScore} — Effortless advance (result > effort = bullish)`); }
  if (evrScore < -0.5 && !isGreen) { bearScore += 1; reasons.push(`EVR ${evrScore} — Effort without result (absorption / distribution)`); }

  // MA positioning
  if (curC > ma20 && curC > ma50) { bullScore += 1; reasons.push(`MA: Price above MA20 & MA50 (uptrend structure intact)`); }
  if (curC < ma20 && curC < ma50) { bearScore += 1; reasons.push(`MA: Price below MA20 & MA50 (downtrend structure)`); }
  if (nearMA20Sup && (isDryUp || isNoSupply || isHammer)) { bullScore += 2; reasons.push(`MA Support: Price testing MA20 with low supply — classic buy zone`); }
  if (nearMA50Sup && (isDryUp || isNoSupply)) { bullScore += 1; reasons.push(`MA Support: Testing MA50 with dry up — deeper accumulation zone`); }

  // HAKA
  if (isHaka) {
    bullScore += 3;
    reasons.push(`HAKA Cooldown: ${cooldownBars} bars of healthy pause (sell vol=${Math.round(cdRatio*100)}%) after aggressive markup — ready to resume`);
  }

  // Accumulation ratio
  if (accRatio > 1.5) { bullScore += 1; reasons.push(`Accumulation: Buy vol ${accRatio.toFixed(1)}x vs sell vol over last 10 bars`); }
  if (accRatio < 0.6) { bearScore += 1; reasons.push(`Distribution: Sell vol dominates (acc ratio ${accRatio.toFixed(1)})`); }

  // Momentum
  if (momentum > 3 && curC > ma20) { bullScore += 1; reasons.push(`Momentum: +${momentum.toFixed(1)}% over 10 bars above MA20`); }
  if (momentum < -5) { bearScore += 1; reasons.push(`Momentum: ${momentum.toFixed(1)}% over 10 bars — downward pressure`); }

  // Determine suggestion
  let suggestion: 'BUY' | 'WAIT' | 'SELL' | 'WATCH';
  let confidence: number;

  const total = bullScore + bearScore;
  const bullPct = total > 0 ? (bullScore / total) * 100 : 50;

  if (bullScore >= 6 && bearScore <= 1) {
    suggestion = 'BUY';
    confidence = Math.min(95, 60 + bullScore * 4);
  } else if (bearScore >= 6 && bullScore <= 1) {
    suggestion = 'SELL';
    confidence = Math.min(95, 60 + bearScore * 4);
  } else if (bullScore >= 3 && bullScore > bearScore) {
    suggestion = 'WAIT';  // Good setup forming, wait for confirmation
    confidence = Math.round(bullPct);
    reasons.push('Wait for volume confirmation or next candle close above resistance before entering');
  } else if (bearScore >= 3 && bearScore > bullScore) {
    suggestion = 'SELL';
    confidence = Math.round(100 - bullPct);
    reasons.push('Consider reducing position or setting tight stop');
  } else {
    suggestion = 'WATCH';
    confidence = 40;
    reasons.push('Mixed signals — no clear directional bias. Monitor for breakout or breakdown.');
  }

  // Stop Loss & Target (simple ATR-based)
  const stopLoss = suggestion === 'BUY'  ? parseFloat((curC - atr14 * 1.5).toFixed(0))
                 : suggestion === 'SELL' ? parseFloat((curC + atr14 * 1.5).toFixed(0))
                 : undefined;
  const target   = suggestion === 'BUY'  ? parseFloat((curC + atr14 * 3).toFixed(0))
                 : suggestion === 'SELL' ? parseFloat((curC - atr14 * 3).toFixed(0))
                 : undefined;

  return {
    symbol, price, change, changePercent: changePct,
    wyckoffPhase, wyckoffDetail, vsaSignal, vsaDetail, vcpStatus, vcpDetail,
    cppScore, cppBias, candlePower, evrScore,
    suggestion, confidence, reasons, stopLoss, target,
    ma20, ma50, ma200, volRatio, accRatio, rmv, momentum,
  };
}

// ── ICON COMPONENTS ───────────────────────────────────────────────────────────
const Spinner = () => (
  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);
const IconSearch = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
const IconClose = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const IconCheck = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
);
const IconWarning = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);
const IconInfo = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconTrend = ({ up }: { up: boolean }) => (
  <svg className={`w-3.5 h-3.5`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {up
      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
      : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />}
  </svg>
);
const IconTarget = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" strokeWidth={2} /><circle cx="12" cy="12" r="6" strokeWidth={2} /><circle cx="12" cy="12" r="2" strokeWidth={2} />
  </svg>
);
const IconShield = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

// ── SUGGESTION CARD CONFIG ────────────────────────────────────────────────────
const SUGGESTION_CONFIG = {
  BUY: {
    bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', text: 'text-emerald-300',
    badge: 'bg-emerald-500/30 text-emerald-200 border-emerald-500/50',
    label: 'BUY', icon: <IconCheck />,
    desc: 'Strong bullish setup — Consider entering position',
  },
  WAIT: {
    bg: 'bg-blue-500/20', border: 'border-blue-500/40', text: 'text-blue-300',
    badge: 'bg-blue-500/30 text-blue-200 border-blue-500/50',
    label: 'WAIT FOR SETUP', icon: <IconInfo />,
    desc: 'Bullish bias but needs confirmation — Wait for next candle',
  },
  SELL: {
    bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-300',
    badge: 'bg-red-500/30 text-red-200 border-red-500/50',
    label: 'CONSIDER SELL', icon: <IconWarning />,
    desc: 'Bearish signals dominant — Reduce or exit position',
  },
  WATCH: {
    bg: 'bg-gray-500/20', border: 'border-gray-500/30', text: 'text-gray-300',
    badge: 'bg-gray-500/30 text-gray-200 border-gray-500/40',
    label: 'WATCH', icon: <IconInfo />,
    desc: 'Mixed signals — No clear edge. Monitor closely.',
  },
} as const;

const PHASE_COLOR: Record<string, string> = {
  'MARKUP': 'text-emerald-400', 'SPRING': 'text-emerald-300', 'SELLING CLIMAX': 'text-emerald-400',
  'STOPPING VOL': 'text-sky-400', 'ACCUMULATION': 'text-blue-400', 'RE-ACCUMULATION': 'text-cyan-400',
  'MARKDOWN': 'text-red-400', 'DISTRIBUTION': 'text-red-400', 'UPTHRUST': 'text-orange-400',
  'BUYING CLIMAX': 'text-orange-400',
};
const VSA_COLOR: Record<string, string> = {
  'SELLING CLIMAX': 'text-emerald-400', 'SPRING': 'text-emerald-300', 'STOPPING VOL': 'text-sky-400',
  'SIGN OF STRENGTH': 'text-emerald-400', 'NO SUPPLY': 'text-blue-400',
  'DRY UP': 'text-blue-400', 'ICEBERG': 'text-cyan-400', 'HAMMER': 'text-emerald-300',
  'UPTHRUST': 'text-orange-400', 'BUYING CLIMAX': 'text-red-400', 'SIGN OF WEAKNESS': 'text-red-400',
  'NO DEMAND': 'text-yellow-400', 'NEUTRAL': 'text-gray-400',
};

// ── RESULT CARD ────────────────────────────────────────────────────────────────
function ResultCard({ r, onRemove }: { r: AnalysisResult; onRemove: () => void }) {
  const cfg = SUGGESTION_CONFIG[r.suggestion];
  const fmt = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 0 });

  return (
    <div className={`backdrop-blur-xl border rounded-2xl shadow-xl overflow-hidden ${cfg.border} ${cfg.bg}`}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${cfg.badge} font-bold text-sm`}>
            {cfg.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base">{r.symbol}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${cfg.badge}`}>
                {cfg.label}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
              <span>Rp {fmt(r.price)}</span>
              <span className={`flex items-center gap-0.5 ${r.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                <IconTrend up={r.changePercent >= 0} />
                {r.changePercent >= 0 ? '+' : ''}{r.changePercent.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Confidence meter */}
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs text-gray-400 mb-1">Confidence</span>
            <div className="flex items-center gap-1.5">
              <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    r.confidence >= 70 ? 'bg-emerald-400' : r.confidence >= 50 ? 'bg-blue-400' : 'bg-yellow-400'
                  }`}
                  style={{ width: `${r.confidence}%` }}
                />
              </div>
              <span className={`text-xs font-bold ${cfg.text}`}>{r.confidence}%</span>
            </div>
          </div>
          <button onClick={onRemove} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition">
            <IconClose />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* ── 3-col metric badges ── */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          <Metric label="Wyckoff" value={r.wyckoffPhase} color={PHASE_COLOR[r.wyckoffPhase] ?? 'text-gray-300'} />
          <Metric label="VSA" value={r.vsaSignal} color={VSA_COLOR[r.vsaSignal] ?? 'text-gray-300'} />
          <Metric label="VCP" value={r.vcpStatus}
            color={r.vcpStatus === 'VCP PIVOT' ? 'text-amber-300' : r.vcpStatus === 'VCP BASE' ? 'text-violet-300' : 'text-gray-400'} />
          <Metric label="CPP" value={`${r.cppScore > 0 ? '+' : ''}${r.cppScore}`}
            color={r.cppBias === 'BULLISH' ? 'text-emerald-400' : r.cppBias === 'BEARISH' ? 'text-red-400' : 'text-gray-400'} />
          <Metric label="Power" value={`${r.candlePower}`}
            color={r.candlePower >= 70 ? 'text-emerald-400' : r.candlePower >= 50 ? 'text-blue-400' : 'text-red-400'} />
          <Metric label="RMV" value={`${r.rmv}`}
            color={r.rmv <= 20 ? 'text-amber-300' : r.rmv <= 40 ? 'text-blue-400' : 'text-gray-400'} />
        </div>

        {/* ── Suggestion box ── */}
        <div className={`rounded-xl border px-3 py-3 ${cfg.border} bg-black/20`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`font-bold text-sm ${cfg.text}`}>{cfg.icon}</span>
            <span className={`font-bold text-sm ${cfg.text}`}>{cfg.label}</span>
            <span className="text-xs text-gray-400">— {cfg.desc}</span>
          </div>

          {/* Stop loss & target */}
          {(r.stopLoss || r.target) && (
            <div className="flex flex-wrap gap-2 mb-2">
              {r.stopLoss && (
                <span className="flex items-center gap-1 bg-red-500/15 border border-red-500/30 text-red-300 rounded-lg px-2 py-1 text-xs font-mono">
                  <IconShield /> SL: Rp {fmt(r.stopLoss)}
                </span>
              )}
              {r.target && (
                <span className="flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-lg px-2 py-1 text-xs font-mono">
                  <IconTarget /> TP: Rp {fmt(r.target)}
                </span>
              )}
              {r.stopLoss && r.target && (
                <span className="flex items-center gap-1 bg-blue-500/15 border border-blue-500/30 text-blue-300 rounded-lg px-2 py-1 text-xs font-mono">
                  R:R {Math.abs((r.target - r.price) / (r.price - r.stopLoss)).toFixed(1)}x
                </span>
              )}
            </div>
          )}

          {/* Reasons list */}
          <ul className="space-y-1.5">
            {r.reasons.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-gray-300">
                <span className={`mt-0.5 flex-shrink-0 ${cfg.text}`}>
                  {idx === 0
                    ? <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" /></svg>
                    : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" strokeWidth="1.5" /></svg>
                  }
                </span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── MA levels ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: 'MA20', val: r.ma20, ref: r.price },
            { label: 'MA50', val: r.ma50, ref: r.price },
            { label: 'MA200', val: r.ma200, ref: r.price },
            { label: 'Mom 10d', val: r.momentum, ref: 0, pct: true },
          ].map(({ label, val, ref, pct }) => {
            if (val === 0) return null;
            const above = !pct ? val < ref : val > 0;
            return (
              <div key={label} className="bg-white/[0.03] border border-white/[0.07] rounded-lg px-2 py-1.5">
                <div className="text-[10px] text-gray-500 uppercase mb-0.5">{label}</div>
                <div className={`text-xs font-bold ${above ? 'text-emerald-400' : 'text-red-400'}`}>
                  {pct ? `${val > 0 ? '+' : ''}${val.toFixed(1)}%` : `Rp ${fmt(val)}`}
                </div>
                {!pct && (
                  <div className={`text-[10px] ${above ? 'text-emerald-500' : 'text-red-500'}`}>
                    {above ? 'Price above' : 'Price below'}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Wyckoff + VSA detail ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Detail label="Wyckoff Analysis" value={r.wyckoffDetail} color={PHASE_COLOR[r.wyckoffPhase] ?? 'text-gray-300'} />
          <Detail label="VSA Analysis" value={r.vsaDetail} color={VSA_COLOR[r.vsaSignal] ?? 'text-gray-300'} />
          <Detail label="VCP Analysis" value={r.vcpDetail}
            color={r.vcpStatus === 'VCP PIVOT' ? 'text-amber-300' : 'text-gray-300'} />
        </div>

        {/* ── View Chart button ── */}
        <div className="flex justify-end">
          <Link
            href={`/?symbol=${r.symbol}&interval=1d&scalpSignal=${r.suggestion}&scalpLabel=${encodeURIComponent(r.suggestion + ': ' + r.vsaSignal)}`}
            className="flex items-center gap-2 bg-blue-500/25 hover:bg-blue-500/40 border border-blue-500/40 text-blue-300 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            View Chart (Daily)
          </Link>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-lg px-2 py-1.5 min-w-0">
      <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5 truncate">{label}</div>
      <div className={`text-xs font-bold leading-tight truncate ${color}`}>{value}</div>
    </div>
  );
}

function Detail({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-black/20 border border-white/[0.07] rounded-xl px-3 py-2">
      <div className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${color}`}>{label}</div>
      <p className="text-xs text-gray-300 leading-relaxed">{value || '—'}</p>
    </div>
  );
}

// ── PAGE COMPONENT ─────────────────────────────────────────────────────────────
export default function AnalysisPage() {
  const [inputValue, setInputValue] = useState('');
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [analyzingSymbol, setAnalyzingSymbol] = useState<string | null>(null);
  const [error, setError] = useState('');

  const parseInputSymbols = (raw: string): string[] => {
    // Accept comma, space, newline separated tickers
    return raw
      .split(/[\s,;\n]+/)
      .map(s => s.trim().toUpperCase().replace('.JK', ''))
      .filter(s => s.length >= 2 && s.length <= 6 && /^[A-Z0-9]+$/.test(s))
      .filter((v, i, arr) => arr.indexOf(v) === i); // dedupe
  };

  const analyzeSymbols = async () => {
    const symbols = parseInputSymbols(inputValue);
    if (symbols.length === 0) {
      setError('Enter at least one ticker symbol (e.g. BBCA, TLKM, FIRE)');
      return;
    }
    setError('');

    for (const ticker of symbols) {
      // Skip if already analyzed
      if (analysisResults.find(r => r.symbol === ticker)) continue;

      setAnalyzingSymbol(ticker);
      try {
        const symbol = `${ticker}.JK`;

        const [histRes, quoteRes] = await Promise.all([
          fetch(`/api/stock/historical?symbol=${symbol}&interval=1d`),
          fetch(`/api/stock/quote?symbol=${symbol}`),
        ]);

        if (!histRes.ok || !quoteRes.ok) {
          setAnalysisResults(prev => prev.concat({
            symbol: ticker, price: 0, change: 0, changePercent: 0,
            wyckoffPhase: 'ERROR', wyckoffDetail: `Failed to fetch data for ${ticker}`,
            vsaSignal: 'ERROR', vsaDetail: '',
            vcpStatus: 'ERROR', vcpDetail: '',
            cppScore: 0, cppBias: 'NEUTRAL', candlePower: 0, evrScore: 0,
            suggestion: 'WATCH', confidence: 0,
            reasons: [`Could not load data for ${ticker}. Check if the ticker is valid on IDX.`],
            ma20: 0, ma50: 0, ma200: 0, volRatio: 0, accRatio: 0, rmv: 0, momentum: 0,
          }));
          continue;
        }

        const [hist, quote] = await Promise.all([histRes.json(), quoteRes.json()]);

        if (!hist.data || hist.data.length < 50) {
          setAnalysisResults(prev => prev.concat({
            symbol: ticker, price: quote.price ?? 0, change: quote.change ?? 0, changePercent: quote.changePercent ?? 0,
            wyckoffPhase: 'INSUFFICIENT', wyckoffDetail: 'Less than 50 candles available',
            vsaSignal: 'UNKNOWN', vsaDetail: '',
            vcpStatus: 'UNKNOWN', vcpDetail: '',
            cppScore: 0, cppBias: 'NEUTRAL', candlePower: 0, evrScore: 0,
            suggestion: 'WATCH', confidence: 0,
            reasons: ['Insufficient historical data. Try a different timeframe or check the ticker.'],
            ma20: 0, ma50: 0, ma200: 0, volRatio: 0, accRatio: 0, rmv: 0, momentum: 0,
          }));
          continue;
        }

        const result = analyzeStock(hist.data, ticker, quote.price, quote.change, quote.changePercent);
        setAnalysisResults(prev => [result, ...prev]);

      } catch (e: any) {
        console.error(`Analysis error for ${ticker}:`, e);
        setAnalysisResults(prev => prev.concat({
          symbol: ticker, price: 0, change: 0, changePercent: 0,
          wyckoffPhase: 'ERROR', wyckoffDetail: e.message ?? 'Unknown error',
          vsaSignal: 'ERROR', vsaDetail: '',
          vcpStatus: 'ERROR', vcpDetail: '',
          cppScore: 0, cppBias: 'NEUTRAL', candlePower: 0, evrScore: 0,
          suggestion: 'WATCH', confidence: 0,
          reasons: [`Error: ${e.message ?? 'Network error'}`],
          ma20: 0, ma50: 0, ma200: 0, volRatio: 0, accRatio: 0, rmv: 0, momentum: 0,
        }));
      }
    }

    setAnalyzingSymbol(null);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      analyzeSymbols();
    }
  };

  const removeResult = (symbol: string) => {
    setAnalysisResults(prev => prev.filter(r => r.symbol !== symbol));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-white">

      {/* Nav */}
      <nav className="backdrop-blur-xl bg-black/30 border-b border-white/10 px-3 py-2.5 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="font-bold text-sm bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent hidden sm:block">
              Stock Analysis
            </span>
          </div>
          <div className="flex gap-1.5">
            <Link href="/" className="backdrop-blur-md bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Chart
            </Link>
            <Link href="/scalp-screener" className="backdrop-blur-md bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Scalp
            </Link>
            <Link href="/vcp-screener" className="backdrop-blur-md bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              VCP
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-3 md:p-6 space-y-4">

        {/* Header */}
        <div className="text-center pt-2">
          <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent mb-1">
            Manual Stock Analysis
          </h1>
          <p className="text-sm text-gray-400">
            Wyckoff Theory + VSA + VCP + CPP — Get actionable Buy / Wait / Sell suggestion with reasons
          </p>
        </div>

        {/* Input section */}
        <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl p-4 shadow-2xl">
          <div className="mb-3">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-2">
              Enter stock tickers (comma or space separated)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                placeholder="e.g. BBCA, TLKM, FIRE, LAJU, ASII"
                className="flex-1 px-3 py-2.5 backdrop-blur-md bg-black/30 border border-white/15 rounded-xl text-white placeholder:text-gray-600 text-sm focus:ring-2 focus:ring-violet-500/50 focus:outline-none transition"
              />
              <button
                onClick={analyzeSymbols}
                disabled={!inputValue.trim() || !!analyzingSymbol}
                className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition shadow-md ${
                  !inputValue.trim() || analyzingSymbol
                    ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed border border-gray-500/20'
                    : 'bg-violet-500/30 hover:bg-violet-500/40 text-white border border-violet-500/40'
                }`}
              >
                {analyzingSymbol ? <><Spinner />Analyzing {analyzingSymbol}…</> : <><IconSearch />Analyze</>}
              </button>
            </div>
            {error && (
              <p className="text-xs text-red-400 flex items-center gap-1 mt-2"><IconWarning />{error}</p>
            )}
          </div>

          {/* Quick picks */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] text-gray-500 self-center mr-1 uppercase tracking-wide">Quick:</span>
            {['BBCA','BBRI','TLKM','ASII','FIRE','LAJU','GOTO','BREN','MDKA','ANTM'].map(s => (
              <button
                key={s}
                onClick={() => setInputValue(v => v ? v + ', ' + s : s)}
                className="px-2 py-0.5 rounded-lg text-xs bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10 transition"
              >
                {s}
              </button>
            ))}
          </div>

          {/* How it works */}
          <div className="mt-4 pt-3 border-t border-white/5">
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mb-2">How it works</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: 'Wyckoff', desc: 'Identifies market phase: Accumulation, Markup, Distribution, Markdown, Spring, Upthrust', color: 'text-blue-400' },
                { label: 'VSA', desc: 'Volume Spread Analysis: No Supply, Selling Climax, Iceberg, Sign of Strength, etc.', color: 'text-emerald-400' },
                { label: 'VCP', desc: 'Volatility Contraction Pattern: Measures pivot readiness via RMV index (≤20 = ready)', color: 'text-amber-400' },
                { label: 'CPP / PDI', desc: 'Candle Power Prediction: Weighted buy/sell pressure index for next-candle bias', color: 'text-violet-400' },
              ].map(({ label, desc, color }) => (
                <div key={label} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-2">
                  <div className={`text-xs font-bold mb-1 ${color}`}>{label}</div>
                  <p className="text-[10px] text-gray-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        {analysisResults.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-300 text-sm flex items-center gap-2">
                <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {analysisResults.length} Stock{analysisResults.length > 1 ? 's' : ''} Analyzed
              </h2>
              <button
                onClick={() => setAnalysisResults([])}
                className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1 transition"
              >
                <IconClose /> Clear all
              </button>
            </div>

            {/* Summary bar */}
            <div className="flex gap-2 flex-wrap">
              {(['BUY','WAIT','SELL','WATCH'] as const).map(s => {
                const count = analysisResults.filter(r => r.suggestion === s).length;
                if (count === 0) return null;
                const cfg = SUGGESTION_CONFIG[s];
                return (
                  <span key={s} className={`px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.badge}`}>
                    {cfg.label}: {count}
                  </span>
                );
              })}
            </div>

            {analysisResults.map(r => (
              <ResultCard key={r.symbol} r={r} onRemove={() => removeResult(r.symbol)} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {analysisResults.length === 0 && !analyzingSymbol && (
          <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl p-12 text-center shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center border border-violet-500/30">
              <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-2">Ready for Analysis</h3>
            <p className="text-gray-400 text-sm mb-1">Enter any IDX stock ticker above</p>
            <p className="text-gray-500 text-xs">Powered by Wyckoff + VSA + VCP + CPP algorithm</p>
          </div>
        )}
      </div>
    </div>
  );
}

