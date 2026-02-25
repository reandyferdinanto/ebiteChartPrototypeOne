// Indicator calculation utilities for stock charts

export interface ChartData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface MovingAverageData {
  time: number;
  value: number;
}

export interface HistogramData {
  time: number;
  value: number;
  color: string;
}

export interface MarkerData {
  time: number;
  position: 'aboveBar' | 'belowBar';
  color: string;
  shape: 'arrowUp' | 'arrowDown' | 'circle';
  text: string;
}

export interface FibonacciData {
  f382: MovingAverageData[];
  f500: MovingAverageData[];
  f618: MovingAverageData[];
}

export interface IndicatorResult {
  ma5: MovingAverageData[];
  ma20: MovingAverageData[];
  ma50: MovingAverageData[];
  ma200: MovingAverageData[];
  momentum: HistogramData[];
  awesomeOscillator: HistogramData[];
  fibonacci: FibonacciData;
  candlePowerMarkers: MarkerData[];
  candlePowerAnalysis: string;
  vsaMarkers: MarkerData[];
  squeezeMarkers: MarkerData[];
  signals: {
    base: string;
    bandar: string;
  };
}

// Calculate Moving Average
export function calculateMA(data: ChartData[], period: number): MovingAverageData[] {
  const result: MovingAverageData[] = [];

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j].close;
    }
    result.push({
      time: data[i].time,
      value: sum / period
    });
  }

  return result;
}

// Calculate Momentum Indicator (MACD-like histogram)
export function calculateMomentum(data: ChartData[], period: number = 20): HistogramData[] {
  const result: HistogramData[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      result.push({ time: data[i].time, value: 0, color: 'rgba(0,0,0,0)' });
    } else {
      const closes = data.slice(i - period, i).map(d => d.close);
      const sma = closes.reduce((a, b) => a + b) / period;

      const highs = data.slice(i - period, i).map(d => d.high);
      const lows = data.slice(i - period, i).map(d => d.low);
      const highestHigh = Math.max(...highs);
      const lowestLow = Math.min(...lows);

      const value = data[i].close - ((highestHigh + lowestLow) / 2 + sma) / 2;
      const prevValue = result[i - 1].value;

      const color = value >= 0
        ? (value > prevValue ? '#00b894' : '#55efc4')
        : (value < prevValue ? '#d63031' : '#ff7675');

      result.push({ time: data[i].time, value, color });
    }
  }

  return result;
}

// Calculate Awesome Oscillator
export function calculateAO(data: ChartData[]): HistogramData[] {
  const result: HistogramData[] = [];
  const medians = data.map(d => (d.high + d.low) / 2);

  for (let i = 0; i < data.length; i++) {
    if (i < 33) {
      result.push({ time: data[i].time, value: 0, color: 'rgba(0,0,0,0)' });
    } else {
      let sum5 = 0;
      for (let j = i - 4; j <= i; j++) {
        sum5 += medians[j];
      }

      let sum34 = 0;
      for (let j = i - 33; j <= i; j++) {
        sum34 += medians[j];
      }

      const aoValue = (sum5 / 5) - (sum34 / 34);
      const prevAoValue = result[i - 1].value;
      const color = aoValue >= prevAoValue ? '#00b894' : '#d63031';

      result.push({ time: data[i].time, value: aoValue, color });
    }
  }

  return result;
}

// Calculate Fibonacci Retracement Levels
export function calculateFibonacci(data: ChartData[], lookback: number = 100): FibonacciData {
  const N = data.length;
  const fiboLookback = Math.min(lookback, N);

  let recentHigh = -Infinity;
  let recentLow = Infinity;

  for (let i = N - fiboLookback; i < N; i++) {
    if (data[i].high > recentHigh) recentHigh = data[i].high;
    if (data[i].low < recentLow) recentLow = data[i].low;
  }

  const diff = recentHigh - recentLow;
  const f382 = recentHigh - (0.382 * diff);
  const f500 = recentHigh - (0.500 * diff);
  const f618 = recentHigh - (0.618 * diff);

  const f382Data: MovingAverageData[] = [];
  const f500Data: MovingAverageData[] = [];
  const f618Data: MovingAverageData[] = [];

  for (let i = N - fiboLookback; i < N; i++) {
    f382Data.push({ time: data[i].time, value: f382 });
    f500Data.push({ time: data[i].time, value: f500 });
    f618Data.push({ time: data[i].time, value: f618 });
  }

  return { f382: f382Data, f500: f500Data, f618: f618Data };
}

// Detect Squeeze (Bollinger Band inside Keltner Channel)
export function detectSqueeze(data: ChartData[], period: number = 20): { isSqueezed: boolean[]; squeezeCount: number[] } {
  const N = data.length;
  const isSqueezed: boolean[] = new Array(N).fill(false);
  const squeezeCount: number[] = new Array(N).fill(0);
  let currentCount = 0;

  for (let i = period; i < N; i++) {
    const closes = data.slice(i - period + 1, i + 1).map(d => d.close);
    const sma = closes.reduce((a, b) => a + b) / period;

    // Standard Deviation
    const variance = closes.map(x => Math.pow(x - sma, 2)).reduce((a, b) => a + b) / period;
    const stdDev = Math.sqrt(variance);

    // True Range sum
    let trSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const tr = Math.max(
        data[j].high - data[j].low,
        Math.abs(data[j].high - data[j - 1].close),
        Math.abs(data[j].low - data[j - 1].close)
      );
      trSum += tr;
    }

    const atr = trSum / period;
    const bbUpper = sma + (2 * stdDev);
    const bbLower = sma - (2 * stdDev);
    const kcUpper = sma + (1.5 * atr);
    const kcLower = sma - (1.5 * atr);

    isSqueezed[i] = (bbUpper < kcUpper) && (bbLower > kcLower);

    if (isSqueezed[i]) {
      currentCount++;
    } else {
      currentCount = 0;
    }
    squeezeCount[i] = currentCount;
  }

  return { isSqueezed, squeezeCount };
}

