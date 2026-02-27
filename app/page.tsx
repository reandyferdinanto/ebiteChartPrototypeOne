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
  const [timeframe, setTimeframe] = useState('1d');
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [showSettings, setShowSettings] = useState(false); // Collapsible settings

  const popularStocks = [
    'BBCA', 'BBRI', 'BMRI', 'BBNI', 'ASII', 'TLKM', 'UNVR', 'ICBP'
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
    // Check for symbol and interval in URL params (from screener view button)
    const urlParams = new URLSearchParams(window.location.search);
    const urlSymbol = urlParams.get('symbol');
    const urlInterval = urlParams.get('interval');

    // Set interval from URL if provided
    if (urlInterval && ['5m', '15m', '1h', '4h', '1d', '1wk', '1mo'].includes(urlInterval)) {
      setTimeframe(urlInterval);
    }

    if (urlSymbol) {
      const fullSymbol = ensureJKSuffix(urlSymbol);
      setSymbol(fullSymbol);
      setInputSymbol(urlSymbol); // Update input field to show ticker without .JK
      // Fetch data immediately for URL symbol with URL interval if provided
      fetchStockData(fullSymbol, urlInterval || timeframe);
      setInitialLoadDone(true);
    } else {
      // No URL symbol, fetch default symbol
      fetchStockData(symbol, urlInterval || timeframe);
      setInitialLoadDone(true);
    }
  }, []); // Run once on component mount

  useEffect(() => {
    // Only run for subsequent changes after initial load
    // Skip if this is the initial load or if we just loaded from URL
    if (initialLoadDone) {
      console.log('useEffect triggered for symbol or timeframe change:', symbol, timeframe); // Debug log

      // Always fetch data when symbol or timeframe changes after initial load
      // This ensures timeframe buttons work even when loaded from URL
      fetchStockData(symbol, timeframe);

      // Update URL to reflect current state (removes stale interval param)
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('symbol', symbol.replace('.JK', ''));
      newUrl.searchParams.set('interval', timeframe);
      window.history.replaceState({}, '', newUrl);
    }
  }, [symbol, timeframe, initialLoadDone]);

  const fetchStockData = async (sym: string, int: string) => {
    console.log('fetchStockData called with symbol:', sym, 'interval:', int); // Debug log
    setLoading(true);
    setError('');

    try {
      // Fetch quote
      const quoteRes = await fetch(`/api/stock/quote?symbol=${sym}`);
      if (!quoteRes.ok) {
        const errorData = await quoteRes.json().catch(() => ({ error: 'Unknown error' }));
        const stockTicker = sym.replace('.JK', '');
        throw new Error(`Failed to fetch data for ${stockTicker}. The stock may be delisted, suspended, or not available on Yahoo Finance.`);
      }
      const quoteData = await quoteRes.json();
      setStockQuote(quoteData);

      // Fetch historical data
      const historicalRes = await fetch(
        `/api/stock/historical?symbol=${sym}&interval=${int}`
      );
      if (!historicalRes.ok) {
        const errorData = await historicalRes.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Historical API error:', errorData);
        const stockTicker = sym.replace('.JK', '');
        throw new Error(`Failed to fetch historical data for ${stockTicker}. The stock may not have data available for the ${int} timeframe.`);
      }
      const historicalData = await historicalRes.json();

      // Check if we have valid data
      if (!historicalData.data || historicalData.data.length === 0) {
        console.warn('No historical data available for:', sym, 'interval:', int);
        const stockTicker = sym.replace('.JK', '');
        throw new Error(`No data available for ${stockTicker} at ${int} timeframe. Try a different timeframe or stock.`);
      }

      setChartData(historicalData.data);
      console.log('Successfully fetched', historicalData.data.length, 'data points for:', sym); // Debug log
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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-white">
      {/* Top Navigation Bar - Glassmorphism */}
      <nav className="backdrop-blur-xl bg-black/30 border-b border-white/10 px-4 py-3 sticky top-0 z-50 shadow-2xl">{/* ...existing code... */}
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Ebite Chart
            </h1>
          </div>
          <div className="flex gap-2">
            <Link
              href="/vcp-screener"
              className="backdrop-blur-md bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 px-3 py-1.5 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 shadow-lg hover:shadow-orange-500/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>VCP Screener</span>
            </Link>
            <Link
              href="/scalp-screener"
              className="backdrop-blur-md bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 px-3 py-1.5 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 shadow-lg hover:shadow-green-500/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Scalp Screener</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-2 md:p-4">
        {/* Compact Search Section - Glassmorphism */}
        <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl p-3 md:p-4 mb-3 shadow-2xl">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2 mb-3">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={inputSymbol}
                onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
                placeholder="Type ticker symbol (e.g., BBCA, TLKM, ASII)"
                className="w-full pl-10 pr-3 py-2.5 backdrop-blur-md bg-black/30 border border-white/20 rounded-xl text-white placeholder:text-gray-500 text-sm focus:ring-2 focus:ring-blue-500/50 focus:outline-none transition"
              />
            </div>
            <button
              type="submit"
              disabled={!inputSymbol.trim() || loading}
              className={`px-4 py-2.5 rounded-xl font-semibold transition text-sm flex items-center gap-2 shadow-lg ${
                !inputSymbol.trim() || loading
                  ? 'backdrop-blur-md bg-gray-500/20 text-gray-500 cursor-not-allowed border border-gray-500/30'
                  : 'backdrop-blur-md bg-blue-500/30 hover:bg-blue-500/40 text-white border border-blue-500/30 hover:shadow-blue-500/30'
              }`}
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden md:inline">Loading</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="hidden md:inline">Search</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="backdrop-blur-md bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2 shadow-lg"
              title="Toggle Settings"
            >
              <svg className={`w-4 h-4 transition-transform ${showSettings ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="hidden md:inline">Settings</span>
            </button>
          </form>

          {/* Quick Access Stocks */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className="text-xs text-gray-400 self-center mr-1">Quick Access:</span>
            {popularStocks.map((stock) => (
              <button
                key={stock}
                onClick={() => {
                  const fullSymbol = ensureJKSuffix(stock);
                  setSymbol(fullSymbol);
                  setInputSymbol(stock);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition shadow-md ${
                  symbol === ensureJKSuffix(stock)
                    ? 'backdrop-blur-md bg-blue-500/30 text-white border border-blue-500/50 shadow-blue-500/20'
                    : 'backdrop-blur-md bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                }`}
              >
                {stock}
              </button>
            ))}
          </div>

          {/* Collapsible Settings */}
          {showSettings && (
            <div className="mt-3 pt-3 border-t border-white/10 space-y-3 animate-in slide-in-from-top duration-200">
              {/* Timeframe Selector */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-gray-300 font-semibold">Timeframe</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { value: '5m', label: '5 Min', type: 'intraday', icon: '⚡' },
                    { value: '15m', label: '15 Min', type: 'intraday', icon: '⚡' },
                    { value: '1h', label: '1 Hour', type: 'intraday', icon: '⚡' },
                    { value: '4h', label: '4 Hours', type: 'intraday', icon: '⚡' },
                    { value: '1d', label: 'Daily', type: 'daily', icon: '📅' },
                    { value: '1wk', label: 'Weekly', type: 'daily', icon: '📅' },
                    { value: '1mo', label: 'Monthly', type: 'daily', icon: '📅' },
                  ].map((tf) => (
                    <button
                      key={tf.value}
                      onClick={() => setTimeframe(tf.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-md ${
                        timeframe === tf.value
                          ? tf.type === 'intraday'
                            ? 'backdrop-blur-md bg-green-500/30 text-white ring-2 ring-green-400/50 shadow-green-500/20'
                            : 'backdrop-blur-md bg-blue-500/30 text-white ring-2 ring-blue-400/50 shadow-blue-500/20'
                          : 'backdrop-blur-md bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                      }`}
                    >
                      <span>{tf.icon}</span>
                      <span>{tf.label}</span>
                      {timeframe === tf.value && <span className="text-green-400">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Loading State - Glassmorphism */}
        {loading && (
          <div className="text-center py-8 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl">
            <div className="inline-block">
              <svg className="w-12 h-12 text-blue-400 animate-spin mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <p className="text-lg">Loading {inputSymbol || symbol.replace('.JK', '')}...</p>
          </div>
        )}

        {/* Error State - Glassmorphism */}
        {error && (
          <div className="backdrop-blur-xl bg-red-500/10 border border-red-500/30 text-red-100 px-4 py-3 rounded-2xl mb-4 flex items-center gap-3 shadow-lg">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Stock Info & Chart - Maximum Focus */}
        {!loading && !error && stockQuote && (
          <div className="space-y-3">
            <StockInfo {...stockQuote} />
            {chartData.length > 0 && (
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <StockChart symbol={symbol} data={chartData} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
