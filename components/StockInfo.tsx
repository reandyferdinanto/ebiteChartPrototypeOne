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
  symbol, name, price, change, changePercent,
  volume, marketCap, high, low, open, previousClose, currency = 'IDR',
}: StockInfoProps) {
  const isPos = change >= 0;

  const fmt = (n: number, d = 2) =>
    new Intl.NumberFormat('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);

  const fmtBig = (n: number) => {
    if (n >= 1e12) return `${fmt(n / 1e12, 2)}T`;
    if (n >= 1e9)  return `${fmt(n / 1e9,  2)}B`;
    if (n >= 1e6)  return `${fmt(n / 1e6,  2)}M`;
    return fmt(n, 0);
  };

  // SVG icon components (futuristic / tech)
  const IconTrend = ({ up }: { up: boolean }) => (
    <svg className={`w-3.5 h-3.5 ${up ? 'text-emerald-400' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {up
        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
        : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
      }
    </svg>
  );

  const stats = [
    {
      label: 'Open',
      value: fmt(open),
      color: 'text-gray-200',
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'High',
      value: fmt(high),
      color: 'text-emerald-400',
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
        </svg>
      ),
    },
    {
      label: 'Low',
      value: fmt(low),
      color: 'text-red-400',
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      ),
    },
    {
      label: 'Prev',
      value: fmt(previousClose),
      color: 'text-gray-300',
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
        </svg>
      ),
    },
    {
      label: 'Vol',
      value: fmtBig(volume),
      color: 'text-sky-400',
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    ...(marketCap ? [{
      label: 'Mkt Cap',
      value: `${fmtBig(marketCap)}`,
      color: 'text-violet-400',
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    }] : []),
  ];

  return (
    <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-xl shadow-xl px-3 py-2.5">
      {/* ── Top row: symbol + name + price + change ── */}
      <div className="flex items-center justify-between gap-2 mb-2">
        {/* Left: ticker + name */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Compact tech icon badge */}
          <div className="w-7 h-7 flex-shrink-0 rounded-lg bg-gradient-to-br from-blue-500/80 to-purple-600/80 flex items-center justify-center shadow-md">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white leading-tight truncate">
              {symbol.replace('.JK', '')}
            </div>
            <div className="text-xs text-gray-400 leading-tight truncate max-w-[140px] sm:max-w-none">
              {name}
            </div>
          </div>
        </div>

        {/* Right: price + change */}
        <div className="text-right flex-shrink-0">
          <div className="text-base font-bold text-white leading-tight">
            {fmt(price)}
          </div>
          <div className={`flex items-center justify-end gap-0.5 text-xs font-semibold ${isPos ? 'text-emerald-400' : 'text-red-400'}`}>
            <IconTrend up={isPos} />
            <span>{isPos ? '+' : ''}{fmt(change)}</span>
            <span className="opacity-80">({isPos ? '+' : ''}{fmt(changePercent, 2)}%)</span>
          </div>
        </div>
      </div>

      {/* ── Stats grid: 3 cols on mobile, 6 cols on md ── */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-1">
        {stats.map((s) => (
          <div key={s.label} className="backdrop-blur-md bg-white/[0.03] border border-white/[0.07] rounded-lg px-2 py-1.5">
            <div className={`flex items-center gap-1 mb-0.5 ${s.color} opacity-60`}>
              {s.icon}
              <span className="text-[10px] font-medium tracking-wide uppercase">{s.label}</span>
            </div>
            <div className={`text-xs font-bold ${s.color} leading-tight`}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
