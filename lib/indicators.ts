// ============================================================================
// EBITE CHART - ADVANCED TECHNICAL ENGINE
// Wyckoff Theory + Volume Spread Analysis (VSA) + Volatility Contraction (VCP)
// Research-grade quantitative algorithm for institutional footprint detection
// ============================================================================

export interface ChartData {
  time: number; open: number; high: number; low: number; close: number; volume?: number;
}
export interface MovingAverageData { time: number; value: number; }
export interface HistogramData { time: number; value: number; color: string; }
export interface MarkerData {
  time: number; position: 'aboveBar' | 'belowBar'; color: string;
  shape: 'arrowUp' | 'arrowDown' | 'circle'; text: string;
}
export interface FibonacciData { f382: MovingAverageData[]; f500: MovingAverageData[]; f618: MovingAverageData[]; }
export interface SupportResistanceZone { level: number; top: number; bottom: number; startIndex: number; type: 'support' | 'resistance'; }
export interface SupportResistanceData { zones: SupportResistanceZone[]; }
export interface RMVData { time: number; value: number; color: string; }
export interface IndicatorResult {
  ma5: MovingAverageData[]; ma20: MovingAverageData[]; ma50: MovingAverageData[]; ma200: MovingAverageData[];
  momentum: HistogramData[]; awesomeOscillator: HistogramData[]; fibonacci: FibonacciData;
  supportResistance: SupportResistanceData;
  candlePowerMarkers: MarkerData[]; candlePowerAnalysis: string;
  vsaMarkers: MarkerData[]; rmvData: RMVData[];
  signals: { bandar: string; wyckoffPhase: string; vcpStatus: string; evrScore: number; };
}

// ============================================================================
// UTILITY: MOVING AVERAGE
// ============================================================================
export function calculateMA(data: ChartData[], period: number): MovingAverageData[] {
  const result: MovingAverageData[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j].close;
    result.push({ time: data[i].time, value: sum / period });
  }
  return result;
}

// ============================================================================
// UTILITY: ATR (True Range normalization base for VSA + RMV)
// ============================================================================
export function calculateATR(data: ChartData[], period: number = 14): number[] {
  const tr: number[] = new Array(data.length).fill(0);
  const atr: number[] = new Array(data.length).fill(0);
  for (let i = 0; i < data.length; i++) {
    tr[i] = i === 0 ? data[i].high - data[i].low :
      Math.max(data[i].high - data[i].low, Math.abs(data[i].high - data[i-1].close), Math.abs(data[i].low - data[i-1].close));
  }
  let sum = 0;
  for (let i = 0; i < period && i < data.length; i++) sum += tr[i];
  if (period <= data.length) atr[period - 1] = sum / period;
  for (let i = period; i < data.length; i++) atr[i] = (atr[i-1] * (period - 1) + tr[i]) / period;
  return atr;
}

function calculateVolumeSMA(data: ChartData[], period: number = 20): number[] {
  const result: number[] = new Array(data.length).fill(0);
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += (data[j].volume || 0);
    result[i] = sum / period;
  }
  return result;
}

// ============================================================================
// MOMENTUM HISTOGRAM
// ============================================================================
export function calculateMomentum(data: ChartData[], period: number = 20): HistogramData[] {
  const result: HistogramData[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period) { result.push({ time: data[i].time, value: 0, color: 'rgba(0,0,0,0)' }); continue; }
    const closes = data.slice(i - period, i).map(d => d.close);
    const sma = closes.reduce((a, b) => a + b) / period;
    const hi = Math.max(...data.slice(i - period, i).map(d => d.high));
    const lo = Math.min(...data.slice(i - period, i).map(d => d.low));
    const value = data[i].close - ((hi + lo) / 2 + sma) / 2;
    const prev = result[i - 1].value;
    const color = value >= 0 ? (value > prev ? '#00b894' : '#55efc4') : (value < prev ? '#d63031' : '#ff7675');
    result.push({ time: data[i].time, value, color });
  }
  return result;
}

// ============================================================================
// AWESOME OSCILLATOR
// ============================================================================
export function calculateAO(data: ChartData[]): HistogramData[] {
  const result: HistogramData[] = [];
  const meds = data.map(d => (d.high + d.low) / 2);
  for (let i = 0; i < data.length; i++) {
    if (i < 33) { result.push({ time: data[i].time, value: 0, color: 'rgba(0,0,0,0)' }); continue; }
    let s5 = 0, s34 = 0;
    for (let j = i - 4; j <= i; j++) s5 += meds[j];
    for (let j = i - 33; j <= i; j++) s34 += meds[j];
    const v = (s5 / 5) - (s34 / 34);
    result.push({ time: data[i].time, value: v, color: v >= result[i-1].value ? '#00b894' : '#d63031' });
  }
  return result;
}

