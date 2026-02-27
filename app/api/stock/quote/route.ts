import { NextRequest, NextResponse } from 'next/server';
import YahooFinanceModule from 'yahoo-finance2';

// Create YahooFinance instance (required for v3!)
const yahooFinance = new YahooFinanceModule();

// Helper: race a promise against a timeout
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// GET /api/stock/quote?symbol=BBCA.JK
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      );
    }

    // Use quote method with 10s timeout
    const result: any = await withTimeout(yahooFinance.quote(symbol), 10000);

    return NextResponse.json({
      symbol: result.symbol || symbol,
      name: result.longName || result.shortName || symbol,
      price: result.regularMarketPrice || 0,
      change: result.regularMarketChange || 0,
      changePercent: result.regularMarketChangePercent || 0,
      volume: result.regularMarketVolume || 0,
      marketCap: result.marketCap || 0,
      high: result.regularMarketDayHigh || 0,
      low: result.regularMarketDayLow || 0,
      open: result.regularMarketOpen || 0,
      previousClose: result.regularMarketPreviousClose || 0,
      currency: result.currency || 'IDR',
    });
  } catch (error: any) {
    console.error('Error fetching quote:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock quote', details: error.message },
      { status: 500 }
    );
  }
}

