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

// Detect VSA (Volume Spread Analysis) patterns
export function detectVSA(data: ChartData[]): { markers: MarkerData[]; signal: string } {
  const markers: MarkerData[] = [];
  const N = data.length;
  let latestSignal = '⬜ Netral';

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

    // Calculate buying/selling pressure
    let buyVol = 0;
    let sellVol = 0;
    for (let k = i - 9; k <= i; k++) {
      if (data[k].close > data[k].open) buyVol += data[k].volume || 0;
      else if (data[k].close < data[k].open) sellVol += data[k].volume || 0;
    }
    const accRatio = buyVol / (sellVol || 1);

    // Calculate VCP criteria (match screener logic)
    const highs = data.slice(0, i + 1).map(d => d.high);

    const last30High = Math.max(...highs.slice(-30));
    const isNearHigh = data[i].close > (last30High * 0.80);

    // Calculate 5-period spread and volume
    let spread5Sum = 0;
    let vol5Sum = 0;
    for (let j = Math.max(0, i - 4); j <= i; j++) {
      spread5Sum += (data[j].high - data[j].low);
      vol5Sum += (data[j].volume || 0);
    }
    const isLowSpread = (spread5Sum / 5) < (spreadAvg * 0.75);
    const isLowVolume = (vol5Sum / 5) < (volAvg * 0.85);
    const isVCP = isNearHigh && isLowSpread && isLowVolume;

    // Detect patterns (UPDATED to match screener criteria)
    const isDryUp = (!isGreen || body < spread * 0.3) && (volRatio <= 0.60) && (accRatio > 0.8);
    const isIceberg = (volRatio > 1.2) && (spreadRatio < 0.75);
    const isDistribution = (!isGreen && volRatio > 1.5 && accRatio < 0.5);

    // Add markers for last 30 candles (was only 5 - too few!)
    if (i >= N - 30) {
      let markerObj: MarkerData | null = null;

      // VCP + DRY UP = Sniper Entry (highest priority)
      if (isVCP && isDryUp) {
        markerObj = {
          time: data[i].time,
          position: 'belowBar',
          color: '#ff9f43',
          shape: 'arrowUp',
          text: '🎯 SNIPER'
        };
        if (i === N - 1) latestSignal = '🎯 VCP DRY-UP (Sniper Entry)';
      }
      // VCP + ICEBERG
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
      // VCP BASE
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
      // DISTRIBUTION (selling)
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
      // DRY UP alone (professional accumulation)
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
      // ICEBERG alone (hidden buying/selling)
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
    // Skip if we don't have enough MA data
    if (i >= ma20Values.length || i >= ma50Values.length) continue;

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

    // Get MA values for current candle
    const ma20 = ma20Values[i]?.value || current.close;
    const ma50 = ma50Values[i]?.value || current.close;

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

    // START WYCKOFF-BASED CANDLE POWER CALCULATION
    let power = 50;
    let reason = 'Neutral';

    // WYCKOFF PRINCIPLE 1: EFFORT vs RESULT ANALYSIS
    // High volume (effort) + small range (result) = Abnormal (absorption or distribution)
    // High volume (effort) + wide range (result) = Normal (trending)
    // Low volume (effort) + small range (result) = Normal (no interest)
    // Low volume (effort) + wide range (result) = Abnormal (professional activity)

    const isHighEffort = volRatio > 1.3; // High volume = effort
    const isWideResult = spreadRatio > 1.2; // Wide spread = result
    const isLowEffort = volRatio < 0.7; // Low volume
    const isNarrowResult = spreadRatio < 0.8; // Narrow spread

    // WYCKOFF PRINCIPLE 2: SUPPLY & DEMAND BALANCE
    // More buying volume = demand > supply (bullish)
    // More selling volume = supply > demand (bearish)
    const strongDemand = accRatio > 1.5;
    const moderateDemand = accRatio > 1.1;
    const strongSupply = accRatio < 0.6;
    const moderateSupply = accRatio < 0.9;

    // WYCKOFF PRINCIPLE 3: BACKGROUND vs TREND IDENTIFICATION
    // Location in trend context (using MA position)
    const inUptrend = (current.close > ma20 && current.close > ma50 && ma20 > ma50);
    const inDowntrend = (current.close < ma20 && current.close < ma50 && ma20 < ma50);
    const inAccumulation = !inUptrend && !inDowntrend && (current.close > ma20 * 0.95);

    // PRIORITY 0: WYCKOFF TEST OF SUPPORT/RESISTANCE
    const nearMA20 = (current.low <= ma20 * 1.03) && (current.low >= ma20 * 0.97);
    const hasLowerWick = lowerWick > 0 && (lowerWick >= bodySize * 0.5);

    if (nearMA20 && hasLowerWick) {
      // WYCKOFF ANALYSIS: Test of support with volume characteristics
      if (isLowEffort && strongDemand) {
        // Low volume test + strong demand = No selling pressure (very bullish)
        power = 95;
        reason = '🏛️ Wyckoff No Supply Test';
      } else if (isHighEffort && strongDemand && isNarrowResult) {
        // High volume + narrow spread + demand = Volume absorption (very bullish)
        power = 98;
        reason = '🏛️ Wyckoff Volume Absorption';
      } else if (isHighEffort && strongDemand && isWideResult) {
        // High volume + wide spread + demand = Sign of Strength
        power = 92;
        reason = '💪 Wyckoff Sign of Strength';
      } else if (moderateDemand) {
        power = 80;
        reason = '🎯 Support Test + Demand';
      } else {
        power = 65;
        reason = '🎯 Support Test (Weak)';
      }
    }

    // PRIORITY 1: WYCKOFF UPTHRUST ANALYSIS (Distribution)
    else if (inUptrend && isHighEffort && isWideResult && strongSupply) {
      // High volume + wide spread + lots of selling in uptrend = Upthrust/Distribution
      if (upperWick > bodySize * 1.5 && !isGreen) {
        power = 10; // Very bearish - professional distribution
        reason = '⚡ Wyckoff Upthrust';
      } else {
        power = 20;
        reason = '📉 Wyckoff Distribution';
      }
    }

    // PRIORITY 2: WYCKOFF SPRING ANALYSIS (Accumulation)
    else if (inAccumulation && (current.low < ma50) && isLowEffort && moderateDemand && isGreen) {
      // Spring: Brief move below support on low volume, then recover
      power = 88;
      reason = '🌱 Wyckoff Spring';
    }

    // PRIORITY 3: WYCKOFF SIGN OF STRENGTH (SOS)
    else if (isHighEffort && isWideResult && strongDemand && isGreen) {
      if (inUptrend) {
        // High volume, wide spread, strong buying in uptrend = Sign of Strength
        power = 92;
        reason = '💪 Wyckoff Sign of Strength';
      } else if (inAccumulation) {
        // Same pattern in accumulation area = potential breakout
        power = 85;
        reason = '💪 Wyckoff SOS (Accumulation)';
      } else {
        power = 78;
        reason = '💪 Strong Buying Effort';
      }
    }

    // PRIORITY 4: WYCKOFF SIGN OF WEAKNESS (SOW)
    else if (isHighEffort && isWideResult && strongSupply && !isGreen) {
      if (inUptrend) {
        // High volume, wide spread, heavy selling in uptrend = Sign of Weakness
        power = 15;
        reason = '⚠️ Wyckoff Sign of Weakness';
      } else {
        power = 25;
        reason = '📉 Heavy Selling Effort';
      }
    }

    // PRIORITY 5: WYCKOFF STOPPING VOLUME
    else if (isHighEffort && isNarrowResult) {
      if (strongDemand && (inDowntrend || current.close < ma20)) {
        // High volume + narrow spread + buying in downtrend = Stopping volume
        power = 85;
        reason = '🛑 Wyckoff Stopping Volume';
      } else if (strongSupply && inUptrend) {
        // High volume + narrow spread + selling in uptrend = Distribution
        power = 20;
        reason = '🛑 Wyckoff Stopping (Selling)';
      } else if (strongDemand) {
        power = 75;
        reason = '🛑 Volume Absorption';
      } else {
        power = 45;
        reason = '🛑 High Volume (Unclear)';
      }
    }

    // PRIORITY 6: WYCKOFF NO DEMAND/NO SUPPLY
    else if (isLowEffort && isNarrowResult) {
      if (inUptrend && moderateSupply) {
        // Low volume + narrow spread in uptrend with some selling = No Demand
        power = 30;
        reason = '😴 Wyckoff No Demand';
      } else if (inDowntrend && moderateDemand) {
        // Low volume + narrow spread in downtrend with some buying = No Supply
        power = 75;
        reason = '🥷 Wyckoff No Supply';
      } else {
        power = 50;
        reason = '😴 No Interest';
      }
    }

    // PRIORITY 7: WYCKOFF EFFORT WITHOUT RESULT (Absorption)
    else if (isLowEffort && isWideResult) {
      if (isGreen && moderateDemand) {
        // Low volume + wide spread up = Professional accumulation (very bullish)
        power = 90;
        reason = '🏛️ Wyckoff Effortless Advance';
      } else if (!isGreen && moderateSupply) {
        // Low volume + wide spread down = No support (bearish)
        power = 25;
        reason = '📉 Wyckoff No Support';
      } else {
        power = 55;
        reason = '📊 Wide Range (Low Volume)';
      }
    }

    // PRIORITY 8: STANDARD PATTERNS WITH WYCKOFF CONTEXT
    else if (isGreen) {
      if (inUptrend) {
        if (isHighEffort && moderateDemand) {
          power = 78;
          reason = '📈 Uptrend + Volume';
        } else if (isLowEffort && moderateDemand) {
          power = 82; // Effortless advance is bullish
          reason = '📈 Effortless Advance';
        } else {
          power = 58;
          reason = '📈 Weak Uptrend';
        }
      } else {
        if (strongDemand) {
          power = 70;
          reason = '🟢 Strong Demand';
        } else if (moderateDemand) {
          power = 60;
          reason = '🟢 Moderate Demand';
        } else {
          power = 45;
          reason = '🟢 Weak Green';
        }
      }
    }

    // PRIORITY 9: WYCKOFF MARKDOWN PATTERNS
    else if (!isGreen) {
      if (inDowntrend) {
        if (isHighEffort && strongSupply) {
          power = 18;
          reason = '📉 Strong Markdown';
        } else if (isLowEffort && moderateSupply) {
          power = 35;
          reason = '📉 Weak Markdown';
        } else {
          power = 40;
          reason = '📉 Downtrend';
        }
      } else {
        if (strongSupply) {
          power = 25;
          reason = '🔴 Strong Supply';
        } else if (moderateSupply) {
          power = 40;
          reason = '🔴 Moderate Supply';
        } else {
          power = 52;
          reason = '🔴 Weak Red';
        }
      }
    }

    // WYCKOFF CONTEXT ADJUSTMENTS

    // Trend alignment bonus/penalty
    if (inUptrend && power > 50) power += 3; // Bullish in uptrend
    else if (inDowntrend && power < 50) power -= 5; // Bearish in downtrend
    else if (inAccumulation && power > 70) power += 5; // Good accumulation area

    // Volume extremes (professional activity indicators)
    if (volRatio > 3.0 && strongDemand) {
      power += 5; // Exceptional buying volume
      if (power > 95) reason += ' (Professional)';
    } else if (volRatio > 3.0 && strongSupply) {
      power -= 8; // Exceptional selling volume
      if (power < 25) reason += ' (Professional)';
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

    // Only add markers for recent candles to avoid clutter
    if (i >= N - 50) {
      markers.push({
        time: current.time,
        position: 'aboveBar',
        color: color,
        shape: 'circle',
        text: power.toString()
      });
    }

    // Force markers for the last 3 candles to ensure they always appear
    if (i >= N - 3) {
      // Check if marker already exists for this time, if not add it
      const existingMarker = markers.find(m => m.time === current.time);
      if (!existingMarker) {
        markers.push({
          time: current.time,
          position: 'aboveBar',
          color: color,
          shape: 'circle',
          text: power.toString()
        });
      }
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

  // Add squeeze markers
  for (let i = 20; i < data.length; i++) {
    if (isSqueezed[i]) {
      squeezeMarkers.push({
        time: data[i].time,
        position: 'aboveBar',
        color: '#9b59b6',
        shape: 'arrowDown',
        text: `SQZ ${squeezeCount[i]}D`
      });
    } else if (!isSqueezed[i] && isSqueezed[i - 1]) {
      const totalBase = squeezeCount[i - 1];
      if (totalBase > 0) {
        squeezeMarkers.push({
          time: data[i].time,
          position: 'aboveBar',
          color: '#e67e22',
          shape: 'arrowDown',
          text: `💥 ${totalBase}D MAX`
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

