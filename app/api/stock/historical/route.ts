import { NextRequest, NextResponse } from 'next/server';
import YahooFinanceModule from 'yahoo-finance2';

// Create YahooFinance instance (required for v3!)
const yahooFinance = new YahooFinanceModule();

// GET /api/stock/historical?symbol=BBCA.JK&period1=2024-01-01&period2=2024-12-31&interval=1d
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');
    const period1Param = searchParams.get('period1');
    const period2Param = searchParams.get('period2');
    const interval = searchParams.get('interval') || '1d';

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      );
    }

    // Determine appropriate date range based on interval
    // Yahoo Finance v3 expects Date objects, not strings
    let defaultPeriod1: Date;
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    switch (interval) {
      case '5m':
        // 5-minute data: last 5 days (Yahoo Finance limit for 5m)
        defaultPeriod1 = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
        break;
      case '15m':
        // 15-minute data: last 10 days
        defaultPeriod1 = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
        break;
      case '1h':
        // 1-hour data: last 30 days
        defaultPeriod1 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '4h':
        // 4-hour data: last 60 days
        defaultPeriod1 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        break;
      case '1d':
        // Daily data: 2 years
        defaultPeriod1 = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);
        break;
      case '1wk':
        // Weekly data: 5 years
        defaultPeriod1 = new Date(now.getTime() - 1825 * 24 * 60 * 60 * 1000);
        break;
      case '1mo':
        // Monthly data: 10 years
        defaultPeriod1 = new Date(now.getTime() - 3650 * 24 * 60 * 60 * 1000);
        break;
      default:
        // Default to 1 year
        defaultPeriod1 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }

    // Convert string parameters to Date if provided
    const period1 = period1Param ? new Date(period1Param) : defaultPeriod1;
    const period2 = period2Param ? new Date(period2Param) : tomorrow;


    // Yahoo Finance doesn't support 4h natively, so we need to use 1h and aggregate
    const actualInterval = interval === '4h' ? '1h' : interval;

    console.log('Fetching historical data for:', symbol, 'with options:', {
      interval: actualInterval,
      requestedInterval: interval,
      period1: period1.toISOString(),
      period2: period2.toISOString()
    });

    // Use chart() method instead of historical() - more reliable for intraday data
    const result: any = await yahooFinance.chart(symbol, {
      period1: period1,
      period2: period2,
      interval: actualInterval as any,
    });

    if (!result || !result.quotes || result.quotes.length === 0) {
      console.warn('No historical data returned for:', symbol, 'interval:', interval);
      return NextResponse.json({
        symbol,
        data: [],
      });
    }

    // Transform data to match lightweight-charts format with WIB timezone
    let chartData = result.quotes
      .filter((item: any) => item.date && item.close !== null && item.close !== undefined)
      .map((item: any) => {
        // Convert to WIB (UTC+7) by adding 7 hours
        const dateUTC = new Date(item.date);
        const wibTime = Math.floor(dateUTC.getTime() / 1000) + (7 * 60 * 60);

        return {
          time: wibTime,
          open: item.open || item.close,
          high: item.high || item.close,
          low: item.low || item.close,
          close: item.close,
          volume: item.volume || 0,
        };
      });

    // If user requested 4h, aggregate 1h data into 4h candles
    if (interval === '4h' && actualInterval === '1h') {
      const aggregatedData: any[] = [];

      // Group by 4-hour periods
      for (let i = 0; i < chartData.length; i += 4) {
        const chunk = chartData.slice(i, i + 4);
        if (chunk.length === 0) continue;

        // Create 4h candle from 4x 1h candles
        const fourHourCandle = {
          time: chunk[0].time,
          open: chunk[0].open,
          high: Math.max(...chunk.map((c: any) => c.high)),
          low: Math.min(...chunk.map((c: any) => c.low)),
          close: chunk[chunk.length - 1].close,
          volume: chunk.reduce((sum: number, c: any) => sum + c.volume, 0)
        };

        aggregatedData.push(fourHourCandle);
      }

      chartData = aggregatedData;
      console.log('Aggregated 1h data into', chartData.length, '4h candles for', symbol);
    } else {
      console.log('Successfully fetched', chartData.length, 'data points for', symbol, 'interval:', interval);
    }

    return NextResponse.json({
      symbol,
      data: chartData,
    });
  } catch (error: any) {
    console.error('Error fetching historical data for', request.nextUrl.searchParams.get('symbol'), ':', error);
    console.error('Error details:', error.message, error.stack);
    return NextResponse.json(
      {
        error: 'Failed to fetch historical data',
        details: error.message || 'Unknown error',
        symbol: request.nextUrl.searchParams.get('symbol')
      },
      { status: 500 }
    );
  }
}
