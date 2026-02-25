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
  isVCP: boolean;
  isDryUp: boolean;
  isIceberg: boolean;
  isSniperEntry: boolean;
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
                  <th className="text-left py-2 md:py-3 px-2 md:px-3 text-gray-400 hidden lg:table-cell">Pattern</th>
                  <th className="text-left py-2 md:py-3 px-2 md:px-3 text-gray-400 hidden lg:table-cell">Action</th>
                  <th className="text-center py-2 md:py-3 px-2 md:px-3 text-gray-400">Chart</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-800 hover:bg-gray-800/50 transition"
                  >
                    <td className="py-2 md:py-3 px-2 md:px-3 font-semibold text-white">
                      {candidate.symbol}
                    </td>
                    <td className="py-2 md:py-3 px-2 md:px-3 text-right text-white">
                      <div className="text-xs md:text-sm">
                        Rp {candidate.price.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                      </div>
                    </td>
                    <td className="py-2 md:py-3 px-2 md:px-3 text-right">
                      <span
                        className={`text-xs md:text-sm ${
                          candidate.change >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {candidate.change >= 0 ? '+' : ''}
                        {candidate.changePercent.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-2 md:py-3 px-2 md:px-3 text-right text-gray-300 hidden sm:table-cell">
                      <div className="text-xs md:text-sm">
                        {(candidate.volume / 1000000).toFixed(1)}M
                      </div>
                    </td>
                    <td className="py-2 md:py-3 px-2 md:px-3 text-center">
                      <span
                        className={`px-2 md:px-3 py-1 rounded font-bold text-xs md:text-sm ${
                          candidate.vpcScore >= 90
                            ? 'bg-green-900 text-green-200'
                            : candidate.vpcScore >= 80
                            ? 'bg-blue-900 text-blue-200'
                            : candidate.vpcScore >= 70
                            ? 'bg-yellow-900 text-yellow-200'
                            : 'bg-gray-700 text-gray-300'
                        }`}
                      >
                        {candidate.vpcScore}
                      </span>
                    </td>
                    <td className="py-2 md:py-3 px-2 md:px-3 text-xs md:text-sm text-gray-300 hidden lg:table-cell">
                      {candidate.pattern}
                    </td>
                    <td className="py-2 md:py-3 px-2 md:px-3 text-xs md:text-sm hidden lg:table-cell">
                      <span
                        className={`${
                          candidate.recommendation.includes('STRONG')
                            ? 'text-green-400 font-bold'
                            : candidate.recommendation.includes('BUY')
                            ? 'text-green-300'
                            : candidate.recommendation.includes('ENTRY')
                            ? 'text-yellow-300'
                            : 'text-blue-300'
                        }`}
                      >
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
    <div className="min-h-screen bg-gray-900 text-white">
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
              href="/manual-screener"
              className="bg-yellow-700 hover:bg-yellow-600 px-3 md:px-4 py-2 rounded transition text-xs md:text-sm text-center"
            >
              🔬 Manual Test
            </Link>
            <Link
              href="/"
              className="bg-gray-700 hover:bg-gray-600 px-3 md:px-4 py-2 rounded transition text-xs md:text-sm text-center"
            >
              ← Back to Chart
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
        <div className="bg-gray-800 border border-gray-700 rounded p-3 md:p-4 space-y-3 md:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 items-end">
            <label className="text-xs md:text-sm text-gray-300">
              Filter:
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'liquid')}
                className="mt-1 w-full bg-gray-700 border border-gray-600 rounded px-2 md:px-3 py-2 text-xs md:text-sm text-white"
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
                className="mt-1 w-full bg-gray-700 border border-gray-600 rounded px-2 md:px-3 py-2 text-xs md:text-sm text-white"
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
                className="mt-1 w-full bg-gray-700 border border-gray-600 rounded px-2 md:px-3 py-2 text-xs md:text-sm text-white"
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
          <div className="bg-gray-900 border border-gray-700 rounded p-3">
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
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🎯 Sniper ({results?.sniperCount || 0})
          </button>
          <button
            onClick={() => setActiveTab('vcp')}
            className={`px-3 md:px-4 py-2 rounded font-semibold transition text-xs md:text-sm ${
              activeTab === 'vcp'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            📉 VCP ({results?.vcpCount || 0})
          </button>
          <button
            onClick={() => setActiveTab('dryup')}
            className={`px-3 md:px-4 py-2 rounded font-semibold transition text-xs md:text-sm ${
              activeTab === 'dryup'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🥷 Dry Up ({results?.dryUpCount || 0})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 md:px-4 py-2 rounded font-semibold transition text-xs md:text-sm ${
              activeTab === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
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

        {/* Legend */}
        <div className="bg-gray-800 border border-gray-700 rounded p-3 md:p-4">
          <h3 className="font-semibold mb-3 text-sm md:text-base">📖 Pattern Guide</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs md:text-sm">
            <div>
              <span className="font-semibold text-red-300">🎯 Sniper Entry</span>
              <p className="text-gray-400">VCP base + dry up = Perfect sniper entry point</p>
            </div>
            <div>
              <span className="font-semibold text-blue-300">📉 VCP Base</span>
              <p className="text-gray-400">Low volatility & volume near 52-week high</p>
            </div>
            <div>
              <span className="font-semibold text-yellow-300">🥷 Dry Up</span>
              <p className="text-gray-400">Low volume support test. Institutional accumulation</p>
            </div>
            <div>
              <span className="font-semibold text-green-300">🧊 Iceberg</span>
              <p className="text-gray-400">High volume but low spread. Hidden buying activity</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


