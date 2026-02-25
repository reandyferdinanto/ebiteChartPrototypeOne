# Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           EBITE CHART                                │
│                    (Next.js Full-Stack Application)                  │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                ┌────────────────┴────────────────┐
                │                                  │
       ┌────────▼─────────┐            ┌─────────▼──────────┐
       │     FRONTEND      │            │      BACKEND       │
       │   (React/Next)    │◄───────────┤   (API Routes)     │
       └───────────────────┘            └────────────────────┘
                │                                  │
                │                                  │
    ┌───────────┴──────────┐           ┌──────────▼──────────┐
    │                      │           │                      │
┌───▼────┐          ┌─────▼─────┐ ┌───▼────────┐    ┌──────▼──────┐
│ Home   │          │ Screener  │ │   Quote    │    │ Historical  │
│ Page   │          │   Page    │ │    API     │    │     API     │
└────────┘          └───────────┘ └────────────┘    └─────────────┘
    │                      │           │                      │
    │                      │           └──────────┬───────────┘
    │                      │                      │
┌───▼──────────────────────▼────┐     ┌──────────▼──────────────┐
│        COMPONENTS             │     │     Screener API         │
│  - StockChart (TradingView)   │     └──────────┬──────────────┘
│  - StockInfo                  │                │
└───────────────────────────────┘                │
                                         ┌───────▼────────────┐
                                         │  Yahoo Finance 2   │
                                         │    (npm package)   │
                                         └─────────┬──────────┘
                                                   │
                                         ┌─────────▼──────────┐
                                         │  Yahoo Finance API │
                                         │   (External API)   │
                                         └────────────────────┘
```

## Data Flow

### 1. Stock Quote Request Flow
```
User Action → Frontend (page.tsx)
    ↓
    Fetch Request: /api/stock/quote?symbol=BBCA.JK
    ↓
Backend (quote/route.ts)
    ↓
yahoo-finance2.quote()
    ↓
Yahoo Finance API
    ↓
Response: Stock Data (JSON)
    ↓
StockInfo Component (Display)
```

### 2. Chart Data Flow
```
User Selects Interval → Frontend
    ↓
    Fetch Request: /api/stock/historical?symbol=BBCA.JK&interval=1d
    ↓
Backend (historical/route.ts)
    ↓
yahoo-finance2.historical()
    ↓
Yahoo Finance API
    ↓
Transform to lightweight-charts format
    ↓
Response: OHLCV Data Array
    ↓
StockChart Component → lightweight-charts Library
    ↓
Rendered Candlestick/Line Chart
```

### 3. Stock Screener Flow
```
User Clicks Filter → Frontend (screener/page.tsx)
    ↓
    Fetch Request: /api/stock/screener?filter=gainers
    ↓
Backend (screener/route.ts)
    ↓
Loop through 20 Indonesian stocks
    ↓
Parallel Requests: yahoo-finance2.quote() for each
    ↓
Yahoo Finance API (Multiple calls)
    ↓
Filter & Sort Results
    ↓
Response: Array of Stock Objects
    ↓
Table Component (Display)
```

## Component Hierarchy

```
App (layout.tsx)
│
├─ Home Page (page.tsx) 'use client'
│  ├─ Navigation Bar
│  ├─ Search Input
│  ├─ Popular Stocks Buttons
│  ├─ Interval Selector
│  ├─ StockInfo Component
│  │  └─ Price, Change, Volume, Market Cap
│  └─ StockChart Component
│     ├─ Chart Type Toggle
│     ├─ Candlestick Series
│     ├─ Line Series
│     └─ Volume Histogram
│
└─ Screener Page (screener/page.tsx) 'use client'
   ├─ Navigation Bar
   ├─ Filter Buttons
   └─ Stock Table
      ├─ Symbol, Name, Price
      ├─ Change, Change %
      ├─ Volume, Market Cap, P/E
      └─ View Chart Link
