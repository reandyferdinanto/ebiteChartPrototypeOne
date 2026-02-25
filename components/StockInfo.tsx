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
    <div className="bg-gray-800 rounded-lg p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold text-white">{symbol}</h1>
          <p className="text-gray-400">{name}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-white">
            {currency} {formatNumber(price)}
          </div>
          <div
            className={`text-lg font-semibold ${
              isPositive ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {isPositive ? '+' : ''}
            {formatNumber(change)} ({isPositive ? '+' : ''}
            {formatNumber(changePercent, 2)}%)
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <div className="text-gray-400 text-sm">Open</div>
          <div className="text-white font-semibold">{formatNumber(open)}</div>
        </div>
        <div>
          <div className="text-gray-400 text-sm">High</div>
          <div className="text-white font-semibold">{formatNumber(high)}</div>
        </div>
        <div>
          <div className="text-gray-400 text-sm">Low</div>
          <div className="text-white font-semibold">{formatNumber(low)}</div>
        </div>
        <div>
          <div className="text-gray-400 text-sm">Prev Close</div>
          <div className="text-white font-semibold">{formatNumber(previousClose)}</div>
        </div>
        <div>
          <div className="text-gray-400 text-sm">Volume</div>
          <div className="text-white font-semibold">{formatLargeNumber(volume)}</div>
        </div>
        {marketCap && (
          <div>
            <div className="text-gray-400 text-sm">Market Cap</div>
            <div className="text-white font-semibold">
              {currency} {formatLargeNumber(marketCap)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