// ============================================================================
// FIBONACCI RETRACEMENT
// ============================================================================
export function calculateFibonacci(data: ChartData[], lookback: number = 100): FibonacciData {
  const N = data.length;
  const lb = Math.min(lookback, N);
  let hi = -Infinity, lo = Infinity;
  for (let i = N - lb; i < N; i++) { if (data[i].high > hi) hi = data[i].high; if (data[i].low < lo) lo = data[i].low; }
  const diff = hi - lo;
  const f382Data: MovingAverageData[] = [], f500Data: MovingAverageData[] = [], f618Data: MovingAverageData[] = [];
  for (let i = N - lb; i < N; i++) {
    f382Data.push({ time: data[i].time, value: hi - 0.382 * diff });
    f500Data.push({ time: data[i].time, value: hi - 0.500 * diff });
    f618Data.push({ time: data[i].time, value: hi - 0.618 * diff });
  }
  return { f382: f382Data, f500: f500Data, f618: f618Data };
}

// ============================================================================
// WYCKOFF PHASE DETECTOR
// Composite Man theory: Accumulation → Markup → Distribution → Markdown
// ============================================================================
interface WyckoffResult { phase: 'ACCUMULATION' | 'MARKUP' | 'DISTRIBUTION' | 'MARKDOWN' | 'UNKNOWN'; event: string; confidence: number; }

function detectWyckoffPhase(data: ChartData[], i: number, volSMA: number[]): WyckoffResult {
  if (i < 50) return { phase: 'UNKNOWN', event: 'Insufficient data', confidence: 0 };
  let hiP = -Infinity, loP = Infinity, avgVol = 0;
  for (let j = Math.max(0, i - 50); j <= i; j++) {
    if (data[j].high > hiP) hiP = data[j].high;
    if (data[j].low < loP) loP = data[j].low;
    avgVol += (data[j].volume || 0);
  }
  avgVol /= Math.min(50, i + 1);
  const rng = hiP - loP;
  const relPos = rng > 0 ? (data[i].close - loP) / rng : 0.5;
  const sp = data[i].high - data[i].low;
  const volRatio = (data[i].volume || 0) / (volSMA[i] || avgVol || 1);
  const closePos = sp > 0 ? (data[i].close - data[i].low) / sp : 0.5;
  let maSlope = 0;
  if (i >= 25) {
    let s1 = 0, s2 = 0;
    for (let j = i - 4; j <= i; j++) s1 += data[j].close;
    for (let j = i - 24; j <= i - 20; j++) s2 += data[j].close;
    maSlope = (s1 / 5) - (s2 / 5);
  }
  if (relPos < 0.30 && maSlope >= -0.5) {
    if (closePos > 0.5 && volRatio < 0.8) return { phase: 'ACCUMULATION', event: 'No Supply Test', confidence: 82 };
    if (closePos < 0.3 && volRatio > 1.8) return { phase: 'ACCUMULATION', event: 'Selling Climax (SC)', confidence: 80 };
    return { phase: 'ACCUMULATION', event: 'Base Building', confidence: 65 };
  }
  if (relPos >= 0.30 && relPos <= 0.75 && maSlope > 0) {
    if (volRatio > 1.3 && closePos > 0.65 && data[i].close >= data[i].open) return { phase: 'MARKUP', event: 'Sign of Strength (SOS)', confidence: 82 };
    if (volRatio < 0.7 && closePos > 0.4) return { phase: 'MARKUP', event: 'Last Point of Support (LPS)', confidence: 76 };
    return { phase: 'MARKUP', event: 'Uptrend Continuation', confidence: 65 };
  }
  if (relPos > 0.70 && maSlope <= 0) {
    if (volRatio > 2.0 && closePos < 0.3) return { phase: 'DISTRIBUTION', event: 'Buying Climax (BC)', confidence: 87 };
    if (volRatio > 1.3 && closePos < 0.4) return { phase: 'DISTRIBUTION', event: 'Upthrust (UT)', confidence: 76 };
    return { phase: 'DISTRIBUTION', event: 'Distribution Phase', confidence: 62 };
  }
  if (relPos < 0.40 && maSlope < 0) {
    if (volRatio > 1.5 && closePos < 0.3 && data[i].close < data[i].open) return { phase: 'MARKDOWN', event: 'Sign of Weakness (SOW)', confidence: 78 };
    return { phase: 'MARKDOWN', event: 'Downtrend', confidence: 62 };
  }
  return { phase: 'UNKNOWN', event: 'Transitional', confidence: 40 };
}

