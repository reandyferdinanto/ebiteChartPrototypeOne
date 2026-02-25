# Quick Start Guide - Ebite Chart

## ✅ What Has Been Created

### 1. **API Routes** (Backend)
Located in `app/api/stock/`:

- **`quote/route.ts`** - Get real-time stock quotes
  - Endpoint: `GET /api/stock/quote?symbol=BBCA.JK`
  - Returns: Price, change, volume, market cap, etc.

- **`historical/route.ts`** - Get historical stock data
  - Endpoint: `GET /api/stock/historical?symbol=BBCA.JK&interval=1d`
  - Returns: OHLCV (Open, High, Low, Close, Volume) data for charting
  - Supports intervals: 1d, 1wk, 1mo

- **`screener/route.ts`** - Stock screening for Indonesian stocks
  - Endpoint: `GET /api/stock/screener?filter=all`
  - Filters: all, gainers, losers, active
  - Returns: 20 popular Indonesian stocks with metrics

### 2. **Components** (Frontend)
Located in `components/`:

- **`StockChart.tsx`** - TradingView-like chart component
  - Uses lightweight-charts library
  - Supports Candlestick and Line charts
  - Volume indicators
  - Interactive and responsive

- **`StockInfo.tsx`** - Stock information display
  - Shows price, change, volume, market cap
  - Color-coded gains/losses
  - Formatted Indonesian Rupiah (IDR)

### 3. **Pages**
Located in `app/`:

- **`page.tsx`** - Main chart page
  - Search any Indonesian stock
  - Quick access to popular stocks (BBCA, BBRI, BMRI, etc.)
  - Time interval selector (Daily, Weekly, Monthly)
  - Real-time updates

- **`screener/page.tsx`** - Stock screener
  - Table view of all stocks
  - Filter by top gainers/losers/most active
  - Click to view detailed charts
  - Sortable columns

## 📦 Architecture: Next.js (Recommended)

**You asked: Should I use Next.js or split Node.js + React?**

✅ **I chose Next.js** because:

1. **Unified Codebase** - Frontend + Backend in one project
2. **Built-in API Routes** - No need for separate Express server
3. **Server-Side Rendering** - Better for data-heavy charts
4. **Easy Deployment** - Deploy to Vercel with one click
5. **Type Safety** - Full TypeScript support across stack

### Project Structure:
```
ebite-chart/
├── app/
│   ├── api/                    ← Backend (API Routes)
│   │   └── stock/
│   │       ├── quote/route.ts
│   │       ├── historical/route.ts
│   │       └── screener/route.ts
│   ├── page.tsx                ← Frontend (Home/Chart)
│   └── screener/page.tsx       ← Frontend (Screener)
└── components/                  ← Reusable UI Components
    ├── StockChart.tsx
    └── StockInfo.tsx
```

## 🚀 How to Run

### Prerequisites:
- Node.js >= 20.9.0 (⚠️ You currently have 20.0.0)
- npm or yarn

### Steps:

1. **Update Node.js** (if needed):
   - Download from: https://nodejs.org/
   - Or use nvm: `nvm install 20.9.0`

2. **Navigate to project**:
   ```bash
   cd "C:\reandy\Ebite Chart\ebite-chart"
   ```

3. **Install dependencies** (if not done):
   ```bash
   npm install
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

5. **Open browser**:
   - Visit: http://localhost:3000
   - Chart page: http://localhost:3000
   - Screener: http://localhost:3000/screener

## 🎯 How to Use the API

### Example 1: Get Stock Quote
```bash
curl http://localhost:3000/api/stock/quote?symbol=BBCA.JK
```

### Example 2: Get Historical Data
```bash
curl "http://localhost:3000/api/stock/historical?symbol=TLKM.JK&interval=1d"
```

### Example 3: Get Stock Screener
```bash
curl "http://localhost:3000/api/stock/screener?filter=gainers"
```

### From JavaScript/TypeScript:
```javascript
// Fetch stock quote
const response = await fetch('/api/stock/quote?symbol=BBCA.JK');
const data = await response.json();
console.log(data.price, data.changePercent);

// Fetch historical data
const histRes = await fetch('/api/stock/historical?symbol=BBRI.JK&interval=1d');
const histData = await histRes.json();
console.log(histData.data); // Array of OHLCV data
```

## 📊 Indonesian Stock Symbols

All use `.JK` suffix (Jakarta Stock Exchange):

**Banking:**
- BBCA.JK - Bank Central Asia
- BBRI.JK - Bank Rakyat Indonesia
- BMRI.JK - Bank Mandiri

**Telecommunications:**
- TLKM.JK - Telkom Indonesia
- EXCL.JK - XL Axiata

**Consumer Goods:**
- UNVR.JK - Unilever Indonesia
- ICBP.JK - Indofood CBP
- INDF.JK - Indofood

**Automotive:**
- ASII.JK - Astra International
- UNTR.JK - United Tractors

**And 10+ more in the screener!**

## 🛠️ Technology Stack

| Technology | Purpose |
|------------|---------|
| Next.js 16 | Full-stack framework |
| TypeScript | Type safety |
| lightweight-charts | TradingView charting |
| yahoo-finance2 | Stock data API |
| Tailwind CSS | Styling |
| date-fns | Date utilities |

## 📝 Key Features

✅ Real-time stock quotes from Yahoo Finance
✅ TradingView-style candlestick charts
✅ Volume indicators
✅ Multiple timeframes (Daily, Weekly, Monthly)
✅ Stock screener with filters
✅ Indonesian Stock Exchange (IDX) support
✅ Responsive design
✅ Type-safe API
✅ Easy to extend

## 🔧 Next Steps

1. **Update Node.js** to >= 20.9.0
2. **Run `npm run dev`**
3. **Open http://localhost:3000**
4. **Search for stocks** like BBCA.JK, TLKM.JK
5. **Try the screener** at /screener

## 📚 Documentation

- **README.md** - Full project documentation
- **API_USAGE.md** - Detailed API examples with Python, cURL, React hooks

## 🎨 Customization Ideas

- Add more technical indicators (RSI, MACD, Bollinger Bands)
- Implement WebSocket for real-time updates
- Add user watchlists (save favorite stocks)
- Export charts as images
- Add price alerts
- Integration with broker APIs for trading

## ⚠️ Important Notes

- Yahoo Finance API may have rate limits
- Consider caching for production use
- Market data may be delayed
- Indonesian market hours: 09:00-16:00 WIB

## 🎉 You're Ready!

Your API is complete and ready to consume Yahoo Finance data. Just update Node.js and run `npm run dev` to see it in action!

