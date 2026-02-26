'use client';

import { useState, useEffect } from 'react';
import StockChart from '@/components/StockChart';
import StockInfo from '@/components/StockInfo';
import Link from 'next/link';

interface ChartData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  currency?: string;
}

export default function Home() {
  const [symbol, setSymbol] = useState('BBCA.JK');
  const [inputSymbol, setInputSymbol] = useState('BBCA'); // Display without .JK
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [stockQuote, setStockQuote] = useState<StockQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [interval, setInterval] = useState('1d');
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const popularStocks = [
    'FIRE.JK', 'ELIT.JK', 'UVCR.JK', 'LAND.JK', 'KOTA.JK',
  ];

  // Helper function to ensure .JK suffix
  const ensureJKSuffix = (ticker: string): string => {
    const trimmed = ticker.trim().toUpperCase();
    if (trimmed.endsWith('.JK')) {
      return trimmed;
    }
    return `${trimmed}.JK`;
  };

  useEffect(() => {
    // Check for symbol in URL params (from screener view button)
    const urlParams = new URLSearchParams(window.location.search);
    const urlSymbol = urlParams.get('symbol');

    if (urlSymbol) {
      const fullSymbol = ensureJKSuffix(urlSymbol);
      setSymbol(fullSymbol);
      setInputSymbol(urlSymbol); // Update input field to show ticker without .JK
      // Fetch data immediately for URL symbol
      fetchStockData(fullSymbol, interval);
      setInitialLoadDone(true);
    } else {
      // No URL symbol, fetch default symbol
      fetchStockData(symbol, interval);
      setInitialLoadDone(true);
    }
  }, []); // Run once on component mount

  useEffect(() => {
    // Only run for subsequent changes after initial load
    // Skip if this is the initial load or if we just loaded from URL
    if (initialLoadDone) {
      console.log('useEffect triggered for symbol change:', symbol); // Debug log
      const urlParams = new URLSearchParams(window.location.search);
      const urlSymbol = urlParams.get('symbol');

      // Only fetch if the symbol change wasn't from URL parameter
      // or if the URL symbol is different from current symbol
      if (!urlSymbol || ensureJKSuffix(urlSymbol) !== symbol) {
        console.log('Fetching data for symbol change:', symbol); // Debug log
        fetchStockData(symbol, interval);
      } else {
        console.log('Skipping fetch - symbol change was from URL parameter'); // Debug log
      }
    }
  }, [symbol, interval, initialLoadDone]);

  const fetchStockData = async (sym: string, int: string) => {
    console.log('fetchStockData called with symbol:', sym, 'interval:', int); // Debug log
    setLoading(true);
    setError('');

    try {
      // Fetch quote
      const quoteRes = await fetch(`/api/stock/quote?symbol=${sym}`);
      if (!quoteRes.ok) throw new Error('Failed to fetch quote');
      const quoteData = await quoteRes.json();
      setStockQuote(quoteData);

      // Fetch historical data
      const historicalRes = await fetch(
        `/api/stock/historical?symbol=${sym}&interval=${int}`
      );
      if (!historicalRes.ok) throw new Error('Failed to fetch historical data');
      const historicalData = await historicalRes.json();
      setChartData(historicalData.data);

      console.log('Successfully fetched data for:', sym); // Debug log
    } catch (err: any) {
      console.error('Error fetching data for', sym, ':', err); // Debug log
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputSymbol.trim()) {
      // Clear any previous errors
      setError('');

      // Automatically add .JK suffix
      const fullSymbol = ensureJKSuffix(inputSymbol);
      console.log('Search triggered for symbol:', fullSymbol); // Debug log

      // Update symbol state - this will trigger the useEffect to fetch data
      setSymbol(fullSymbol);

      // Update URL without page reload for better UX
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('symbol'); // Remove any existing symbol param for manual searches
      window.history.replaceState({}, '', newUrl.pathname);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <nav className="bg-gray-800 border-b border-gray-700 px-3 md:px-6 py-3 md:py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <h1 className="text-xl md:text-2xl font-bold">Ebite Chart</h1>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Link
              href="/vcp-screener"
              className="bg-red-600 hover:bg-red-700 px-3 md:px-4 py-2 rounded text-sm md:text-base font-semibold transition text-center"
            >
              🎯 VCP Screener
            </Link>
            <Link
              href="/screener"
              className="bg-blue-600 hover:bg-blue-700 px-3 md:px-4 py-2 rounded text-sm md:text-base transition text-center"
            >
              Stock Screener
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-3 md:p-6">
        {/* Search Bar */}
        <div className="mb-4 md:mb-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              type="text"
              value={inputSymbol}
              onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
              placeholder="Enter stock ticker (e.g., BBCA, TLKM, BBRI)"
              className="flex-1 px-3 md:px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder:text-gray-500 text-sm md:text-base"
            />
            <button
              type="submit"
              disabled={!inputSymbol.trim() || loading}
              className={`px-4 md:px-6 py-2 rounded font-semibold transition text-sm md:text-base ${
                !inputSymbol.trim() || loading
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {loading ? '⏳ Loading...' : '🔍 Search'}
            </button>
          </form>

          <p className="text-xs md:text-sm text-gray-400 mb-3">
            💡 Tip: Just type the ticker symbol (e.g., BBCA). The .JK suffix is added automatically for Indonesian stocks.
          </p>

          {/* Popular Stocks */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:flex lg:flex-wrap gap-2">
            {popularStocks.map((stock) => (
              <button
                key={stock}
                onClick={() => {
                  setSymbol(stock);
                  setInputSymbol(stock.replace('.JK', '')); // Show without .JK in input
                }}
                className={`px-2 md:px-3 py-1 rounded text-xs md:text-sm text-center ${
                  symbol === stock
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {stock.replace('.JK', '')}
              </button>
            ))}
          </div>
        </div>

        {/* Interval Selector */}
        <div className="mb-4 md:mb-6">
          <div className="flex flex-col gap-3">
            {/* Current Selection Display */}
            <div className="bg-gray-800 border border-gray-700 rounded p-3">
              <p className="text-sm text-gray-400">
                📊 Current Timeframe: <span className="text-white font-bold">
                  {interval === '5m' ? '5 Minutes' :
                   interval === '15m' ? '15 Minutes' :
                   interval === '1h' ? '1 Hour' :
                   interval === '4h' ? '4 Hours' :
                   interval === '1d' ? 'Daily' :
                   interval === '1wk' ? 'Weekly' : 'Monthly'}
                </span>
                {(interval === '5m' || interval === '15m' || interval === '1h' || interval === '4h') && (
                  <span className="ml-2 text-yellow-400 text-xs">⚡ Intraday</span>
                )}
              </p>
            </div>

            {/* Intraday Timeframes */}
            <div>
              <p className="text-xs text-gray-400 mb-2">⚡ Intraday (Short-term Trading)</p>
              <div className="flex flex-wrap gap-2">
                {['5m', '15m', '1h', '4h'].map((int) => (
                  <button
                    key={int}
                    onClick={() => setInterval(int)}
                    className={`px-3 md:px-4 py-2 rounded text-sm md:text-base font-semibold transition-all ${
                      interval === int
                        ? 'bg-green-600 text-white ring-2 ring-green-400 shadow-lg'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {interval === int ? '✓ ' : ''}
                    {int === '5m' ? '5 Min' : int === '15m' ? '15 Min' : int === '1h' ? '1 Hour' : '4 Hours'}
                  </button>
                ))}
              </div>
            </div>

            {/* Daily/Weekly/Monthly Timeframes */}
            <div>
              <p className="text-xs text-gray-400 mb-2">📅 Daily/Weekly/Monthly (Long-term Analysis)</p>
              <div className="flex flex-wrap gap-2">
                {['1d', '1wk', '1mo'].map((int) => (
                  <button
                    key={int}
                    onClick={() => setInterval(int)}
                    className={`px-3 md:px-4 py-2 rounded text-sm md:text-base font-semibold transition-all ${
                      interval === int
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-lg'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {interval === int ? '✓ ' : ''}
                    {int === '1d' ? 'Daily' : int === '1wk' ? 'Weekly' : 'Monthly'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="animate-spin mb-4 text-3xl">🔄</div>
              <div className="text-xl mb-2">
                Loading {inputSymbol || symbol.replace('.JK', '')} chart...
              </div>
              {window.location.search && (
                <p className="text-sm text-gray-400">
                  Loading stock from screener analysis...
                </p>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {!loading && !error && stockQuote && (
          <>
            <StockInfo {...stockQuote} />
            {chartData.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-2 md:p-6">
                <StockChart symbol={symbol} data={chartData} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