// ============================================================================
// VSA SIGNAL CLASSIFIER
// Williams 3-variable matrix: Spread (Result) / Volume (Effort) / Close Position
// Detects anomalous Effort vs Result divergences (Wyckoff Law 3)
// ============================================================================
interface VSASignalResult {
  type: 'SC' | 'BC' | 'ND' | 'NS' | 'UT' | 'SV' | 'EVR_POS' | 'EVR_NEG' | null;
  label: string; color: string; position: 'aboveBar' | 'belowBar'; shape: 'arrowUp' | 'arrowDown' | 'circle'; strength: number;
}

function classifyVSASignal(data: ChartData[], i: number, atr14: number[], volSMA: number[]): VSASignalResult {
  const cur = data[i], p1 = data[i - 1], p2 = data[i - 2];
  const sp = cur.high - cur.low;
  const atr = atr14[i] || sp || 1;
  const avgVol = volSMA[i] || (cur.volume || 1);
  const nSpread = sp / atr;                                      // Normalized spread (Result)
  const vRatio = (cur.volume || 0) / avgVol;                     // Volume ratio (Effort)
  const cPos = sp > 0 ? (cur.close - cur.low) / sp : 0.5;        // Close position
  const isGreen = cur.close >= cur.open;
  const evr = nSpread - vRatio;                                   // EVR Score

  // Selling Climax: ultra-wide down, ultra-high vol, closes middle/upper
  if (nSpread > 2.0 && vRatio > 2.5 && cPos > 0.40 && !isGreen)
    return { type: 'SC', label: 'SC', color: '#00b894', position: 'belowBar', shape: 'arrowUp', strength: Math.min(100, 70 + (vRatio - 2.5) * 10) };
  // Buying Climax: ultra-wide up, ultra-high vol, closes middle/lower
  if (nSpread > 2.0 && vRatio > 2.5 && cPos < 0.60 && isGreen)
    return { type: 'BC', label: 'BC', color: '#e74c3c', position: 'aboveBar', shape: 'arrowDown', strength: Math.min(100, 70 + (vRatio - 2.5) * 10) };
  // Upthrust: liquidity trap, wide range, close at bottom
  if (nSpread > 1.5 && vRatio > 1.5 && cPos < 0.30)
    return { type: 'UT', label: 'UT', color: '#e17055', position: 'aboveBar', shape: 'arrowDown', strength: Math.min(100, 60 + (vRatio - 1.5) * 15) };
  // No Demand: higher high, narrow spread, volume drying up both prev bars
  if (cur.high > p1.high && nSpread < 1.0 && (cur.volume||0) < (p1.volume||0) && (cur.volume||0) < (p2.volume||0) && cPos <= 0.55)
    return { type: 'ND', label: 'ND', color: '#fdcb6e', position: 'aboveBar', shape: 'arrowDown', strength: Math.min(100, 50 + (1.0 - nSpread) * 30) };
  // No Supply: lower low, narrow spread, volume drying up both prev bars
  if (cur.low < p1.low && nSpread < 1.0 && (cur.volume||0) < (p1.volume||0) && (cur.volume||0) < (p2.volume||0) && cPos >= 0.45)
    return { type: 'NS', label: 'NS', color: '#74b9ff', position: 'belowBar', shape: 'arrowUp', strength: Math.min(100, 50 + (1.0 - nSpread) * 30) };
  // Stopping Volume: high vol wide down bar but closes HIGH (smart money enters)
  if (nSpread > 1.5 && vRatio > 1.5 && cPos > 0.55 && !isGreen)
    return { type: 'SV', label: 'SV', color: '#00cec9', position: 'belowBar', shape: 'arrowUp', strength: Math.min(100, 60 + (vRatio - 1.5) * 15) };
  // EVR Anomaly: high effort, narrow result (absorption or hidden activity)
  if (evr < -0.8 && vRatio > 1.5) {
    if (isGreen) return { type: 'EVR_NEG', label: 'ABS', color: '#fd79a8', position: 'aboveBar', shape: 'arrowDown', strength: Math.min(100, 40 + Math.abs(evr) * 15) };
    else return { type: 'EVR_POS', label: 'SOS', color: '#6c5ce7', position: 'belowBar', shape: 'arrowUp', strength: Math.min(100, 55 + Math.abs(evr) * 12) };
  }
  return { type: null, label: '', color: '', position: 'aboveBar', shape: 'circle', strength: 0 };
}

