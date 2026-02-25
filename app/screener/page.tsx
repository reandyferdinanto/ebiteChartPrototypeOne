'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  pe?: number;
  high: number;
  low: number;
}

export default function ScreenerPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchScreenerData(filter);
  }, [filter]);

  const fetchScreenerData = async (filterType: string) => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/stock/screener?filter=${filterType}`);
      if (!res.ok) throw new Error('Failed to fetch screener data');
      const data = await res.json();
      setStocks(data.stocks);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number, decimals = 2) => {
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  const formatLargeNumber = (num: number) => {
    if (num >= 1e12) return `${formatNumber(num / 1e12, 2)}T`;
    if (num >= 1e9) return `${formatNumber(num / 1e9, 2)}B`;
    if (num >= 1e6) return `${formatNumber(num / 1e6, 2)}M`;
    return formatNumber(num, 0);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <nav className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">Stock Screener - Indonesian Stocks</h1>
          <Link
            href="/"
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Back to Chart
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        {/* Filter Buttons */}
        <div className="mb-6 flex gap-2">
          {[
            { value: 'all', label: 'All Stocks' },
            { value: 'gainers', label: 'Top Gainers' },
            { value: 'losers', label: 'Top Losers' },
            { value: 'active', label: 'Most Active' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded ${
                filter === f.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="text-xl">Loading stock data...</div>
            <div className="text-gray-400 mt-2">
              Fetching data from Yahoo Finance API...
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Symbol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Change
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Change %
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Volume
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Market Cap
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                      P/E
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {stocks.map((stock) => (
                    <tr key={stock.symbol} className="hover:bg-gray-750">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">
                          {stock.symbol}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{stock.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-white">
                          {formatNumber(stock.price)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div
                          className={`text-sm font-medium ${
                            stock.change >= 0 ? 'text-green-500' : 'text-red-500'
                          }`}
                        >
                          {stock.change >= 0 ? '+' : ''}
                          {formatNumber(stock.change)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div
                          className={`text-sm font-medium ${
                            stock.changePercent >= 0
                              ? 'text-green-500'
                              : 'text-red-500'
                          }`}
                        >
                          {stock.changePercent >= 0 ? '+' : ''}
                          {formatNumber(stock.changePercent, 2)}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-300">
                          {formatLargeNumber(stock.volume)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-300">
                          {stock.marketCap
                            ? formatLargeNumber(stock.marketCap)
                            : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-300">
                          {stock.pe ? formatNumber(stock.pe, 2) : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <Link
                          href={`/?symbol=${stock.symbol}`}
                          className="text-blue-500 hover:text-blue-400 text-sm"
                        >
                          View Chart
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {stocks.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                No stocks found
              </div>
            )}
          </div>
        )}

        <div className="mt-6 text-gray-400 text-sm">
          <p>
            Showing {stocks.length} stocks from Indonesia Stock Exchange (IDX)
          </p>
          <p className="mt-2">
            Data provided by Yahoo Finance API. Market data may be delayed.
          </p>
        </div>
      </div>
    </div>
  );
}

