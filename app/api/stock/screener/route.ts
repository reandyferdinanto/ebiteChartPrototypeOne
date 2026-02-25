import { NextRequest, NextResponse } from 'next/server';
import YahooFinanceModule from 'yahoo-finance2';

// Create YahooFinance instance (required for v3!)
const yahooFinance = new YahooFinanceModule();

// Popular Indonesian stocks on IDX (Indonesia Stock Exchange)
const INDONESIAN_STOCKS = [
  'BBCA.JK', // Bank Central Asia
  'BBRI.JK', // Bank Rakyat Indonesia
  'BMRI.JK', // Bank Mandiri
  'TLKM.JK', // Telkom Indonesia
  'ASII.JK', // Astra International
  'UNVR.JK', // Unilever Indonesia
  'ICBP.JK', // Indofood CBP
  'INDF.JK', // Indofood Sukses Makmur
  'KLBF.JK', // Kalbe Farma
  'GGRM.JK', // Gudang Garam
  'HMSP.JK', // H.M. Sampoerna
  'SMGR.JK', // Semen Indonesia
  'UNTR.JK', // United Tractors
  'PGAS.JK', // Perusahaan Gas Negara
  'ITMG.JK', // Indo Tambangraya Megah
  'ADRO.JK', // Adaro Energy
  'PTBA.JK', // Bukit Asam
  'EXCL.JK', // XL Axiata
  'CPIN.JK', // Charoen Pokphand Indonesia
  'INCO.JK', // Vale Indonesia
];

// GET /api/stock/screener?filter=all
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filter = searchParams.get('filter') || 'all';

    // Fetch quotes for all Indonesian stocks
    const quotes = await Promise.allSettled(
      INDONESIAN_STOCKS.map((symbol) => yahooFinance.quote(symbol))
    );

    const stocks = quotes
      .map((result, index) => {
        if (result.status === 'fulfilled') {
          const quote: any = result.value;

          return {
            symbol: quote.symbol || INDONESIAN_STOCKS[index],
            name: quote.longName || quote.shortName || INDONESIAN_STOCKS[index],
            price: quote.regularMarketPrice || 0,
            change: quote.regularMarketChange || 0,
            changePercent: quote.regularMarketChangePercent || 0,
            volume: quote.regularMarketVolume || 0,
            marketCap: quote.marketCap || 0,
            pe: quote.trailingPE || 0,
            high: quote.regularMarketDayHigh || 0,
            low: quote.regularMarketDayLow || 0,
          };
        }
        return null;
      })
      .filter((stock) => stock !== null);

    // Apply filters
    let filteredStocks = stocks;
    if (filter === 'gainers') {
      filteredStocks = stocks
        .filter((s) => s && s.changePercent > 0)
        .sort((a, b) => (b?.changePercent || 0) - (a?.changePercent || 0));
    } else if (filter === 'losers') {
      filteredStocks = stocks
        .filter((s) => s && s.changePercent < 0)
        .sort((a, b) => (a?.changePercent || 0) - (b?.changePercent || 0));
    } else if (filter === 'active') {
      filteredStocks = stocks.sort((a, b) => (b?.volume || 0) - (a?.volume || 0));
    }

    return NextResponse.json({
      stocks: filteredStocks,
      total: filteredStocks.length,
    });
  } catch (error) {
    console.error('Error fetching screener data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch screener data' },
      { status: 500 }
    );
  }
}

