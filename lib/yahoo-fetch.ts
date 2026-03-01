// ============================================================================
// SHARED: Yahoo Finance OHLCV fetcher
// Used by both /api/stock/historical and telegram-bot.ts
// This avoids the telegram bot making a self-HTTP call back to /api/stock/historical
// (which can deadlock / timeout on Vercel serverless)
// ============================================================================

import { ChartData } from './indicators';
import YahooFinanceModule from 'yahoo-finance2';

// Singleton instance (required for yahoo-finance2 v3)
let _yf: InstanceType<typeof YahooFinanceModule> | null = null;
function getYF() {
  if (!_yf) _yf = new YahooFinanceModule();
  return _yf;
}

// Helper: race promise against timeout
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Yahoo Finance timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export interface FetchOHLCVOptions {
  interval?: '1d' | '1wk' | '1mo' | '1h' | '5m' | '15m' | '4h';
  days?: number;
  timeoutMs?: number;
}

/**
 * Fetch OHLCV data directly from Yahoo Finance.
 * Returns [] on any error (never throws).
 */
export async function fetchYahooOHLCV(
  symbol: string,
  options: FetchOHLCVOptions = {}
): Promise<ChartData[]> {
  const { interval = '1d', days = 400, timeoutMs = 20000 } = options;

  try {
    const yf = getYF();
    const now = new Date();
    const period1 = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const period2 = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Yahoo doesn't have 4h natively — use 1h and aggregate
    const actualInterval = interval === '4h' ? '1h' : interval;

    const result: any = await withTimeout(
      yf.chart(symbol, {
        period1,
        period2,
        interval: actualInterval as any,
      }),
      timeoutMs
    );

    if (!result?.quotes?.length) return [];

    let chartData: ChartData[] = result.quotes
      .filter((q: any) => q.date && q.close != null)
      .map((q: any) => {
        const dateUTC = new Date(q.date);
        // Add WIB offset (+7h) to match the rest of the app
        const wibTime = Math.floor(dateUTC.getTime() / 1000) + 7 * 3600;
        return {
          time: wibTime,
          open: q.open ?? q.close,
          high: q.high ?? q.close,
          low: q.low ?? q.close,
          close: q.close,
          volume: q.volume ?? 0,
        };
      });

    // Aggregate 1h → 4h if requested
    if (interval === '4h' && actualInterval === '1h') {
      const agg: ChartData[] = [];
      for (let i = 0; i < chartData.length; i += 4) {
        const chunk = chartData.slice(i, i + 4);
        if (!chunk.length) continue;
        agg.push({
          time: chunk[0].time,
          open: chunk[0].open,
          high: Math.max(...chunk.map(c => c.high)),
          low: Math.min(...chunk.map(c => c.low)),
          close: chunk[chunk.length - 1].close,
          volume: chunk.reduce((s, c) => s + (c.volume ?? 0), 0),
        });
      }
      chartData = agg;
    }

    // Ensure sorted by time ascending and deduplicated
    const seen = new Set<number>();
    chartData = chartData
      .filter(c => { if (seen.has(c.time)) return false; seen.add(c.time); return true; })
      .sort((a, b) => a.time - b.time);

    return chartData;
  } catch (err: any) {
    console.error(`[fetchYahooOHLCV] ${symbol} error:`, err.message);
    return [];
  }
}

