# Ebite Chart - Indonesian Stock Market Charting & Screening

A Next.js application that provides TradingView-like charting and stock screening for Indonesian stocks (IDX - Indonesia Stock Exchange) using Yahoo Finance API.

## Features

✅ **Real-time Stock Charts**
- Candlestick and Line chart types
- Volume indicators
- Interactive charting with lightweight-charts (by TradingView)
- Multiple time intervals (Daily, Weekly, Monthly)

✅ **Stock Screener**
- View all Indonesian stocks
- Filter by Top Gainers, Top Losers, Most Active
- Display key metrics: Price, Change %, Volume, Market Cap, P/E Ratio

✅ **Yahoo Finance Integration**
- Real-time stock quotes
- Historical data
- Indonesian Stock Exchange (IDX) support

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Charting**: lightweight-charts (TradingView)
- **Data Source**: Yahoo Finance API (via yahoo-finance2)
- **Styling**: Tailwind CSS
- **Utilities**: axios, date-fns

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Routes

### 1. Get Stock Quote
```
GET /api/stock/quote?symbol=BBCA.JK
```

**Response:**
```json
{
  "symbol": "BBCA.JK",
  "name": "Bank Central Asia Tbk PT",
  "price": 9175,
  "change": 75,
  "changePercent": 0.82,
  "volume": 15234500,
  "marketCap": 1125000000000,
  "high": 9200,
  "low": 9100,
  "open": 9150,
  "previousClose": 9100,
  "currency": "IDR"
}
```

### 2. Get Historical Data
```
GET /api/stock/historical?symbol=BBCA.JK&interval=1d
```

**Query Parameters:**
- `symbol` (required): Stock symbol (e.g., BBCA.JK)
- `interval` (optional): 1d, 1wk, 1mo (default: 1d)
- `period1` (optional): Start date (YYYY-MM-DD)
- `period2` (optional): End date (YYYY-MM-DD)

**Response:**
```json
{
  "symbol": "BBCA.JK",
  "data": [
    {
      "time": 1704067200,
      "open": 9150,
      "high": 9200,
      "low": 9100,
      "close": 9175,
      "volume": 15234500
    }
  ]
}
```

### 3. Stock Screener
```
GET /api/stock/screener?filter=all
```

**Query Parameters:**
- `filter` (optional): all, gainers, losers, active (default: all)

**Response:**
```json
{
  "stocks": [
    {
      "symbol": "BBCA.JK",
      "name": "Bank Central Asia Tbk PT",
      "price": 9175,
      "change": 75,
      "changePercent": 0.82,
      "volume": 15234500,
      "marketCap": 1125000000000,
      "pe": 15.5,
      "high": 9200,
      "low": 9100
    }
  ],
  "total": 20
}
```

## Indonesian Stock Symbols

All Indonesian stocks use the `.JK` suffix (Jakarta Stock Exchange). Examples:

- **Banking**: BBCA.JK, BBRI.JK, BMRI.JK
- **Telecommunications**: TLKM.JK, EXCL.JK
- **Consumer Goods**: UNVR.JK, ICBP.JK, INDF.JK
- **Automotive**: ASII.JK, UNTR.JK
- **Tobacco**: GGRM.JK, HMSP.JK
- **Pharmaceuticals**: KLBF.JK
- **Mining**: ADRO.JK, ITMG.JK, PTBA.JK
- **Energy**: PGAS.JK
- **Agriculture**: CPIN.JK

## Project Structure

```
ebite-chart/
├── app/
│   ├── api/
│   │   └── stock/
│   │       ├── quote/route.ts       # Get stock quote
│   │       ├── historical/route.ts  # Get historical data
│   │       └── screener/route.ts    # Get screener data
│   ├── screener/
│   │   └── page.tsx                 # Stock screener page
│   ├── layout.tsx                   # Root layout
│   └── page.tsx                     # Home page (chart view)
├── components/
│   ├── StockChart.tsx               # Chart component
│   └── StockInfo.tsx                # Stock info display
└── package.json
```

## Important Notes

- Yahoo Finance API may have rate limits
- Market data may be delayed
- For production use, consider implementing caching
- Indonesian stocks trade in IDR (Indonesian Rupiah)
- Market hours: 09:00 - 16:00 WIB (GMT+7)

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
