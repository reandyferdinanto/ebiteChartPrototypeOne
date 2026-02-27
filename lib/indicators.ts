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

// ── NEW: Breakout Volume Delta ──────────────────────────────────────────────
export interface BreakoutDeltaResult {
  time: number;
  direction: 'bull' | 'bear';
  bullPct: number;
  bearPct: number;
  totalVol: number;
  isRealBreakout: boolean;
  isFakeBreakout: boolean;
  label: string;
  level: number;
}

// ── Predicta V4 Result ──────────────────────────────────────────────────────
export interface PredictaV4Result {
  trendScore: number; macdScore: number; deltaScore: number; rsiScore: number;
  stochScore: number; adxScore: number; volScore: number;
  longScore: number; shortScore: number; longPct: number; shortPct: number;
  confluenceLong: number; confluenceShort: number;
  isUptrend: boolean; deltaBullish: boolean; rsiAbove50: boolean;
  stochAbove50: boolean; adxStrong: boolean;
  volRegime: 'HIGH' | 'MEDIUM' | 'LOW';
  longPerfect: boolean; shortPerfect: boolean;
  verdict: 'STRONG_BULL' | 'BULL' | 'NEUTRAL' | 'BEAR' | 'STRONG_BEAR';
  rsiValue: number; adxValue: number; volRatio: number;
  stochK: number; stochD: number; macdHistValue: number;
  volumeDeltaValue: number;
  ema8: number; ema21: number; ema50val: number;
}