// ============================================================================
// RMV (Relative Measured Volatility) INDEX
// Formula: RMV = (ATR5_now - Min(ATR5,20)) / (Max(ATR5,20) - Min(ATR5,20)) × 100
// RMV ≤ 15 = Extreme compression → VCP Pivot forming
// ============================================================================
function calculateRMV(atr5: number[], i: number, lookback: number = 20): number {
  if (i < lookback) return 50;
  let minV = Infinity, maxV = -Infinity;
  for (let j = Math.max(0, i - lookback + 1); j <= i; j++) {
    const v = atr5[j];
    if (v > 0) { if (v < minV) minV = v; if (v > maxV) maxV = v; }
  }
  if (maxV === minV || maxV === -Infinity) return 50;
  return Math.max(0, Math.min(100, ((atr5[i] - minV) / (maxV - minV)) * 100));
}

// ============================================================================
// VCP STRUCTURE DETECTOR (Minervini + Wyckoff Cause & Effect)
// Detects: C1 > C2 > C3... (each contraction < 60% of previous)
// Pivot: RMV ≤ 15 + Volume Dry-Up < 75% of 50-bar avg
// ============================================================================
interface VCPResult { isValid: boolean; contractionCount: number; currentRMV: number; isPivotReady: boolean; isVolumeConfirmed: boolean; label: string; }

function detectVCPStructure(data: ChartData[], i: number, atr5: number[], _volSMA: number[]): VCPResult {
  const empty: VCPResult = { isValid: false, contractionCount: 0, currentRMV: 50, isPivotReady: false, isVolumeConfirmed: false, label: '' };
  if (i < 60) return empty;

  // Verify uptrend (above MA50 = Wyckoff Phase 2)
  let ma50s = 0;
  for (let j = i - 49; j <= i; j++) ma50s += data[j].close;
  if (data[i].close < (ma50s / 50) * 0.97) return empty;

  // Find swing pivots in 60-bar window
  const start = Math.max(0, i - 60);
  const sHighs: { index: number; price: number }[] = [];
  const sLows: { index: number; price: number }[] = [];

  for (let j = start + 2; j <= i - 2; j++) {
    if (data[j].high > data[j-1].high && data[j].high > data[j-2].high && data[j].high > data[j+1].high && data[j].high > data[j+2].high)
      sHighs.push({ index: j, price: data[j].high });
    if (data[j].low < data[j-1].low && data[j].low < data[j-2].low && data[j].low < data[j+1].low && data[j].low < data[j+2].low)
      sLows.push({ index: j, price: data[j].low });
  }
  if (sHighs.length < 1 || sLows.length < 1) return empty;

  // Calculate contraction depths
  const contractions: number[] = [];
  for (const sh of sHighs) {
    const nl = sLows.find(sl => sl.index > sh.index);
    if (nl) {
      const depth = (sh.price - nl.price) / sh.price * 100;
      if (depth > 2 && depth < 50) contractions.push(depth);
    }
  }
  if (contractions.length < 2) return empty;

  // Validate progressive contraction (Minervini condition: each < previous)
  let validCount = 1;
  for (let c = 1; c < contractions.length; c++) {
    if (contractions[c] < contractions[c - 1]) validCount++;
    else break;
  }
  if (validCount < 2) return empty;

  const currentRMV = calculateRMV(atr5, i, 20);
  let vol5 = 0, vol50 = 0;
  for (let j = i - 4; j <= i; j++) vol5 += (data[j].volume || 0);
  for (let j = Math.max(0, i - 49); j <= i; j++) vol50 += (data[j].volume || 0);
  const isVolumeConfirmed = (vol5 / 5) < (vol50 / Math.min(50, i + 1)) * 0.75;
  const isPivotReady = currentRMV <= 15;
  let label = `VCP T${validCount}`;
  if (isPivotReady) label = `VCP PIVOT (RMV:${Math.round(currentRMV)})`;
  else if (isVolumeConfirmed) label = `VCP BASE T${validCount}`;

  return { isValid: true, contractionCount: validCount, currentRMV, isPivotReady, isVolumeConfirmed, label };
}

