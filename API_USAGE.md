# API Usage Examples

This document shows how to consume the Ebite Chart API endpoints.

## Using the API from External Applications

### Example 1: Fetch Stock Quote with JavaScript/Node.js

```javascript
// Using fetch (browser or Node.js with node-fetch)
async function getStockQuote(symbol) {
  const response = await fetch(`http://localhost:3000/api/stock/quote?symbol=${symbol}`);
  const data = await response.json();
  
  console.log(`${data.name} (${data.symbol})`);
  console.log(`Price: ${data.currency} ${data.price}`);
  console.log(`Change: ${data.change} (${data.changePercent}%)`);
  
  return data;
}

// Usage
getStockQuote('BBCA.JK');
```

### Example 2: Fetch Historical Data with Axios

```javascript
const axios = require('axios');

async function getHistoricalData(symbol, interval = '1d') {
  try {
    const response = await axios.get('http://localhost:3000/api/stock/historical', {
      params: {
        symbol: symbol,
        interval: interval
      }
    });
    
    const { data } = response.data;
    
    // Process candlestick data
    data.forEach(candle => {
      console.log(`Date: ${new Date(candle.time * 1000).toISOString()}`);
      console.log(`Open: ${candle.open}, High: ${candle.high}, Low: ${candle.low}, Close: ${candle.close}`);
      console.log(`Volume: ${candle.volume}`);
    });
    
    return data;
  } catch (error) {
    console.error('Error fetching historical data:', error.message);
  }
}

// Usage
getHistoricalData('TLKM.JK', '1d');
```

### Example 3: Stock Screener with Python

```python
import requests
import pandas as pd

def get_stock_screener(filter_type='all'):
    url = f'http://localhost:3000/api/stock/screener?filter={filter_type}'
    response = requests.get(url)
    data = response.json()
    
    # Convert to pandas DataFrame
    df = pd.DataFrame(data['stocks'])
    
    # Display top 10 stocks
    print(df[['symbol', 'name', 'price', 'changePercent', 'volume']].head(10))
    
    return df

# Usage - Get top gainers
gainers = get_stock_screener('gainers')
```

### Example 4: Using cURL

```bash
# Get stock quote
curl "http://localhost:3000/api/stock/quote?symbol=BBRI.JK"

# Get historical data
curl "http://localhost:3000/api/stock/historical?symbol=BMRI.JK&interval=1wk"

# Get stock screener - top gainers
curl "http://localhost:3000/api/stock/screener?filter=gainers"
```

### Example 5: React Hook for Stock Data

```javascript
import { useState, useEffect } from 'react';

function useStockData(symbol) {
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch quote
        const quoteRes = await fetch(`/api/stock/quote?symbol=${symbol}`);
        const quote = await quoteRes.json();
        
        // Fetch historical data
        const histRes = await fetch(`/api/stock/historical?symbol=${symbol}&interval=1d`);
        const historical = await histRes.json();
        
        setStockData({
          quote,
          historical: historical.data
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [symbol]);

  return { stockData, loading, error };
}

// Usage in a component
function StockDisplay({ symbol }) {
  const { stockData, loading, error } = useStockData(symbol);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <h2>{stockData.quote.name}</h2>
      <p>Price: {stockData.quote.price}</p>
      <p>Change: {stockData.quote.changePercent}%</p>
    </div>
  );
}
```

### Example 6: Building a Custom Trading Bot

```javascript
// Simple trading signal detector
async function detectTradingSignals(symbol) {
  const response = await fetch(
    `http://localhost:3000/api/stock/historical?symbol=${symbol}&interval=1d`
  );
  const { data } = await response.json();
  
  // Calculate simple moving average (SMA)
  const calculateSMA = (data, period) => {
    const closes = data.slice(-period).map(d => d.close);
    return closes.reduce((a, b) => a + b, 0) / period;
  };
  
  const sma20 = calculateSMA(data, 20);
  const sma50 = calculateSMA(data, 50);
  const currentPrice = data[data.length - 1].close;
  
  console.log(`${symbol} Analysis:`);
  console.log(`Current Price: ${currentPrice}`);
  console.log(`SMA(20): ${sma20.toFixed(2)}`);
  console.log(`SMA(50): ${sma50.toFixed(2)}`);
  
  // Generate signal
  if (sma20 > sma50 && currentPrice > sma20) {
    console.log('Signal: BUY ✅');
  } else if (sma20 < sma50 && currentPrice < sma20) {
    console.log('Signal: SELL ❌');
  } else {
    console.log('Signal: HOLD ⏸️');
  }
}

// Analyze multiple stocks
const stocks = ['BBCA.JK', 'BBRI.JK', 'BMRI.JK', 'TLKM.JK', 'ASII.JK'];
stocks.forEach(stock => detectTradingSignals(stock));
```

### Example 7: Export Data to CSV (Node.js)

```javascript
const fs = require('fs');
const axios = require('axios');

async function exportStockDataToCSV(symbol, filename) {
  const response = await axios.get('http://localhost:3000/api/stock/historical', {
    params: { symbol, interval: '1d' }
  });
  
  const data = response.data.data;
  
  // Create CSV content
  let csv = 'Date,Open,High,Low,Close,Volume\n';
  data.forEach(row => {
    const date = new Date(row.time * 1000).toISOString().split('T')[0];
    csv += `${date},${row.open},${row.high},${row.low},${row.close},${row.volume}\n`;
  });
  
  // Write to file
  fs.writeFileSync(filename, csv);
  console.log(`Data exported to ${filename}`);
}

// Usage
exportStockDataToCSV('BBCA.JK', 'bbca_data.csv');
```

### Example 8: WebSocket-like Real-time Updates (Polling)

```javascript
class StockWatcher {
  constructor(symbol, interval = 5000) {
    this.symbol = symbol;
    this.interval = interval;
    this.lastPrice = null;
    this.callbacks = [];
  }
  
  subscribe(callback) {
    this.callbacks.push(callback);
  }
  
  async start() {
    this.intervalId = setInterval(async () => {
      try {
        const response = await fetch(`/api/stock/quote?symbol=${this.symbol}`);
        const data = await response.json();
        
        // Check if price changed
        if (this.lastPrice !== null && data.price !== this.lastPrice) {
          const direction = data.price > this.lastPrice ? '↑' : '↓';
          this.callbacks.forEach(cb => cb({
            ...data,
            direction,
            priceChange: data.price - this.lastPrice
          }));
        }
        
        this.lastPrice = data.price;
      } catch (error) {
        console.error('Error fetching price:', error);
      }
    }, this.interval);
  }
  
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}

// Usage
const watcher = new StockWatcher('BBCA.JK', 5000); // Update every 5 seconds

watcher.subscribe((data) => {
  console.log(`${data.symbol} ${data.direction} ${data.price} (${data.changePercent}%)`);
});

watcher.start();

// Stop after 1 minute
setTimeout(() => watcher.stop(), 60000);
```

## Rate Limiting Considerations

Yahoo Finance API may have rate limits. Best practices:

1. **Cache responses** for at least 1 minute
2. **Batch requests** when possible
3. **Implement exponential backoff** for retries
4. **Use appropriate intervals** for real-time updates (minimum 5 seconds)

## Production Deployment

When deploying to production, update the base URL:

```javascript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-domain.com';

const response = await fetch(`${API_BASE_URL}/api/stock/quote?symbol=BBCA.JK`);
```

