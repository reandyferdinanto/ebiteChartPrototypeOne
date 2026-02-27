'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
  const evrScore = parseFloat((spRatio - volRatio).toFixed(2));

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

  // ── MOMENTUM SUSTAINABILITY ANALYSIS ────────────────────────────────────
  const mom3  = n >= 4  ? ((C[i] - C[i-3])  / C[i-3])  * 100 : 0;
  const mom5  = n >= 6  ? ((C[i] - C[i-5])  / C[i-5])  * 100 : 0;

  // Recent 3-bar buy/sell pressure (more current than 10-bar)
  let recentBuyVol = 0, recentSellVol = 0;
  for (let k = i - 2; k <= i; k++) {
    if (C[k] > O[k]) recentBuyVol += V[k];
    else recentSellVol += V[k];
  }
  const recentAccRatio = recentBuyVol / (recentSellVol || 1);

  // Consecutive closes trending higher
  const last3Rising = n >= 4 && C[i] > C[i-1] && C[i-1] > C[i-2];

  // Overextension: how far above MA20 is price?
  const distFromMA20 = ma20 > 0 ? ((curC - ma20) / ma20) * 100 : 0;
  const distFromMA50 = ma50 > 0 ? ((curC - ma50) / ma50) * 100 : 0;
  const isOverextended      = distFromMA20 > 15;
  const isExtremeOverext    = distFromMA20 > 30;

  // Momentum fading: short-term weakening vs mid-term
  const momentumFading       = mom3 < mom5 * 0.4 && momentum > 10;
  const momentumAccelerating = mom3 > 0 && mom3 > mom5 * 0.4;

  // Consecutive up-bar streak
  let consecutiveUp = 0;
  for (let k = i; k >= Math.max(1, i - 9); k--) {
    if (C[k] > C[k-1]) consecutiveUp++;
    else break;
  }

  // Volume exhaustion on recent bars
  const recentVolAvg    = n >= 4 ? (V[i] + V[i-1] + V[i-2]) / 3 : volAvg20;
  const volumeExhaustion = recentVolAvg < volAvg20 * 0.7 && momentum > 20;

  // ── FINAL SUGGESTION ENGINE ───────────────────────────────────────────────
  let bullScore = 0, bearScore = 0;
  const reasons: string[] = [];
  const warnings: string[] = [];

  // Wyckoff scoring
  if (['MARKUP', 'SPRING', 'SELLING CLIMAX', 'STOPPING VOL', 'ACCUMULATION', 'RE-ACCUMULATION'].includes(wyckoffPhase)) {
    bullScore += wyckoffPhase === 'SPRING' ? 3 : wyckoffPhase === 'SELLING CLIMAX' ? 2 : 1;
    reasons.push(`Wyckoff [${wyckoffPhase}]: ${wyckoffDetail.split('.')[0]}`);
  }
  if (['MARKDOWN', 'DISTRIBUTION', 'UPTHRUST', 'BUYING CLIMAX'].includes(wyckoffPhase)) {
    bearScore += wyckoffPhase === 'UPTHRUST' ? 3 : wyckoffPhase === 'BUYING CLIMAX' ? 2 : 1;
    reasons.push(`Wyckoff [${wyckoffPhase}]: ${wyckoffDetail.split('.')[0]}`);
  }

  // VSA scoring
  const bullVSA = ['SELLING CLIMAX','SPRING','STOPPING VOL','SIGN OF STRENGTH','NO SUPPLY','DRY UP','ICEBERG','HAMMER'];
  const bearVSA = ['UPTHRUST','BUYING CLIMAX','SIGN OF WEAKNESS','NO DEMAND'];
  if (bullVSA.includes(vsaSignal)) {
    const pts = (vsaSignal === 'SIGN OF STRENGTH' || vsaSignal === 'SPRING') ? 3 : 2;
    bullScore += pts;
    reasons.push(`VSA [${vsaSignal}]: ${vsaDetail.split('.')[0]}`);
  }
  if (bearVSA.includes(vsaSignal)) {
    const pts = (vsaSignal === 'UPTHRUST' || vsaSignal === 'SIGN OF WEAKNESS') ? 3 : 2;
    bearScore += pts;
    reasons.push(`VSA [${vsaSignal}]: ${vsaDetail.split('.')[0]}`);
  }

  // VCP scoring
  if (vcpStatus === 'VCP PIVOT') { bullScore += 3; reasons.push(`VCP [PIVOT]: ${vcpDetail.split('.')[0]}`); }
  else if (vcpStatus === 'VCP BASE') { bullScore += 2; reasons.push(`VCP [BASE]: ${vcpDetail.split('.')[0]}`); }
  else if (vcpStatus === 'CONTRACTING') { bullScore += 1; reasons.push(`VCP [CONTRACTING]: Volatility compressing — base building`); }

  // CPP / PDI — weight by magnitude
  if (cppBias === 'BULLISH') {
    const pts = cppScore > 2.0 ? 3 : cppScore > 1.0 ? 2 : 1;
    bullScore += pts;
    reasons.push(`CPP [+${cppScore}]: Next-candle BULLISH bias — weighted buy pressure ${cppScore > 2 ? 'VERY STRONG' : 'strong'}`);
  }
  if (cppBias === 'BEARISH') {
    bearScore += cppScore < -2.0 ? 3 : 2;
    reasons.push(`CPP [${cppScore}]: Next-candle BEARISH bias — selling pressure dominant`);
  }

  // EVR
  if (evrScore > 0.3 && isGreen) {
    bullScore += 1;
    reasons.push(`EVR [+${evrScore}]: Effortless advance — result exceeds effort (institutional sponsorship)`);
  }
  if (evrScore < -0.5 && !isGreen) {
    bearScore += 1;
    reasons.push(`EVR [${evrScore}]: Effort without result — absorption/distribution detected`);
  }

  // MA positioning
  if (curC > ma20 && curC > ma50) {
    bullScore += 1;
    reasons.push(`MA Structure: Price above MA20 (+${distFromMA20.toFixed(1)}%) & MA50 (+${distFromMA50.toFixed(1)}%) — uptrend intact`);
  }
  if (curC < ma20 && curC < ma50) {
    bearScore += 1;
    reasons.push(`MA Structure: Price below MA20 & MA50 — downtrend / distribution zone`);
  }
  if (nearMA20Sup && (isDryUp || isNoSupply || isHammer)) {
    bullScore += 2;
    reasons.push(`MA Support Test: MA20 holding with low supply — classic institutional re-entry zone`);
  }
  if (nearMA50Sup && (isDryUp || isNoSupply)) {
    bullScore += 1;
    reasons.push(`MA Support: MA50 holding with dry-up — deeper accumulation zone`);
  }

  // HAKA
  if (isHaka) {
    bullScore += 3;
    reasons.push(`HAKA Cooldown [${cooldownBars} bars]: Healthy pause after markup (sell vol=${Math.round(cdRatio*100)}% only) — ready to resume`);
  }

  // Accumulation (weighted by ratio strength)
  if (accRatio > 2.0) {
    bullScore += 2;
    reasons.push(`Accumulation [${accRatio.toFixed(1)}x]: Very strong buy-vol vs sell-vol — smart money loading`);
  } else if (accRatio > 1.5) {
    bullScore += 1;
    reasons.push(`Accumulation [${accRatio.toFixed(1)}x]: Buy vol dominates over last 10 bars`);
  }
  if (accRatio < 0.6) {
    bearScore += 1;
    reasons.push(`Distribution [${accRatio.toFixed(1)}x]: Sell vol dominates — smart money exiting`);
  }

  // Recent 3-bar pressure (more timely)
  if (recentAccRatio > 2.0) {
    bullScore += 1;
    reasons.push(`Recent Buy Pressure [${recentAccRatio.toFixed(1)}x last 3 bars]: Momentum actively continuing`);
  }
  if (recentAccRatio < 0.5 && momentum > 10) {
    warnings.push(`⚠️ Recent sell pressure rising despite uptrend — watch for reversal signal`);
  }

  // Momentum
  if (momentum > 3 && curC > ma20) {
    bullScore += momentum > 30 ? 2 : 1;
    reasons.push(`Momentum [+${momentum.toFixed(1)}% / 10d]: Sustained upward pressure above MA20`);
  }
  if (momentum < -5) {
    bearScore += 1;
    reasons.push(`Momentum [${momentum.toFixed(1)}% / 10d]: Downward price pressure`);
  }

  // Continuation signals
  if (last3Rising) {
    bullScore += 1;
    reasons.push(`Consecutive: Last 3 closes higher — near-term momentum intact`);
  }
  if (momentumAccelerating && !isOverextended) {
    bullScore += 1;
    reasons.push(`Momentum Accelerating: Short-term ${mom3.toFixed(1)}% vs 5d ${mom5.toFixed(1)}% — still building`);
  }

  // Overextension warnings (reduce confidence, do NOT kill signal — high momentum CAN continue)
  if (isExtremeOverext) {
    bearScore += 2;
    warnings.push(`⚠️ EXTREME OVEREXTENSION: +${distFromMA20.toFixed(0)}% above MA20. Very high pullback risk. Trade with VERY tight stop or wait for MA20 test.`);
  } else if (isOverextended) {
    bearScore += 1;
    warnings.push(`⚠️ Overextension: +${distFromMA20.toFixed(0)}% above MA20. Use trailing stop — don't chase.`);
  }

  if (volumeExhaustion && momentum > 20) {
    bearScore += 1;
    warnings.push(`⚠️ Volume Exhaustion: Recent vol below 20-bar avg despite strong momentum — buying may be fading`);
  }

  if (momentumFading) {
    warnings.push(`⚠️ Momentum Slowing: Short-term (${mom3.toFixed(1)}%) decelerating vs mid-term — possible consolidation ahead`);
  }

  // High-momentum special analysis
  if (momentum > 50) {
    if (volRatio > 1.3 && accRatio > 1.2) {
      reasons.push(`High Momentum Confirmation: +${momentum.toFixed(0)}% WITH strong volume (${volRatio.toFixed(1)}x) + buy dominance — NOT exhaustion, continuation supported`);
    } else {
      warnings.push(`⚠️ High Momentum (+${momentum.toFixed(0)}%) without volume support — risk of short-term correction`);
    }
  }

  if (consecutiveUp >= 5) {
    warnings.push(`⚠️ ${consecutiveUp} consecutive up-closes — statistically due for a pause. Consider partial profit or wait for dip.`);
  }

  // ── CONFLUENCE CHECK: all 4 pillars aligned ───────────────────────────────
  const wyckoffBull = ['MARKUP','SPRING','SELLING CLIMAX','STOPPING VOL','ACCUMULATION','RE-ACCUMULATION'].includes(wyckoffPhase);
  const vsaBull     = bullVSA.includes(vsaSignal);
  const vcpBull     = ['VCP PIVOT','VCP BASE','CONTRACTING'].includes(vcpStatus);
  const cppBull     = cppBias === 'BULLISH';
  const confluenceCount = [wyckoffBull, vsaBull, vcpBull, cppBull].filter(Boolean).length;
  const confluenceBonus = confluenceCount === 4 ? 15 : confluenceCount === 3 ? 8 : 0;

  if (confluenceCount === 4) {
    reasons.push(`🔥 FULL CONFLUENCE: All 4 pillars aligned (Wyckoff + VSA + VCP + CPP) — highest probability setup`);
  } else if (confluenceCount === 3) {
    reasons.push(`✅ HIGH CONFLUENCE: 3/4 pillars aligned — strong directional conviction`);
  }

  // Add warnings at the end
  reasons.push(...warnings);

  // ── DETERMINE FINAL SUGGESTION ─────────────────────────────────────────────
  let suggestion: 'BUY' | 'WAIT' | 'SELL' | 'WATCH';
  let confidence: number;

  const netBull = bullScore - bearScore;

  if (netBull >= 7 && bearScore <= 1) {
    suggestion = 'BUY';
    confidence = Math.min(95, 55 + netBull * 3 + confluenceBonus);
  } else if (netBull >= 4 && bearScore <= 2) {
    suggestion = 'BUY';
    confidence = Math.min(88, 48 + netBull * 3 + confluenceBonus);
  } else if (bearScore >= 6 && bullScore <= 2) {
    suggestion = 'SELL';
    confidence = Math.min(95, 55 + (bearScore - bullScore) * 3);
  } else if (netBull >= 2) {
    suggestion = 'WAIT';
    confidence = Math.min(75, 40 + netBull * 4 + confluenceBonus);
    if (!isOverextended) reasons.push('Wait for next candle volume confirmation before full entry');
    else reasons.push('Setup valid but price overextended — wait for MA20 pullback for better risk/reward');
  } else if (bearScore > bullScore) {
    suggestion = 'SELL';
    confidence = Math.min(80, 40 + (bearScore - bullScore) * 4);
    reasons.push('Consider reducing position or tightening stop loss');
  } else {
    suggestion = 'WATCH';
    confidence = 35;
    reasons.push('Mixed signals — no clear directional edge. Monitor for breakout or breakdown.');
  }

  // Overextension dampens BUY confidence (but doesn't remove the call)
  if (suggestion === 'BUY' && isExtremeOverext) confidence = Math.max(42, confidence - 22);
  else if (suggestion === 'BUY' && isOverextended)  confidence = Math.max(50, confidence - 10);

  // ── STOP LOSS & TARGET (adaptive ATR-based) ───────────────────────────────
  const slMult = isOverextended ? 1.2 : vcpStatus === 'VCP PIVOT' ? 1.0 : 1.5;
  const tpMult = vcpStatus === 'VCP PIVOT' ? 4 : isHaka ? 4 : 3;
  const stopLoss = suggestion === 'BUY'  ? parseFloat((curC - atr14 * slMult).toFixed(0))
                 : suggestion === 'SELL' ? parseFloat((curC + atr14 * slMult).toFixed(0))
                 : undefined;
  const target   = suggestion === 'BUY'  ? parseFloat((curC + atr14 * tpMult).toFixed(0))
                 : suggestion === 'SELL' ? parseFloat((curC - atr14 * tpMult).toFixed(0))
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