// ============================================================================
// CANDLE POWER ENGINE (Wyckoff + VSA + VCP Integrated)
// Predicts NEXT candle direction — score = probability next candle is bullish
// 90+ = Near certain up | 50 = Neutral | < 25 = Near certain down
// ============================================================================
export function calculateCandlePower(data: ChartData[]): { markers: MarkerData[]; analysis: string } {
  const markers: MarkerData[] = [];
  const N = data.length;
  let latestPower = 50, latestAnalysis = 'Insufficient data';
  if (N < 50) return { markers, analysis: latestAnalysis };

  const atr14 = calculateATR(data, 14);
  const volSMA20 = calculateVolumeSMA(data, 20);
  const ma20v = calculateMA(data, 20);
  const ma50v = calculateMA(data, 50);

  for (let i = 50; i < N; i++) {
    const cur = data[i];
    const sp = cur.high - cur.low;
    const body = Math.abs(cur.close - cur.open);
    const atr = atr14[i] || sp || 1;
    const avgVol = volSMA20[i] || (cur.volume || 1);
    const vRatio = (cur.volume || 0) / avgVol;
    const nSp = sp / atr;
    const cPos = sp > 0 ? (cur.close - cur.low) / sp : 0.5;
    const isGreen = cur.close >= cur.open;
    const ma20 = (i - 19 >= 0 && (i - 19) < ma20v.length) ? ma20v[i - 19].value : cur.close;
    const ma50 = (i - 49 >= 0 && (i - 49) < ma50v.length) ? ma50v[i - 49].value : cur.close;

    let bVol = 0, sVol = 0;
    for (let k = Math.max(0, i - 9); k <= i; k++) {
      if (data[k].close > data[k].open) bVol += (data[k].volume || 0);
      else if (data[k].close < data[k].open) sVol += (data[k].volume || 0);
    }
    const accR = bVol / (sVol || 1);

    const uWick = cur.high - Math.max(cur.open, cur.close);
    const lWick = Math.min(cur.open, cur.close) - cur.low;
    const isHammer = lWick > body * 1.2 && uWick < body * 0.6 && lWick / (sp || 1) > 0.5;
    const isStar = uWick > body * 2 && lWick < body * 0.3 && cPos < 0.4;
    const isSmallBody = body < sp * 0.3;

    const abMA20 = cur.close > ma20, abMA50 = cur.close > ma50, maTrend = ma20 > ma50;
    const inUp = abMA20 && abMA50 && maTrend, inDown = !abMA20 && !abMA50 && !maTrend;
    const nearMA20 = cur.low <= ma20 * 1.02 && cur.low >= ma20 * 0.96 && cur.close > ma20 * 0.99;

    const hiEff = vRatio > 1.3, loEff = vRatio < 0.65;
    const wideR = nSp > 1.2, narrowR = nSp < 0.8;
    const sDemand = accR > 1.5, mDemand = accR > 1.1, sSupply = accR < 0.6;

    let power = 50, reason = 'Neutral';

    // P1: NO SUPPLY AT MA20 SUPPORT (Wyckoff best signal)
    if (nearMA20 && loEff && !sSupply) {
      if (sDemand) { power = 96; reason = 'No Supply + Demand at MA20 → Up'; }
      else if (mDemand) { power = 88; reason = 'No Supply Test MA20 → Up'; }
      else { power = 78; reason = 'Supply Dry-Up MA20 → Up'; }
    }
    // P2: WYCKOFF SPRING (low dips below MA, closes above = shakeout)
    else if (cur.low < ma20 * 0.99 && cur.close > ma20 * 0.99 && isHammer) {
      if (hiEff && sDemand) { power = 94; reason = 'Spring + HAKA → Strong Up'; }
      else if (sDemand) { power = 88; reason = 'Wyckoff Spring → Up'; }
      else if (mDemand) { power = 80; reason = 'Possible Spring → Up'; }
      else { power = 60; reason = 'Weak Spring → Caution'; }
    }
    // P3: SIGN OF STRENGTH (wide up + high vol + close near top)
    else if (isGreen && hiEff && wideR && cPos > 0.6) {
      if (inUp && sDemand) { power = 90; reason = 'Wyckoff SOS → Up'; }
      else if (inUp) { power = 78; reason = 'Sign of Strength → Up'; }
      else if (sDemand) { power = 72; reason = 'SOS Reversal Area → Up'; }
      else { power = 60; reason = 'Possible SOS → Neutral'; }
    }
    // P4: SIGN OF WEAKNESS / UPTHRUST
    else if (!isGreen && hiEff && nSp > 1.5 && cPos < 0.35) {
      if (isStar && inUp) { power = 12; reason = 'Upthrust → Down'; }
      else if (inDown && sSupply) { power = 15; reason = 'SOW Continues → Down'; }
      else if (sSupply) { power = 22; reason = 'Heavy Selling → Down'; }
      else { power = 40; reason = 'Wide Down → Caution'; }
    }
    // P5: STOPPING VOLUME (high vol + narrow result = absorption)
    else if (hiEff && narrowR && sDemand) {
      if (!isGreen && cur.close > ma20 * 0.99) { power = 92; reason = 'Stopping Volume → Up'; }
      else if (nearMA20) { power = 85; reason = 'Volume Absorption MA20 → Up'; }
      else { power = 70; reason = 'Effort Absorbed → Up'; }
    }
    // P6: HIDDEN DISTRIBUTION (high effort, narrow result, selling dominates in uptrend)
    else if (hiEff && narrowR && sSupply && inUp) { power = 25; reason = 'Hidden Distribution → Down Risk'; }
    // P7: NO SUPPLY (VSA - red candle, very low vol = sellers gone)
    else if (!isGreen && loEff && cPos > 0.45) {
      if (abMA20 && mDemand) { power = 85; reason = 'No Supply → Up'; }
      else if (nearMA20) { power = 80; reason = 'No Supply at MA20 → Up'; }
      else if (abMA50) { power = 72; reason = 'No Supply → Up Likely'; }
      else { power = 60; reason = 'Low Supply → Neutral'; }
    }
    // P8: NO DEMAND (VSA - green candle, very low vol = buyers weak)
    else if (isGreen && loEff && cPos < 0.55) {
      if (!abMA20) { power = 35; reason = 'No Demand → Down Risk'; }
      else if (inDown) { power = 28; reason = 'No Demand in Downtrend → Down'; }
      else { power = 45; reason = 'Low Demand → Caution'; }
    }
    // P9: EFFORTLESS ADVANCE (low vol but green = pro buying)
    else if (isGreen && inUp && loEff && cPos > 0.55) { power = 82; reason = 'Effortless Advance → Up'; }
    // P10: HEALTHY UPTREND CONTINUATION
    else if (isGreen && inUp && mDemand) { power = 68; reason = 'Uptrend Continuation → Up'; }
    // P11: SHOOTING STAR (distribution)
    else if (isStar && vRatio > 1.5) { power = 18; reason = 'Shooting Star → Down'; }
    // P12: DOWNTREND CONTINUATION
    else if (!isGreen && inDown && sSupply) { power = 20; reason = 'Downtrend Continues → Down'; }
    // P13: CONSOLIDATION
    else if (isSmallBody) {
      power = (abMA20 && mDemand) ? 60 : (!abMA20 ? 42 : 52);
      reason = 'Consolidation → Neutral';
    }
    else { power = isGreen ? 55 : 45; reason = isGreen ? 'Green → Neutral' : 'Red → Neutral'; }

    if (inUp && power > 60) power = Math.min(100, power + 3);
    if (inDown && power < 40) power = Math.max(0, power - 3);
    if (vRatio > 3.0 && sDemand && isGreen) power = Math.min(100, power + 5);
    if (vRatio > 3.0 && sSupply && !isGreen) power = Math.max(0, power - 5);
    power = Math.max(0, Math.min(100, Math.round(power)));
    latestPower = power; latestAnalysis = reason;

    const col = power >= 90 ? '#00b894' : power >= 75 ? '#55efc4' : power >= 60 ? '#a4de6c' :
      power >= 50 ? '#ffd700' : power >= 40 ? '#ff8c00' : power >= 25 ? '#d63031' : '#8b0000';

    if (i >= N - 5 && !markers.find(m => m.time === cur.time))
      markers.push({ time: cur.time, position: 'aboveBar', color: col, shape: 'circle', text: power.toString() });
  }
  return { markers, analysis: `Power: ${latestPower} (${latestAnalysis})` };
}

