// ============================================================================
// EBITE CHART — Chart Image Generator for Telegram
// Approach: Multi-segment line chart (green if close > prev, red if lower)
//   + MA20 grey dashed line + MA50 grey line
//   + S/R as shaded area boxes (annotation plugin)
//   + SL / TP / Entry horizontal dashed lines
//   + Volume thin bars on separate y1 axis (bottom 20%)
// 100% reliable on QuickChart.io — no financial plugin needed.
// ============================================================================

import { ChartData } from './indicators';

export interface ChartImageOptions {
  title:        string;
  data:         ChartData[];
  slLevel?:     number;
  tpLevel?:     number;
  entryLevel?:  number;
  sr?:          { level: number; type: 'support' | 'resistance' }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(ts: number): string {
  const d = new Date(ts * 1000);
  const dd = d.getUTCDate().toString().padStart(2, '0');
  const mm = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  return `${dd}/${mm}`;
}

function calcMA(closes: number[], period: number): (number | null)[] {
  return closes.map((_, i) => {
    if (i < period - 1) return null;
    let s = 0;
    for (let j = i - period + 1; j <= i; j++) s += closes[j];
    return parseFloat((s / period).toFixed(2));
  });
}

function fmtVol(v: number): string {
  if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K';
  return String(v);
}

// ── Build config ──────────────────────────────────────────────────────────────
export function buildChartConfig(opts: ChartImageOptions, maxCandles = 90): object {
  const { title, data, slLevel, tpLevel, entryLevel, sr = [] } = opts;

  const candles = data.slice(-maxCandles);
  const N       = candles.length;
  if (N === 0) return {};

  const labels = candles.map(c => formatDate(c.time));
  const closes = candles.map(c => c.close);
  const vols   = candles.map(c => c.volume ?? 0);

  // ── Price axis range ──────────────────────────────────────────────────────
  const allPx = candles.flatMap(c => [c.high, c.low]);
  if (slLevel)    allPx.push(slLevel);
  if (tpLevel)    allPx.push(tpLevel);
  if (entryLevel) allPx.push(entryLevel);
  sr.forEach(z => allPx.push(z.level));
  const pxMin = Math.min(...allPx) * 0.990;
  const pxMax = Math.max(...allPx) * 1.010;

  // ── MA lines ─────────────────────────────────────────────────────────────
  const ma20 = calcMA(closes, Math.min(20, N));
  const ma50 = calcMA(closes, Math.min(50, N));

  // ── Multi-segment price line: each point is a dataset of 2 points ─────────
  // Green segment  = close[i] >= close[i-1]
  // Red segment    = close[i] <  close[i-1]
  // We build ONE dataset per adjacent pair; QuickChart handles up to ~200 datasets fine.
  // Simpler alternative (works great): single line dataset with pointBackgroundColor trick
  // BEST approach for QuickChart: single line + per-point segment color via
  // the "segment" option (Chart.js 3.x feature supported by QuickChart).
  // We'll use that — much lighter payload than N datasets.

  // Per-point border color array (N points, green/red based on prev close)
  const pointColors: string[] = closes.map((c, i) => {
    if (i === 0) return 'rgba(100,180,255,1)'; // first point neutral blue
    return c >= closes[i - 1] ? '#00d069' : '#eb3c3c';
  });

  // For line segments we need a workaround: Chart.js 3 supports
  // `segment.borderColor` callback but QuickChart may serialize it differently.
  // Safest: build multiple 2-point line datasets (one per gap). Max 90 datasets — fine.
  const segmentDatasets: object[] = [];
  for (let i = 1; i < N; i++) {
    const isUp   = closes[i] >= closes[i - 1];
    const color  = isUp ? '#00d069' : '#eb3c3c';
    // Each segment is just 2 data points with nulls elsewhere
    const segData: (number | null)[] = new Array(N).fill(null);
    segData[i - 1] = closes[i - 1];
    segData[i]     = closes[i];
    segmentDatasets.push({
      type:            'line',
      label:           `_seg${i}`,
      data:            segData,
      borderColor:     color,
      backgroundColor: 'transparent',
      borderWidth:     2.2,
      pointRadius:     0,
      tension:         0,
      spanGaps:        false,
      yAxisID:         'y',
      order:           2,
    });
  }

  // ── Volume bars on y1 ─────────────────────────────────────────────────────
  const maxVol    = Math.max(...vols, 1);
  const volAxisMax = maxVol * 4; // bars occupy bottom ~25% of y1 range

  // ── Annotations: SL, TP, Entry, S/R boxes ────────────────────────────────
  const annotations: Record<string, object> = {};

  // S/R zones as shaded boxes (±0.8% ATR around level)
  const atrApprox = (pxMax - pxMin) * 0.008; // simple approximation
  sr.slice(0, 5).forEach((zone, i) => {
    const isSup  = zone.type === 'support';
    const half   = Math.max(atrApprox, zone.level * 0.004);
    annotations[`srBox${i}`] = {
      type:            'box',
      yMin:            zone.level - half,
      yMax:            zone.level + half,
      xMin:            0,
      xMax:            N - 1,
      backgroundColor: isSup ? 'rgba(0,208,105,0.12)' : 'rgba(235,60,60,0.12)',
      borderColor:     isSup ? 'rgba(0,208,105,0.50)' : 'rgba(235,60,60,0.50)',
      borderWidth:     1,
      label: {
        enabled:         true,
        content:         `${isSup ? 'SUP' : 'RES'} ${Math.round(zone.level).toLocaleString('id-ID')}`,
        position:        { x: 'start', y: 'center' },
        backgroundColor: 'transparent',
        color:           isSup ? 'rgba(0,208,105,0.85)' : 'rgba(235,100,100,0.85)',
        font:            { size: 8, weight: 'bold' },
        padding:         { x: 3, y: 0 },
      },
    };
  });

  if (entryLevel) {
    annotations.entry = {
      type:        'line',
      yMin: entryLevel, yMax: entryLevel,
      borderColor: 'rgba(0,230,118,0.95)', borderWidth: 2, borderDash: [6, 3],
      label: {
        enabled: true,
        content: `Entry ${Math.round(entryLevel).toLocaleString('id-ID')}`,
        position: 'end',
        backgroundColor: 'rgba(0,200,100,0.9)',
        color: '#000', font: { size: 9, weight: 'bold' }, padding: { x: 4, y: 2 },
      },
    };
  }
  if (slLevel) {
    annotations.sl = {
      type:        'line',
      yMin: slLevel, yMax: slLevel,
      borderColor: 'rgba(255,82,82,0.95)', borderWidth: 2, borderDash: [5, 4],
      label: {
        enabled: true,
        content: `SL ${Math.round(slLevel).toLocaleString('id-ID')}`,
        position: 'end',
        backgroundColor: 'rgba(255,60,60,0.95)',
        color: '#fff', font: { size: 9, weight: 'bold' }, padding: { x: 4, y: 2 },
      },
    };
  }
  if (tpLevel) {
    annotations.tp = {
      type:        'line',
      yMin: tpLevel, yMax: tpLevel,
      borderColor: 'rgba(64,196,255,0.95)', borderWidth: 2, borderDash: [5, 4],
      label: {
        enabled: true,
        content: `TP ${Math.round(tpLevel).toLocaleString('id-ID')}`,
        position: 'end',
        backgroundColor: 'rgba(30,150,230,0.95)',
        color: '#fff', font: { size: 9, weight: 'bold' }, padding: { x: 4, y: 2 },
      },
    };
  }

  // Latest price dot annotation
  const lastClose = closes[N - 1];
  const lastColor = N > 1 && lastClose >= closes[N - 2] ? '#00d069' : '#eb3c3c';
  annotations.lastPrice = {
    type:            'point',
    xValue:          N - 1,
    yValue:          lastClose,
    backgroundColor: lastColor,
    borderColor:     '#fff',
    borderWidth:     2,
    radius:          5,
  };

  return {
    type: 'bar', // mixed chart base type
    data: {
      labels,
      datasets: [
        // ── Volume bars (y1 axis, rendered behind) ──
        {
          type:            'bar',
          label:           'Vol',
          data:            vols,
          backgroundColor: candles.map(c =>
            c.close >= c.open ? 'rgba(0,184,148,0.25)' : 'rgba(214,48,49,0.25)'
          ),
          borderWidth:        0,
          barPercentage:      0.85,
          categoryPercentage: 1.0,
          yAxisID:            'y1',
          order:              20,
        },
        // ── MA50 (grey, thicker) ──
        {
          type:            'line',
          label:           'MA50',
          data:            ma50,
          borderColor:     'rgba(160,160,160,0.7)',
          backgroundColor: 'transparent',
          borderWidth:     2,
          pointRadius:     0,
          tension:         0.3,
          spanGaps:        true,
          yAxisID:         'y',
          order:           4,
          borderDash:      [],
        },
        // ── MA20 (grey dashed) ──
        {
          type:            'line',
          label:           'MA20',
          data:            ma20,
          borderColor:     'rgba(200,200,200,0.55)',
          backgroundColor: 'transparent',
          borderWidth:     1.5,
          pointRadius:     0,
          tension:         0.3,
          spanGaps:        true,
          yAxisID:         'y',
          order:           3,
          borderDash:      [4, 3],
        },
        // ── Colored price line segments ──
        ...segmentDatasets,
      ],
    },
    options: {
      responsive: false,
      animation:  false,
      plugins: {
        title: {
          display: true,
          text:    title,
          color:   '#e8e8e8',
          font:    { size: 14, weight: 'bold' },
          padding: { bottom: 4 },
        },
        legend: {
          display:  true,
          position: 'top',
          labels: {
            color:    '#aaa',
            font:     { size: 10 },
            boxWidth: 14,
            padding:  8,
            // Show only MA20, MA50 — hide Vol + all segment lines
            filter: (item: any) =>
              item.text === 'MA20' || item.text === 'MA50',
          },
        },
        annotation: { annotations },
      },
      scales: {
        x: {
          ticks: {
            color:        '#666',
            maxTicksLimit: 12,
            maxRotation:  0,
            font:         { size: 8 },
            autoSkip:     true,
          },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
        // Price axis — right side
        y: {
          min:      pxMin,
          max:      pxMax,
          position: 'right',
          ticks: {
            color:         '#999',
            font:          { size: 9 },
            maxTicksLimit: 7,
            callback:      (val: number) => Math.round(val).toLocaleString('id-ID'),
          },
          grid: { color: 'rgba(255,255,255,0.06)' },
        },
        // Volume axis — left side, no grid overlap
        y1: {
          min:      0,
          max:      volAxisMax,
          position: 'left',
          display:  true,
          ticks: {
            color:         '#444',
            font:          { size: 7 },
            maxTicksLimit: 3,
            callback:      (val: number) => fmtVol(val),
          },
          grid: { drawOnChartArea: false },
        },
      },
      layout: {
        padding: { left: 2, right: 65, top: 4, bottom: 4 },
      },
    },
    backgroundColor: '#131722',
  };
}

// ── Build chart URL (GET fallback) ────────────────────────────────────────────
export function buildChartImageUrl(opts: ChartImageOptions, maxCandles = 60): string {
  const config  = buildChartConfig(opts, maxCandles);
  const encoded = encodeURIComponent(JSON.stringify(config));
  const url     = `https://quickchart.io/chart?c=${encoded}&w=900&h=520&bkg=%23131722&f=png`;
  if (url.length > 7500 && maxCandles > 15) {
    return buildChartImageUrl(opts, Math.floor(maxCandles * 0.75));
  }
  return url;
}

// ── Fetch chart image as Buffer via QuickChart POST ───────────────────────────
export async function fetchChartImageBuffer(
  opts: ChartImageOptions,
  timeoutMs = 22000,
): Promise<Buffer | null> {
  const config = buildChartConfig(opts, 90);
  try {
    const body = JSON.stringify({
      width:           900,
      height:          520,
      backgroundColor: '#131722',
      format:          'png',
      chart:           config,
    });
    console.log('[Chart] POST QuickChart, body:', body.length, 'bytes');

    const res = await fetch('https://quickchart.io/chart', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal:  AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      console.error('[Chart] QuickChart error:', res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('image')) {
      console.error('[Chart] Non-image response:', ct, (await res.text()).slice(0, 300));
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    console.log('[Chart] OK, size:', buf.length, 'bytes');
    return buf;
  } catch (e: any) {
    console.error('[Chart] fetchChartImageBuffer:', e.message);
    return null;
  }
}

// ── Send chart photo to Telegram ─────────────────────────────────────────────
export async function sendChartPhoto(
  chatId:   number | string,
  opts:     ChartImageOptions,
  caption:  string,
  botToken: string,
): Promise<void> {
  const API          = `https://api.telegram.org/bot${botToken}`;
  const safeCaption  = caption.replace(/<[^>]+>/g, '').slice(0, 1024);

  // Strategy 1: POST buffer
  try {
    const imgBuffer = await fetchChartImageBuffer(opts, 22000);
    if (imgBuffer && imgBuffer.length > 5000) {
      const boundary  = `EbiteBdy${Date.now().toString(16)}`;
      const CRLF      = '\r\n';
      const mkPart    = (n: string, v: string) =>
        `--${boundary}${CRLF}Content-Disposition: form-data; name="${n}"${CRLF}${CRLF}${v}${CRLF}`;

      const textBuf   = Buffer.from(
        [mkPart('chat_id', String(chatId)), mkPart('caption', safeCaption), mkPart('parse_mode', 'HTML')].join(''),
        'utf8',
      );
      const headerBuf = Buffer.from(
        `--${boundary}${CRLF}Content-Disposition: form-data; name="photo"; filename="chart.png"${CRLF}Content-Type: image/png${CRLF}${CRLF}`,
        'utf8',
      );
      const footerBuf = Buffer.from(`${CRLF}--${boundary}--${CRLF}`, 'utf8');
      const multipart = Buffer.concat([textBuf, headerBuf, imgBuffer, footerBuf]);

      const r = await fetch(`${API}/sendPhoto`, {
        method:  'POST',
        headers: {
          'Content-Type':   `multipart/form-data; boundary=${boundary}`,
          'Content-Length': String(multipart.length),
        },
        // @ts-ignore
        body:   multipart,
        signal: AbortSignal.timeout(28000),
      });
      if (r.ok) { console.log('[Chart] multipart OK'); return; }
      console.warn('[Chart] multipart fail:', r.status, (await r.text()).slice(0, 200));
    }
  } catch (e: any) {
    console.warn('[Chart] POST strategy error:', e.message);
  }

  // Strategy 2: URL fallback
  try {
    const url = buildChartImageUrl(opts, 60);
    const r   = await fetch(`${API}/sendPhoto`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ chat_id: chatId, photo: url, caption: safeCaption, parse_mode: 'HTML' }),
      signal:  AbortSignal.timeout(15000),
    });
    if (r.ok) { console.log('[Chart] URL sendPhoto OK'); return; }
    console.warn('[Chart] URL fail:', r.status, (await r.text()).slice(0, 200));
  } catch (e: any) {
    console.warn('[Chart] URL strategy error:', e.message);
  }

  console.error('[Chart] All strategies failed for chat', chatId);
}
