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
    const lows = data.slice(0, i + 1).map(d => d.low);
    const volumes = data.slice(0, i + 1).map(d => d.volume || 0);

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

    // Add markers for last few candles
    if (i >= N - 5) {
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
      // DRY UP + ICEBERG
      else if (isDryUp && isIceberg) {
        markerObj = {
          time: data[i].time,
          position: 'belowBar',
          color: '#00cec9',
          shape: 'arrowUp',
          text: '🧊 ICEBERG'
        };
        if (i === N - 1) latestSignal = '🧊 ICEBERG + DRY UP';
      }
      // DRY UP only
      else if (isDryUp) {
        markerObj = {
          time: data[i].time,
          position: 'belowBar',
          color: '#0984e3',
          shape: 'arrowUp',
          text: '🥷 DRY UP'
        };
        if (i === N - 1) latestSignal = '🥷 UJI SUPPORT (Dry Up)';
      }
      // ICEBERG only
      else if (isIceberg) {
        markerObj = {
          time: data[i].time,
          position: 'belowBar',
          color: '#00cec9',
          shape: 'arrowUp',
          text: '🧊 ICEBERG'
        };
        if (i === N - 1) latestSignal = '🧊 ICEBERG';
      }

      if (markerObj) markers.push(markerObj);
    }
  }

  return { markers, signal: latestSignal };
}


// Calculate Candle Power - predicts NEXT candle movement based on current candle analysis
// ✅ This analyzes TODAY's candle to predict TOMORROW's price action
//
// HOW IT WORKS:
// Current Candle (i) → Analyze VSA patterns → Score 0-100 → Predict Next Candle (i+1)
//
// SCORE MEANING:
// 90+  = Extreme strength → Next candle likely to move UP significantly
// 85+  = Very strong     → Next candle likely to move UP
// 70+  = Strong          → Next candle probably moves UP
// 50-60= Neutral         → Next candle could go either way
// 25-40= Weak/Bearish   → Next candle likely to move DOWN
// <25  = Very weak      → Next candle likely DOWN or trapped
export function calculateCandlePower(data: ChartData[]): { markers: MarkerData[]; analysis: string } {
  const markers: MarkerData[] = [];
  const N = data.length;
  let latestPower = 50;
  let latestAnalysis = '';

  for (let i = 40; i < N; i++) {
    // Analyze CURRENT candle (at index i) to predict what NEXT candle (at index i+1) will do

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

    // Calculate buy/sell pressure (accumulation/distribution)
    let buyVol = 0;
    let sellVol = 0;
    for (let k = i - 9; k <= i; k++) {
      if (data[k].close > data[k].open) buyVol += data[k].volume || 0;
      else if (data[k].close < data[k].open) sellVol += data[k].volume || 0;
    }
    const accRatio = buyVol / (sellVol || 1);

    // Predict NEXT candle strength (0-100)
    let power = 50;
    let reason = 'Neutral';

    // VSA Pattern Detection - determines NEXT candle prediction
    const isDryUp = (!isGreen || body < spread * 0.2) && (volRatio <= 0.45) && (accRatio > 1.2);
    const isIceberg = (volRatio > 1.5) && (spreadRatio < 0.6);
    const isSilentAccumulation = (volRatio < 0.6) && isGreen && (accRatio > 1.0);
    const isWeakBody = body < spread * 0.3;
    const isFakeShape = (spreadRatio < 0.6 && volRatio < 0.8 && accRatio < 0.8);

    // Score Assignment - what to expect for NEXT candle
    if (isFakeShape) {
      // Trap setup = Next candle likely fails
      power = 35;
      reason = 'Fake Shape';
    } else if (isDryUp) {
      // Dry Up = Professional support test = Next candle likely UP
      power = 85;
      reason = 'Dry Up';
    } else if (isIceberg && isGreen) {
      // Iceberg = Hidden buying = Next candle likely STRONG UP
      power = 90;
      reason = 'Iceberg Buy';
    } else if (isSilentAccumulation && isWeakBody) {
      // Silent buying with weak body = Accumulation phase = Next candle likely UP
      power = 80;
      reason = 'Silent Acc';
    } else if (volRatio > 1.5 && isGreen && body > spread * 0.6) {
      // High volume green with strong body = Next candle likely UP
      power = 75;
      reason = 'High Vol';
    } else if (isGreen && accRatio > 1.2 && volRatio > 0.8) {
      // Green with strong buying = Next candle probably UP
      power = 70;
      reason = 'Strong Buy';
    } else if (isGreen && volRatio > 1.0 && spreadRatio > 0.8) {
      // Green with normal conditions = Next candle slightly UP
      power = 65;
      reason = 'Bullish';
    } else if (isGreen && body > spread * 0.5) {
      // Weak green = Next candle uncertain
      power = 55;
      reason = 'Slight Bull';
    } else if (!isGreen && volRatio > 1.5 && accRatio < 0.5) {
      // Distribution = Professional selling = Next candle likely DOWN
      power = 25;
      reason = 'Distribution';
    } else if (!isGreen) {
      // Red day = Next candle probably DOWN
      power = 40;
      reason = 'Bearish';
    }

    power = Math.max(0, Math.min(100, Math.round(power)));
    latestPower = power;
    latestAnalysis = reason;

    // Color and shape based on strength
    let color = '#808080';
    if (power >= 85) {
      color = '#00b894';
    } else if (power >= 70) {
      color = '#55efc4';
    } else if (power >= 60) {
      color = '#a4de6c';
    } else if (power >= 50) {
      color = '#ffd700';
    } else if (power >= 40) {
      color = '#ff8c00';
    } else if (power >= 25) {
      color = '#d63031';
    } else {
      color = '#8b0000';
    }

    // Only add markers for recent candles (last 30) to avoid clutter
    if (i >= N - 30) {
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

