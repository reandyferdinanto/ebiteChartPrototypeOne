'use client';

import { useState, useEffect, useRef } from 'react';
import StockChart from '@/components/StockChart';
import StockInfo from '@/components/StockInfo';
import Link from 'next/link';

interface ChartData {
  time: number; open: number; high: number; low: number; close: number; volume?: number;
}
interface StockQuote {
  symbol: string; name: string; price: number; change: number; changePercent: number;
  volume: number; marketCap?: number; high: number; low: number; open: number;
  previousClose: number; currency?: string;
}

// ── Tech SVG icons (no emoji) ────────────────────────────────────────────────
const IconSearch = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
const IconSpin = () => (
  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);
const IconClock = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconCheck = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
);
const IconWarn = () => (
  <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);
const IconFilter = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707l-6.414 6.414A1 1 0 0014 13.828V19a1 1 0 01-.553.894l-4 2A1 1 0 018 21v-7.172a1 1 0 00-.293-.707L1.293 6.707A1 1 0 011 6V4z" />
  </svg>
);
const IconLogo = () => (
  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const TIMEFRAMES = [
  { value: '5m',  label: '5m',  group: 'intra' },
  { value: '15m', label: '15m', group: 'intra' },
  { value: '1h',  label: '1H',  group: 'intra' },
  { value: '4h',  label: '4H',  group: 'intra' },
  { value: '1d',  label: '1D',  group: 'daily' },
  { value: '1wk', label: '1W',  group: 'daily' },
  { value: '1mo', label: '1M',  group: 'daily' },
];

export default function Home() {
  const [symbol, setSymbol]         = useState('BBCA.JK');
  const [inputSymbol, setInputSymbol] = useState('BBCA');
  const [chartData, setChartData]   = useState<ChartData[]>([]);
  const [stockQuote, setStockQuote] = useState<StockQuote | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [timeframe, setTimeframe]   = useState('1d');

  const abortControllerRef = useRef<AbortController | null>(null);

  const popularStocks = ['BBCA', 'BBRI', 'BMRI', 'BBNI', 'ASII', 'TLKM', 'UNVR', 'ICBP'];

  const ensureJK = (t: string) => {
    const s = t.trim().toUpperCase();
    return s.endsWith('.JK') ? s : `${s}.JK`;
  };

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const u = p.get('symbol');
    // Support both ?interval= (internal) and ?timeframe= (from scalp/swing screener)
    const ui = p.get('timeframe') || p.get('interval');
    const valid = ['5m','15m','1h','4h','1d','1wk','1mo'];
    const ri = ui && valid.includes(ui) ? ui : '1d';
    const rs = u ? ensureJK(u) : 'BBCA.JK';
    const ri2 = u ? u.replace('.JK','').toUpperCase() : 'BBCA';
    setSymbol(rs); setInputSymbol(ri2); setTimeframe(ri);
    fetchStockData(rs, ri);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStockData = async (sym: string, int: string) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const ctrl = new AbortController();
    abortControllerRef.current = ctrl;
    const sig = ctrl.signal;

    setLoading(true); setError(''); setChartData([]); setStockQuote(null);

    try {
      const u = new URL(window.location.href);
      u.searchParams.set('symbol', sym.replace('.JK',''));
      u.searchParams.set('interval', int);
      window.history.replaceState({}, '', u);
    } catch (_) {}

    try {
      const qr = await fetch(`/api/stock/quote?symbol=${sym}`, { signal: sig });
      if (sig.aborted) return;
      if (!qr.ok) throw new Error(`Stock "${sym.replace('.JK','')}" not found.`);
      const qd = await qr.json();
      if (sig.aborted) return;
      setStockQuote(qd);

      const hr = await fetch(`/api/stock/historical?symbol=${sym}&interval=${int}`, { signal: sig });
      if (sig.aborted) return;
      if (!hr.ok) throw new Error(`No historical data for "${sym.replace('.JK','')}" at ${int}.`);
      const hd = await hr.json();
      if (sig.aborted) return;
      if (!hd.data || hd.data.length === 0)
        throw new Error(`No data for "${sym.replace('.JK','')}" at ${int}. Try Daily.`);
      setChartData(hd.data);
    } catch (e: any) {
      if (e?.name === 'AbortError' || sig.aborted) return;
      setError(e.message || 'Failed to fetch data.');
    } finally {
      if (!sig.aborted) setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const t = inputSymbol.trim();
    if (!t || loading) return;
    const fs = ensureJK(t);
    setSymbol(fs);
    fetchStockData(fs, timeframe);
  };

  const handleTF = (tf: string) => {
    setTimeframe(tf);
    fetchStockData(symbol, tf);
  };

  const handleQuick = (stock: string) => {
    const fs = ensureJK(stock);
    setSymbol(fs); setInputSymbol(stock);
    fetchStockData(fs, timeframe);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-white">

      {/* ── Top Nav ───────────────────────────────────────────────────────── */}
      <nav className="backdrop-blur-xl bg-black/30 border-b border-white/10 px-3 py-2.5 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Brand */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <IconLogo />
            </div>
            <span className="text-base font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent hidden sm:block">
              Ebite Chart
            </span>
          </div>

          {/* Nav links */}
          <div className="flex gap-1.5">
            <Link
              href="/analysis"
              className="backdrop-blur-md bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="hidden sm:inline">Analysis</span>
              <span className="sm:hidden">AI</span>
            </Link>
            <Link
              href="/screener"
              className="backdrop-blur-md bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707l-6.414 6.414A1 1 0 0014 13.828V19a1 1 0 01-.553.894l-4 2A1 1 0 018 21v-7.172a1 1 0 00-.293-.707L1.293 6.707A1 1 0 011 6V4z" />
              </svg>
              <span className="hidden sm:inline">Screener</span>
              <span className="sm:hidden">Scr</span>
            </Link>
            <Link
              href="/guide"
              className="backdrop-blur-md bg-blue-400/15 hover:bg-blue-400/25 border border-blue-400/25 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="hidden sm:inline">Guide</span>
              <span className="sm:hidden">?</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-2 md:p-4 space-y-2">

        {/* ── Search + Timeframe Bar ────────────────────────────────────────── */}
        <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl p-2.5 shadow-2xl space-y-2">

          {/* Row 1: search input + search button (full width on mobile) */}
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            {/* Input */}
            <div className="relative flex-1 min-w-0">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                <IconSearch />
              </span>
              <input
                type="text"
                value={inputSymbol}
                onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(e as any)}
                placeholder="Ticker (BBCA, TLKM…)"
                className="w-full pl-9 pr-2 py-2.5 backdrop-blur-md bg-black/30 border border-white/15 rounded-xl text-white placeholder:text-gray-600 text-sm focus:ring-2 focus:ring-blue-500/50 focus:outline-none transition"
              />
            </div>

            {/* Search button */}
            <button
              type="submit"
              disabled={!inputSymbol.trim() || loading}
              className={`flex-shrink-0 px-3 py-2.5 rounded-xl font-semibold transition text-sm flex items-center gap-1.5 shadow-md ${
                !inputSymbol.trim() || loading
                  ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed border border-gray-500/20'
                  : 'bg-blue-500/30 hover:bg-blue-500/40 text-white border border-blue-500/30'
              }`}
            >
              {loading ? <IconSpin /> : <IconSearch />}
              <span className="hidden sm:inline">{loading ? 'Loading…' : 'Search'}</span>
            </button>
          </form>

          {/* Row 2: Timeframe pills — always on their own row so they're never hidden */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
            <span className="text-gray-500 flex-shrink-0 mr-0.5">
              <IconClock />
            </span>
            {TIMEFRAMES.map((tf) => {
              const isActive = timeframe === tf.value;
              const isIntra  = tf.group === 'intra';
              return (
                <button
                  key={tf.value}
                  type="button"
                  onClick={() => handleTF(tf.value)}
                  disabled={loading}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-0.5 ${
                    isActive
                      ? isIntra
                        ? 'bg-emerald-500/30 text-emerald-300 ring-1 ring-emerald-400/40'
                        : 'bg-blue-500/30 text-blue-300 ring-1 ring-blue-400/40'
                      : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                  } ${loading ? 'opacity-40 pointer-events-none' : ''}`}
                >
                  {isActive && <IconCheck />}
                  {tf.label}
                </button>
              );
            })}
          </div>

          {/* Row 3: Quick access chips */}
          <div className="flex flex-wrap gap-1 items-center">
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide flex items-center gap-1 mr-0.5">
              <IconFilter />
              <span className="hidden sm:inline">Quick</span>
            </span>
            {popularStocks.map((s) => (
              <button
                key={s}
                onClick={() => handleQuick(s)}
                disabled={loading}
                className={`px-2 py-0.5 rounded-lg text-xs font-medium transition border ${
                  symbol === ensureJK(s)
                    ? 'bg-blue-500/25 text-white border-blue-500/40'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 border-white/10'
                } ${loading ? 'opacity-40 pointer-events-none' : ''}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* ── Loading ───────────────────────────────────────────────────────── */}
        {loading && (
          <div className="text-center py-8 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-blue-400/30 border-t-blue-400 animate-spin" />
            <p className="text-sm text-gray-300">Loading <span className="text-white font-semibold">{inputSymbol || symbol.replace('.JK','')}</span>…</p>
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────────────────────── */}
        {error && (
          <div className="backdrop-blur-xl bg-red-500/10 border border-red-500/30 text-red-100 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-lg">
            <IconWarn />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* ── Stock Info + Chart ────────────────────────────────────────────── */}
        {!loading && !error && stockQuote && (
          <div className="space-y-2">
            <StockInfo {...stockQuote} />
            {chartData.length > 0 && (
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <StockChart symbol={symbol} data={chartData} timeframe={timeframe} />
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
