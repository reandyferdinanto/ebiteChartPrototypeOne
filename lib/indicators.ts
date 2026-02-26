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

export interface SupportResistanceZone {
  level: number;
  top: number;
  bottom: number;
  startIndex: number;
  type: 'support' | 'resistance';
}

export interface SupportResistanceData {
  zones: SupportResistanceZone[];
}

export interface IndicatorResult {
  ma5: MovingAverageData[];
  ma20: MovingAverageData[];
  ma50: MovingAverageData[];
  ma200: MovingAverageData[];
  momentum: HistogramData[];
  awesomeOscillator: HistogramData[];
  fibonacci: FibonacciData;
  supportResistance: SupportResistanceData;
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

    // SCALP SNIPER ENTRY - For intraday (5m, 15m, 1h)
    // Detects EARLY MOMENTUM for scalping - catch stocks starting to move!

    // Calculate momentum
    let momentum = 0;
    if (i >= 10) {
      momentum = ((data[i].close - data[i - 10].close) / data[i - 10].close) * 100;
    }

    // Momentum characteristics
    let recentMom = 0;
    let prevMom = 0;
    if (i >= 7) {
      recentMom = ((data[i].close - data[i - 3].close) / data[i - 3].close) * 100;
      prevMom = ((data[i - 3].close - data[i - 6].close) / data[i - 6].close) * 100;
    }
    const momentumAccelerating = recentMom > prevMom && recentMom > 0.3;

    // Volume increasing
    let recentVolAvg = 0;
    let prevVolAvg = 0;
    for (let j = Math.max(0, i - 2); j <= i; j++) recentVolAvg += (data[j].volume || 0);
    for (let j = Math.max(0, i - 5); j < Math.max(0, i - 2); j++) prevVolAvg += (data[j].volume || 0);
    recentVolAvg /= 3;
    prevVolAvg /= 3;
    const volumeIncreasing = recentVolAvg > prevVolAvg * 1.1;

    // Calculate close position within the candle range
    const closePosition = spread > 0 ? (data[i].close - data[i].low) / spread : 0.5;

    // SCALP SNIPER = Early momentum (0.5-3%) + Volume confirm (1.2-3x) + Above MA
    const earlyMomentum = momentum > 0.5 && momentum < 3;
    const volumeConfirm = volRatio > 1.2 && volRatio < 3;
    const priceStrength = closePosition > 0.5; // Decent close position (close near high)
    const buyingPressure = accRatio > 1.0;

    const isScalpSniper = earlyMomentum &&
                          volumeConfirm &&
                          aboveMA20 &&
                          (momentumAccelerating || volumeIncreasing) &&
                          buyingPressure &&
                          priceStrength;