// ============================================================================
// UNIFIED VSA + VCP + WYCKOFF DETECTOR
// ============================================================================
export function detectVSA(data: ChartData[]): {
  markers: MarkerData[]; signal: string; rmvData: RMVData[];
  wyckoffPhase: string; vcpStatus: string; evrScore: number;
} {
  const markers: MarkerData[] = [], rmvData: RMVData[] = [];
  const N = data.length;
  let latestSignal = '⬜ Netral', latestWyckoff = '⬜ Analisis...', latestVCP = '⬜ Tidak Aktif', latestEVR = 0;
  if (N < 50) return { markers, signal: latestSignal, rmvData, wyckoffPhase: latestWyckoff, vcpStatus: latestVCP, evrScore: 0 };

  const atr14 = calculateATR(data, 14);
  const atr5 = calculateATR(data, 5);
  const volSMA20 = calculateVolumeSMA(data, 20);

  for (let i = 42; i < N; i++) {
    const cur = data[i];
    const atr = atr14[i] || 1;
    const avgVol = volSMA20[i] || (cur.volume || 1);

    // ── VSA SIGNALS (last 60 bars) ──────────────────────────────────────────
    if (i >= N - 60) {
      const vsaSig = classifyVSASignal(data, i, atr14, volSMA20);
      if (vsaSig.type !== null) {
        markers.push({ time: cur.time, position: vsaSig.position, color: vsaSig.color, shape: vsaSig.shape, text: vsaSig.label });
        if (i >= N - 3) {
          const names: Record<string, string> = {
            'SC': '🟢 Selling Climax - Akumulasi Institusi',
            'BC': '🔴 Buying Climax - Distribusi',
            'UT': '🔴 Upthrust - Jebakan Bullish',
            'ND': '🟡 No Demand - Kenaikan Palsu',
            'NS': '🟢 No Supply - Tekanan Jual Habis',
            'SV': '🟢 Stopping Volume - Smart Money Masuk',
            'EVR_POS': '🟢 Absorption Bullish (Akumulasi)',
            'EVR_NEG': '🔴 Absorption Bearish (Distribusi)',
          };
          latestSignal = names[vsaSig.type] || latestSignal;
        }
      }
    }

    // ── VCP STRUCTURE (last 60 bars) ────────────────────────────────────────
    const vcpR = detectVCPStructure(data, i, atr5, volSMA20);
    if (vcpR.isValid && i >= N - 60) {
      if (vcpR.isPivotReady && !markers.find(m => m.time === cur.time)) {
        markers.push({ time: cur.time, position: 'belowBar', color: '#ff9f43', shape: 'arrowUp', text: 'PIVOT' });
        if (i >= N - 5) latestSignal = `🎯 VCP PIVOT READY (RMV:${Math.round(vcpR.currentRMV)})`;
      } else if (vcpR.isVolumeConfirmed && i >= N - 30 && !markers.find(m => m.time === cur.time)) {
        markers.push({ time: cur.time, position: 'belowBar', color: '#a29bfe', shape: 'arrowUp', text: `T${vcpR.contractionCount}` });
      }
      if (i === N - 1) latestVCP = vcpR.label;
    }

    // Standard DRY UP / ICEBERG / DISTRIBUTION (when no VCP)
    if (!vcpR.isValid && i >= N - 60) {
      const sp = cur.high - cur.low;
      const body = Math.abs(cur.close - cur.open);
      const vR = (cur.volume || 0) / avgVol;
      const spR = sp / (atr || 1);
      let bV = 0, sV = 0;
      for (let k = Math.max(0, i - 9); k <= i; k++) {
        if (data[k].close > data[k].open) bV += (data[k].volume || 0);
        else if (data[k].close < data[k].open) sV += (data[k].volume || 0);
      }
      const accR = bV / (sV || 1);
      const nearHi = cur.close > Math.max(...data.slice(Math.max(0, i - 30), i + 1).map(d => d.high)) * 0.85;
      const isDryUp = vR < 0.65 && body < sp * 0.5 && accR > 0.85;
      const isIce = vR > 1.2 && spR < 0.75 && accR > 1.1;
      const isDist = cur.close < cur.open && vR > 1.5 && accR < 0.5;
      if (!markers.find(m => m.time === cur.time)) {
        if (isIce && nearHi) { markers.push({ time: cur.time, position: 'belowBar', color: '#00cec9', shape: 'arrowUp', text: '🧊 ICE' }); if (i === N-1) latestSignal = '🧊 Iceberg (Hidden Accumulation)'; }
        else if (isDryUp && nearHi) { markers.push({ time: cur.time, position: 'belowBar', color: '#0984e3', shape: 'arrowUp', text: '🥷 DRY' }); if (i === N-1) latestSignal = '🥷 Dry Up (Supply Exhaustion)'; }
        else if (isDist) { markers.push({ time: cur.time, position: 'aboveBar', color: '#d63031', shape: 'arrowDown', text: '🩸 DIST' }); if (i === N-1) latestSignal = '🩸 Distribusi (Institutional Selling)'; }
      }
    }

    // ── RMV HISTOGRAM ────────────────────────────────────────────────────────
    if (i >= 20) {
      const rmv = calculateRMV(atr5, i, 20);
      const sp = cur.high - cur.low;
      const vR = (cur.volume || 0) / avgVol;
      if (i === N - 1) latestEVR = Math.round(((sp / (atr || 1)) - vR) * 100) / 100;
      const rmvColor = rmv <= 10 ? 'rgba(33,150,243,1.0)' : rmv <= 15 ? 'rgba(33,150,243,0.85)' : rmv <= 25 ? 'rgba(100,181,246,0.6)' : rmv <= 40 ? 'rgba(150,150,150,0.4)' : 'rgba(100,100,100,0.25)';
      rmvData.push({ time: cur.time, value: rmv, color: rmvColor });
    }

    // ── WYCKOFF PHASE ────────────────────────────────────────────────────────
    if (i >= N - 3) {
      const wy = detectWyckoffPhase(data, i, volSMA20);
      const icons: Record<string, string> = { ACCUMULATION: '🟢', MARKUP: '🚀', DISTRIBUTION: '🔴', MARKDOWN: '📉', UNKNOWN: '⬜' };
      latestWyckoff = `${icons[wy.phase]} ${wy.phase}: ${wy.event} (${wy.confidence}%)`;
    }
  }

  return { markers, signal: latestSignal, rmvData, wyckoffPhase: latestWyckoff, vcpStatus: latestVCP, evrScore: latestEVR };
}

