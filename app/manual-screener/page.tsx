'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ScreenResult {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  vpcScore: number;
  isVCP: boolean;
  isDryUp: boolean;
  isIceberg: boolean;
  pattern: string;
  recommendation: string;
  details?: {
    spread: number;
    body: number;
    volRatio: number;
    spreadRatio: number;
    accRatio: number;
    isGreen: boolean;
    isNearHigh: boolean;
    isLowSpread: boolean;
    isLowVolume: boolean;
  };
}

export default function ManualScreener() {
  const [symbol, setSymbol] = useState('BBCA');
  const [result, setResult] = useState<ScreenResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const analyzeStock = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const stockSymbol = symbol.toUpperCase();
      const withJK = stockSymbol.includes('.JK') ? stockSymbol : `${stockSymbol}.JK`;

      const response = await fetch(`/api/stock/vcp-screener/manual?symbol=${withJK}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze stock');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze stock');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      analyzeStock();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <nav className="bg-gray-800 border-b border-gray-700 px-3 md:px-6 py-3 md:py-4">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 lg:gap-0">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">🔬 Manual Stock Analyzer</h1>
            <p className="text-xs md:text-sm text-gray-400">
              Test individual stocks to verify screening logic
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <Link
              href="/vcp-screener"
              className="bg-gray-700 hover:bg-gray-600 px-3 md:px-4 py-2 rounded transition text-xs md:text-sm text-center"
            >
              ← Back to Screener
            </Link>
            <Link
              href="/"
              className="bg-blue-600 hover:bg-blue-700 px-3 md:px-4 py-2 rounded transition text-xs md:text-sm text-center"
            >
              ← Back to Chart
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-3 md:p-6 space-y-4 md:space-y-6">
        {/* Input Section */}
        <div className="bg-gray-800 border border-gray-700 rounded p-3 md:p-6 space-y-3 md:space-y-4">
          <div className="space-y-2">
            <label className="block text-xs md:text-sm font-semibold text-gray-300">
              Stock Symbol (e.g., BBCA, BBRI, ASII)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter stock symbol"
                className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 md:px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none text-sm md:text-base"
              />
              <button
                onClick={analyzeStock}
                disabled={loading || !symbol}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 md:px-6 py-2 rounded transition font-semibold text-sm md:text-base"
              >
                {loading ? '🔄 Analyzing...' : '🔍 Analyze'}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Tip: Just type the ticker symbol (BBCA, BBRI, ASII, etc.) - .JK will be added automatically
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-3 rounded">
            ❌ Error: {error}
          </div>
        )}

        {result && (
          <div className="space-y-6">
            {/* Main Result Card */}
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 border border-blue-700 rounded p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-3xl font-bold mb-2">{result.symbol}</h2>
                  <p className="text-sm text-gray-300">Price: Rp {result.price.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</p>
                  <p className="text-sm text-gray-300">Change: {result.changePercent.toFixed(2)}%</p>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-bold mb-2">{result.vpcScore}</div>
                  <p className="text-sm text-gray-300">VPC Score</p>
                </div>
              </div>

              <div className="border-t border-blue-600 pt-4">
                <p className="text-xl font-semibold mb-2">{result.pattern}</p>
                <p className="text-green-300">{result.recommendation}</p>
              </div>

              <div className="bg-blue-900/50 rounded p-3">
                <p className="text-sm">
                  <strong>Status:</strong>{' '}
                  {result.pattern === '⬜ Netral' ? '❌ No pattern detected' : '✅ Pattern detected!'}
                </p>
              </div>
            </div>

            {/* Pattern Detection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`border rounded p-4 ${result.isVCP ? 'bg-green-900/30 border-green-700' : 'bg-gray-800 border-gray-700'}`}>
                <p className="font-semibold mb-2">📉 VCP Pattern</p>
                <p className="text-2xl font-bold">{result.isVCP ? '✅ YES' : '❌ NO'}</p>
                <p className="text-xs text-gray-400 mt-2">Volatility Contraction</p>
              </div>

              <div className={`border rounded p-4 ${result.isDryUp ? 'bg-green-900/30 border-green-700' : 'bg-gray-800 border-gray-700'}`}>
                <p className="font-semibold mb-2">🥷 Dry Up Pattern</p>
                <p className="text-2xl font-bold">{result.isDryUp ? '✅ YES' : '❌ NO'}</p>
                <p className="text-xs text-gray-400 mt-2">Low Volume Support</p>
              </div>

              <div className={`border rounded p-4 ${result.isIceberg ? 'bg-green-900/30 border-green-700' : 'bg-gray-800 border-gray-700'}`}>
                <p className="font-semibold mb-2">🧊 Iceberg Pattern</p>
                <p className="text-2xl font-bold">{result.isIceberg ? '✅ YES' : '❌ NO'}</p>
                <p className="text-xs text-gray-400 mt-2">Hidden Buying</p>
              </div>
            </div>

            {/* Detailed Metrics */}
            {result.details && (
              <div className="bg-gray-800 border border-gray-700 rounded p-6">
                <h3 className="text-xl font-semibold mb-4">📊 Detailed Metrics</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Volume Ratio</p>
                    <p className="text-lg font-semibold">{result.details.volRatio.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">
                      {result.details.volRatio < 0.6 ? '✅ Low' : result.details.volRatio > 1.5 ? '⚠️ High' : '🔹 Normal'}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-400">Spread Ratio</p>
                    <p className="text-lg font-semibold">{result.details.spreadRatio.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">
                      {result.details.spreadRatio < 0.75 ? '✅ Low spread' : '⚠️ Normal'}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-400">Accumulation Ratio</p>
                    <p className="text-lg font-semibold">{result.details.accRatio.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">
                      {result.details.accRatio > 1.2 ? '✅ Strong buy' : result.details.accRatio > 1.0 ? '🔹 Bullish' : '⚠️ Weak'}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-400">Candle Body</p>
                    <p className="text-lg font-semibold">{(result.details.body / result.details.spread * 100).toFixed(0)}%</p>
                    <p className="text-xs text-gray-500">
                      {result.details.body > result.details.spread * 0.5 ? '✅ Strong' : '🔹 Weak'}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-400">Green Candle</p>
                    <p className="text-lg font-semibold">{result.details.isGreen ? '✅ YES' : '❌ NO'}</p>
                    <p className="text-xs text-gray-500">{result.details.isGreen ? 'Bullish' : 'Bearish'}</p>
                  </div>

                  <div>
                    <p className="text-gray-400">Near 30-High</p>
                    <p className="text-lg font-semibold">{result.details.isNearHigh ? '✅ YES' : '❌ NO'}</p>
                    <p className="text-xs text-gray-500">{result.details.isNearHigh ? 'Close to high' : 'Below high'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* View in Chart */}
            <div className="bg-gray-800 border border-gray-700 rounded p-4 text-center">
              <p className="text-gray-400 mb-3">Want to see this on the chart?</p>
              <Link
                href={`/?symbol=${result.symbol}`}
                className="inline-block bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded transition font-semibold"
              >
                📈 Open in Chart
              </Link>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="bg-gray-800 border border-gray-700 rounded p-6">
          <h3 className="text-lg font-semibold mb-4">❓ How to Use This Tool</h3>
          <div className="space-y-3 text-sm text-gray-300">
            <p>
              <strong>1. Enter Stock Symbol:</strong> Type a stock ticker (BBCA, BBRI, ASII, etc.)
            </p>
            <p>
              <strong>2. Click Analyze:</strong> The tool will fetch data and calculate patterns
            </p>
            <p>
              <strong>3. Review Metrics:</strong> See if patterns are detected (VCP, Dry Up, Iceberg)
            </p>
            <p>
              <strong>4. Check Score:</strong> The VPC score shows the pattern strength
            </p>
            <p>
              <strong>5. Compare with Chart:</strong> Click "Open in Chart" to see it visually
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-700 space-y-2 text-xs text-gray-500">
            <p><strong>Why Use This?</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Verify if screener is working correctly on specific stocks</li>
              <li>Test the analysis logic before running full screener</li>
              <li>Compare manual chart analysis with automated detection</li>
              <li>Debug why certain stocks aren't appearing in results</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

