'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ScalpResult {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  signal: string;
  momentum: number;
  candlePower: number;
  timeframe: string;
  volume: number;
  volatility: number;
  entry: 'SNIPER' | 'BREAKOUT' | 'WATCH' | null;
  reason: string;
}

const SCALP_STOCKS = [
  // Banks (Very Liquid)
  'BBCA', 'BBRI', 'BMRI', 'BBNI', 'BRIS', 'BTPS', 'BDMN', 'BNGA', 'NISP', 'MEGA',

  // Blue Chips (Very Liquid)
  'TLKM', 'ASII', 'UNVR', 'ICBP', 'INDF', 'HMSP', 'GGRM', 'KLBF', 'ANTM', 'INCO',

  // Infrastructure & Energy (Liquid)
  'JSMR', 'ADRO', 'PTBA', 'PGAS', 'ITMG', 'SMGR', 'WIKA', 'WSKT', 'PTPP', 'ADHI',

  // Mining & Resources (Liquid)
  'MDKA', 'INDY', 'TINS', 'MEDC', 'ELSA', 'ESSA', 'BRMS', 'DOID', 'GEMS', 'PSAB',

  // Tech & Telecom (Liquid)
  'GOTO', 'EMTK', 'BUKA', 'WIFI', 'EXCL', 'ISAT', 'FREN', 'LINK', 'TBIG', 'MTEL',

  // Consumer (Liquid)
  'MYOR', 'CAMP', 'MLBI', 'ULTJ', 'ROTI', 'ADES', 'CLEO', 'GOOD', 'SIDO', 'KAEF',

  // Property (Liquid)
  'BSDE', 'SMRA', 'CTRA', 'PWON', 'LPKR', 'APLN', 'DUTI', 'ASRI', 'PLIN', 'BAPA',

  // Finance (Liquid)
  'BBTN', 'BJBR', 'BJTM', 'BCAP', 'PNBN', 'ADMF', 'AMMN', 'BFIN', 'DEFI', 'HADE',

  // Misc Large Caps (Liquid)
  'ARTO', 'PANI', 'BREN', 'TPIA', 'AKRA', 'UNTR', 'SRTG', 'TOWR', 'INKP', 'TKIM',

  // Mid Caps (Regular Volume)
  'FIRE', 'ELIT', 'UVCR', 'LAND', 'KOTA', 'MAPI', 'LPPF', 'ERAA', 'HEAL', 'MIKA',

  // Growth Stocks (Active)
  'AMRT', 'DNET', 'DCII', 'BOGA', 'CPRO', 'EDGE', 'FILM', 'BEER', 'BULL', 'NCKL',
];

