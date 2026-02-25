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

    const queryOptions: any = {
      period1: period1 || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year ago
      period2: period2 || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // tomorrow (to include today)
      interval: interval as any, // '1d', '1wk', '1mo', etc.
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