// Detect VSA (Volume Spread Analysis) patterns with enhanced accuracy
export function detectVSA(data: ChartData[]): { markers: MarkerData[]; signal: string } {
  const markers: MarkerData[] = [];
  const N = data.length;
  let latestSignal = '⬜ Netral';

  // Calculate MA for trend context
  const ma20Values = calculateMA(data, 20);
  const ma50Values = calculateMA(data, 50);

  for (let i = 40; i < N; i++) {
    // Calculate 20-period volume average
    let volSum = 0;
    let spreadSum = 0;
    for (let j = i - 20; j < i; j++) {
      volSum += data[j].volume || 0;
      spreadSum += (data[j].high - data[j].low);
    }
    const volAvg = volSum / 20;
    const spreadAvg = spreadSum / 20;

    const volRatio = (data[i].volume || 0) / (volAvg || 1);
    const spread = data[i].high - data[i].low;
    const spreadRatio = spread / (spreadAvg || 1);
    const body = Math.abs(data[i].close - data[i].open);
    const isGreen = data[i].close >= data[i].open;

    // Get MA values for trend context
    const ma20Index = i - 19;
    const ma50Index = i - 49;
    let ma20 = data[i].close;
    let ma50 = data[i].close;

    if (ma20Index >= 0 && ma20Index < ma20Values.length) {
      ma20 = ma20Values[ma20Index].value;
    }
    if (ma50Index >= 0 && ma50Index < ma50Values.length) {
      ma50 = ma50Values[ma50Index].value;
    }

    // Calculate buying/selling pressure over 10 periods
    let buyVol = 0;
    let sellVol = 0;
    for (let k = i - 9; k <= i; k++) {
      if (data[k].close > data[k].open) buyVol += data[k].volume || 0;
      else if (data[k].close < data[k].open) sellVol += data[k].volume || 0;
    }
    const accRatio = buyVol / (sellVol || 1);

    // Get highs and trend info
    const highs = data.slice(0, i + 1).map(d => d.high);

    // MA positioning (for context)
    const aboveMA20 = data[i].close > ma20;
    const aboveMA50 = data[i].close > ma50;
    const maUptrend = ma20 > ma50;

    // VCP DETECTION - More lenient for visibility
    // Just check if near recent highs and contracting
    const last30High = Math.max(...highs.slice(-30));
    const last52WeekHigh = Math.max(...highs.slice(-250)); // ~1 year of data
    const isNearRecentHigh = data[i].close > (last30High * 0.85); // Within 15% of 30-day high

    // Calculate volatility contraction
    let spread5Sum = 0;
    let vol5Sum = 0;
    let spread20Sum = 0;
    let vol20Sum = 0;

    for (let j = Math.max(0, i - 4); j <= i; j++) {
      spread5Sum += (data[j].high - data[j].low);
      vol5Sum += (data[j].volume || 0);
    }
    for (let j = i - 19; j <= i; j++) {
      spread20Sum += (data[j].high - data[j].low);
      vol20Sum += (data[j].volume || 0);
    }

    const spread5Avg = spread5Sum / 5;
    const spread20Avg = spread20Sum / 20;
    const vol5Avg = vol5Sum / 5;
    const vol20Avg = vol20Sum / 20;

    // Volatility contracting (more lenient)
    const isVolatilityContraction = spread5Avg < (spread20Avg * 0.75); // < 75% (not 65%)
    const isVolumeContraction = vol5Avg < (vol20Avg * 0.80); // < 80% (not 75%)

    // Basic VCP = Near highs + contraction (LENIENT for visibility)
    const isVCP = isNearRecentHigh &&
                  isVolatilityContraction &&
                  isVolumeContraction;

    // DRY UP DETECTION - More lenient (should show frequently)
    // Low volume support test
    const lowerWick = Math.min(data[i].open, data[i].close) - data[i].low;
    const isDryUp = (volRatio < 0.65) && // < 65% volume (more lenient)
                    (body < spread * 0.5) && // Small body (more lenient)
                    (accRatio > 0.85); // Buying > selling (more lenient)

    // ICEBERG DETECTION - More lenient (should show frequently)
    // High volume but tight spread
    const isIceberg = (volRatio > 1.2) && // > 1.2x volume (more lenient)
                      (spreadRatio < 0.75) && // Tight spread
                      (accRatio > 1.1); // Some buying pressure (more lenient)

    // DISTRIBUTION DETECTION - Keep this one strict
    const isDistribution = (!isGreen && volRatio > 1.5 && accRatio < 0.5);

    // SNIPER ENTRY - VERY STRICT (only best setups)
    // Must meet ALL these criteria
    const isNearAllTimeHigh = data[i].close > (last52WeekHigh * 0.90); // 90% of 52-week
    const hasSupport = (data[i].low <= ma20 * 1.02) && (data[i].close > ma20 * 0.98);

    let priceRangeSum = 0;
    for (let j = i - 4; j <= i; j++) {
      priceRangeSum += Math.abs(data[j].high - data[j].low) / data[j].close;
    }
    const avgPriceRange = priceRangeSum / 5;
    const isTightPrice = avgPriceRange < 0.03; // < 3% daily range

    const isSignificantVCContraction = spread5Avg < (spread20Avg * 0.65); // < 65% (tight)
    const isStrictVolumeContraction = vol5Avg < (vol20Avg * 0.75); // < 75%

    // SNIPER = Perfect VCP + Perfect DRY UP + Perfect trend
    const isSniperEntry = isNearAllTimeHigh && // 90% of 52-week high
                          aboveMA20 &&
                          aboveMA50 &&
                          maUptrend &&
                          isSignificantVCContraction &&
                          isStrictVolumeContraction &&
                          isTightPrice &&
                          (volRatio < 0.50) && // Very low volume
                          (accRatio > 1.2) && // Strong buying
                          hasSupport;

    // Add markers for last 100 candles (increased from 30 for better visibility)
    if (i >= N - 100) {
      let markerObj: MarkerData | null = null;

      // Debug logging for last 10 candles
      if (i >= N - 10) {
        console.log(`Candle ${i}: VCP=${isVCP} DryUp=${isDryUp} Iceberg=${isIceberg} Sniper=${isSniperEntry} Vol=${volRatio.toFixed(2)} Acc=${accRatio.toFixed(2)}`);
      }

      // SNIPER ENTRY = Perfect setup (MOST RESTRICTIVE)
      if (isSniperEntry) {
        markerObj = {
          time: data[i].time,
          position: 'belowBar',
          color: '#ff9f43',
          shape: 'arrowUp',
          text: '🎯 SNIPER'
        };
        if (i === N - 1) latestSignal = '🎯 SNIPER ENTRY';
      }
      // VCP + ICEBERG (Strong accumulation in base)
      else if (isVCP && isIceberg) {
        markerObj = {
          time: data[i].time,
          position: 'belowBar',
          color: '#00cec9',
          shape: 'arrowUp',
          text: '🧊 VCP ICEBERG'
        };
        if (i === N - 1) latestSignal = '🧊 VCP ICEBERG';
      }
      // VCP BASE (Building base, wait for breakout)
      else if (isVCP) {
        markerObj = {
          time: data[i].time,
          position: 'belowBar',
          color: '#a29bfe',
          shape: 'arrowUp',
          text: '📉 VCP BASE'
        };
        if (i === N - 1) latestSignal = '📉 VCP BASE';
      }
      // DISTRIBUTION (Danger - selling detected)
      else if (isDistribution) {
        markerObj = {
          time: data[i].time,
          position: 'aboveBar',
          color: '#d63031',
          shape: 'arrowDown',
          text: '🩸 DISTRIBUSI'
        };
        if (i === N - 1) latestSignal = '🩸 DISTRIBUSI (Waspada)';
      }
      // DRY UP alone (Low volume support test anywhere)
      else if (isDryUp) {
        markerObj = {
          time: data[i].time,
          position: 'belowBar',
          color: '#0984e3',
          shape: 'arrowUp',
          text: '🥷 DRY UP'
        };
        if (i === N - 1) latestSignal = '🥷 DRY UP (Support Test)';
      }
      // ICEBERG alone (Hidden accumulation)
      else if (isIceberg) {
        markerObj = {
          time: data[i].time,
          position: 'belowBar',
          color: '#00cec9',
          shape: 'arrowUp',
          text: '🧊 ICEBERG'
        };
        if (i === N - 1) latestSignal = '🧊 ICEBERG (Hidden Activity)';
      }

      if (markerObj) markers.push(markerObj);
    }
  }

  return { markers, signal: latestSignal };
}