export default function ScalpScreener() {
  const [results, setResults] = useState<ScalpResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [timeframe, setTimeframe] = useState<'5m' | '15m'>('15m');
  const [sortBy, setSortBy] = useState<'momentum' | 'power' | 'volatility'>('momentum');
  const [filterEntry, setFilterEntry] = useState<'ALL' | 'SNIPER' | 'BREAKOUT'>('ALL');

  const scanStocks = async () => {
    setLoading(true);
    setResults([]);
    setProgress(0);

    const newResults: ScalpResult[] = [];
    let scannedCount = 0;
    let errorCount = 0;

    for (let idx = 0; idx < SCALP_STOCKS.length; idx++) {
      const ticker = SCALP_STOCKS[idx];

      try {
        const symbol = `${ticker}.JK`;

        // Fetch historical data for scalping timeframe
        const histRes = await fetch(
          `/api/stock/historical?symbol=${symbol}&interval=${timeframe}`
        );

        if (!histRes.ok) {
          console.log(`❌ Failed to fetch ${ticker}: ${histRes.status}`);
          errorCount++;
          setProgress(Math.round(((idx + 1) / SCALP_STOCKS.length) * 100));
          continue;
        }

        const histData = await histRes.json();
        if (!histData.data || histData.data.length < 50) {
          console.log(`⚠️ ${ticker}: Insufficient data (${histData.data?.length || 0} candles)`);
          setProgress(Math.round(((idx + 1) / SCALP_STOCKS.length) * 100));
          continue;
        }

        scannedCount++;

        // Fetch quote for current price
        const quoteRes = await fetch(`/api/stock/quote?symbol=${symbol}`);
        if (!quoteRes.ok) {
          console.log(`❌ Failed to fetch quote for ${ticker}`);
          setProgress(Math.round(((idx + 1) / SCALP_STOCKS.length) * 100));
          continue;
        }

        const quoteData = await quoteRes.json();

        // Analyze scalping opportunity
        const analysis = analyzeScalpingOpportunity(histData.data);

        if (analysis.entry) {
          console.log(`✅ ${ticker}: ${analysis.signal} (Power: ${analysis.candlePower}, Mom: ${analysis.momentum}%)`);
          newResults.push({
            symbol: ticker,
            price: quoteData.price,
            change: quoteData.change,
            changePercent: quoteData.changePercent,
            signal: analysis.signal,
            momentum: analysis.momentum,
            candlePower: analysis.candlePower,
            timeframe: timeframe,
            volume: analysis.volume,
            volatility: analysis.volatility,
            entry: analysis.entry,
            reason: analysis.reason,
          });

          // Sort and update in real-time
          const sorted = [...newResults].sort((a, b) => {
            if (sortBy === 'momentum') return b.momentum - a.momentum;
            if (sortBy === 'power') return b.candlePower - a.candlePower;
            return b.volatility - a.volatility;
          });
          setResults(sorted);
        }

      } catch (err) {
        console.error(`❌ Error scanning ${ticker}:`, err);
        errorCount++;
      }

      setProgress(Math.round(((idx + 1) / SCALP_STOCKS.length) * 100));
    }

    console.log(`📊 Scan complete: ${scannedCount} stocks scanned, ${newResults.length} opportunities found, ${errorCount} errors`);
    setLoading(false);
  };

  const analyzeScalpingOpportunity = (data: any[]): any => {
    const N = data.length;
    if (N < 50) return { entry: null };

    // Calculate indicators for scalping
    const closes = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const volumes = data.map(d => d.volume || 0);

    // Recent 20 candles for analysis
    const recentVolumes = volumes.slice(-20);
    const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / 20;

    // Current candle
    const current = data[N - 1];
    const volRatio = current.volume / (avgVolume || 1);

    // Calculate momentum (rate of change)
    const momentum = ((closes[N - 1] - closes[N - 10]) / closes[N - 10]) * 100;

    // Calculate MA20 for trend
    let sum20 = 0;
    for (let i = N - 20; i < N; i++) {
      sum20 += closes[i];
    }
    const ma20 = sum20 / 20;

    // Calculate volatility (ATR-like)
    let atrSum = 0;
    for (let i = N - 14; i < N; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      atrSum += tr;
    }
    const atr = atrSum / 14;
    const volatility = (atr / closes[N - 1]) * 100;

    // Candle Power Score (Wyckoff-based)
    const spread = current.high - current.low;
    const body = Math.abs(current.close - current.open);
    const isGreen = current.close >= current.open;
    const closePos = spread > 0 ? (current.close - current.low) / spread : 0.5;
    const lowerWick = Math.min(current.open, current.close) - current.low;

    // Calculate buying/selling pressure
    let buyVol = 0;
    let sellVol = 0;
    for (let k = N - 10; k < N; k++) {
      if (data[k].close > data[k].open) buyVol += data[k].volume || 0;
      else if (data[k].close < data[k].open) sellVol += data[k].volume || 0;
    }
    const accRatio = buyVol / (sellVol || 1);

    let candlePower = 50;

    // High volume + green + close near high = Strength
    if (volRatio > 1.5 && isGreen && closePos > 0.7) {
      candlePower = 85 + (volRatio * 5);
    }
    // Low volume + hammer at MA = Accumulation (SNIPER!)
    else if (volRatio < 0.7 && lowerWick > body * 0.5 && current.close >= ma20 && current.low < ma20) {
      candlePower = 92;
    }
    // Volume spike + narrow spread = Absorption
    else if (volRatio > 2 && spread < (atr * 0.8)) {
      candlePower = 88;
    }
    // Normal conditions
    else if (isGreen && volRatio > 1) {
      candlePower = 65 + (closePos * 20);
    } else if (!isGreen && volRatio < 0.8) {
      candlePower = 35 - (closePos * 10);
    }

    candlePower = Math.max(0, Math.min(100, Math.round(candlePower)));

    // Determine entry signal
    let entry: 'SNIPER' | 'BREAKOUT' | 'WATCH' | null = null;
    let signal = '';
    let reason = '';

    // SNIPER ENTRY: Accumulation before markup (MORE LENIENT)
    const nearMA = Math.abs(current.close - ma20) / ma20 < 0.025; // Relaxed to 2.5%
    const tailTouchesMA = current.low < ma20 * 1.02 && current.close >= ma20 * 0.98; // More lenient
    const isDryingUp = volRatio < 0.80; // Relaxed to 80%
    const momentumBuilding = momentum > -2 && momentum < 5; // Wider range
    const highPower = candlePower >= 75; // Lowered from 85
    const strongAccumulation = accRatio > 0.95; // Lowered from 1.1

    // SNIPER = Near MA + (Low volume OR tail) + Decent power + Above MA
    if ((nearMA || tailTouchesMA) &&
        (isDryingUp || highPower) &&
        momentumBuilding &&
        strongAccumulation &&
        current.close > ma20 * 0.98) {
      entry = 'SNIPER';
      signal = '⚡ SCALP SNIPER';
      reason = `Accumulation at MA20 (Vol: ${volRatio.toFixed(2)}x, Power: ${candlePower})`;
    }
    // BREAKOUT ENTRY: Volume spike breaking out (MORE LENIENT)
    else if (volRatio > 2.0 && isGreen && momentum > 1 && candlePower > 70 && current.close > ma20) {
      entry = 'BREAKOUT';
      signal = '🚀 SCALP BREAKOUT';
      reason = `High volume breakout (Vol: ${volRatio.toFixed(2)}x, Mom: ${momentum.toFixed(1)}%)`;
    }
    // WATCH: Potential setup forming (MORE LENIENT)
    else if (candlePower > 65 && current.close > ma20 * 0.97 && momentum > -3) {
      entry = 'WATCH';
      signal = '👀 WATCH';
      reason = `Setup forming (Power: ${candlePower}, Mom: ${momentum.toFixed(1)}%)`;
    }

    return {
      entry,
      signal,
      momentum: parseFloat(momentum.toFixed(2)),
      candlePower,
      volume: parseFloat(volRatio.toFixed(2)),
      volatility: parseFloat(volatility.toFixed(2)),
      reason,
    };
  };

  const filteredResults = results.filter(r => {
    if (filterEntry === 'ALL') return true;
    return r.entry === filterEntry;
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <nav className="bg-gray-800 border-b border-gray-700 px-3 md:px-6 py-3 md:py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl md:text-2xl font-bold">
              ⚡ Scalp Screener
            </Link>
            <span className="text-xs md:text-sm text-gray-400">
              Intraday Sniper Entries
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/vcp-screener"
              className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-sm transition"
            >
              🎯 VCP
            </Link>
            <Link
              href="/"
              className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm transition"
            >
              📊 Chart
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-3 md:p-6">
        {/* Controls */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Timeframe Selection */}
            <div>
              <label className="block text-sm font-semibold mb-2">⏱️ Timeframe</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTimeframe('5m')}
                  disabled={loading}
                  className={`flex-1 px-4 py-2 rounded font-semibold transition ${
                    timeframe === '5m'
                      ? 'bg-green-600 text-white ring-2 ring-green-400'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  5 Min
                </button>
                <button
                  onClick={() => setTimeframe('15m')}
                  disabled={loading}
                  className={`flex-1 px-4 py-2 rounded font-semibold transition ${
                    timeframe === '15m'
                      ? 'bg-green-600 text-white ring-2 ring-green-400'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  15 Min
                </button>
              </div>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-semibold mb-2">📊 Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                disabled={loading}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              >
                <option value="momentum">Momentum</option>
                <option value="power">Candle Power</option>
                <option value="volatility">Volatility</option>
              </select>
            </div>

            {/* Filter Entry Type */}
            <div>
              <label className="block text-sm font-semibold mb-2">🎯 Filter</label>
              <select
                value={filterEntry}
                onChange={(e) => setFilterEntry(e.target.value as any)}
                disabled={loading}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              >
                <option value="ALL">All Signals</option>
                <option value="SNIPER">Sniper Only</option>
                <option value="BREAKOUT">Breakout Only</option>
              </select>
            </div>
          </div>

          {/* Scan Button */}
          <button
            onClick={scanStocks}
            disabled={loading}
            className={`w-full mt-4 px-6 py-3 rounded font-bold text-lg transition ${
              loading
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white shadow-lg'
            }`}
          >
            {loading ? `🔄 Scanning... ${progress}%` : '🚀 Scan for Scalp Opportunities'}
          </button>

          {loading && (
            <div className="mt-3">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h3 className="font-bold mb-3">📚 Signal Guide:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="bg-gray-700 p-3 rounded">
              <div className="font-bold text-yellow-400 mb-1">⚡ SCALP SNIPER</div>
              <div className="text-gray-300 text-xs">
                Accumulation at MA20 before markup. Low volume + strong power. BEST risk/reward for scalping.
              </div>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <div className="font-bold text-green-400 mb-1">🚀 SCALP BREAKOUT</div>
              <div className="text-gray-300 text-xs">
                High volume breakout with momentum. Fast trade - quick entry/exit. Momentum already started.
              </div>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <div className="font-bold text-blue-400 mb-1">👀 WATCH</div>
              <div className="text-gray-300 text-xs">
                Potential setup forming. Monitor for sniper entry or breakout confirmation.
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        {loading && results.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin text-4xl mb-4">🔄</div>
            <div className="text-xl">Scanning {SCALP_STOCKS.length} stocks...</div>
            <div className="text-sm text-gray-400 mt-2">Analyzing {timeframe} charts for sniper entries</div>
            <div className="text-lg text-green-400 mt-3 font-bold">{progress}%</div>
          </div>
        )}

        {!loading && results.length === 0 && (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <div className="text-xl mb-2">No scalping opportunities found</div>
            <div className="text-gray-400">
              Try changing timeframe or click scan again. Market may be consolidating.
            </div>
          </div>
        )}

        {filteredResults.length > 0 && (
          <div>
            <div className="mb-4 text-sm text-gray-400">
              Found <span className="text-white font-bold">{filteredResults.length}</span> scalping opportunities on {timeframe} timeframe
              {loading && <span className="ml-2 text-yellow-400">(Still scanning...)</span>}
            </div>

            <div className="grid gap-4">
              {filteredResults.map((result) => (
                <div
                  key={result.symbol}
                  className={`bg-gray-800 rounded-lg p-4 border-l-4 hover:bg-gray-750 transition ${
                    result.entry === 'SNIPER'
                      ? 'border-yellow-400'
                      : result.entry === 'BREAKOUT'
                      ? 'border-green-400'
                      : 'border-blue-400'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Stock Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl font-bold">{result.symbol}</span>
                        <span className="text-xl text-gray-300">
                          Rp {result.price.toLocaleString()}
                        </span>
                        <span
                          className={`text-sm font-semibold ${
                            result.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {result.changePercent >= 0 ? '↑' : '↓'} {Math.abs(result.changePercent).toFixed(2)}%
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-2">
                        <span
                          className={`px-3 py-1 rounded font-bold text-sm ${
                            result.entry === 'SNIPER'
                              ? 'bg-yellow-600 text-black'
                              : result.entry === 'BREAKOUT'
                              ? 'bg-green-600 text-white'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {result.signal}
                        </span>
                        <span className="px-3 py-1 bg-gray-700 rounded text-sm">
                          Power: <span className="font-bold text-green-400">{result.candlePower}</span>
                        </span>
                        <span className="px-3 py-1 bg-gray-700 rounded text-sm">
                          Momentum: <span className={`font-bold ${result.momentum > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {result.momentum > 0 ? '+' : ''}{result.momentum}%
                          </span>
                        </span>
                        <span className="px-3 py-1 bg-gray-700 rounded text-sm">
                          Vol: <span className="font-bold">{result.volume}x</span>
                        </span>
                      </div>

                      <div className="text-sm text-gray-400">
                        💡 {result.reason}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div>
                      <Link
                        href={`/?symbol=${result.symbol}&interval=${timeframe}`}
                        className="block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded font-bold text-center transition whitespace-nowrap"
                      >
                        📊 View Chart
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