    // Add markers for last 100 candles (increased from 30 for better visibility)
    if (i >= N - 100) {
      let markerObj: MarkerData | null = null;

      // Debug logging for last 10 candles
      if (i >= N - 10) {
        console.log(`Candle ${i}: VCP=${isVCP} DryUp=${isDryUp} Iceberg=${isIceberg} Sniper=${isSniperEntry} Vol=${volRatio.toFixed(2)} Acc=${accRatio.toFixed(2)}`);
      }

      // SNIPER ENTRY = Perfect setup (MOST RESTRICTIVE - for daily/weekly)
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
      // SCALP SNIPER = Intraday sniper entry (momentum before markup)
      else if (isScalpSniper) {
        markerObj = {
          time: data[i].time,
          position: 'belowBar',
          color: '#ffd700',
          shape: 'arrowUp',
          text: '⚡ SCALP SNIPER'
        };
        if (i === N - 1) latestSignal = '⚡ SCALP SNIPER (Momentum Building)';
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


// Calculate Candle Power - PREDICTIVE NEXT CANDLE DIRECTION
// ✅ Analyzes CURRENT candle to predict NEXT candle's movement
//
// PREDICTION LOGIC:
// 1. Setup Quality: Is the current candle creating a good setup?
// 2. Momentum: Will the trend continue or reverse?
// 3. Volume Context: Is there follow-through potential?
// 4. Support/Resistance: Where is price relative to key levels?
//
// SCORE MEANING (NEXT CANDLE PREDICTION):
// 90+ = Very High probability next candle GREEN (strong setup completed)
// 75-89 = High probability next candle GREEN (good setup)
// 60-74 = Moderate probability next candle GREEN (okay setup)
// 40-59 = Neutral (could go either way)
// 25-39 = Moderate probability next candle RED (weak/distribution)
// 10-24 = High probability next candle RED (bearish setup)
// 0-9 = Very High probability next candle RED (panic/collapse)
//
// KEY PRINCIPLE: Score reflects NEXT CANDLE probability, not current candle quality
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
    // =========================================================================
    // PREDICTIVE NEXT CANDLE POWER SCORE
    // Based on: What setup does this candle CREATE for tomorrow?
    // =========================================================================
    let power = 50;
    let reason = 'Neutral';

    // KEY INSIGHT: Current candle quality matters LESS than the setup it creates
    // A bad-looking candle (red, low volume) can create an EXCELLENT setup
    // A good-looking candle (green, high volume) might exhaust the move

    // VOLUME CONTEXT
    const isHighEffort = volRatio > 1.3;
    const isLowEffort = volRatio < 0.7;
    const isNarrowResult = spreadRatio < 0.8;
    const isWideResult = spreadRatio > 1.2;

    // DEMAND/SUPPLY
    const strongDemand = accRatio > 1.5;
    const moderateDemand = accRatio > 1.1;
    const strongSupply = accRatio < 0.6;
    const moderateSupply = accRatio < 0.9;

    // TREND CONTEXT
    const inUptrend = (current.close > ma20 && current.close > ma50 && ma20 > ma50);
    const inDowntrend = (current.close < ma20 && current.close < ma50 && ma20 < ma50);
    const nearMA20Support = (current.low <= ma20 * 1.03) && (current.close >= ma20 * 0.97);

    // PATTERN CONTEXT
    const hasLowerWick = lowerWick > bodySize * 0.8;
    const hasUpperWick = upperWick > bodySize * 1.5;
    const isSmallBody = bodySize < spread * 0.3;

    // =========================================================================
    // PREDICTIVE SCORING: What will NEXT candle likely do?
    // =========================================================================

    // SCENARIO 1: HAMMER/TEST AT SUPPORT = Next candle likely GREEN
    // Current: Red/small candle with tail at MA20
    // Next: High probability bounce
    if (nearMA20Support && hasLowerWick) {
      if (isLowEffort && moderateDemand) {
        // NO SUPPLY test = Very bullish for tomorrow
        power = 95;
        reason = '🎯 NO SUPPLY Test → Next: Strong Up';
      } else if (isLowEffort && !strongSupply) {
        // Dry up test = Bullish for tomorrow
        power = 88;
        reason = '🥷 Dry Up Test → Next: Likely Up';
      } else if (isHighEffort && strongDemand) {
        // Spring/Shakeout = Very bullish for tomorrow
        power = 92;
        reason = '🌱 Spring → Next: Strong Up';
      } else if (moderateDemand) {
        // Decent test = Bullish for tomorrow
        power = 78;
        reason = '✅ Support Test → Next: Likely Up';
      } else if (strongSupply) {
        // Failed test = Bearish
        power = 30;
        reason = '❌ Failed Test → Next: Down';
      } else {
        power = 65;
        reason = '⏳ Support Test → Next: Neutral';
      }
    }

    // SCENARIO 2: EXHAUSTION CANDLE AFTER RUN = Next candle likely RED
    // Current: High volume green candle far from support
    // Next: Likely pullback/reversal
    else if (isGreen && isHighEffort && isWideResult && !nearMA20Support) {
      if (current.close > ma20 * 1.1 && strongSupply) {
        // Climactic buying far from support = Exhaustion
        power = 15;
        reason = '🔴 Buying Climax → Next: Down';
      } else if (current.close > ma20 * 1.08 && moderateSupply) {
        // Possible exhaustion
        power = 35;
        reason = '⚠️ Possible Top → Next: Likely Down';
      } else if (strongDemand && inUptrend) {
        // Still strong demand in uptrend = Continue
        power = 72;
        reason = '💪 Strong Demand → Next: Up Likely';
      } else {
        power = 55;
        reason = '📊 High Volume → Next: Neutral';
      }
    }

    // SCENARIO 3: DRY UP CANDLE = Next candle can go either way BUT setup is forming
    // Current: Low volume, small candle
    // Next: If at support = up, if after run = consolidation
    else if (isLowEffort && isSmallBody) {
      if (nearMA20Support && moderateDemand) {
        // Dry up AT support = Bullish
        power = 82;
        reason = '🥷 Dry Up Support → Next: Up';
      } else if (inUptrend && moderateDemand) {
        // Dry up IN uptrend = Healthy pullback, continue up
        power = 70;
        reason = '📈 Healthy Pause → Next: Up Likely';
      } else if (!isGreen && current.close < ma20 * 0.95) {
        // Dry up BELOW support = Weak
        power = 38;
        reason = '💤 Weak Dry Up → Next: Down Risk';
      } else {
        power = 60;
        reason = '😴 Low Volume → Next: Neutral';
      }
    }

    // SCENARIO 4: DISTRIBUTION/SELLING = Next candle likely RED
    // Current: High volume red candle or shooting star
    // Next: Likely continue down
    else if (!isGreen && isHighEffort && strongSupply) {
      if (hasUpperWick && current.close > ma20) {
        // Shooting star with distribution = Very bearish
        power = 12;
        reason = '⭐ Shooting Star → Next: Down';
      } else if (isWideResult) {
        // Wide range selling = Bearish continuation
        power = 22;
        reason = '🩸 Heavy Selling → Next: Down';
      } else {
        // Narrow range high volume selling = Possible bottom
        power = 48;
        reason = '🛑 Selling Volume → Next: Neutral';
      }
    }

    // SCENARIO 5: BULLISH CONTINUATION = Next candle likely GREEN
    // Current: Green candle with good volume in uptrend
    // Next: Likely continue
    else if (isGreen && inUptrend && (moderateDemand || strongDemand)) {
      if (isHighEffort && isWideResult) {
        // Strong day but might need pause
        power = 65;
        reason = '📈 Strong Day → Next: Pause/Up';
      } else if (isLowEffort || isNarrowResult) {
        // Effortless advance = Very bullish
        power = 85;
        reason = '🚀 Effortless Rise → Next: Up';
      } else {
        power = 68;
        reason = '📈 Uptrend → Next: Up Likely';
      }
    }

    // SCENARIO 6: BEARISH CONTINUATION = Next candle likely RED
    // Current: Red candle in downtrend
    // Next: Likely continue down
    else if (!isGreen && inDowntrend && (moderateSupply || strongSupply)) {
      if (isHighEffort && isWideResult) {
        // Panic selling = Might be near bottom
        power = 42;
        reason = '📉 Panic Sell → Next: Bounce?';
      } else {
        power = 28;
        reason = '📉 Downtrend → Next: Down Likely';
      }
    }

    // SCENARIO 7: CONSOLIDATION = Next candle 50/50
    // Current: Small candle, normal volume
    // Next: Could go either way
    else if (isSmallBody && !isHighEffort && !isLowEffort) {
      if (current.close > ma20) {
        power = 58;
        reason = '⏸️ Consolidating → Next: Slight Up';
      } else {
        power = 45;
        reason = '⏸️ Consolidating → Next: Slight Down';
      }
    }

    // DEFAULT: Neutral
    else {
      if (isGreen) {
        power = 55;
        reason = '🟢 Green Day → Next: Neutral';
      } else {
        power = 45;
        reason = '🔴 Red Day → Next: Neutral';
      }
    }

    // Ensure bounds
    power = Math.max(0, Math.min(100, Math.round(power)));

    latestPower = power;
    latestAnalysis = reason;

    // Enhanced color coding based on predictive score (NEXT CANDLE probability)
    let color = '#808080';
    if (power >= 90) {
      color = '#00b894'; // Dark green - Very high probability next candle green
    } else if (power >= 75) {
      color = '#55efc4'; // Light green - High probability next candle green
    } else if (power >= 60) {
      color = '#a4de6c'; // Yellow-green - Moderate probability next candle green
    } else if (power >= 50) {
      color = '#ffd700'; // Gold - Neutral (50/50)
    } else if (power >= 40) {
      color = '#ff8c00'; // Orange - Moderate probability next candle red
    } else if (power >= 25) {
      color = '#d63031'; // Red - High probability next candle red
    } else if (power >= 10) {
      color = '#8b0000'; // Dark red - Very high probability next candle red
    } else {
      color = '#4a0000'; // Very dark red - Extreme bearish next candle
    }

    // Only add markers for the LAST 5 CANDLES (most recent, most actionable)
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

// Calculate Support and Resistance Zones
// Based on pivot highs and pivot lows with ATR-based zones
export function calculateSupportResistance(
  data: ChartData[],
  pivotLeft: number = 7,
  pivotRight: number = 7,
  atrLength: number = 14,
  zoneMult: number = 0.25,
  maxStore: number = 60
): SupportResistanceData {
  const N = data.length;
  const zones: SupportResistanceZone[] = [];

  if (N < pivotLeft + pivotRight + atrLength) {
    return { zones };
  }

  // Calculate ATR
  const atrValues: number[] = [];
  for (let i = 0; i < N; i++) {
    if (i === 0) {
      atrValues.push(data[i].high - data[i].low);
    } else {
      const tr = Math.max(
        data[i].high - data[i].low,
        Math.abs(data[i].high - data[i - 1].close),
        Math.abs(data[i].low - data[i - 1].close)
      );

      if (i < atrLength) {
        const sum = atrValues.slice(0, i).reduce((a, b) => a + b, 0) + tr;
        atrValues.push(sum / (i + 1));
      } else {
        const prevATR = atrValues[i - 1];
        const smoothedATR = (prevATR * (atrLength - 1) + tr) / atrLength;
        atrValues.push(smoothedATR);
      }
    }
  }

  const currentATR = atrValues[N - 1];
  const zoneHalf = currentATR * zoneMult;

  // Detect pivot highs and lows
  interface Pivot {
    value: number;
    index: number;
  }

  const pivotHighs: Pivot[] = [];
  const pivotLows: Pivot[] = [];

  for (let i = pivotLeft; i < N - pivotRight; i++) {
    // Check for pivot high
    let isPivotHigh = true;
    for (let j = i - pivotLeft; j < i; j++) {
      if (data[j].high >= data[i].high) {
        isPivotHigh = false;
        break;
      }
    }
    if (isPivotHigh) {
      for (let j = i + 1; j <= i + pivotRight; j++) {
        if (data[j].high >= data[i].high) {
          isPivotHigh = false;
          break;
        }
      }
    }
    if (isPivotHigh) {
      pivotHighs.push({ value: data[i].high, index: i });
    }

    // Check for pivot low
    let isPivotLow = true;
    for (let j = i - pivotLeft; j < i; j++) {
      if (data[j].low <= data[i].low) {
        isPivotLow = false;
        break;
      }
    }
    if (isPivotLow) {
      for (let j = i + 1; j <= i + pivotRight; j++) {
        if (data[j].low <= data[i].low) {
          isPivotLow = false;
          break;
        }
      }
    }
    if (isPivotLow) {
      pivotLows.push({ value: data[i].low, index: i });
    }
  }

  // Keep only recent pivots
  const recentPivotHighs = pivotHighs.slice(-maxStore);
  const recentPivotLows = pivotLows.slice(-maxStore);

  const currentPrice = data[N - 1].close;

  // Filter pivots: resistances above price, supports below price
  const resistanceCandidates = recentPivotHighs
    .filter(p => p.value > currentPrice)
    .sort((a, b) => a.value - b.value); // Sort ascending (nearest first)

  const supportCandidates = recentPivotLows
    .filter(p => p.value < currentPrice)
    .sort((a, b) => b.value - a.value); // Sort descending (nearest first)

  // Take nearest 2 resistances
  const res1 = resistanceCandidates[0];
  const res2 = resistanceCandidates[1];

  // Take nearest 2 supports
  const sup1 = supportCandidates[0];
  const sup2 = supportCandidates[1];

  // Create zone objects
  if (res1) {
    zones.push({
      level: res1.value,
      top: res1.value + zoneHalf,
      bottom: res1.value - zoneHalf,
      startIndex: res1.index,
      type: 'resistance'
    });
  }

  if (res2) {
    zones.push({
      level: res2.value,
      top: res2.value + zoneHalf,
      bottom: res2.value - zoneHalf,
      startIndex: res2.index,
      type: 'resistance'
    });
  }

  if (sup1) {
    zones.push({
      level: sup1.value,
      top: sup1.value + zoneHalf,
      bottom: sup1.value - zoneHalf,
      startIndex: sup1.index,
      type: 'support'
    });
  }

  if (sup2) {
    zones.push({
      level: sup2.value,
      top: sup2.value + zoneHalf,
      bottom: sup2.value - zoneHalf,
      startIndex: sup2.index,
      type: 'support'
    });
  }

  return { zones };
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
  const supportResistance = calculateSupportResistance(data);

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
    supportResistance,
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