export interface IndicatorResult {
  ma5: MovingAverageData[]; ma20: MovingAverageData[]; ma50: MovingAverageData[]; ma200: MovingAverageData[];
  momentum: HistogramData[]; awesomeOscillator: HistogramData[]; fibonacci: FibonacciData;
  supportResistance: SupportResistanceData;
  candlePowerMarkers: MarkerData[]; candlePowerAnalysis: string;
  vsaMarkers: MarkerData[]; rmvData: RMVData[];
  breakoutDeltaMarkers: MarkerData[];
  latestBreakoutDelta: BreakoutDeltaResult | null;
  predictaV4: PredictaV4Result | null;
  signals: { bandar: string; wyckoffPhase: string; vcpStatus: string; evrScore: number; cppScore: number; cppBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; };
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
// CANDLE POWER ENGINE v2 — Power Directional Index (PDI)
//
// Research formula (probabilistic next-candle prediction):
//
//   CBD_i = (Close_i - Open_i) / (High_i - Low_i)      → Candle Body Dominance  [-1, +1]
//   VAM_i = Volume_i / SMA(Volume, 10)                  → Volume Anomaly Multiplier
//   DP_i  = CBD_i × VAM_i                               → Daily Power
//   CPP   = Σ [ DP_(t-j) × (N-j)/N ]  for j = 0..N-1  → Cumulative Power Prediction
//
//   CPP > +0.5  → HIGH probability bullish next candle
//   CPP < -0.5  → HIGH probability bearish next candle
//   -0.5…+0.5   → Neutral / choppy / VCP base
//
// CPP is then mapped to 0-100 scale and adjusted with Wyckoff/VSA context:
//   - MA positioning (above/below MA20 / MA50)
//   - Trend alignment bonus
//   - VSA pattern boost (Spring, SOS, No Supply, Stopping Volume)
// ============================================================================
export function calculateCandlePower(data: ChartData[]): { markers: MarkerData[]; analysis: string; cppScore: number; cppBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' } {
  const markers: MarkerData[] = [];
  const N = data.length;
  let latestPower = 50, latestAnalysis = 'Insufficient data', latestCPP = 0;
  if (N < 20) return { markers, analysis: latestAnalysis, cppScore: 0, cppBias: 'NEUTRAL' };

  const LOOKBACK = 5;    // N days for CPP weighted sum
  const VOL_SMA_PERIOD = 10; // VAM base

  // Pre-compute MA20, MA50 arrays for context
  const ma20v = calculateMA(data, 20);
  const ma50v = calculateMA(data, 50);
  const atr14 = calculateATR(data, 14);

  for (let i = Math.max(LOOKBACK + VOL_SMA_PERIOD, 20); i < N; i++) {

    // ── STEP 1: Compute SMA(Volume, 10) at current bar ───────────────────────
    let volSum10 = 0;
    for (let k = 0; k < VOL_SMA_PERIOD; k++) volSum10 += (data[i - k].volume || 0);
    const volSMA10 = (volSum10 / VOL_SMA_PERIOD) || 1;

    // ── STEP 2: Compute CPP over LOOKBACK days ───────────────────────────────
    let cpp = 0;
    for (let j = 0; j < LOOKBACK; j++) {
      const bar = data[i - j];
      const range = bar.high - bar.low;
      const safeRange = range < 0.0001 ? 0.0001 : range;

      // Candle Body Dominance: [-1, +1]
      const cbd = (bar.close - bar.open) / safeRange;

      // Volume Anomaly Multiplier
      const vam = (bar.volume || 0) / volSMA10;

      // Daily Power × time weight (j=0 = today = highest weight)
      const weight = (LOOKBACK - j) / LOOKBACK;
      cpp += cbd * vam * weight;
    }

    // ── STEP 3: Map CPP → 0-100 scale ────────────────────────────────────────
    // CPP range is roughly -3 to +3 in practice (VAM ≤ 3, CBD ≤ 1, weight avg ~0.6)
    // Linear scaling: 0 CPP → 50, CPP ≥ +1.5 → 95, CPP ≤ -1.5 → 5
    const CPP_MAX = 1.5;
    let power = 50 + (cpp / CPP_MAX) * 45;
    power = Math.max(5, Math.min(95, power));

    // ── STEP 4: Wyckoff / VSA context modifiers ───────────────────────────────
    const cur = data[i];
    const sp = cur.high - cur.low;
    const body = Math.abs(cur.close - cur.open);
    const atr = atr14[i] || sp || 1;
    const vRatio = (cur.volume || 0) / volSMA10;
    const cPos = sp > 0 ? (cur.close - cur.low) / sp : 0.5;
    const isGreen = cur.close >= cur.open;
    const lWick = Math.min(cur.open, cur.close) - cur.low;
    const uWick = cur.high - Math.max(cur.open, cur.close);
    const isHammer = lWick > body * 1.2 && uWick < body * 0.6 && (lWick / (sp || 1)) > 0.45;
    const isStar = uWick > body * 2.0 && lWick < body * 0.3 && cPos < 0.4;

    // MA position context
    const ma20idx = i - 19;
    const ma50idx = i - 49;
    const ma20 = (ma20idx >= 0 && ma20idx < ma20v.length) ? ma20v[ma20idx].value : cur.close;
    const ma50 = (ma50idx >= 0 && ma50idx < ma50v.length) ? ma50v[ma50idx].value : cur.close;
    const abMA20 = cur.close > ma20;
    const abMA50 = cur.close > ma50;
    const maTrend = ma20 > ma50;
    const inUp = abMA20 && abMA50 && maTrend;
    const inDown = !abMA20 && !abMA50 && !maTrend;
    const nearMA20 = cur.low <= ma20 * 1.025 && cur.low >= ma20 * 0.965;

    // Buying/selling pressure (10-bar accumulation ratio)
    let bVol = 0, sVol = 0;
    for (let k = Math.max(0, i - 9); k <= i; k++) {
      if (data[k].close > data[k].open) bVol += (data[k].volume || 0);
      else if (data[k].close < data[k].open) sVol += (data[k].volume || 0);
    }
    const accR = bVol / (sVol || 1);

    // ── Context adjustments (each capped so they don't override CPP signal) ──

    // Spring / Hammer at MA20 support: strong reversal signal → boost
    if (isHammer && nearMA20) {
      if (vRatio > 1.3 && accR > 1.2) power = Math.max(power, 88);
      else if (vRatio < 0.7)          power = Math.max(power, 82); // No Supply spring
      else                             power = Math.max(power, 74);
    }

    // Upthrust / Shooting Star: trap signal → suppress
    if (isStar && vRatio > 1.3) power = Math.min(power, 22);

    // No Supply (VSA): red candle + very low vol above MA = bullish
    if (!isGreen && vRatio < 0.65 && cPos > 0.45 && abMA20) power = Math.max(power, 72);

    // No Demand (VSA): green candle + very low vol below MA = bearish
    if (isGreen && vRatio < 0.65 && cPos < 0.55 && !abMA20) power = Math.min(power, 38);

    // Stopping Volume (Wyckoff): high vol + narrow spread + closes upper half
    if (vRatio > 1.5 && (sp / atr) < 0.85 && cPos > 0.55 && !isGreen) power = Math.max(power, 80);

    // Buying Climax: ultra-high vol + wide up + closes lower = distribution
    if (vRatio > 2.5 && (sp / atr) > 2.0 && cPos < 0.5 && isGreen) power = Math.min(power, 25);

    // Trend alignment fine-tune
    if (inUp  && power > 55) power = Math.min(100, power + 3);
    if (inDown && power < 45) power = Math.max(0,   power - 3);

    power = Math.max(0, Math.min(100, Math.round(power)));
    latestPower = power;

    // ── Build human-readable reason string ───────────────────────────────────
    const cppRounded = Math.round(cpp * 100) / 100;
    const bias = cpp >  0.5 ? '📈 Bullish Bias' :
                 cpp < -0.5 ? '📉 Bearish Bias' : '➡️ Neutral / Consolidation';
    let context = '';
    if (isHammer && nearMA20)                              context = ' | 🔨 Hammer@MA20';
    else if (isStar && vRatio > 1.3)                       context = ' | ⭐ Shooting Star';
    else if (!isGreen && vRatio < 0.65 && abMA20)         context = ' | 🥷 No Supply';
    else if (isGreen && vRatio < 0.65 && !abMA20)         context = ' | 😴 No Demand';
    else if (vRatio > 1.5 && (sp / atr) < 0.85 && cPos > 0.55) context = ' | 🛑 Stop Volume';
    else if (vRatio > 2.5 && (sp / atr) > 2.0)           context = ' | ⚠️ Climax Vol';
    else if (inUp)                                         context = ' | ↗️ Uptrend';
    else if (inDown)                                       context = ' | ↘️ Downtrend';

    latestAnalysis = `CPP:${cppRounded} ${bias}${context}`;
    latestCPP = cpp;

    // Color scale
    const col = power >= 90 ? '#00b894'
              : power >= 80 ? '#55efc4'
              : power >= 65 ? '#a4de6c'
              : power >= 55 ? '#ffd700'
              : power >= 45 ? '#ffb347'
              : power >= 30 ? '#ff8c00'
              : power >= 15 ? '#d63031'
              :                '#8b0000';

    // Show dots on last 5 candles
    if (i >= N - 5 && !markers.find(m => m.time === cur.time)) {
      markers.push({ time: cur.time, position: 'aboveBar', color: col, shape: 'circle', text: power.toString() });
    }
  }

  const finalBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = latestCPP > 0.5 ? 'BULLISH' : latestCPP < -0.5 ? 'BEARISH' : 'NEUTRAL';
  return { markers, analysis: `Power: ${latestPower} (${latestAnalysis})`, cppScore: Math.round(latestCPP * 100) / 100, cppBias: finalBias };
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

    // ── HAKA COOLDOWN DETECTION ──────────────────────────────────────────────
    // Aggressive markup candle followed by healthy cooldown bars with low sell vol
    if (i >= N - 20) {
      // Find the most recent HAKA candle within last 15 bars before i
      let hakaIdx = -1;
      let hakaVolRatio = 0;
      const curAvgVol = avgVol;
      for (let k = Math.max(0, i - 15); k < i - 1; k++) {
        const sp_k = data[k].high - data[k].low;
        const body_k = Math.abs(data[k].close - data[k].open);
        const vr_k = (data[k].volume || 0) / (curAvgVol || 1);
        const bp_k = sp_k > 0 ? (data[k].close - data[k].low) / sp_k : 0;
        // HAKA = aggressive green breakout candle: high vol, large body, closes near top
        if (data[k].close > data[k].open && vr_k > 1.8 && body_k > sp_k * 0.55 && bp_k > 0.65 && vr_k > hakaVolRatio) {
          hakaIdx = k;
          hakaVolRatio = vr_k;
        }
      }

      if (hakaIdx >= 0) {
        const cooldownLen = i - hakaIdx;
        if (cooldownLen >= 2 && cooldownLen <= 8) {
          // Check cooldown bars: sell volume < 40% of total
          let cdSell = 0, cdTotal = 0;
          for (let k = hakaIdx + 1; k <= i; k++) {
            if (data[k].close < data[k].open) cdSell += (data[k].volume || 0);
            cdTotal += (data[k].volume || 0);
          }
          const sellRatio = cdTotal > 0 ? cdSell / cdTotal : 0;

          // MA20 check
          let ma20sum = 0;
          for (let k = i - 19; k <= i; k++) ma20sum += data[k].close;
          const ma20cur = ma20sum / 20;

          // Pullback < 5% from HAKA close
          const pullback = (data[hakaIdx].close - cur.close) / data[hakaIdx].close * 100;

          // Accumulation ratio current
          let bvC = 0, svC = 0;
          for (let k = Math.max(0, i - 9); k <= i; k++) {
            if (data[k].close > data[k].open) bvC += (data[k].volume || 0);
            else if (data[k].close < data[k].open) svC += (data[k].volume || 0);
          }
          const accCur = bvC / (svC || 1);

          const isHakaReady =
            sellRatio < 0.40 &&
            pullback < 5 &&
            cur.close > ma20cur &&
            accCur > 0.9;

          if (isHakaReady && !markers.find(m => m.time === cur.time)) {
            markers.push({
              time: cur.time,
              position: 'belowBar',
              color: '#fd7e14',
              shape: 'arrowUp',
              text: `🔥 HAKA`
            });
            if (i >= N - 3) {
              latestSignal = `🔥 HAKA COOLDOWN (${cooldownLen}b, sell:${Math.round(sellRatio * 100)}%) — Ready to Markup!`;
            }
          }
        }
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
// INTRADAY SCALP MARKERS — AppScript getLWCData intraday VSA logic
// Produces markers for 5m / 15m / 1h / 4h timeframes:
//   🎯 SCALP SNIPER (VCP+DryUp), ⚡ HAKA (breakout),
//   🧊 ICEBERG, 🥷 MICRO DRY UP, 🩸 DUMP, ⚠️ PUCUK
// ============================================================================
export interface ScalpMarkerSignal { type: string; text: string; }

export function calculateIntradayScalpMarkers(
  data: ChartData[]
): { markers: MarkerData[]; latestSignal: ScalpMarkerSignal | null } {
  const markers: MarkerData[] = [];
  const N = data.length;
  let latestSignal: ScalpMarkerSignal | null = null;

  if (N < 42) return { markers, latestSignal };

  // precompute SMA 20 array
  const smaArr: number[] = new Array(N).fill(0);
  for (let i = 20; i < N; i++) {
    let s = 0;
    for (let j = i - 19; j <= i; j++) s += data[j].close;
    smaArr[i] = s / 20;
  }

  for (let i = 40; i < N; i++) {
    // rolling 20-bar vol & spread avg
    let volAvg20 = 0, spreadSum20 = 0;
    for (let j = i - 20; j < i; j++) {
      volAvg20  += data[j].volume || 0;
      spreadSum20 += data[j].high - data[j].low;
    }
    volAvg20  /= 20;
    const spreadAvg20 = spreadSum20 / 20;

    const v = data[i];
    const vol       = v.volume || 0;
    const volRatio  = vol / (volAvg20 || 1);
    const spread    = v.high - v.low;
    const body      = Math.abs(v.close - v.open);
    const isGreen   = v.close >= v.open;
    const spreadRatio = spread / (spreadAvg20 || 1);
    const upperWick = v.high - Math.max(v.open, v.close);
    const bodyPos   = spread === 0 ? 0 : (v.close - v.low) / spread;

    // accumulation ratio (last 10 bars)
    let buyVol = 0, sellVol = 0;
    for (let k = i - 9; k <= i; k++) {
      if (data[k].close > data[k].open) buyVol  += data[k].volume || 0;
      else if (data[k].close < data[k].open) sellVol += data[k].volume || 0;
    }
    const accRatio = buyVol / (sellVol || 1);

    // VCP: near 30-bar high + spread + vol contracting
    const highest30 = Math.max(...data.slice(Math.max(0, i - 30), i).map(d => d.high));
    const isNearHigh = v.close > (highest30 * 0.85);
    let spreadSum5 = 0, volSum5 = 0;
    for (let j = i - 5; j < i; j++) { spreadSum5 += data[j].high - data[j].low; volSum5 += data[j].volume || 0; }
    const isVCP = isNearHigh && (spreadSum5 / 5 < spreadAvg20 * 0.65) && (volSum5 / 5 < volAvg20 * 0.75);

    // AppScript intraday pattern flags
    const isDryUp       = (!isGreen || body < spread * 0.2) && volRatio <= 0.45 && accRatio > 1.2;
    const isIceberg     = volRatio > 1.5 && spreadRatio < 0.6;
    const isScalpDump   = !isGreen && volRatio > 2.5 && body > spread * 0.6;
    const isShootingStar = volRatio > 2 && (upperWick / (spread || 1) > 0.5);
    const isScalpBreakout = isGreen && volRatio > 2.5 && bodyPos > 0.8 && v.close > smaArr[i];

    let markerObj: MarkerData | null = null;
    let sigType = '';

    // Priority order from AppScript
    if (isScalpDump) {
      sigType = 'SCALP DUMP';
      markerObj = { time: v.time, position: 'aboveBar', color: '#d63031', shape: 'arrowDown', text: '🩸 DUMP' };
    } else if (isShootingStar && !isVCP && !isDryUp) {
      sigType = 'PUCUK';
      markerObj = { time: v.time, position: 'aboveBar', color: '#e74c3c', shape: 'arrowDown', text: '⚠️ PUCUK' };
    } else if (isVCP && isDryUp) {
      sigType = 'SCALP SNIPER';
      markerObj = { time: v.time, position: 'belowBar', color: '#ff9f43', shape: 'arrowUp', text: '🎯 SNIPER' };
    } else if (isScalpBreakout) {
      sigType = 'SCALP BREAKOUT';
      markerObj = { time: v.time, position: 'belowBar', color: '#00b894', shape: 'arrowUp', text: '⚡ HAKA!' };
    } else if (isIceberg) {
      sigType = 'ICEBERG';
      markerObj = { time: v.time, position: 'belowBar', color: '#00cec9', shape: 'arrowUp', text: '🧊 ICEBERG' };
    } else if (isDryUp) {
      sigType = 'DRY UP';
      markerObj = { time: v.time, position: 'belowBar', color: '#0984e3', shape: 'arrowUp', text: '🥷 DRY UP' };
    }

    if (markerObj) {
      markers.push(markerObj);
      if (i >= N - 1) latestSignal = { type: sigType, text: markerObj.text };
    }
  }

  return { markers, latestSignal };
}

// ============================================================================
// BREAKOUT VOLUME DELTA
//
// Ported from PineScript "Breakout Volume Delta | Flux Charts"
// Detects swing H/L pivots, then when price breaks through one, measures:
//   bullPct = buying volume share at the breakout candle
//   bearPct = selling volume share
//
// REAL breakout  (upside): bullPct ≥ 55% — buyers dominate → trend likely to continue
// FAKE breakout  (upside): bearPct ≥ 55% — sellers dominate → Upthrust / trap likely
// REAL breakdown (bear):   bearPct ≥ 55% — sellers dominate → trend likely to continue
// FAKE breakdown (bear):   bullPct ≥ 55% — buyers dominate → Spring / shakeout
//
// Volume split proxy (no LTF data available):
//   Bull Vol at bar = volume if close > open, else volume × closePos
//   Bear Vol at bar = volume if close < open, else volume × (1 - closePos)
//
// This is added on top of existing VSA markers without replacing them.
// ============================================================================
export function detectBreakoutVolumeDelta(
  data: ChartData[],
  pivotLeft = 5,
  pivotRight = 5,
  maxLevels = 10,       // increased from 5 → catches older pivots used in screener
  brVolFilter = false,
  brVolPct = 55,
): { markers: MarkerData[]; breakouts: BreakoutDeltaResult[]; latestBreakout: BreakoutDeltaResult | null } {
  const markers: MarkerData[] = [];
  const breakouts: BreakoutDeltaResult[] = [];
  let latestBreakout: BreakoutDeltaResult | null = null;
  const N = data.length;
  if (N < pivotLeft + pivotRight + 20) return { markers, breakouts, latestBreakout };

  // ── 1. Detect swing pivots ────────────────────────────────────────────────
  // Each pivot tracks its own "first breakout bar" instead of a boolean flag,
  // so we don't consume the pivot until it's actually broken (no premature mitigation)
  interface Pivot { value: number; index: number; firstBreakBar: number; }
  const pivotsHi: Pivot[] = [];
  const pivotsLo: Pivot[] = [];

  for (let i = pivotLeft; i < N - pivotRight; i++) {
    let isH = true, isL = true;
    for (let j = i - pivotLeft; j <= i + pivotRight; j++) {
      if (j === i) continue;
      if (data[j].high >= data[i].high) isH = false;
      if (data[j].low  <= data[i].low)  isL = false;
    }
    if (isH) pivotsHi.push({ value: data[i].high, index: i, firstBreakBar: -1 });
    if (isL) pivotsLo.push({ value: data[i].low,  index: i, firstBreakBar: -1 });
  }

  // Keep only the most recent `maxLevels` on each side
  const activeHi = pivotsHi.slice(-maxLevels);
  const activeLo = pivotsLo.slice(-maxLevels);

  // ── 2. Helper: estimate bull/bear volume split for a single candle ────────
  function splitVolume(bar: ChartData): { bullV: number; bearV: number } {
    const vol  = bar.volume || 0;
    const rng  = bar.high - bar.low;
    const cPos = rng > 0 ? (bar.close - bar.low) / rng : 0.5;
    if (bar.close > bar.open) return { bullV: vol,       bearV: 0 };
    if (bar.close < bar.open) return { bullV: 0,         bearV: vol };
    return { bullV: vol * cPos, bearV: vol * (1 - cPos) };
  }

  // ── 3. Check each bar for breakouts of unmitigated pivots ─────────────────
  // Key fix: only mark the FIRST bar that breaks each pivot, then stop
  // tracking that pivot (firstBreakBar >= 0 means consumed).
  // Do NOT mitigate when volOk is false — skip but keep pivot active.
  for (let i = pivotRight + pivotLeft; i < N; i++) {
    const bar = data[i];
    const { bullV, bearV } = splitVolume(bar);
    const totalV = bullV + bearV;
    const bullPct = totalV > 0 ? (bullV / totalV) * 100 : 50;
    const bearPct = 100 - bullPct;

    // ── Upside breakout (resistance break) ──
    for (const pivot of activeHi) {
      if (pivot.firstBreakBar >= 0) continue; // already consumed
      if (pivot.index >= i) continue;

      const broke = bar.close > pivot.value;
      if (!broke) continue;

      // Volume filter: if enabled and not met, skip without consuming pivot
      if (brVolFilter && bullPct < brVolPct) continue;

      pivot.firstBreakBar = i; // consume — only first break counts

      const isReal = bullPct >= 55;
      const isFake = bearPct >= 55;
      const label  = isReal
        ? `🚀 REAL BR ↑ Bull:${Math.round(bullPct)}%`
        : isFake
        ? `⚠️ FAKE BR ↑ Bear:${Math.round(bearPct)}% (Upthrust!)`
        : `🔶 BREAK ↑ Bull:${Math.round(bullPct)}%`;

      const color  = isReal ? '#00b894' : isFake ? '#e74c3c' : '#fdcb6e';
      const pos: 'aboveBar' | 'belowBar' = isFake ? 'aboveBar' : 'belowBar';
      const shape: 'arrowUp' | 'arrowDown' = isFake ? 'arrowDown' : 'arrowUp';

      markers.push({ time: bar.time, position: pos, color, shape, text: isFake ? '⚠️UT' : '🚀BR' });

      const result: BreakoutDeltaResult = {
        time: bar.time, direction: 'bull',
        bullPct: Math.round(bullPct), bearPct: Math.round(bearPct),
        totalVol: totalV, isRealBreakout: isReal, isFakeBreakout: isFake,
        label, level: pivot.value,
      };
      breakouts.push(result);
      if (i >= N - 5) latestBreakout = result;
    }

    // ── Downside breakdown (support break) ──
    for (const pivot of activeLo) {
      if (pivot.firstBreakBar >= 0) continue; // already consumed
      if (pivot.index >= i) continue;

      const broke = bar.close < pivot.value;
      if (!broke) continue;

      // Volume filter: if enabled and not met, skip without consuming pivot
      if (brVolFilter && bearPct < brVolPct) continue;

      pivot.firstBreakBar = i; // consume

      const isReal = bearPct >= 55;
      const isFake = bullPct >= 55;
      const label  = isReal
        ? `📉 REAL BD ↓ Bear:${Math.round(bearPct)}%`
        : isFake
        ? `🌱 FAKE BD ↓ Bull:${Math.round(bullPct)}% (Spring!)`
        : `🔶 BREAK ↓ Bear:${Math.round(bearPct)}%`;

      const color  = isReal ? '#d63031' : isFake ? '#00b894' : '#fdcb6e';
      const pos: 'aboveBar' | 'belowBar' = isFake ? 'belowBar' : 'aboveBar';
      const shape: 'arrowUp' | 'arrowDown' = isFake ? 'arrowUp' : 'arrowDown';

      markers.push({ time: bar.time, position: pos, color, shape, text: isFake ? '🌱SP' : '📉BD' });

      const result: BreakoutDeltaResult = {
        time: bar.time, direction: 'bear',
        bullPct: Math.round(bullPct), bearPct: Math.round(bearPct),
        totalVol: totalV, isRealBreakout: isReal, isFakeBreakout: isFake,
        label, level: pivot.value,
      };
      breakouts.push(result);
      if (i >= N - 5) latestBreakout = result;
    }
  }

  return { markers, breakouts, latestBreakout };
}

// ============================================================================
// PREDICTA V4 — NEXT CANDLE PREDICTOR
// Ported from PineScript "Predicta Futures - Next Candle Predictor V4"
// 8-point confluence: Supertrend + EMA + MACD + RSI + Stoch + ADX + Vol + Delta
// V4 fix: Delta confirmation MANDATORY for "Perfect Time" signal
// ============================================================================
export function calculatePredictaV4(data: ChartData[]): PredictaV4Result | null {
  const N = data.length;
  if (N < 60) return null;

  // ── EMA ──────────────────────────────────────────────────────────────────
  function emaFn(values: number[], period: number): number[] {
    const result = new Array(values.length).fill(NaN);
    const k = 2 / (period + 1);
    let seed = 0;
    const seedLen = Math.min(period, values.length);
    for (let i = 0; i < seedLen; i++) seed += values[i];
    seed /= seedLen;
    result[period - 1] = seed;
    for (let i = period; i < values.length; i++) {
      result[i] = values[i] * k + result[i - 1] * (1 - k);
    }
    return result;
  }

  // ── SMA ──────────────────────────────────────────────────────────────────
  function smaFn(values: number[], period: number): number[] {
    const result = new Array(values.length).fill(NaN);
    for (let i = period - 1; i < values.length; i++) {
      let s = 0;
      for (let j = i - period + 1; j <= i; j++) s += values[j];
      result[i] = s / period;
    }
    return result;
  }

  // ── Wilder RMA (for RSI / ATR) ────────────────────────────────────────────
  function rmaFn(values: number[], period: number): number[] {
    const result = new Array(values.length).fill(NaN);
    let seed = 0;
    for (let i = 0; i < period && i < values.length; i++) seed += values[i];
    seed /= Math.min(period, values.length);
    result[period - 1] = seed;
    for (let i = period; i < values.length; i++) {
      result[i] = (result[i - 1] * (period - 1) + values[i]) / period;
    }
    return result;
  }

  const closes = data.map(d => d.close);
  const highs  = data.map(d => d.high);
  const lows   = data.map(d => d.low);
  const vols   = data.map(d => d.volume || 0);

  // ── True Range array ─────────────────────────────────────────────────────
  const trArr: number[] = new Array(N).fill(0);
  trArr[0] = highs[0] - lows[0];
  for (let i = 1; i < N; i++) {
    trArr[i] = Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
  }

  // ── Supertrend (period=10, factor=3.0) ───────────────────────────────────
  const stATR = rmaFn(trArr, 10);
  const upperBandArr = new Array(N).fill(0);
  const lowerBandArr = new Array(N).fill(0);
  const trendDirArr  = new Array(N).fill(1); // 1=down, -1=up
  for (let i = 0; i < N; i++) {
    const hl2 = (highs[i] + lows[i]) / 2;
    const raw = 3.0 * (stATR[i] || 1);
    const rawU = hl2 + raw, rawL = hl2 - raw;
    if (i === 0) { upperBandArr[i] = rawU; lowerBandArr[i] = rawL; continue; }
    lowerBandArr[i] = closes[i - 1] > lowerBandArr[i - 1] ? Math.max(rawL, lowerBandArr[i - 1]) : rawL;
    upperBandArr[i] = closes[i - 1] < upperBandArr[i - 1] ? Math.min(rawU, upperBandArr[i - 1]) : rawU;
    const pDir = trendDirArr[i - 1];
    trendDirArr[i] = pDir === 1 ? (closes[i] > upperBandArr[i] ? -1 : 1) : (closes[i] < lowerBandArr[i] ? 1 : -1);
  }
  const isUptrend = trendDirArr[N - 1] === -1;

  // ── EMA 8, 21, 50 ────────────────────────────────────────────────────────
  const ema8arr  = emaFn(closes, 8);
  const ema21arr = emaFn(closes, 21);
  const ema50arr = emaFn(closes, 50);
  const ema8v    = isNaN(ema8arr[N - 1])  ? closes[N - 1] : ema8arr[N - 1];
  const ema21v   = isNaN(ema21arr[N - 1]) ? closes[N - 1] : ema21arr[N - 1];
  const ema50v   = isNaN(ema50arr[N - 1]) ? closes[N - 1] : ema50arr[N - 1];

  // ── RSI(14) ───────────────────────────────────────────────────────────────
  const gains  = new Array(N).fill(0);
  const losses = new Array(N).fill(0);
  for (let i = 1; i < N; i++) {
    const ch = closes[i] - closes[i - 1];
    gains[i]  = ch > 0 ?  ch : 0;
    losses[i] = ch < 0 ? -ch : 0;
  }
  const avgGain = rmaFn(gains,  14);
  const avgLoss = rmaFn(losses, 14);
  let rsiVal = 50;
  if (N >= 14) {
    const ag = avgGain[N - 1], al = avgLoss[N - 1];
    rsiVal = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  }

  // ── MACD (12, 26, 9) ──────────────────────────────────────────────────────
  const fastEMA   = emaFn(closes, 12);
  const slowEMA   = emaFn(closes, 26);
  const macdLine  = fastEMA.map((v, i) => (isNaN(v) || isNaN(slowEMA[i])) ? 0 : v - slowEMA[i]);
  const sigLine   = emaFn(macdLine, 9);
  const macdHist  = macdLine[N - 1] - (isNaN(sigLine[N - 1]) ? 0 : sigLine[N - 1]);
  const macdLineV = macdLine[N - 1];
  const sigLineV  = isNaN(sigLine[N - 1]) ? 0 : sigLine[N - 1];

  // ── Stochastic(14, 3) ─────────────────────────────────────────────────────
  const stochKArr = new Array(N).fill(50);
  for (let i = 13; i < N; i++) {
    const slice = { h: Math.max(...highs.slice(i - 13, i + 1)), l: Math.min(...lows.slice(i - 13, i + 1)) };
    stochKArr[i] = slice.h > slice.l ? ((closes[i] - slice.l) / (slice.h - slice.l)) * 100 : 50;
  }
  const stochDArr = smaFn(stochKArr, 3);
  const stochK = stochKArr[N - 1];
  const stochD = isNaN(stochDArr[N - 1]) ? 50 : stochDArr[N - 1];

  // ── ADX(14) ───────────────────────────────────────────────────────────────
  const dmP = new Array(N).fill(0), dmM = new Array(N).fill(0);
  for (let i = 1; i < N; i++) {
    const up = highs[i] - highs[i - 1], dn = lows[i - 1] - lows[i];
    dmP[i] = (up > dn && up > 0) ? up : 0;
    dmM[i] = (dn > up && dn > 0) ? dn : 0;
  }
  const atrAdx    = rmaFn(trArr, 14);
  const smDiP     = rmaFn(dmP, 14);
  const smDiM     = rmaFn(dmM, 14);
  const diPlusV   = atrAdx[N - 1] > 0 ? (smDiP[N - 1] / atrAdx[N - 1]) * 100 : 0;
  const diMinusV  = atrAdx[N - 1] > 0 ? (smDiM[N - 1] / atrAdx[N - 1]) * 100 : 0;
  const dxArr     = atrAdx.map((a, i) => {
    const dp = a > 0 ? (smDiP[i] / a) * 100 : 0;
    const dm = a > 0 ? (smDiM[i] / a) * 100 : 0;
    const s  = dp + dm;
    return s > 0 ? (Math.abs(dp - dm) / s) * 100 : 0;
  });
  const adxArr = rmaFn(dxArr, 14);
  const adxVal = isNaN(adxArr[N - 1]) ? 20 : adxArr[N - 1];

  // ── Volume ratio ──────────────────────────────────────────────────────────
  const volSMA20 = smaFn(vols, 20);
  const volRatio = vols[N - 1] / (isNaN(volSMA20[N - 1]) || volSMA20[N - 1] === 0 ? 1 : volSMA20[N - 1]);

  // ── Volume Delta (buy vol vs sell vol estimate) ───────────────────────────
  const candleRange = highs[N - 1] - lows[N - 1];
  const buyVol  = candleRange > 0 ? vols[N - 1] * (closes[N - 1] - lows[N - 1]) / candleRange : vols[N - 1] * 0.5;
  const sellVol = candleRange > 0 ? vols[N - 1] * (highs[N - 1] - closes[N - 1]) / candleRange : vols[N - 1] * 0.5;
  const volumeDelta = buyVol - sellVol;

  // Delta EMA(10) over all bars
  const deltaArr = data.map(d => {
    const r = d.high - d.low;
    const bv = r > 0 ? (d.volume || 0) * (d.close - d.low) / r : (d.volume || 0) * 0.5;
    const sv = r > 0 ? (d.volume || 0) * (d.high - d.close) / r : (d.volume || 0) * 0.5;
    return bv - sv;
  });
  const deltaEmaArr = emaFn(deltaArr, 10);
  const deltaEma    = isNaN(deltaEmaArr[N - 1]) ? 0 : deltaEmaArr[N - 1];
  const deltaBullish  = volumeDelta > 0;
  const deltaBearish  = volumeDelta < 0;
  const deltaMomentum = volumeDelta > deltaEma;

  // ── Volatility Regime ─────────────────────────────────────────────────────
  const atrCur = stATR[N - 1] || 1;
  let atrRankCount = 0;
  const lookbackATR = Math.min(100, N);
  for (let i = N - lookbackATR; i < N; i++) if ((stATR[i] || 0) < atrCur) atrRankCount++;
  const atrPct = (atrRankCount / lookbackATR) * 100;
  const volRegime: 'HIGH' | 'MEDIUM' | 'LOW' = atrPct > 75 ? 'HIGH' : atrPct < 25 ? 'LOW' : 'MEDIUM';
  const volMult = atrPct > 75 ? 0.85 : atrPct < 25 ? 1.15 : 1.0;

  // ── Dynamic ADX threshold ─────────────────────────────────────────────────
  const dynThr = adxVal > 30 ? 55 : adxVal > 25 ? 60 : adxVal > 20 ? 65 : 70;

  // ── Component Scores ──────────────────────────────────────────────────────
  const rsiAbove50 = rsiVal > 50;
  const stochAbove50 = stochK > 50;
  const adxStrong = adxVal > 25;

  const macdScL = macdLineV > sigLineV && macdHist > 0 ? 100 : macdLineV > sigLineV ? 70 : macdHist > 0 ? 50 : 20;
  const macdScS = macdLineV < sigLineV && macdHist < 0 ? 100 : macdLineV < sigLineV ? 70 : macdHist < 0 ? 50 : 20;
  const rsiScL  = rsiVal < 30 ? 100 : rsiVal < 40 ? 85 : rsiVal < 50 ? 70 : rsiVal < 60 ? 50 : 25;
  const rsiScS  = rsiVal > 70 ? 100 : rsiVal > 60 ? 85 : rsiVal > 50 ? 70 : rsiVal > 40 ? 50 : 25;
  const stScL   = stochK > stochD && stochK < 20 ? 100 : stochK > stochD && stochK < 50 ? 85 : stochK > stochD ? 65 : 25;
  const stScS   = stochK < stochD && stochK > 80 ? 100 : stochK < stochD && stochK > 50 ? 85 : stochK < stochD ? 65 : 25;
  const volSc   = volRatio > 2.0 ? 100 : volRatio > 1.5 ? 80 : volRatio > 1.0 ? 60 : volRatio > 0.8 ? 45 : 25;
  const dScL    = volumeDelta > 0 && deltaMomentum ? 100 : volumeDelta > 0 ? 75 : volumeDelta > -Math.abs(deltaEma) ? 40 : 20;
  const dScS    = volumeDelta < 0 && !deltaMomentum ? 100 : volumeDelta < 0 ? 75 : volumeDelta < Math.abs(deltaEma) ? 40 : 20;
  const adxSc   = adxVal > 35 ? 100 : adxVal > 30 ? 85 : adxVal > 25 ? 70 : adxVal > 20 ? 50 : 30;
  const tScL    = isUptrend && ema8v > ema21v && ema21v > ema50v ? 100 : isUptrend && ema8v > ema21v ? 80 : isUptrend ? 60 : 0;
  const tScS    = !isUptrend && ema8v < ema21v && ema21v < ema50v ? 100 : !isUptrend && ema8v < ema21v ? 80 : !isUptrend ? 60 : 0;

  // Weighted composite (Trend 23%, MACD 18%, Delta 15%, RSI 12%, Stoch 12%, ADX 10%, Vol 10%)
  const longRaw  = tScL * 0.23 + macdScL * 0.18 + dScL * 0.15 + rsiScL * 0.12 + stScL * 0.12 + adxSc * 0.10 + volSc * 0.10;
  const shortRaw = tScS * 0.23 + macdScS * 0.18 + dScS * 0.15 + rsiScS * 0.12 + stScS * 0.12 + adxSc * 0.10 + volSc * 0.10;

  const longScore  = Math.round(Math.min(100, Math.max(0, longRaw  * volMult)));
  const shortScore = Math.round(Math.min(100, Math.max(0, shortRaw * volMult)));
  const totalRaw   = longScore + shortScore || 1;
  const longPct    = Math.round((longScore / totalRaw) * 100);
  const shortPct   = 100 - longPct;

  // ── 8-Point Confluence ────────────────────────────────────────────────────
  const volOk = volRatio >= 0.8;
  let cL = 0, cS = 0;
  cL += isUptrend ? 1 : 0;     cS += !isUptrend ? 1 : 0;
  cL += ema8v > ema21v ? 1 : 0; cS += ema8v < ema21v ? 1 : 0;
  cL += macdLineV > sigLineV ? 1 : 0; cS += macdLineV < sigLineV ? 1 : 0;
  cL += stochK > stochD ? 1 : 0;     cS += stochK < stochD ? 1 : 0;
  cL += volOk ? 1 : 0;              cS += volOk ? 1 : 0;
  cL += adxStrong ? 1 : 0;          cS += adxStrong ? 1 : 0;
  cL += rsiAbove50 ? 1 : 0;         cS += !rsiAbove50 ? 1 : 0;
  cL += deltaBullish ? 1 : 0;       cS += deltaBearish ? 1 : 0;

  // ── Perfect Time (V4: Delta MANDATORY) ───────────────────────────────────
  const longPerfect  = isUptrend  && longPct  >= dynThr && cL >= 5 && volOk && rsiAbove50  && deltaBullish;
  const shortPerfect = !isUptrend && shortPct >= dynThr && cS >= 5 && volOk && !rsiAbove50 && deltaBearish;

  // ── Verdict ───────────────────────────────────────────────────────────────
  let verdict: PredictaV4Result['verdict'];
  if      (longPerfect)              verdict = 'STRONG_BULL';
  else if (longPct  >= 60 && cL >= 5) verdict = 'BULL';
  else if (shortPerfect)             verdict = 'STRONG_BEAR';
  else if (shortPct >= 60 && cS >= 5) verdict = 'BEAR';
  else                                verdict = 'NEUTRAL';

  return {
    trendScore: Math.max(tScL, tScS), macdScore: Math.max(macdScL, macdScS),
    deltaScore: Math.max(dScL, dScS), rsiScore: rsiAbove50 ? rsiScL : rsiScS,
    stochScore: stochAbove50 ? stScL : stScS, adxScore: adxSc, volScore: volSc,
    longScore, shortScore, longPct, shortPct,
    confluenceLong: cL, confluenceShort: cS,
    isUptrend, deltaBullish, rsiAbove50, stochAbove50, adxStrong, volRegime,
    longPerfect, shortPerfect, verdict,
    rsiValue:         Math.round(rsiVal * 10) / 10,
    adxValue:         Math.round(adxVal * 10) / 10,
    volRatio:         Math.round(volRatio * 10) / 10,
    stochK:           Math.round(stochK  * 10) / 10,
    stochD:           Math.round(stochD  * 10) / 10,
    macdHistValue:    Math.round(macdHist * 100) / 100,
    volumeDeltaValue: Math.round(volumeDelta),
    ema8:             Math.round(ema8v  * 100) / 100,
    ema21:            Math.round(ema21v * 100) / 100,
    ema50val:         Math.round(ema50v * 100) / 100,
  };
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
  const bvdResult = detectBreakoutVolumeDelta(data);
  const predictaV4 = calculatePredictaV4(data);
  return {
    ma5, ma20, ma50, ma200, momentum, awesomeOscillator, fibonacci, supportResistance,
    candlePowerMarkers: cpResult.markers, candlePowerAnalysis: cpResult.analysis,
    vsaMarkers: vsaResult.markers, rmvData: vsaResult.rmvData,
    breakoutDeltaMarkers: bvdResult.markers,
    latestBreakoutDelta: bvdResult.latestBreakout,
    predictaV4,
    signals: {
      bandar: vsaResult.signal, wyckoffPhase: vsaResult.wyckoffPhase,
      vcpStatus: vsaResult.vcpStatus, evrScore: vsaResult.evrScore,
      cppScore: cpResult.cppScore, cppBias: cpResult.cppBias,
    }
  };
}
