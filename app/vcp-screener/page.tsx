'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface VCPCandidate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  vpcScore: number;
  cppScore: number;
  cppBias: string;
  evrScore: number;
  wyckoffPhase: string;
  isVCP: boolean;
  isDryUp: boolean;
  isIceberg: boolean;
  isSniperEntry: boolean;
  isNoSupply: boolean;
  isSellingClimax: boolean;
  rmv: number;
  pattern: string;
  recommendation: string;
}

interface ScreenerResult {
  total: number;
  scannedStocks: number;
  filter: string;
  sniperCount: number;
  vcpCount: number;
  dryUpCount: number;
  candidates: {
    sniperEntry: VCPCandidate[];
    vcp: VCPCandidate[];
    dryUp: VCPCandidate[];
    all: VCPCandidate[];
  };
  timestamp: string;
}

export default function VCPScreener() {
  const [results, setResults] = useState<ScreenerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'sniper' | 'vcp' | 'dryup' | 'all'>('sniper');
  const [minScore, setMinScore] = useState(50);
  const [filter, setFilter] = useState<'all' | 'liquid'>('liquid');
  const [limit, setLimit] = useState(100);

  useEffect(() => {
    scanStocks();
  }, []);

  const scanStocks = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/stock/vcp-screener?limit=${limit}&minScore=${minScore}&filter=${filter}`);
      if (!response.ok) throw new Error('Failed to fetch screener data');
      const data = await response.json();
      setResults(data);

      // If no results found and minScore is high, suggest lowering it
      if (data.total === 0 && minScore > 55) {
        setError(`No stocks found with score ${minScore}+. Tip: Try lowering minimum score to 50-55 for more results.`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to scan stocks');
    } finally {
      setLoading(false);
    }
  };

  const renderCandidates = () => {
    if (!results) return null;

    let candidates: VCPCandidate[] = [];
    let title = '';
    let description = '';

    switch (activeTab) {
      case 'sniper':
        candidates = results.candidates.sniperEntry;
        title = '🎯 Sniper Entry (VCP + Dry Up)';
        description = 'Perfect setup: VCP base + low volume support test. Premium entry points!';
        break;
      case 'vcp':
        candidates = results.candidates.vcp;
        title = '📉 VCP Base Patterns';
        description = 'Volatility Contraction Patterns forming near highs. Ready for breakout.';
        break;
      case 'dryup':
        candidates = results.candidates.dryUp;
        title = '🥷 Dry Up (Low Volume Support)';
        description = 'Support tests with low volume. Institutional accumulation signals.';
        break;
      case 'all':
        candidates = results.candidates.all;
        title = '📊 All VCP Candidates';
        description = 'All stocks meeting VCP/Sniper criteria sorted by score.';
        break;
    }

    return (
      <div className="space-y-4">
        <div className="bg-blue-900/30 border border-blue-700 rounded p-4">
          <h3 className="text-lg font-semibold mb-1">{title}</h3>
          <p className="text-sm text-gray-400">{description}</p>
        </div>

        {candidates.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No candidates found. Try lowering the minimum score.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 md:py-3 px-2 md:px-3 text-gray-400">Ticker</th>
                  <th className="text-right py-2 md:py-3 px-2 md:px-3 text-gray-400">Price</th>
                  <th className="text-right py-2 md:py-3 px-2 md:px-3 text-gray-400">Change</th>
                  <th className="text-right py-2 md:py-3 px-2 md:px-3 text-gray-400 hidden sm:table-cell">Volume</th>
                  <th className="text-center py-2 md:py-3 px-2 md:px-3 text-gray-400">Score</th>
                  <th className="text-center py-2 md:py-3 px-2 md:px-3 text-gray-400 hidden md:table-cell">CPP</th>
                  <th className="text-center py-2 md:py-3 px-2 md:px-3 text-gray-400 hidden md:table-cell">Wyckoff</th>
                  <th className="text-left py-2 md:py-3 px-2 md:px-3 text-gray-400 hidden lg:table-cell">Pattern</th>
                  <th className="text-left py-2 md:py-3 px-2 md:px-3 text-gray-400 hidden lg:table-cell">Action</th>
                  <th className="text-center py-2 md:py-3 px-2 md:px-3 text-gray-400">Chart</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate, idx) => (
                  <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800/50 transition">
                    <td className="py-2 md:py-3 px-2 md:px-3 font-semibold text-white">
                      <div>{candidate.symbol}</div>
                      {/* Mobile: show pattern below ticker */}
                      <div className="text-xs text-gray-400 md:hidden">{candidate.pattern}</div>
                    </td>
                    <td className="py-2 md:py-3 px-2 md:px-3 text-right text-white">
                      Rp {candidate.price.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-2 md:py-3 px-2 md:px-3 text-right">
                      <span className={`text-xs md:text-sm ${candidate.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {candidate.change >= 0 ? '+' : ''}{candidate.changePercent.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-2 md:py-3 px-2 md:px-3 text-right text-gray-300 hidden sm:table-cell">
                      {(candidate.volume / 1000000).toFixed(1)}M
                    </td>
                    <td className="py-2 md:py-3 px-2 md:px-3 text-center">
                      <span className={`px-2 py-1 rounded font-bold text-xs ${
                        candidate.vpcScore >= 90 ? 'bg-green-900 text-green-200'
                        : candidate.vpcScore >= 80 ? 'bg-blue-900 text-blue-200'
                        : candidate.vpcScore >= 70 ? 'bg-yellow-900 text-yellow-200'
                        : 'bg-gray-800 text-gray-300'
                      }`}>
                        {candidate.vpcScore}
                      </span>
                    </td>
                    {/* CPP bias column */}
                    <td className="py-2 md:py-3 px-2 md:px-3 text-center hidden md:table-cell">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                        candidate.cppBias === 'BULLISH' ? 'bg-green-900/50 text-green-300'
                        : candidate.cppBias === 'BEARISH' ? 'bg-red-900/50 text-red-300'
                        : 'bg-gray-800 text-gray-400'
                      }`}>
                        {candidate.cppBias === 'BULLISH' ? '📈' : candidate.cppBias === 'BEARISH' ? '📉' : '➡️'}
                        {' '}{candidate.cppScore > 0 ? '+' : ''}{candidate.cppScore}
                      </span>
                    </td>
                    {/* Wyckoff phase */}
                    <td className="py-2 md:py-3 px-2 md:px-3 text-center hidden md:table-cell">
                      <span className={`text-xs ${
                        candidate.wyckoffPhase === 'MARKUP' ? 'text-green-400'
                        : candidate.wyckoffPhase === 'ACCUMULATION' ? 'text-blue-400'
                        : candidate.wyckoffPhase === 'MARKDOWN' ? 'text-red-400'
                        : 'text-yellow-400'
                      }`}>
                        {candidate.wyckoffPhase}
                      </span>
                    </td>
                    <td className="py-2 md:py-3 px-2 md:px-3 text-xs text-gray-300 hidden lg:table-cell">
                      {candidate.pattern}
                    </td>
                    <td className="py-2 md:py-3 px-2 md:px-3 text-xs hidden lg:table-cell">
                      <span className={`${
                        candidate.recommendation.includes('KUAT') ? 'text-green-400 font-bold'
                        : candidate.recommendation.includes('BELI') ? 'text-green-300'
                        : candidate.recommendation.includes('ENTRY') ? 'text-yellow-300'
                        : 'text-blue-300'
                      }`}>
                        {candidate.recommendation}
                      </span>
                    </td>
                    <td className="py-2 md:py-3 px-2 md:px-3 text-center">
                      <Link
                        href={`/?symbol=${candidate.symbol}`}
                        className="bg-blue-600 hover:bg-blue-700 px-2 md:px-3 py-1 rounded text-xs transition"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-white">
      <nav className="bg-gray-800 border-b border-gray-700 px-3 md:px-6 py-3 md:py-4">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 lg:gap-0">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">🎯 VCP Screener</h1>
            <p className="text-xs md:text-sm text-gray-400">
              Scan all IDX stocks for VCP Base & Sniper Entry patterns
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <Link
              href="/analysis"
              className="backdrop-blur-md bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/40 px-3 md:px-4 py-2 rounded-lg transition text-xs md:text-sm text-center flex items-center gap-1.5 font-semibold"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Analysis
            </Link>
            <Link
              href="/scalp-screener"
              className="backdrop-blur-md bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 px-3 md:px-4 py-2 rounded-lg transition text-xs md:text-sm text-center flex items-center gap-1.5 font-semibold"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Scalp
            </Link>
            <Link
              href="/"
              className="backdrop-blur-md bg-black/30 hover:bg-gray-600 border border-white/10 px-3 md:px-4 py-2 rounded-lg transition text-xs md:text-sm text-center flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Chart
            </Link>
            <Link
              href="/guide"
              className="backdrop-blur-md bg-blue-400/15 hover:bg-blue-400/25 border border-blue-400/25 px-3 md:px-4 py-2 rounded-lg transition text-xs md:text-sm text-center flex items-center gap-1.5 font-semibold"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Guide
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-3 md:p-6 space-y-4 md:space-y-6">
        {/* Summary Cards */}
        {results && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-gradient-to-br from-red-900 to-red-800 rounded p-3 md:p-4 border border-red-700">
              <div className="text-xs md:text-sm text-gray-300 mb-1">🎯 Sniper Entry</div>
              <div className="text-2xl md:text-3xl font-bold">{results.sniperCount}</div>
              <div className="text-xs text-gray-400 mt-1 md:mt-2">VCP + Dry Up combined</div>
            </div>
            <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded p-3 md:p-4 border border-blue-700">
              <div className="text-xs md:text-sm text-gray-300 mb-1">📉 VCP Base</div>
              <div className="text-2xl md:text-3xl font-bold">{results.vcpCount}</div>
              <div className="text-xs text-gray-400 mt-1 md:mt-2">Ready for breakout</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-900 to-yellow-800 rounded p-3 md:p-4 border border-yellow-700">
              <div className="text-xs md:text-sm text-gray-300 mb-1">🥷 Dry Up</div>
              <div className="text-2xl md:text-3xl font-bold">{results.dryUpCount}</div>
              <div className="text-xs text-gray-400 mt-1 md:mt-2">Support accumulation</div>
            </div>
            <div className="bg-gradient-to-br from-green-900 to-green-800 rounded p-3 md:p-4 border border-green-700">
              <div className="text-xs md:text-sm text-gray-300 mb-1">📊 Total Scanned</div>
              <div className="text-2xl md:text-3xl font-bold">{results.total}</div>
              <div className="text-xs text-gray-400 mt-2">
                {new Date(results.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl shadow-2xl rounded p-3 md:p-4 space-y-3 md:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 items-end">
            <label className="text-xs md:text-sm text-gray-300">
              Filter:
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'liquid')}
                className="mt-1 w-full backdrop-blur-md bg-black/30 border border-gray-600 rounded px-2 md:px-3 py-2 text-xs md:text-sm text-white"
              >
                <option value="liquid">💧 Liquid Stocks (200+ stocks) - Faster</option>
                <option value="all">📊 All IDX Stocks (800+) - Comprehensive</option>
              </select>
            </label>

            <label className="text-xs md:text-sm text-gray-300">
              Results Limit:
              <input
                type="number"
                value={limit}
                onChange={(e) => setLimit(Math.max(10, parseInt(e.target.value) || 100))}
                min="10"
                max="500"
                step="10"
                className="mt-1 w-full backdrop-blur-md bg-black/30 border border-gray-600 rounded px-2 md:px-3 py-2 text-xs md:text-sm text-white"
              />
            </label>

            <label className="text-xs md:text-sm text-gray-300">
              Minimum Score:
              <input
                type="number"
                value={minScore}
                onChange={(e) => setMinScore(Math.max(50, Math.min(100, parseInt(e.target.value) || 70)))}
                min="50"
                max="100"
                step="5"
                className="mt-1 w-full backdrop-blur-md bg-black/30 border border-gray-600 rounded px-2 md:px-3 py-2 text-xs md:text-sm text-white"
              />
            </label>

            <button
              onClick={scanStocks}
              disabled={loading}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 md:px-6 py-2 rounded transition font-semibold text-sm md:text-base"
            >
              {loading ? '🔄 Scanning...' : '🔍 Scan Stocks'}
            </button>
          </div>

          {/* Legend */}
          <div className="bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 border border-gray-700 rounded p-3">
            <div className="text-xs text-gray-400 space-y-1">
              <p><strong>💧 Liquid Stocks:</strong> High-volume, actively traded stocks (LQ45 + most liquid IDX). Faster scanning. Best for beginners.</p>
              <p><strong>📊 All IDX Stocks:</strong> Scans all 800+ Indonesian stocks. Comprehensive but slower. Finds hidden gems.</p>
              {results && <p><strong>Scanned {results.scannedStocks} stocks</strong> with filter: <span className="font-bold text-yellow-300">{results.filter === 'liquid' ? 'LIQUID' : 'ALL'}</span></p>}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="grid grid-cols-2 lg:flex lg:gap-2 gap-2">
          <button
            onClick={() => setActiveTab('sniper')}
            className={`px-3 md:px-4 py-2 rounded font-semibold transition text-xs md:text-sm ${
              activeTab === 'sniper'
                ? 'bg-red-600 text-white'
                : 'backdrop-blur-md bg-black/30 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🎯 Sniper ({results?.sniperCount || 0})
          </button>
          <button
            onClick={() => setActiveTab('vcp')}
            className={`px-3 md:px-4 py-2 rounded font-semibold transition text-xs md:text-sm ${
              activeTab === 'vcp'
                ? 'bg-blue-600 text-white'
                : 'backdrop-blur-md bg-black/30 text-gray-300 hover:bg-gray-600'
            }`}
          >
            📉 VCP ({results?.vcpCount || 0})
          </button>
          <button
            onClick={() => setActiveTab('dryup')}
            className={`px-3 md:px-4 py-2 rounded font-semibold transition text-xs md:text-sm ${
              activeTab === 'dryup'
                ? 'bg-yellow-600 text-white'
                : 'backdrop-blur-md bg-black/30 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🥷 Dry Up ({results?.dryUpCount || 0})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 md:px-4 py-2 rounded font-semibold transition text-xs md:text-sm ${
              activeTab === 'all'
                ? 'bg-purple-600 text-white'
                : 'backdrop-blur-md bg-black/30 text-gray-300 hover:bg-gray-600'
            }`}
          >
            📊 All
          </button>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="animate-spin mb-4">🔄</div>
              <p className="text-gray-400">
                Scanning {filter === 'liquid' ? '200+' : '800+'} stocks ({filter === 'liquid' ? 'Liquid' : 'All IDX'})...
              </p>
              <p className="text-xs text-gray-500 mt-2">This may take 1-10 minutes depending on server response</p>
            </div>
          </div>
        ) : (
          renderCandidates()
        )}

        {/* Pattern Guide — exact match with screener API logic */}
        <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl shadow-2xl p-3 md:p-4 space-y-4">
          <h3 className="font-semibold text-sm md:text-base flex items-center gap-2">
            <span>📖</span> Pattern Guide — cara baca hasil screener
          </h3>

          {/* BUY patterns */}
          <div>
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">✅ BUY / Entry Setups</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 text-xs">

              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-2.5 space-y-1">
                <div className="font-bold text-yellow-300">🎯 SNIPER ENTRY</div>
                <div className="text-gray-300 leading-relaxed">
                  Syarat terpenuhi semua sekaligus:<br/>
                  • Harga dekat high 30 hari (≥80%)<br/>
                  • Spread 5 candle &lt;75% rata-rata<br/>
                  • Volume 5 candle &lt;85% rata-rata<br/>
                  • RMV ≤ 15 (kompresi volatilitas ekstrem)<br/>
                  • Candle kecil + vol rendah (≤0.6×)<br/>
                  • Di atas MA20 &amp; MA50 (uptrend)<br/>
                  • Buying pressure &gt; selling (accRatio &gt;1.0)
                </div>
                <div className="text-yellow-400 font-semibold">⚡ Aksi: KUAT BELI – perfect VCP pivot</div>
              </div>

              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-2.5 space-y-1">
                <div className="font-bold text-orange-300">🎯 VCP DRY-UP</div>
                <div className="text-gray-300 leading-relaxed">
                  VCP Base + Dry Up (tanpa syarat RMV &amp; MA uptrend penuh):<br/>
                  • Harga dekat high + spread/vol menyempit<br/>
                  • Volume kering ≤0.6× rata-rata<br/>
                  • Body candle kecil (&lt;30% spread)<br/>
                  • Accumulation ratio &gt;0.8 (beli &gt; jual)
                </div>
                <div className="text-orange-400 font-semibold">🚀 Aksi: BELI – high probability setup</div>
              </div>

              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-2.5 space-y-1">
                <div className="font-bold text-green-300">🟢 Selling Climax (SC)</div>
                <div className="text-gray-300 leading-relaxed">
                  Wyckoff kapitulasi publik diserap institusi:<br/>
                  • Spread &gt;2× ATR (candle besar ke bawah)<br/>
                  • Volume &gt;2.5× rata-rata 20 hari<br/>
                  • Candle merah, close di &gt;40% dari bawah<br/>
                  • Harga masih di atas MA20
                </div>
                <div className="text-green-400 font-semibold">🚀 Aksi: BELI – SC + akumulasi institusi</div>
              </div>

              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-2.5 space-y-1">
                <div className="font-bold text-cyan-300">🟢 No Supply (NS)</div>
                <div className="text-gray-300 leading-relaxed">
                  Wyckoff VSA — penjual kehabisan amunisi:<br/>
                  • Low baru tapi spread sempit (&lt;1× ATR)<br/>
                  • Volume lebih kecil dari 2 candle sebelumnya<br/>
                  • Harga di atas MA20
                </div>
                <div className="text-cyan-400 font-semibold">🛒 Aksi: BELI – supply habis, siap naik</div>
              </div>

              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-2.5 space-y-1">
                <div className="font-bold text-teal-300">🧊 VCP ICEBERG</div>
                <div className="text-gray-300 leading-relaxed">
                  VCP Base + akumulasi tersembunyi:<br/>
                  • Harga dekat high + volatilitas menyempit<br/>
                  • Volume &gt;1.2× tapi spread &lt;0.75× rata-rata<br/>
                  • Institusi beli diam-diam (Wyckoff absorption)
                </div>
                <div className="text-teal-400 font-semibold">🚀 Aksi: BELI – strong hidden accumulation</div>
              </div>

              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-2.5 space-y-1">
                <div className="font-bold text-sky-300">🥷 DRY UP Kuat</div>
                <div className="text-gray-300 leading-relaxed">
                  Dry Up dengan tekanan beli dominan:<br/>
                  • Volume ≤0.6× rata-rata 20 hari<br/>
                  • Body kecil atau candle merah tipis<br/>
                  • accRatio &gt;1.5 (beli kuat vs jual)
                </div>
                <div className="text-sky-400 font-semibold">📍 Aksi: ENTRY – support test + buying pressure</div>
              </div>
            </div>
          </div>

          {/* WATCH patterns */}
          <div>
            <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">👀 WATCH / Monitor</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 text-xs">

              <div className="bg-blue-950/30 border border-blue-500/20 rounded-lg p-2.5 space-y-1">
                <div className="font-bold text-blue-300">📍 VCP PIVOT (RMV xx)</div>
                <div className="text-gray-300 leading-relaxed">
                  Titik pivot VCP terbentuk tapi belum dry up:<br/>
                  • VCP Base terpenuhi<br/>
                  • RMV ≤ 15 (kompresi volatilitas ekstrem)<br/>
                  • Tunggu volume kering atau candle reversal
                </div>
                <div className="text-blue-400 font-semibold">⏳ Aksi: WATCH – tunggu dry up/breakout</div>
              </div>

              <div className="bg-blue-950/30 border border-blue-500/20 rounded-lg p-2.5 space-y-1">
                <div className="font-bold text-indigo-300">📉 VCP BASE</div>
                <div className="text-gray-300 leading-relaxed">
                  Minervini VCP — base forming, belum pivot:<br/>
                  • Harga dekat high 30 hari (&gt;80%)<br/>
                  • Spread 5 candle &lt;75% rata-rata<br/>
                  • Volume 5 candle &lt;85% rata-rata<br/>
                  • RMV masih &gt;15, masih ada ruang kontraksi
                </div>
                <div className="text-indigo-400 font-semibold">⏳ Aksi: WATCH – base forming, belum entry</div>
              </div>

              <div className="bg-blue-950/30 border border-blue-500/20 rounded-lg p-2.5 space-y-1">
                <div className="font-bold text-gray-300">🥷 DRY UP</div>
                <div className="text-gray-300 leading-relaxed">
                  Dry Up standar tanpa konfirmasi VCP:<br/>
                  • Volume ≤0.6× rata-rata 20 hari<br/>
                  • Body candle kecil atau tipis<br/>
                  • accRatio &gt;0.8 (beli sedikit lebih dominan)
                </div>
                <div className="text-gray-400 font-semibold">📍 Aksi: ENTRY hati-hati – support test saja</div>
              </div>

              <div className="bg-blue-950/30 border border-blue-500/20 rounded-lg p-2.5 space-y-1">
                <div className="font-bold text-slate-300">🧊 ICEBERG</div>
                <div className="text-gray-300 leading-relaxed">
                  Akumulasi tersembunyi tanpa VCP:<br/>
                  • Volume &gt;1.2× rata-rata<br/>
                  • Spread &lt;0.75× rata-rata (spread sempit)<br/>
                  • Institusi beli tapi harga tertahan
                </div>
                <div className="text-slate-400 font-semibold">👀 Aksi: WATCH – hidden activity tanpa tren</div>
              </div>

              <div className="bg-blue-950/30 border border-blue-500/20 rounded-lg p-2.5 space-y-1">
                <div className="font-bold text-purple-300">📈 DEVELOPING</div>
                <div className="text-gray-300 leading-relaxed">
                  Setup berkembang, belum memenuhi kriteria utama:<br/>
                  • Score &gt;55 tapi tidak ada pola spesifik<br/>
                  • Biasanya CPP bullish + di atas MA20
                </div>
                <div className="text-purple-400 font-semibold">⏳ Aksi: MONITOR – setup belum matang</div>
              </div>
            </div>
          </div>

          {/* AVOID patterns */}
          <div>
            <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">❌ HINDARI / Bearish</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-2.5 space-y-1">
                <div className="font-bold text-red-300">🩸 DISTRIBUSI</div>
                <div className="text-gray-300 leading-relaxed">
                  Institusi jual ke publik:<br/>
                  • Candle merah + volume &gt;1.5× rata-rata<br/>
                  • accRatio &lt;0.5 (jual sangat dominan)<br/>
                  • Score dipotong −15 poin
                </div>
                <div className="text-red-400 font-semibold">❌ Aksi: HINDARI – distribusi aktif</div>
              </div>
              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-2.5 space-y-1">
                <div className="font-bold text-orange-300">⚡ UPTHRUST</div>
                <div className="text-gray-300 leading-relaxed">
                  Wyckoff jebakan breakout palsu:<br/>
                  • Spread &gt;1.5× ATR (candle besar)<br/>
                  • Volume &gt;1.5× rata-rata<br/>
                  • Close di bawah 30% dari bawah candle (ekor panjang atas)<br/>
                  • Score dipotong −12 poin
                </div>
                <div className="text-orange-400 font-semibold">❌ Aksi: HINDARI – jebakan bullish</div>
              </div>
            </div>
          </div>

          {/* Score & columns explained */}
          <div className="border-t border-white/10 pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-white/5 rounded-lg p-2.5 space-y-1">
              <div className="text-white font-semibold">📊 Score (0–100)</div>
              <div className="space-y-0.5 text-gray-400">
                <div><span className="text-emerald-400 font-bold">90+</span> = Premium (Sniper + CPP bullish kuat)</div>
                <div><span className="text-blue-400 font-bold">80–89</span> = Good (VCP + pattern kuat)</div>
                <div><span className="text-yellow-400 font-bold">70–79</span> = Decent (pattern ada, CPP ok)</div>
                <div><span className="text-gray-400 font-bold">50–69</span> = Weak (hanya 1 sinyal)</div>
              </div>
              <div className="text-gray-500 text-xs mt-1">Formula: CPP×40% + VSA bonus + RMV bonus − penalty</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2.5 space-y-1">
              <div className="text-white font-semibold">📈 CPP (Power Candle)</div>
              <div className="space-y-0.5 text-gray-400">
                <div><span className="text-emerald-400">BULLISH</span> = CPP &gt; +0.5 (momentum naik 5 hari)</div>
                <div><span className="text-gray-400">NEUTRAL</span> = CPP −0.5 s/d +0.5</div>
                <div><span className="text-red-400">BEARISH</span> = CPP &lt; −0.5 (momentum turun)</div>
              </div>
              <div className="text-gray-500 text-xs mt-1">Weighted sum CBD×VAM 5 hari terakhir</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2.5 space-y-1">
              <div className="text-white font-semibold">🏛️ Wyckoff Phase</div>
              <div className="space-y-0.5 text-gray-400">
                <div><span className="text-emerald-400">MARKUP</span> = Close &gt; MA20 &amp; MA50, MA20&gt;MA50</div>
                <div><span className="text-blue-400">ACCUMULATION</span> = Close dekat MA20 (±5%)</div>
                <div><span className="text-red-400">MARKDOWN</span> = Close &lt; MA20 &amp; MA50</div>
                <div><span className="text-yellow-400">DISTRIBUTION</span> = Close jauh di bawah MA</div>
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-2.5 space-y-1">
              <div className="text-white font-semibold">📉 RMV Index</div>
              <div className="space-y-0.5 text-gray-400">
                <div><span className="text-blue-400 font-bold">RMV ≤ 15</span> = Kompresi ekstrem → pivot siap</div>
                <div><span className="text-cyan-400">RMV ≤ 30</span> = Kontraksi kuat → +12 score</div>
                <div><span className="text-yellow-400">RMV ≤ 50</span> = Kontraksi sedang → +6 score</div>
                <div><span className="text-gray-400">RMV &gt; 50</span> = Volatilitas normal, belum ketat</div>
              </div>
              <div className="text-gray-500 text-xs mt-1">ATR5 dinormalisasi 20 bar = 0–100</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