// Calculate Candle Power - Enhanced with MA analysis and better VSA logic
// ✅ Analyzes current candle to predict next candle movement with improved accuracy
//
// ENHANCED FEATURES:
// - Hammer/Doji patterns near MA support
// - Volume spread analysis relative to MA position
// - Volatility contraction vs dump distinction
// - Professional VSA interpretation
//
// SCORE MEANING:
// 95+ = Extreme markup likely (Hammer at MA + Volume confirmation)
// 85+ = Strong markup (Dry Up / Iceberg confirmed)
// 70+ = Good markup chance (Volume/Price alignment)
// 50-60 = Neutral/Uncertain
// 25-40 = Bearish / Distribution
// <25 = Very bearish / Trap/Dump
export function calculateCandlePower(data: ChartData[]): { markers: MarkerData[]; analysis: string } {
  const markers: MarkerData[] = [];
  const N = data.length;
  let latestPower = 50;
  let latestAnalysis = '';

  // Calculate MA values for positioning analysis
  const ma20Values = calculateMA(data, 20);
  const ma50Values = calculateMA(data, 50);

  for (let i = 40; i < N; i++) {
    // Calculate 20-period averages (baseline for comparison)
    let volSum = 0;
    let spreadSum = 0;
    for (let j = i - 20; j < i; j++) {
      volSum += data[j].volume || 0;
      spreadSum += data[j].high - data[j].low;
    }
    const volAvg = volSum / 20;
    const spreadAvg = spreadSum / 20;

    const current = data[i]; // Current candle being analyzed
    const spread = current.high - current.low;
    const body = Math.abs(current.close - current.open);
    const volRatio = (current.volume || 0) / (volAvg || 1);
    const spreadRatio = spread / (spreadAvg || 1);
    const isGreen = current.close >= current.open;

    // Get MA values for current candle - handle array bounds properly
    let ma20 = current.close;
    let ma50 = current.close;

    // Find the correct MA index (MA arrays start from period-1)
    const ma20Index = i - 19; // MA20 starts from index 19
    const ma50Index = i - 49; // MA50 starts from index 49

    if (ma20Index >= 0 && ma20Index < ma20Values.length) {
      ma20 = ma20Values[ma20Index].value;
    }
    if (ma50Index >= 0 && ma50Index < ma50Values.length) {
      ma50 = ma50Values[ma50Index].value;
    }

    // Calculate buy/sell pressure (accumulation/distribution)
    let buyVol = 0;
    let sellVol = 0;
    for (let k = i - 9; k <= i; k++) {
      if (data[k].close > data[k].open) buyVol += data[k].volume || 0;
      else if (data[k].close < data[k].open) sellVol += data[k].volume || 0;
    }
    const accRatio = buyVol / (sellVol || 1);

    // ENHANCED CANDLE ANALYSIS dengan fokus pada pola hammer di MA20

    // 1. Calculate candle components relative to MA dengan lebih detail
    const upperWick = current.high - Math.max(current.open, current.close);
    const lowerWick = Math.min(current.open, current.close) - current.low;
    const bodyPosition = spread > 0 ? (current.close - current.low) / spread : 0.5;
    const bodySize = Math.abs(current.close - current.open);
    const wickRatio = spread > 0 ? lowerWick / spread : 0;

    // 2. MA positioning analysis yang lebih presisi
    const closeAboveMA20 = current.close > ma20;
    const closeAboveMA50 = current.close > ma50;
    const openAboveMA20 = current.open > ma20;
    const bodyAboveMA20 = Math.min(current.open, current.close) > ma20;
    const bodyAboveMA50 = Math.min(current.open, current.close) > ma50;

    // CRITICAL: Deteksi tail menyentuh MA20 tapi body di atas
    const tailTouchesMA20 = current.low <= ma20 * 1.005 && current.low >= ma20 * 0.995; // 0.5% tolerance
    const tailBelowMA20 = current.low < ma20;
    const tailBelowMA50 = current.low < ma50;

    // 3. Enhanced pattern detection dengan fokus pada reversal patterns
    const isHammer = (lowerWick > bodySize * 1.2) && (upperWick < bodySize * 0.6) && (wickRatio > 0.5);
    const isInvertedHammer = (upperWick > bodySize * 1.5) && (lowerWick < bodySize * 0.5);
    const isDoji = bodySize < spread * 0.2; // Lebih liberal untuk doji detection
    const isShootingStar = (upperWick > bodySize * 2) && (lowerWick < bodySize * 0.3) && (bodyPosition < 0.4);

    // Additional pattern for red candle dengan long tail (LAJU case)
    const isRedWithLongTail = !isGreen && (lowerWick > bodySize * 1.0) && (wickRatio > 0.4);

    // 4. Volume analysis context yang lebih detail
    const highVolume = volRatio > 1.3;
    const veryHighVolume = volRatio > 2.0;
    const lowVolume = volRatio < 0.7;
    const normalVolume = volRatio >= 0.7 && volRatio <= 1.3;

    // 5. Volatility analysis - distinguish cooldown vs dump
    const isLowSpread = spreadRatio < 0.8;
    const isHighSpread = spreadRatio > 1.2;

    // Calculate 5-period volatility trend
    let recentSpreadSum = 0;
    let prevSpreadSum = 0;
    for (let j = 0; j < 5; j++) {
      if (i - j >= 0) recentSpreadSum += (data[i - j].high - data[i - j].low);
      if (i - j - 5 >= 0) prevSpreadSum += (data[i - j - 5].high - data[i - j - 5].low);
    }
    const volatilityDecreasing = (recentSpreadSum / 5) < (prevSpreadSum / 5);

    // =========================================================================
    // WYCKOFF + VSA + VCP INTEGRATED CANDLE POWER CALCULATION
    // Based on Wyckoff Method principles combined with Volume Spread Analysis
    // =========================================================================
    let power = 50;
    let reason = 'Neutral';

    // WYCKOFF PRINCIPLE 1: EFFORT vs RESULT ANALYSIS
    // The relationship between volume (effort) and price range (result) reveals market intent
    const isHighEffort = volRatio > 1.3; // High volume = effort
    const isWideResult = spreadRatio > 1.2; // Wide spread = result
    const isLowEffort = volRatio < 0.7; // Low volume
    const isNarrowResult = spreadRatio < 0.8; // Narrow spread

    // WYCKOFF PRINCIPLE 2: SUPPLY & DEMAND BALANCE (VSA Integration)
    const strongDemand = accRatio > 1.5; // Buying dominates
    const moderateDemand = accRatio > 1.1;
    const strongSupply = accRatio < 0.6; // Selling dominates
    const moderateSupply = accRatio < 0.9;

    // WYCKOFF PRINCIPLE 3: MARKET PHASE IDENTIFICATION
    const inUptrend = (current.close > ma20 && current.close > ma50 && ma20 > ma50);
    const inDowntrend = (current.close < ma20 && current.close < ma50 && ma20 < ma50);
    const inAccumulation = !inUptrend && !inDowntrend && (current.close > ma20 * 0.95);
    const inDistribution = !inUptrend && !inDowntrend && (current.close < ma20 * 0.95);

    // VCP CONTEXT: Check if stock is in volatility contraction
    const isInVCP = volatilityDecreasing && (current.close > ma20 * 0.95);

    // =========================================================================
    // WYCKOFF ACCUMULATION PHASE PATTERNS (Phase A-E)
    // =========================================================================

    // PRIORITY 0A: WYCKOFF PRELIMINARY SUPPORT (PS) - Buying appears after decline
    const nearMA20 = (current.low <= ma20 * 1.03) && (current.low >= ma20 * 0.97);
    const hasLowerWick = lowerWick > 0 && (lowerWick >= bodySize * 0.5);

    if (nearMA20 && hasLowerWick) {
      // Test of support at MA20 - Critical Wyckoff moment
      if (isLowEffort && strongDemand) {
        // NO SUPPLY (Phase C): Low volume test + strong demand = sellers exhausted
        power = 96;
        reason = '🏛️ Wyckoff NO SUPPLY (Phase C)';
      } else if (isLowEffort && moderateDemand && isInVCP) {
        // NO SUPPLY in VCP = highest probability setup
        power = 98;
        reason = '🎯 VCP + NO SUPPLY (Sniper)';
      } else if (isHighEffort && strongDemand && isNarrowResult) {
        // SPRING (Phase C): High volume absorption at support
        power = 93;
        reason = '🌱 Wyckoff SPRING (Phase C)';
      } else if (isHighEffort && strongDemand && isWideResult) {
        // SIGN OF STRENGTH (Phase D): High volume + wide spread + buying
        power = 92;
        reason = '💪 Wyckoff SOS (Phase D)';
      } else if (moderateDemand) {
        // TEST (Phase C): Support test with decent buying
        power = 82;
        reason = '🎯 TEST Support (Phase C)';
      } else if (strongSupply) {
        // Failed test = weakness
        power = 35;
        reason = '⚠️ Failed Support Test';
      } else {
        power = 65;
        reason = '🎯 Support Test (Neutral)';
      }
    }

    // PRIORITY 0B: WYCKOFF SELLING CLIMAX (SC) / AUTOMATIC RALLY (AR)
    else if (!isGreen && isHighEffort && isWideResult && (current.low < ma50) && strongSupply) {
      // Selling Climax: High volume panic selling (Phase A)
      if (i < N - 3) {
        // Not the latest candle, wait for confirmation
        power = 25;
        reason = '📉 Potential Selling Climax';
      } else {
        power = 88; // If followed by green = reversal potential
        reason = '🔄 Selling Climax (Watch AR)';
      }
    }

    // =========================================================================
    // WYCKOFF DISTRIBUTION PHASE PATTERNS
    // =========================================================================

    // PRIORITY 1: UPTHRUST (UT) - False breakout at top (Phase B-C)
    else if (inUptrend && isHighEffort && isWideResult && strongSupply) {
      if (upperWick > bodySize * 1.5 && !isGreen) {
        power = 8; // Extreme bearish - professional distribution
        reason = '⚡ Wyckoff UPTHRUST (Phase C)';
      } else {
        power = 18;
        reason = '🩸 Wyckoff Distribution (Phase B)';
      }
    }

    // PRIORITY 2: UPTHRUST AFTER DISTRIBUTION (UTAD)
    else if (inUptrend && upperWick > bodySize * 2 && isHighEffort && strongSupply) {
      power = 5;
      reason = '☠️ Wyckoff UTAD (Phase D)';
    }

    // =========================================================================
    // WYCKOFF MARKUP PHASE (Phase E - Trending Up)
    // =========================================================================

    // PRIORITY 3: SIGN OF STRENGTH (SOS) in Markup
    else if (isHighEffort && isWideResult && strongDemand && isGreen) {
      if (inUptrend && (current.close > ma20 * 1.05)) {
        // Strong SOS in established uptrend (Phase E)
        power = 90;
        reason = '💪 Wyckoff SOS (Markup)';
      } else if (inAccumulation || (current.close > ma20 * 0.98 && current.close < ma20 * 1.02)) {
        // SOS at breakout point (Phase D->E transition)
        power = 93;
        reason = '🚀 Wyckoff BREAKOUT (SOS)';
      } else {
        power = 78;
        reason = '💪 Strong Buying';
      }
    }

    // PRIORITY 4: LAST POINT OF SUPPORT (LPS) - Retest after breakout
    else if (inUptrend && (current.low <= ma20 * 1.02) && isLowEffort && moderateDemand) {
      // LPS: Low volume pullback to support in uptrend (Phase E)
      power = 87;
      reason = '🎯 Wyckoff LPS (Last Support)';
    }

    // =========================================================================
    // WYCKOFF STOPPING VOLUME PATTERNS
    // =========================================================================

    // PRIORITY 5: STOPPING VOLUME (Phase A)
    else if (isHighEffort && isNarrowResult) {
      if (strongDemand && (inDowntrend || current.close < ma20)) {
        // High vol + narrow spread + buying in downtrend = Stopping Volume
        power = 87;
        reason = '🛑 Wyckoff STOPPING VOL (Phase A)';
      } else if (strongSupply && inUptrend) {
        // High vol + narrow spread + selling in uptrend = Distribution
        power = 22;
        reason = '🛑 Distribution (Stopping Buying)';
      } else if (strongDemand) {
        power = 78;
        reason = '🛑 Volume Absorption';
      } else {
        power = 45;
        reason = '🛑 High Vol (Unclear Intent)';
      }
    }

    // =========================================================================
    // WYCKOFF NO DEMAND / NO SUPPLY PATTERNS
    // =========================================================================

    // PRIORITY 6: NO DEMAND (Phase D of Distribution)
    else if (isLowEffort && isNarrowResult) {
      if (inUptrend && moderateSupply) {
        // No Demand: Low volume + narrow spread in uptrend = weak buying
        power = 28;
        reason = '😴 Wyckoff NO DEMAND';
      } else if (inDowntrend && moderateDemand) {
        // No Supply: Low volume + narrow spread in downtrend = weak selling
        power = 77;
        reason = '🥷 Wyckoff NO SUPPLY';
      } else if (inAccumulation && strongDemand) {
        // Quiet accumulation = professional activity
        power = 85;
        reason = '🤫 Quiet Accumulation';
      } else {
        power = 50;
        reason = '😴 No Interest';
      }
    }

    // =========================================================================
    // WYCKOFF EFFORTLESS ADVANCE/DECLINE (Professional Activity)
    // =========================================================================

    // PRIORITY 7: EFFORTLESS MOVEMENT (Low volume + wide spread)
    else if (isLowEffort && isWideResult) {
      if (isGreen && moderateDemand && inUptrend) {
        // Effortless advance = professional support (Phase E)
        power = 92;
        reason = '🏛️ Wyckoff EFFORTLESS ADVANCE';
      } else if (isGreen && strongDemand) {
        // Strong demand with low volume = absorption phase ending
        power = 88;
        reason = '🏛️ Professional Accumulation';
      } else if (!isGreen && moderateSupply && inDowntrend) {
        // Effortless decline = no support
        power = 23;
        reason = '📉 Wyckoff NO SUPPORT';
      } else {
        power = 55;
        reason = '📊 Wide Range (Low Vol)';
      }
    }

    // =========================================================================
    // VSA INTEGRATION: Classic VSA Patterns with Wyckoff Context
    // =========================================================================

    // PRIORITY 8: VSA + VCP COMBINATION PATTERNS
    else if (isInVCP) {
      // Stock is in VCP base - evaluate with Wyckoff lens
      if (isLowEffort && !isGreen && moderateDemand) {
        // VCP Dry Up = No Supply in base (Phase C)
        power = 95;
        reason = '🎯 VCP DRY UP (NO SUPPLY)';
      } else if (isHighEffort && isNarrowResult && strongDemand) {
        // VCP Iceberg = Volume absorption in base
        power = 94;
        reason = '🧊 VCP ICEBERG (Absorption)';
      } else if (isLowEffort && isNarrowResult) {
        // VCP tightening = calm before breakout
        power = 82;
        reason = '📉 VCP BASE (Phase C)';
      } else if (isHighEffort && isWideResult && strongDemand) {
        // VCP breakout with volume = Jump Across Creek (JAC)
        power = 95;
        reason = '🚀 VCP BREAKOUT (JAC)';
      } else {
        power = 72;
        reason = '📉 VCP Formation';
      }
    }

    // PRIORITY 9: VSA DRY UP (Independent of VCP)
    else if (isLowEffort && !isGreen && moderateDemand && (current.close > ma20 * 0.97)) {
      // Dry Up near support = No Supply
      power = 88;
      reason = '🥷 DRY UP (NO SUPPLY)';
    }

    // PRIORITY 10: VSA ICEBERG (Hidden activity)
    else if (isHighEffort && isNarrowResult && strongDemand) {
      // Iceberg = Smart money quietly accumulating
      power = 86;
      reason = '🧊 ICEBERG (Hidden Buy)';
    }

    // =========================================================================
    // STANDARD PATTERNS WITH INTEGRATED ANALYSIS
    // =========================================================================

    // PRIORITY 11: STRONG BULLISH PATTERNS
    else if (isGreen && (current.close > ma20)) {
      if (isHighEffort && strongDemand && isWideResult) {
        // Classic bullish: High volume + wide spread + demand
        power = 85;
        reason = '🚀 Strong Bullish (SOS)';
      } else if (isLowEffort && moderateDemand && isWideResult) {
        // Effortless rise = professional support
        power = 83;
        reason = '📈 Effortless Rise';
      } else if (isHighEffort && moderateDemand) {
        power = 75;
        reason = '📈 Good Bullish';
      } else if (isLowEffort) {
        power = 68;
        reason = '📈 Weak Volume Bull';
      } else {
        power = 60;
        reason = '📈 Neutral Bull';
      }
    }

    // PRIORITY 12: BULLISH REVERSAL ATTEMPTS (Below MA)
    else if (isGreen && (current.close < ma20)) {
      if (isHighEffort && strongDemand) {
        // High volume buying below MA = potential reversal
        power = 72;
        reason = '🔄 Strong Reversal Try';
      } else if (isLowEffort && moderateDemand) {
        // Low volume rise = weak or early accumulation
        power = 58;
        reason = '🔄 Weak Reversal';
      } else {
        power = 48;
        reason = '📈 Weak Green';
      }
    }

    // PRIORITY 13: BEARISH PATTERNS
    else if (!isGreen && (current.close < ma20)) {
      if (isHighEffort && strongSupply && isWideResult) {
        // Heavy selling with volume = strong markdown
        power = 15;
        reason = '📉 Strong Markdown (SOW)';
      } else if (isHighEffort && strongSupply) {
        power = 25;
        reason = '📉 Heavy Selling';
      } else if (isLowEffort && moderateSupply) {
        // Low volume decline = weak hands selling
        power = 38;
        reason = '📉 Weak Selling';
      } else {
        power = 32;
        reason = '📉 Bearish';
      }
    }

    // PRIORITY 14: DISTRIBUTION PATTERNS (Red candle above MA)
    else if (!isGreen && (current.close > ma20)) {
      if (isHighEffort && strongSupply) {
        // High volume selling above support = distribution
        power = 30;
        reason = '🩸 Distribution (Phase B)';
      } else if (isLowEffort && strongSupply) {
        // No Demand: Low volume with selling
        power = 35;
        reason = '😴 NO DEMAND';
      } else {
        power = 45;
        reason = '📉 Weak Red';
      }
    }

    // =========================================================================
    // SPECIAL WYCKOFF + VSA PATTERNS
    // =========================================================================

    // Check for shake-out patterns (Spring variant)
    if ((lowerWick > bodySize * 2) && (current.low < ma20) && (current.close > ma20) && strongDemand) {
      // Shake-out and recovery = Spring
      power = Math.max(power, 91);
      reason = '🌱 Wyckoff SHAKE-OUT (Spring)';
    }

    // Check for end of rising (climax)
    if (inUptrend && isGreen && (upperWick > bodySize * 1.8) && isHighEffort) {
      // Buying climax = potential top
      power = Math.min(power, 40);
      reason = '⚠️ Buying Climax (Top?)';
    }

    // =========================================================================
    // CONTEXT-AWARE ADJUSTMENTS (Wyckoff Background Analysis)
    // =========================================================================

    // VCP enhancement: Reward tight action near support
    if (isInVCP && (current.close > ma20 * 0.98)) {
      if (power > 70) power += 5; // VCP in good position
      if (power > 95 && isLowEffort) {
        reason += ' + VCP';
      }
    }

    // Trend alignment (Wyckoff Principle: Trade with the trend)
    if (inUptrend && power > 50) {
      power += 3; // Bullish in uptrend (Phase E)
    } else if (inDowntrend && power < 50) {
      power -= 5; // Bearish in downtrend (Phase E Markdown)
    } else if (inAccumulation && power > 75) {
      power += 4; // Strong accumulation signals (Phase C-D)
    }

    // Extreme volume adjustments (Climactic activity)
    if (volRatio > 3.0) {
      if (strongDemand && isGreen) {
        power += 4; // Climactic buying (if at top = warning, if at bottom = reversal)
        if (inUptrend && current.close > ma20 * 1.1) {
          power -= 10; // Buying climax at top = danger
          reason = '⚠️ ' + reason + ' (Climax?)';
        }
      } else if (strongSupply && !isGreen) {
        if (inDowntrend) {
          power -= 8; // Panic selling continues
        } else {
          power = Math.max(power, 85); // Climactic selling at support = potential reversal
          reason = '🔄 Panic Selling (Reversal?)';
        }
      }
    }

    // Volatility contraction bonus (VCP + Wyckoff Cause)
    if (volatilityDecreasing && (current.close > ma20) && power > 65) {
      power += 3; // Building cause for next move
      if (power > 90 && isLowEffort) {
        reason += ' + Tight';
      }
    }

    // Ensure bounds
    power = Math.max(0, Math.min(100, Math.round(power)));

    latestPower = power;
    latestAnalysis = reason;

    // Enhanced color coding based on Wyckoff principles
    let color = '#808080';
    if (power >= 95) {
      color = '#00b894'; // Dark green - Wyckoff professional buying
    } else if (power >= 85) {
      color = '#55efc4'; // Light green - strong bullish
    } else if (power >= 70) {
      color = '#a4de6c'; // Yellow-green - good
    } else if (power >= 60) {
      color = '#ffd700'; // Gold - bullish bias
    } else if (power >= 50) {
      color = '#ffb347'; // Orange - neutral
    } else if (power >= 40) {
      color = '#ff8c00'; // Dark orange - weak
    } else if (power >= 25) {
      color = '#d63031'; // Red - bearish
    } else if (power >= 15) {
      color = '#8b0000'; // Dark red - very bearish
    } else {
      color = '#4a0000'; // Very dark red - Wyckoff professional selling
    }

    // Only add markers for the LAST 5 CANDLES (most recent data)
    // This keeps the chart clean and focuses on current market condition
    if (i >= N - 5) {
      markers.push({
        time: current.time,
        position: 'aboveBar',
        color: color,
        shape: 'circle',
        text: power.toString()
      });
    }
  }

  return { markers, analysis: `Power: ${latestPower} (${latestAnalysis})` };
}

