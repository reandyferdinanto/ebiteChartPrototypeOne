import { NextRequest, NextResponse } from 'next/server';
import YahooFinanceModule from 'yahoo-finance2';

const yahooFinance = new YahooFinanceModule();

export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter required' },
        { status: 400 }
      );
    }

    const result = await yahooFinance.historical(symbol, {
      period1: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      period2: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      interval: '1d',
    });

    if (!result || result.length < 50) {
      return NextResponse.json(
        { error: `Not enough data for ${symbol} (found ${result?.length || 0} bars, need 50)` },
        { status: 400 }
      );
    }

    const data = result.slice(-50);
    const closes = data.map(d => d.close || 0);
    const highs = data.map(d => d.high || 0);
    const lows = data.map(d => d.low || 0);
    const volumes = data.map(d => d.volume || 0);
    const opens = data.map(d => d.open || 0);

    const N = data.length;
    const current = data[N - 1];

    // Get latest quote
    let quoteData: any;
    try {
      quoteData = await yahooFinance.quote(symbol);
    } catch (e) {
      return NextResponse.json(
        { error: `Could not fetch quote for ${symbol}` },
        { status: 400 }
      );
    }

    // Calculate 20-period average
    let volSum = 0;
    let spreadSum = 0;
    for (let i = N - 20; i < N; i++) {
      volSum += volumes[i];
      spreadSum += highs[i] - lows[i];
    }
    const volAvg = volSum / 20;
    const spreadAvg = spreadSum / 20;

    // Current candle metrics
    const spread = current.high - current.low;
    const body = Math.abs(current.close - current.open);
    const volRatio = current.volume / (volAvg || 1);
    const spreadRatio = spread / (spreadAvg || 1);
    const isGreen = current.close >= current.open;

    // Calculate VCP criteria
    const last30High = Math.max(...highs.slice(-30));
    const isNearHigh = current.close > (last30High * 0.80);

    // Calculate 5-period spread and volume
    let spread5Sum = 0;
    let vol5Sum = 0;
    for (let i = N - 5; i < N; i++) {
      spread5Sum += highs[i] - lows[i];
      vol5Sum += volumes[i];
    }
    const isLowSpread = (spread5Sum / 5) < (spreadAvg * 0.75);
    const isLowVolume = (vol5Sum / 5) < (volAvg * 0.85);
    const isVCP = isNearHigh && isLowSpread && isLowVolume;

    // Buying/selling pressure
    let buyVol = 0;
    let sellVol = 0;
    for (let i = N - 10; i < N; i++) {
      if (closes[i] > opens[i]) buyVol += volumes[i];
      else if (closes[i] < opens[i]) sellVol += volumes[i];
    }
    const accRatio = buyVol / (sellVol || 1);

    // Dry Up detection
    const isDryUp = (!isGreen || body < spread * 0.3) && (volRatio <= 0.60) && (accRatio > 0.8);
    const isIceberg = (volRatio > 1.2) && (spreadRatio < 0.75);

    // VPC Score calculation
    let vpcScore = 55;

    if (isVCP) vpcScore += 30;
    if (isDryUp) vpcScore += 25;
    if (isIceberg) vpcScore += 20;
    if (volRatio < 0.7) vpcScore += 12;

    if (isGreen) vpcScore += 10;
    if (body > spread * 0.3) vpcScore += 8;
    if (body > spread * 0.5) vpcScore += 8;

    if (volRatio > 0.6 && volRatio < 1.6) vpcScore += 8;
    if (volRatio > 0.9 && volRatio < 1.2) vpcScore += 5;

    if (accRatio > 0.9) vpcScore += 10;
    if (accRatio > 1.1) vpcScore += 8;
    if (accRatio > 1.3) vpcScore += 8;

    if (current.close > (last30High * 0.95)) vpcScore += 5;
    if (current.close > (last30High * 0.90)) vpcScore += 3;

    // Premium patterns
    if (isVCP && isDryUp) {
      vpcScore = 95;
    } else if (isVCP && isIceberg) {
      vpcScore = 92;
    } else if (isVCP && volRatio < 0.7) {
      vpcScore = 88;
    } else if (isDryUp && accRatio > 1.5) {
      vpcScore = Math.max(vpcScore, 85);
    } else if (isDryUp && accRatio > 1.2) {
      vpcScore = Math.max(vpcScore, 82);
    } else if (isDryUp) {
      vpcScore = Math.max(vpcScore, 75);
    } else if (isIceberg && accRatio > 1.2) {
      vpcScore = Math.max(vpcScore, 82);
    } else if (isIceberg) {
      vpcScore = Math.max(vpcScore, 72);
    } else if (isGreen && accRatio > 1.2 && volRatio > 0.8) {
      vpcScore = Math.max(vpcScore, 70);
    } else if (isGreen && accRatio > 1.0 && volRatio < 1.0) {
      vpcScore = Math.max(vpcScore, 65);
    }

    vpcScore = Math.max(55, Math.min(100, vpcScore));

    let pattern = '⬜ Netral';
    let recommendation = 'Wait';

    if (isVCP && isDryUp) {
      pattern = '🎯 VCP DRY-UP (Sniper Entry)';
      recommendation = '⚡ STRONG BUY - Entry Point!';
    } else if (isVCP && isIceberg) {
      pattern = '🧊 VCP ICEBERG';
      recommendation = '🚀 BUY - Accumulation!';
    } else if (isVCP && volRatio < 0.5) {
      pattern = '📉 VCP BASE';
      recommendation = '⏳ HOLD - Waiting for breakout';
    } else if (isDryUp && accRatio > 1.5) {
      pattern = '🥷 DRY UP (Strong Support)';
      recommendation = '📍 ENTRY - Strong setup';
    } else if (isDryUp) {
      pattern = '🥷 DRY UP (Support Test)';
      recommendation = '📍 ENTRY - Next breakout candle';
    } else if (isIceberg) {
      pattern = '🧊 ICEBERG (Hidden Buying)';
      recommendation = '👀 WATCH - Potential breakout';
    } else if (vpcScore > 60) {
      pattern = '📈 BUILDING SETUP';
      recommendation = '⏳ MONITOR - Potential entry';
    }

    return NextResponse.json({
      symbol: symbol.replace('.JK', ''),
      price: quoteData.regularMarketPrice || 0,
      change: quoteData.regularMarketChange || 0,
      changePercent: quoteData.regularMarketChangePercent || 0,
      volume: quoteData.regularMarketVolume || 0,
      vpcScore,
      isVCP,
      isDryUp,
      isIceberg,
      pattern,
      recommendation,
      details: {
        spread,
        body,
        volRatio,
        spreadRatio,
        accRatio,
        isGreen,
        isNearHigh,
        isLowSpread,
        isLowVolume,
      }
    });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: `Error analyzing stock: ${error.message}` },
      { status: 500 }
    );
  }
}

