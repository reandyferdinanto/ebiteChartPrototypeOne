'use client';

interface StockInfoProps {
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

export default function StockInfo({
  symbol,
  name,
  price,
  change,
  changePercent,
  volume,
  marketCap,
  high,
  low,
  open,
  previousClose,
  currency = 'IDR',
}: StockInfoProps) {
  const isPositive = change >= 0;

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
    <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl p-4 md:p-6 shadow-2xl">
      <div className="flex flex-col md:flex-row items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {symbol}
            </h1>
            <p className="text-gray-400 text-sm">{name}</p>
          </div>
        </div>
        <div className="text-left md:text-right">
          <div className="text-2xl md:text-3xl font-bold text-white">
            {currency} {formatNumber(price)}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {isPositive ? (
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17H5m0 0V9m0 8l8-8 4 4 6-6" />
              </svg>
            )}
            <span
              className={`text-lg font-semibold ${
                isPositive ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {isPositive ? '+' : ''}
              {formatNumber(change)} ({isPositive ? '+' : ''}
              {formatNumber(changePercent, 2)}%)
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="backdrop-blur-md bg-black/30 border border-white/10 rounded-xl p-3">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Open</span>
          </div>
          <div className="text-white font-semibold">{formatNumber(open)}</div>
        </div>
        <div className="backdrop-blur-md bg-black/30 border border-white/10 rounded-xl p-3">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span>High</span>
          </div>
          <div className="text-green-400 font-semibold">{formatNumber(high)}</div>
        </div>
        <div className="backdrop-blur-md bg-black/30 border border-white/10 rounded-xl p-3">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17H5m0 0V9m0 8l8-8 4 4 6-6" />
            </svg>
            <span>Low</span>
          </div>
          <div className="text-red-400 font-semibold">{formatNumber(low)}</div>
        </div>
        <div className="backdrop-blur-md bg-black/30 border border-white/10 rounded-xl p-3">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Prev Close</span>
          </div>
          <div className="text-white font-semibold">{formatNumber(previousClose)}</div>
        </div>
        <div className="backdrop-blur-md bg-black/30 border border-white/10 rounded-xl p-3">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Volume</span>
          </div>
          <div className="text-blue-400 font-semibold">{formatLargeNumber(volume)}</div>
        </div>
        {marketCap && (
          <div className="backdrop-blur-md bg-black/30 border border-white/10 rounded-xl p-3">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Market Cap</span>
            </div>
            <div className="text-purple-400 font-semibold">
              {currency} {formatLargeNumber(marketCap)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