// Calculate all indicators
export function calculateAllIndicators(data: ChartData[]): IndicatorResult {
  const ma5 = calculateMA(data, 5);
  const ma20 = calculateMA(data, 20);
  const ma50 = calculateMA(data, 50);
  const ma200 = calculateMA(data, 200);

  const momentum = calculateMomentum(data, 20);
  const awesomeOscillator = calculateAO(data);
  const fibonacci = calculateFibonacci(data, 100);

  const { isSqueezed, squeezeCount } = detectSqueeze(data, 20);
  const squeezeMarkers: MarkerData[] = [];

  // Calculate MA for trend context in squeeze
  const squeezeMA20 = ma20; // Use already calculated MA20
  const squeezeMA50 = ma50; // Use already calculated MA50

  // Enhanced squeeze markers with trend and momentum context
  for (let i = 20; i < data.length; i++) {
    // Get MA values for trend determination
    const ma20Index = i - 19;
    const ma50Index = i - 49;
    let currentMA20 = data[i].close;
    let currentMA50 = data[i].close;

    if (ma20Index >= 0 && ma20Index < squeezeMA20.length) {
      currentMA20 = squeezeMA20[ma20Index].value;
    }
    if (ma50Index >= 0 && ma50Index < squeezeMA50.length) {
      currentMA50 = squeezeMA50[ma50Index].value;
    }

    const priceAboveMA20 = data[i].close > currentMA20;
    const priceAboveMA50 = data[i].close > currentMA50;
    const maUptrend = currentMA20 > currentMA50;

    if (isSqueezed[i]) {
      const days = squeezeCount[i];
      let text = `SQZ ${days}D`;
      let color = '#9b59b6'; // Default purple

      // Add trend context to squeeze markers
      if (priceAboveMA20 && priceAboveMA50 && maUptrend) {
        // Bullish squeeze - likely to break up
        color = '#27ae60'; // Green
        text = `🟢 SQZ ${days}D`;
      } else if (!priceAboveMA20 && !priceAboveMA50 && !maUptrend) {
        // Bearish squeeze - likely to break down
        color = '#e74c3c'; // Red
        text = `🔴 SQZ ${days}D`;
      } else {
        // Neutral squeeze
        color = '#f39c12'; // Orange
        text = `🟡 SQZ ${days}D`;
      }

      // Show warning for extended squeezes (high probability of breakout soon)
      if (days >= 10) {
        text = `⚡ ${text} (READY!)`;
      } else if (days >= 15) {
        text = `🔥 ${text} (CRITICAL!)`;
      }

      squeezeMarkers.push({
        time: data[i].time,
        position: 'aboveBar',
        color: color,
        shape: 'arrowDown',
        text: text
      });
    } else if (!isSqueezed[i] && isSqueezed[i - 1]) {
      const totalBase = squeezeCount[i - 1];
      if (totalBase > 0) {
        // Determine breakout direction
        const isBreakoutUp = data[i].close > data[i - 1].close;
        const breakoutVolume = (data[i].volume || 0) / ((data[i - 1].volume || 0) || 1);
        const highVolume = breakoutVolume > 1.5;

        let text = `💥 ${totalBase}D`;
        let color = '#e67e22'; // Default orange

        // Bullish breakout with volume
        if (isBreakoutUp && highVolume && priceAboveMA20) {
          color = '#00b894'; // Dark green
          text = `🚀 BREAK ${totalBase}D (UP!)`;
        }
        // Bullish breakout but low volume (weak)
        else if (isBreakoutUp && !highVolume) {
          color = '#55efc4'; // Light green
          text = `📈 BREAK ${totalBase}D`;
        }
        // Bearish breakout
        else if (!isBreakoutUp && highVolume) {
          color = '#d63031'; // Red
          text = `📉 BREAK ${totalBase}D (DOWN!)`;
        }
        // Default breakout
        else {
          text = `💥 BREAK ${totalBase}D`;
        }

        squeezeMarkers.push({
          time: data[i].time,
          position: 'aboveBar',
          color: color,
          shape: 'arrowDown',
          text: text
        });
      }
    }
  }

  const vsaResult = detectVSA(data);
  const candlePowerResult = calculateCandlePower(data);

  const baseSignal = isSqueezed[data.length - 1]
    ? `⏳ ${squeezeCount[data.length - 1]} Hari Squeeze`
    : (!isSqueezed[data.length - 1] && isSqueezed[data.length - 2])
      ? `🔥 Pecah dari ${squeezeCount[data.length - 2]}`
      : '⬜ Tidak Aktif';

  return {
    ma5,
    ma20,
    ma50,
    ma200,
    momentum,
    awesomeOscillator,
    fibonacci,
    candlePowerMarkers: candlePowerResult.markers,
    candlePowerAnalysis: candlePowerResult.analysis,
    vsaMarkers: vsaResult.markers,
    squeezeMarkers,
    signals: {
      base: baseSignal,
      bandar: vsaResult.signal
    }
  };
}

