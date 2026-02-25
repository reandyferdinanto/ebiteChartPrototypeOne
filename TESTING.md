# Testing Guide

## Testing the API Endpoints

### 1. Test Stock Quote Endpoint

**Using Browser:**
```
http://localhost:3000/api/stock/quote?symbol=BBCA.JK
```

**Using PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/stock/quote?symbol=BBCA.JK"
```

**Expected Response:**
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

### 2. Test Historical Data Endpoint

**Using Browser:**
```
http://localhost:3000/api/stock/historical?symbol=TLKM.JK&interval=1d
```

**Using PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/stock/historical?symbol=TLKM.JK&interval=1d"
```

**Expected Response:**
```json
{
  "symbol": "TLKM.JK",
  "data": [
    {
      "time": 1704067200,
      "open": 3450,
      "high": 3500,
      "low": 3420,
      "close": 3475,
      "volume": 45678900
    }
  ]
}
```

### 3. Test Stock Screener Endpoint

**Test All Stocks:**
```
http://localhost:3000/api/stock/screener?filter=all
```

**Test Top Gainers:**
```
http://localhost:3000/api/stock/screener?filter=gainers
```

**Test Top Losers:**
```
http://localhost:3000/api/stock/screener?filter=losers
```

**Test Most Active:**
```
http://localhost:3000/api/stock/screener?filter=active
```

**Using PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/stock/screener?filter=gainers"
```

## Testing Indonesian Stocks

### Popular Stocks to Test:

**Banking Sector:**
- BBCA.JK - Bank Central Asia
- BBRI.JK - Bank Rakyat Indonesia
- BMRI.JK - Bank Mandiri
- BRIS.JK - Bank Syariah Indonesia

**Telecommunications:**
- TLKM.JK - Telkom Indonesia
- EXCL.JK - XL Axiata
- ISAT.JK - Indosat Ooredoo

**Consumer Goods:**
- UNVR.JK - Unilever Indonesia
- ICBP.JK - Indofood CBP
- INDF.JK - Indofood
- MYOR.JK - Mayora

**Automotive:**
- ASII.JK - Astra International
- UNTR.JK - United Tractors
- AUTO.JK - Astra Otoparts

**Energy & Mining:**
- ADRO.JK - Adaro Energy
- PTBA.JK - Bukit Asam
- ITMG.JK - Indo Tambangraya
- PGAS.JK - Perusahaan Gas Negara

**Agriculture:**
- CPIN.JK - Charoen Pokphand
- JPFA.JK - Japfa Comfeed

## Manual Testing Checklist

### Frontend Testing:

- [ ] Home page loads correctly
- [ ] Search bar accepts stock symbols
- [ ] Popular stock buttons work
- [ ] Interval selector (1d, 1wk, 1mo) switches data
- [ ] Chart type toggle (Candlestick/Line) works
- [ ] Chart renders with correct data
- [ ] Volume histogram displays
- [ ] Stock info displays correct values
- [ ] Positive/negative changes show correct colors
- [ ] Loading states display properly
- [ ] Error messages show when API fails

### Stock Screener Testing:

- [ ] Screener page loads
- [ ] All stocks filter shows data
- [ ] Top gainers filter works
- [ ] Top losers filter works
- [ ] Most active filter works
- [ ] Table displays all columns
- [ ] "View Chart" links work
- [ ] Stock data updates correctly

### API Testing:

- [ ] Quote endpoint returns valid data
- [ ] Historical endpoint returns OHLCV data
- [ ] Screener endpoint returns array of stocks
- [ ] Invalid symbol returns error
- [ ] Missing parameters return 400 error
- [ ] Rate limiting works (if implemented)

## Automated Testing Script (PowerShell)

```powershell
# Test all endpoints
Write-Host "Testing Ebite Chart API..." -ForegroundColor Green

# Test 1: Quote Endpoint
Write-Host "`n1. Testing Quote Endpoint (BBCA.JK)..." -ForegroundColor Yellow
try {
    $quote = Invoke-RestMethod -Uri "http://localhost:3000/api/stock/quote?symbol=BBCA.JK"
    Write-Host "✓ Success: $($quote.name) - Price: $($quote.price)" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed: $_" -ForegroundColor Red
}

# Test 2: Historical Data
Write-Host "`n2. Testing Historical Data (TLKM.JK)..." -ForegroundColor Yellow
try {
    $historical = Invoke-RestMethod -Uri "http://localhost:3000/api/stock/historical?symbol=TLKM.JK&interval=1d"
    Write-Host "✓ Success: Got $($historical.data.Count) data points" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed: $_" -ForegroundColor Red
}

# Test 3: Stock Screener
Write-Host "`n3. Testing Stock Screener (Gainers)..." -ForegroundColor Yellow
try {
    $screener = Invoke-RestMethod -Uri "http://localhost:3000/api/stock/screener?filter=gainers"
    Write-Host "✓ Success: Found $($screener.total) stocks" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed: $_" -ForegroundColor Red
}

# Test 4: Multiple Stocks
Write-Host "`n4. Testing Multiple Stocks..." -ForegroundColor Yellow
$symbols = @("BBRI.JK", "BMRI.JK", "ASII.JK")
foreach ($symbol in $symbols) {
    try {
        $result = Invoke-RestMethod -Uri "http://localhost:3000/api/stock/quote?symbol=$symbol"
        Write-Host "  ✓ $symbol : $($result.price)" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ $symbol : Failed" -ForegroundColor Red
    }
}

Write-Host "`nTesting completed!" -ForegroundColor Green
```

Save as `test-api.ps1` and run:
```powershell
.\test-api.ps1
```

## Performance Testing

### Load Testing with PowerShell:

```powershell
# Test API response time
$symbols = @("BBCA.JK", "BBRI.JK", "BMRI.JK", "TLKM.JK", "ASII.JK")
$totalTime = 0

foreach ($symbol in $symbols) {
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    
    try {
        $result = Invoke-RestMethod -Uri "http://localhost:3000/api/stock/quote?symbol=$symbol"
        $stopwatch.Stop()
        
        $time = $stopwatch.ElapsedMilliseconds
        $totalTime += $time
        
        Write-Host "$symbol : ${time}ms" -ForegroundColor Cyan
    } catch {
        Write-Host "$symbol : Failed" -ForegroundColor Red
    }
}

$avgTime = $totalTime / $symbols.Count
Write-Host "`nAverage Response Time: ${avgTime}ms" -ForegroundColor Yellow
```

## Troubleshooting

### Issue: API returns 404
**Solution:** Make sure the dev server is running (`npm run dev`)

### Issue: No data returned
**Solution:** Check internet connection, Yahoo Finance API may be down

### Issue: Slow response times
**Solution:** Implement caching, reduce number of stocks in screener

### Issue: Chart not rendering
**Solution:** Check browser console for errors, verify lightweight-charts is loaded

### Issue: Invalid symbol error
**Solution:** Ensure Indonesian stocks use `.JK` suffix

## Next Steps

After testing:
1. Implement caching for better performance
2. Add error boundaries in React components
3. Add unit tests with Jest
4. Add E2E tests with Playwright
5. Set up CI/CD pipeline