```

## API Architecture

### Endpoint Structure
```
app/api/stock/
├── quote/
│   └── route.ts          → GET /api/stock/quote
│       Input: symbol (query param)
│       Output: Stock quote object
│
├── historical/
│   └── route.ts          → GET /api/stock/historical
│       Input: symbol, interval, period1, period2
│       Output: Array of OHLCV data
│
└── screener/
    └── route.ts          → GET /api/stock/screener
        Input: filter (all/gainers/losers/active)
        Output: Array of stock objects
```

### API Response Format

**Quote Response:**
```typescript
{
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
```

**Historical Response:**
```typescript
{
  symbol: string;
  data: Array<{
    time: number;        // Unix timestamp
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  }>;
}
```

**Screener Response:**
```typescript
{
  stocks: Array<{
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
  }>;
  total: number;
}
```

## Technology Stack Layers

```
┌─────────────────────────────────────────────┐
│          PRESENTATION LAYER                 │
│  - React Components                         │
│  - Tailwind CSS                            │
│  - lightweight-charts                       │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│          APPLICATION LAYER                  │
│  - Next.js App Router                       │
│  - Client-side State Management             │
│  - API Route Handlers                       │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│          INTEGRATION LAYER                  │
│  - yahoo-finance2 (Node.js client)          │
│  - axios (HTTP client)                      │
│  - date-fns (Date utilities)                │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│          EXTERNAL SERVICES                  │
│  - Yahoo Finance API                        │
│  - Indonesian Stock Exchange (IDX) Data     │
└─────────────────────────────────────────────┘
```

## Deployment Architecture

### Development
```
Local Machine
    ↓
npm run dev (localhost:3000)
    ↓
Next.js Dev Server
    ↓
Hot Module Replacement
```

### Production
```
Git Repository
    ↓
Vercel (or any host)
    ↓
Build: npm run build
    ↓
Optimized Static + Server Components
    ↓
CDN + Edge Functions
    ↓
Users Worldwide
```

## State Management

```
┌─────────────────────────────────────┐
│         React useState              │
│                                     │
│  - symbol (current stock)           │
│  - inputSymbol (search input)       │
│  - chartData (OHLCV array)          │
│  - stockQuote (quote object)        │
│  - loading (boolean)                │
│  - error (string)                   │
│  - interval (1d/1wk/1mo)            │
│  - chartType (candlestick/line)     │
└─────────────────────────────────────┘
```

## Why Next.js? (vs Node.js + React)

### Next.js (Chosen) ✅
```
Single Project
    │
    ├─ app/ (Frontend + Backend)
    │  ├─ page.tsx (React)
    │  └─ api/ (Node.js)
    │
    Pros:
    + Unified codebase
    + Built-in API routes
    + Easy deployment
    + SSR/SSG support
    + Type safety across stack
```

### Split Architecture (Not Chosen) ❌
```
Two Projects
    │
    ├─ frontend/ (React)
    │  └─ src/components/
    │
    └─ backend/ (Node.js/Express)
       └─ routes/
    
    Cons:
    - Two deployments
    - CORS configuration
    - Duplicate types
    - More complex
```

## Security Considerations

1. **API Rate Limiting** - Prevent abuse
2. **Input Validation** - Sanitize stock symbols
3. **Error Handling** - Don't expose internal errors
4. **CORS** - Configure for production domain
5. **Environment Variables** - Sensitive config

## Performance Optimization

1. **Caching Strategy**
   - Cache quote data: 30-60 seconds
   - Cache historical data: 5 minutes
   - Cache screener data: 1 minute

2. **Code Splitting**
   - lightweight-charts loaded on-demand
   - Lazy load screener page

3. **API Optimization**
   - Batch requests when possible
   - Compress responses
   - Use HTTP/2

## Scalability

**Current:** Single instance, no caching
**Next Steps:**
1. Add Redis for caching
2. Implement rate limiting
3. Add database for user data
4. Use WebSockets for real-time updates
5. Implement CDN for static assets