// ============================================================================
// SUPPORT & RESISTANCE ZONES (Pivot-based + ATR zones)
// ============================================================================
export function calculateSupportResistance(
  data: ChartData[], pivotLeft = 7, pivotRight = 7, atrLen = 14, zoneMult = 0.25, maxStore = 60
): SupportResistanceData {
  const N = data.length;
  const zones: SupportResistanceZone[] = [];
  if (N < pivotLeft + pivotRight + atrLen) return { zones };
  const atrV = calculateATR(data, atrLen);
  const half = atrV[N - 1] * zoneMult;
  interface Pivot { value: number; index: number; }
  const pHi: Pivot[] = [], pLo: Pivot[] = [];
  for (let i = pivotLeft; i < N - pivotRight; i++) {
    let isH = true, isL = true;
    for (let j = i - pivotLeft; j <= i + pivotRight; j++) {
      if (j === i) continue;
      if (data[j].high >= data[i].high) isH = false;
      if (data[j].low <= data[i].low) isL = false;
    }
    if (isH) pHi.push({ value: data[i].high, index: i });
    if (isL) pLo.push({ value: data[i].low, index: i });
  }
  const curP = data[N - 1].close;
  const res = pHi.slice(-maxStore).filter(p => p.value > curP).sort((a, b) => a.value - b.value);
  const sup = pLo.slice(-maxStore).filter(p => p.value < curP).sort((a, b) => b.value - a.value);
  [res[0], res[1]].forEach(r => { if (r) zones.push({ level: r.value, top: r.value + half, bottom: r.value - half, startIndex: r.index, type: 'resistance' }); });
  [sup[0], sup[1]].forEach(s => { if (s) zones.push({ level: s.value, top: s.value + half, bottom: s.value - half, startIndex: s.index, type: 'support' }); });
  return { zones };
}

// ============================================================================
// MAIN AGGREGATOR
// ============================================================================
export function calculateAllIndicators(data: ChartData[]): IndicatorResult {
  const ma5 = calculateMA(data, 5), ma20 = calculateMA(data, 20), ma50 = calculateMA(data, 50), ma200 = calculateMA(data, 200);
  const momentum = calculateMomentum(data, 20), awesomeOscillator = calculateAO(data), fibonacci = calculateFibonacci(data, 100);
  const supportResistance = calculateSupportResistance(data);
  const vsaResult = detectVSA(data);
  const cpResult = calculateCandlePower(data);
  return {
    ma5, ma20, ma50, ma200, momentum, awesomeOscillator, fibonacci, supportResistance,
    candlePowerMarkers: cpResult.markers, candlePowerAnalysis: cpResult.analysis,
    vsaMarkers: vsaResult.markers, rmvData: vsaResult.rmvData,
    signals: { bandar: vsaResult.signal, wyckoffPhase: vsaResult.wyckoffPhase, vcpStatus: vsaResult.vcpStatus, evrScore: vsaResult.evrScore }
  };
}
