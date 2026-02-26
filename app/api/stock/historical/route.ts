import { NextRequest, NextResponse } from 'next/server';
import YahooFinanceModule from 'yahoo-finance2';

// Create YahooFinance instance (required for v3!)
const yahooFinance = new YahooFinanceModule();

// GET /api/stock/historical?symbol=BBCA.JK&period1=2024-01-01&period2=2024-12-31&interval=1d
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');
    const period1 = searchParams.get('period1');
    const period2 = searchParams.get('period2');
    const interval = searchParams.get('interval') || '1d';

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      );
    }

    // Determine appropriate date range based on interval
    let defaultPeriod1: string;
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    switch (interval) {
      case '5m':
        // 5-minute data: last 5-7 days (Yahoo Finance limit for 5m)
        defaultPeriod1 = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '15m':
        // 15-minute data: last 10 days
        defaultPeriod1 = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '1h':
        // 1-hour data: last 30 days
        defaultPeriod1 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '4h':
        // 4-hour data: last 60 days
        defaultPeriod1 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '1d':
        // Daily data: 2 years
        defaultPeriod1 = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '1wk':
        // Weekly data: 5 years
        defaultPeriod1 = new Date(now.getTime() - 1825 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '1mo':
        // Monthly data: 10 years
        defaultPeriod1 = new Date(now.getTime() - 3650 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      default:
        // Default to 1 year
        defaultPeriod1 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    const queryOptions: any = {
      period1: period1 || defaultPeriod1,
      period2: period2 || tomorrow.toISOString().split('T')[0], // tomorrow (to include today)
      interval: interval as any, // '1d', '1wk', '1mo', '5m', '15m', '1h', '4h', etc.
    };

    const result: any = await yahooFinance.historical(symbol, queryOptions);

    // Transform data to match lightweight-charts format with WIB timezone
    const chartData = result.map((item: any) => {
      // Convert to WIB (UTC+7) by adding 7 hours
      const dateUTC = new Date(item.date);
      const wibTime = Math.floor(dateUTC.getTime() / 1000) + (7 * 60 * 60);

      return {
        time: wibTime,
        open: item.open || 0,
        high: item.high || 0,
        low: item.low || 0,
        close: item.close || 0,
        volume: item.volume || 0,
      };
    });

    return NextResponse.json({
      symbol,
      data: chartData,
    });
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch historical data' },
      { status: 500 }
    );
  }
}