// ── RESULT CARD ───────────────────────────────────────────────────────────────
function ResultCard({ r }: { r: AnalysisResult }) {
  const suggestionCfg = {
    BUY:   { bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', text: 'text-emerald-400', badge: 'bg-emerald-500', label: '🟢 BUY',   desc: 'Strong bullish setup — Consider entering position' },
    WAIT:  { bg: 'bg-yellow-500/20',  border: 'border-yellow-500/40',  text: 'text-yellow-400',  badge: 'bg-yellow-500',  label: '🟡 WAIT',  desc: 'Bullish setup forming — Wait for confirmation signal' },
    SELL:  { bg: 'bg-red-500/20',     border: 'border-red-500/40',     text: 'text-red-400',     badge: 'bg-red-500',     label: '🔴 SELL',  desc: 'Bearish structure — Consider reducing or exiting position' },
    WATCH: { bg: 'bg-gray-500/20',    border: 'border-gray-500/40',    text: 'text-gray-400',    badge: 'bg-gray-500',    label: '⚪ WATCH', desc: 'Mixed signals — No clear directional edge' },
  };
  const cfg = suggestionCfg[r.suggestion];

  // Separate signals from warnings for cleaner display
  const signalReasons = r.reasons.filter(r => !r.startsWith('⚠️') && !r.startsWith('Wait') && !r.startsWith('Setup valid') && !r.startsWith('Mixed') && !r.startsWith('Consider'));
  const warningReasons = r.reasons.filter(r => r.startsWith('⚠️'));
  const actionNote = r.reasons.find(r => r.startsWith('Wait') || r.startsWith('Setup valid') || r.startsWith('Mixed') || r.startsWith('Consider'));

  const rrRatio = r.stopLoss && r.target
    ? Math.abs(r.target - r.price) / Math.abs(r.price - r.stopLoss)
    : null;

  const vsaColors: Record<string, string> = {
    'SIGN OF STRENGTH': 'text-emerald-400', 'SPRING': 'text-emerald-400', 'SELLING CLIMAX': 'text-emerald-300',
    'STOPPING VOL': 'text-emerald-400', 'NO SUPPLY': 'text-cyan-400', 'DRY UP': 'text-cyan-400',
    'ICEBERG': 'text-cyan-400', 'HAMMER': 'text-yellow-400',
    'UPTHRUST': 'text-red-400', 'BUYING CLIMAX': 'text-red-400', 'SIGN OF WEAKNESS': 'text-red-400', 'NO DEMAND': 'text-orange-400',
    'NEUTRAL': 'text-gray-400',
  };
  const vsaColor = vsaColors[r.vsaSignal] || 'text-gray-400';

  const vcpColors: Record<string, string> = {
    'VCP PIVOT': 'text-emerald-400', 'VCP BASE': 'text-cyan-400', 'CONTRACTING': 'text-yellow-400', 'NO VCP': 'text-gray-500',
  };

  const wyckoffColors: Record<string, string> = {
    'MARKUP': 'text-emerald-400', 'SPRING': 'text-emerald-400', 'ACCUMULATION': 'text-cyan-400',
    'RE-ACCUMULATION': 'text-cyan-400', 'SELLING CLIMAX': 'text-emerald-300', 'STOPPING VOL': 'text-emerald-400',
    'MARKDOWN': 'text-red-400', 'DISTRIBUTION': 'text-red-400', 'UPTHRUST': 'text-red-400', 'BUYING CLIMAX': 'text-red-400',
  };

  // Confidence bar color
  const confColor = r.confidence >= 75 ? 'bg-emerald-500' : r.confidence >= 55 ? 'bg-yellow-500' : r.confidence >= 40 ? 'bg-orange-500' : 'bg-red-500';

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4 space-y-4`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-white">{r.symbol}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold text-white ${cfg.badge}`}>
              {r.suggestion}
            </span>
          </div>
          <p className={`text-xs mt-0.5 ${cfg.text}`}>{cfg.desc}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold text-white">Rp {r.price.toLocaleString('id-ID')}</div>
          <div className={`text-xs font-medium ${r.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {r.change >= 0 ? '+' : ''}{r.change.toLocaleString('id-ID')} ({r.changePercent >= 0 ? '+' : ''}{r.changePercent.toFixed(2)}%)
          </div>
        </div>
      </div>

      {/* Confidence bar */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">Signal Confidence</span>
          <span className={`font-bold ${cfg.text}`}>{r.confidence}%</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full ${confColor} rounded-full transition-all`} style={{ width: `${r.confidence}%` }} />
        </div>
      </div>

      {/* SL / TP */}
      {(r.stopLoss || r.target) && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2">
            <div className="flex items-center justify-center gap-1 text-red-400 text-xs mb-0.5">
              <IconShield /> Stop Loss
            </div>
            <div className="text-white font-bold text-sm">Rp {r.stopLoss?.toLocaleString('id-ID')}</div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-2 flex flex-col items-center justify-center">
            {rrRatio && (
              <>
                <div className="text-gray-400 text-xs">R:R Ratio</div>
                <div className={`font-bold text-sm ${rrRatio >= 2 ? 'text-emerald-400' : rrRatio >= 1.5 ? 'text-yellow-400' : 'text-orange-400'}`}>
                  1 : {rrRatio.toFixed(1)}
                </div>
              </>
            )}
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2">
            <div className="flex items-center justify-center gap-1 text-emerald-400 text-xs mb-0.5">
              <IconTarget /> Target
            </div>
            <div className="text-white font-bold text-sm">Rp {r.target?.toLocaleString('id-ID')}</div>
          </div>
        </div>
      )}

      {/* 4-Pillar Summary */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-800/60 rounded-lg p-2.5">
          <div className="text-gray-500 text-xs mb-0.5">Wyckoff Phase</div>
          <div className={`font-semibold text-xs ${wyckoffColors[r.wyckoffPhase] || 'text-gray-300'}`}>{r.wyckoffPhase}</div>
          <div className="text-gray-400 text-xs mt-0.5 leading-tight line-clamp-2">{r.wyckoffDetail.split('.')[0]}</div>
        </div>
        <div className="bg-gray-800/60 rounded-lg p-2.5">
          <div className="text-gray-500 text-xs mb-0.5">VSA Signal</div>
          <div className={`font-semibold text-xs ${vsaColor}`}>{r.vsaSignal}</div>
          <div className="text-gray-400 text-xs mt-0.5 leading-tight line-clamp-2">{r.vsaDetail.split('.')[0]}</div>
        </div>
        <div className="bg-gray-800/60 rounded-lg p-2.5">
          <div className="text-gray-500 text-xs mb-0.5">VCP Pattern</div>
          <div className={`font-semibold text-xs ${vcpColors[r.vcpStatus] || 'text-gray-400'}`}>{r.vcpStatus}</div>
          <div className="text-gray-400 text-xs mt-0.5 leading-tight line-clamp-2">{r.vcpDetail.split('.')[0] || '—'}</div>
        </div>
        <div className="bg-gray-800/60 rounded-lg p-2.5">
          <div className="text-gray-500 text-xs mb-0.5">CPP / Power</div>
          <div className={`font-semibold text-xs ${r.cppBias === 'BULLISH' ? 'text-emerald-400' : r.cppBias === 'BEARISH' ? 'text-red-400' : 'text-gray-400'}`}>
            {r.cppBias} {r.cppScore > 0 ? '+' : ''}{r.cppScore}
          </div>
          <div className="text-gray-400 text-xs mt-0.5">Power: {r.candlePower}/100 | EVR: {r.evrScore > 0 ? '+' : ''}{r.evrScore}</div>
        </div>
      </div>

      {/* Key metrics strip */}
      <div className="grid grid-cols-4 gap-1.5 text-center">
        {[
          { label: 'Vol Ratio', value: `${r.volRatio.toFixed(1)}x`, color: r.volRatio > 1.5 ? 'text-emerald-400' : r.volRatio < 0.6 ? 'text-red-400' : 'text-gray-300' },
          { label: 'Acc Ratio', value: `${r.accRatio.toFixed(1)}x`, color: r.accRatio > 1.5 ? 'text-emerald-400' : r.accRatio < 0.7 ? 'text-red-400' : 'text-gray-300' },
          { label: 'Momentum', value: `${r.momentum > 0 ? '+' : ''}${r.momentum.toFixed(0)}%`, color: r.momentum > 10 ? 'text-emerald-400' : r.momentum < -5 ? 'text-red-400' : 'text-gray-300' },
          { label: 'RMV', value: `${Math.round(r.rmv)}`, color: r.rmv <= 20 ? 'text-emerald-400' : r.rmv <= 40 ? 'text-yellow-400' : 'text-gray-400' },
        ].map(m => (
          <div key={m.label} className="bg-gray-800/40 rounded-lg p-1.5">
            <div className="text-gray-500 text-xs">{m.label}</div>
            <div className={`font-bold text-xs ${m.color}`}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* MA levels */}
      <div className="bg-gray-800/40 rounded-lg p-2.5">
        <div className="text-gray-500 text-xs mb-1.5">Moving Averages</div>
        <div className="grid grid-cols-3 gap-1 text-center text-xs">
          {[
            { label: 'MA20', val: r.ma20, dist: r.ma20 > 0 ? ((r.price - r.ma20) / r.ma20 * 100) : null },
            { label: 'MA50', val: r.ma50, dist: r.ma50 > 0 ? ((r.price - r.ma50) / r.ma50 * 100) : null },
            { label: 'MA200', val: r.ma200, dist: r.ma200 > 0 ? ((r.price - r.ma200) / r.ma200 * 100) : null },
          ].map(m => (
            <div key={m.label} className="bg-gray-700/50 rounded p-1.5">
              <div className="text-gray-500">{m.label}</div>
              <div className="text-gray-200 font-medium">{m.val > 0 ? `Rp ${Math.round(m.val).toLocaleString('id-ID')}` : 'N/A'}</div>
              {m.dist !== null && (
                <div className={`text-xs ${m.dist >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {m.dist >= 0 ? '+' : ''}{m.dist.toFixed(1)}%
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Signal reasons */}
      {signalReasons.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wide">Signal Analysis</div>
          <div className="space-y-1.5">
            {signalReasons.map((reason, idx) => {
              const isConfluence = reason.includes('CONFLUENCE') || reason.includes('🔥') || reason.includes('✅');
              const isBullish = reason.includes('Bullish') || reason.includes('BULLISH') || reason.includes('BUY') || reason.includes('+') || reason.includes('Kuat') || reason.includes('strong') || reason.includes('Strong') || reason.includes('Accumulation') || reason.includes('intact') || reason.includes('Momentum');
              return (
                <div key={idx} className={`flex items-start gap-2 text-xs p-2 rounded-lg ${isConfluence ? 'bg-emerald-500/15 border border-emerald-500/30' : 'bg-gray-800/40'}`}>
                  <span className={`mt-0.5 shrink-0 ${isConfluence ? 'text-emerald-400' : isBullish ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {isConfluence ? '🔥' : isBullish ? '↑' : '·'}
                  </span>
                  <span className="text-gray-300 leading-relaxed">{reason}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Warnings section */}
      {warningReasons.length > 0 && (
        <div>
          <div className="text-xs text-orange-400 mb-1.5 font-medium uppercase tracking-wide flex items-center gap-1">
            <IconWarning /> Risk Factors
          </div>
          <div className="space-y-1.5">
            {warningReasons.map((warn, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <span className="text-orange-400 mt-0.5 shrink-0">⚠</span>
                <span className="text-orange-200 leading-relaxed">{warn.replace('⚠️ ', '')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action note */}
      {actionNote && (
        <div className={`text-xs p-2.5 rounded-lg border ${r.suggestion === 'BUY' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300' : r.suggestion === 'WAIT' ? 'bg-yellow-500/10 border-yellow-500/25 text-yellow-300' : 'bg-gray-700/50 border-gray-600/30 text-gray-300'}`}>
          💡 {actionNote}
        </div>
      )}

      {/* Conclusion / summary */}
      <div className={`rounded-lg p-3 border ${cfg.border} ${cfg.bg}`}>
        <div className="text-xs text-gray-400 mb-1 font-medium">Kesimpulan</div>
        <div className="text-sm text-white font-medium">
          {r.suggestion === 'BUY' && r.confidence >= 75 && (
            <>Sinyal beli kuat dengan confidence {r.confidence}%. {r.vcpStatus !== 'NO VCP' ? 'Pola VCP terdeteksi — setup favorable.' : ''} {r.cppBias === 'BULLISH' ? `CPP +${r.cppScore} mengindikasikan tekanan beli berlanjut ke candle berikutnya.` : ''}</>
          )}
          {r.suggestion === 'BUY' && r.confidence < 75 && (
            <>Setup bullish terkonfirmasi namun confidence moderat ({r.confidence}%). {warningReasons.length > 0 ? 'Perhatikan risk factor di atas sebelum entry.' : 'Pertimbangkan position sizing yang konservatif.'}</>
          )}
          {r.suggestion === 'WAIT' && (
            <>Struktur bullish terbentuk ({r.confidence}%) namun belum ada konfirmasi penuh. {r.cppBias === 'BULLISH' ? 'CPP bullish mendukung, tunggu volume breakout.' : 'Tunggu sinyal volume konfirmasi.'}</>
          )}
          {r.suggestion === 'SELL' && (
            <>Sinyal bearish dominan (confidence {r.confidence}%). Pertimbangkan mengurangi posisi atau pasang stop loss ketat.</>
          )}
          {r.suggestion === 'WATCH' && (
            <>Sinyal campuran — tidak ada edge yang jelas. Monitor untuk breakout atau breakdown dengan volume tinggi.</>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
function AnalysisContent() {
  const searchParams   = useSearchParams();
  const [ticker, setTicker]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<AnalysisResult | null>(null);
  const [error, setError]       = useState('');
  const [history, setHistory]   = useState<AnalysisResult[]>([]);
  const didAutoRun = useRef(false);

  // Auto-run analysis when ?symbol= param is present (e.g. from screener "Deep Analysis" button)
  useEffect(() => {
    if (didAutoRun.current) return;
    const sym = searchParams.get('symbol');
    if (sym) {
      didAutoRun.current = true;
      const clean = sym.trim().toUpperCase().replace(/\.JK$/i, '');
      setTicker(clean);
      analyze(clean);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const analyze = async (sym?: string) => {
    const raw = (sym || ticker).trim().toUpperCase();
    if (!raw) return;
    const symbol = raw.endsWith('.JK') ? raw : `${raw}.JK`;

    setLoading(true); setError(''); setResult(null);
    try {
      // Fetch quote + historical in parallel
      const [quoteRes, histRes] = await Promise.all([
        fetch(`/api/stock/quote?symbol=${symbol}`),
        fetch(`/api/stock/historical?symbol=${symbol}&interval=1d&range=2y`),
      ]);

      if (!quoteRes.ok) throw new Error(`Quote API error: ${quoteRes.status}`);
      if (!histRes.ok)  throw new Error(`Historical API error: ${histRes.status}`);

      const quoteData = await quoteRes.json();
      const histData  = await histRes.json();

      const price     = quoteData.regularMarketPrice ?? quoteData.price ?? 0;
      const change    = quoteData.regularMarketChange ?? quoteData.change ?? 0;
      const changePct = quoteData.regularMarketChangePercent ?? quoteData.changePercent ?? 0;

      const candles = histData.candles ?? histData.data ?? [];
      if (candles.length < 20) throw new Error('Not enough historical data');

      const analysis = analyzeStock(candles, raw, price, change, changePct);
      setResult(analysis);
      setHistory(prev => [analysis, ...prev.filter(h => h.symbol !== analysis.symbol)].slice(0, 5));
    } catch (err: any) {
      setError(err.message || 'Failed to analyze stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-400 hover:text-white text-sm flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Chart
            </Link>
            <span className="text-gray-600">/</span>
            <span className="text-white font-semibold text-sm">Stock Analysis</span>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/vcp-screener" className="text-gray-400 hover:text-white">VCP</Link>
            <Link href="/scalp-screener" className="text-gray-400 hover:text-white">Scalp</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-white">Stock Analysis</h1>
          <p className="text-gray-400 text-sm mt-1">Wyckoff + VSA + VCP + CPP confluence engine</p>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && analyze()}
              placeholder="Enter ticker e.g. BBCA, FIRE, LAJU"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
            />
            {ticker && (
              <button onClick={() => setTicker('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <IconClose />
              </button>
            )}
          </div>
          <button
            onClick={() => analyze()}
            disabled={loading || !ticker}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-5 py-3 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors"
          >
            {loading ? <Spinner /> : <IconSearch />}
            {loading ? 'Analyzing…' : 'Analyze'}
          </button>
        </div>

        {/* Quick picks */}
        <div className="flex flex-wrap gap-1.5">
          {['BBCA','BBRI','BMRI','ASII','TLKM','ANTM','MDKA','AMMN','FIRE','LAJU'].map(s => (
            <button key={s} onClick={() => { setTicker(s); analyze(s); }}
              className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-2.5 py-1 rounded-lg transition-colors">
              {s}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/15 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
            <IconWarning />
            <div>
              <div className="text-red-400 font-medium text-sm">Analysis Failed</div>
              <div className="text-red-300 text-xs mt-0.5">{error}</div>
            </div>
          </div>
        )}

        {/* Result */}
        {result && <ResultCard r={result} />}

        {/* History */}
        {history.length > 1 && (
          <div>
            <div className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Recent Analyses</div>
            <div className="flex flex-wrap gap-2">
              {history.slice(1).map(h => (
                <button key={h.symbol}
                  onClick={() => { setTicker(h.symbol); analyze(h.symbol); }}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    h.suggestion === 'BUY'   ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                    h.suggestion === 'SELL'  ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                    h.suggestion === 'WAIT'  ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
                    'bg-gray-700/50 border-gray-600/30 text-gray-400'
                  }`}>
                  {h.symbol} · {h.suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4">
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-3">Signal Legend</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {[
              { sig: 'SC', label: 'Selling Climax', desc: 'Panic sell absorbed by institutions. Reversal likely.', color: 'text-emerald-400' },
              { sig: 'SV', label: 'Stopping Volume', desc: 'High vol stops decline. Accumulation beginning.', color: 'text-emerald-400' },
              { sig: 'SOS', label: 'Sign of Strength', desc: 'High vol wide spread close top. Institutional demand.', color: 'text-emerald-400' },
              { sig: 'NS', label: 'No Supply', desc: 'Low vol pullback. Sellers exhausted. Continuation up.', color: 'text-cyan-400' },
              { sig: 'DU', label: 'Dry Up', desc: 'Vol contracts. No sellers left. Strong hands holding.', color: 'text-cyan-400' },
              { sig: 'IB', label: 'Iceberg', desc: 'High vol narrow spread. Hidden accumulation.', color: 'text-cyan-400' },
              { sig: 'SP', label: 'Spring', desc: 'Brief dip below support on low vol then recovery.', color: 'text-emerald-400' },
              { sig: 'HMR', label: 'Hammer', desc: 'Long lower wick. Strong rejection of lows.', color: 'text-yellow-400' },
              { sig: 'UT', label: 'Upthrust', desc: 'False breakout on high vol. Trap for bulls.', color: 'text-red-400' },
              { sig: 'BC', label: 'Buying Climax', desc: 'Euphoria buy. Distribution at peak.', color: 'text-red-400' },
              { sig: 'SOW', label: 'Sign of Weakness', desc: 'Wide spread down candle high vol. Institutions dumping.', color: 'text-red-400' },
              { sig: 'ND', label: 'No Demand', desc: 'Narrow green bar low vol. Lack of conviction.', color: 'text-orange-400' },
            ].map(item => (
              <div key={item.sig} className="flex gap-2 items-start">
                <span className={`font-bold shrink-0 ${item.color}`}>{item.sig}</span>
                <div>
                  <span className="text-gray-300 font-medium">{item.label}</span>
                  <span className="text-gray-500"> — {item.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-700/50 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div><span className="text-purple-400 font-bold">VCP</span><span className="text-gray-500"> — Volatility Contraction Pattern. Price & vol compressing before breakout.</span></div>
            <div><span className="text-blue-400 font-bold">CPP</span><span className="text-gray-500"> — Candle Power Prediction. Weighted 5-bar momentum directional bias.</span></div>
            <div><span className="text-yellow-400 font-bold">EVR</span><span className="text-gray-500"> — Effort vs Result. Measures volume efficiency (Wyckoff Law 3).</span></div>
            <div><span className="text-green-400 font-bold">RMV</span><span className="text-gray-500"> — Relative Measured Volatility. ≤20 = pivot / breakout zone.</span></div>
            <div><span className="text-cyan-400 font-bold">HAKA</span><span className="text-gray-500"> — Aggressive markup candle followed by healthy low-sell cooldown.</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-blue-400/30 border-t-blue-400 animate-spin" />
          <p className="text-gray-400 text-sm">Loading analysis…</p>
        </div>
      </div>
    }>
      <AnalysisContent />
    </Suspense>
  );
}
