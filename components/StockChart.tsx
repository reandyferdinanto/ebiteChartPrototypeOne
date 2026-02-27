'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import { calculateAllIndicators, calculateIntradayScalpMarkers, type IndicatorResult } from '@/lib/indicators';

interface ChartData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface StockChartProps {
  symbol: string;
  data: ChartData[];
  timeframe?: string;
}

// ── Screener context passed via URL params ───────────────────────────────────
interface ScreenerContext {
  screenerType: 'swing' | 'vcp' | 'scalp' | 'spring' | null;
  grade: string;
  entryType: string;
  vsaSignal: string;
  reason: string;
  stopLoss: number;
  target: number;
  cppScore: number;
  cppBias: string;
  powerScore: number;
  gainFromBase: number;
  sellVolRatio: number;
  accRatio: number;
  rmv: number;
  timeframe: string;
  // Spring-specific extras
  springBullPct?: number;
  springBarsAgo?: number;
  pivotLevel?: number;
}

export default function StockChart({ data, timeframe = '1d' }: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef  = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const macdChartRef = useRef<any>(null);
  const [chartType, setChartType] = useState<'candlestick' | 'line'>('candlestick');
  const [showControls, setShowControls] = useState(true);
  const [screenerCtx, setScreenerCtx] = useState<ScreenerContext | null>(null);
  const [showScreenerBanner, setShowScreenerBanner] = useState(true);
  const [showIndicators, setShowIndicators] = useState({
    ma: true,
    momentum: true,
    ao: false,
    fibonacci: false,
    vsa: false,
    vcp: false,
    candlePower: false,
    sr: true,
    signals: true
  });
  const [indicators, setIndicators] = useState<IndicatorResult | null>(null);

  // Read screener context from URL params when chart mounts
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search);
    const st = p.get('screenerType') as ScreenerContext['screenerType'];
    if (!st) return; // not coming from screener

    const safeStr = (key: string) => {
      const v = p.get(key) || '';
      try { return v.includes('%') ? decodeURIComponent(v) : v; } catch { return v; }
    };

    const ctx: ScreenerContext = {
      screenerType: st,
      grade: safeStr('grade'),
      entryType: safeStr('entryType'),
      vsaSignal: safeStr('vsaSignal'),
      reason: safeStr('reason'),
      stopLoss: parseFloat(p.get('sl') || '0'),
      target: parseFloat(p.get('tp') || '0'),
      cppScore: parseFloat(p.get('cpp') || '0'),
      cppBias: safeStr('cppBias'),
      powerScore: parseInt(p.get('power') || '0'),
      gainFromBase: parseFloat(p.get('gain') || '0'),
      sellVolRatio: parseFloat(p.get('svr') || '0'),
      accRatio: parseFloat(p.get('acc') || '1'),
      rmv: parseFloat(p.get('rmv') || '50'),
      timeframe: safeStr('timeframe') || '1d',
      springBullPct: p.get('springBullPct') ? parseFloat(p.get('springBullPct')!) : undefined,
      springBarsAgo: p.get('springBarsAgo') ? parseInt(p.get('springBarsAgo')!) : undefined,
      pivotLevel: p.get('pivotLevel') ? parseFloat(p.get('pivotLevel')!) : undefined,
    };
    setScreenerCtx(ctx);
    setShowScreenerBanner(true);

    // Auto-activate correct indicators based on screener type
    if (st === 'scalp') {
      setShowIndicators(prev => ({ ...prev, vsa: true, vcp: true, candlePower: false, signals: true, ma: true }));
    } else if (st === 'vcp') {
      setShowIndicators(prev => ({ ...prev, vsa: true, vcp: true, fibonacci: true, candlePower: false, signals: true, ma: true }));
    } else if (st === 'swing') {
      setShowIndicators(prev => ({ ...prev, vsa: true, vcp: true, candlePower: false, signals: true, ma: true }));
    } else if (st === 'spring') {
      // For Spring: VSA + signals so BVD 🌱SP markers are visible, MA for context
      setShowIndicators(prev => ({ ...prev, vsa: true, vcp: false, candlePower: false, signals: true, ma: true }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  // Quick preset modes - Reorganized for better UX
  const setMAMode = () => {
    setShowIndicators({
      ma: true,        // Show all MA lines (5, 20, 50, 200)
      momentum: false,
      ao: false,
      fibonacci: false,
      vsa: false,      // Clean chart with only MA lines
      vcp: false,
      candlePower: false,
      sr: true,        // Show S/R zones
      signals: true
    });
  };

  const setVSAMode = () => {
    setShowIndicators({
      ma: true,        // Show MA for context
      momentum: false,
      ao: false,
      fibonacci: false,
      vsa: true,       // Focus on VSA patterns (iceberg, dry up, VCP base)
      vcp: true,       // Include VCP detection
      candlePower: false,
      sr: true,        // Show S/R zones
      signals: true
    });
  };

  const setCandlePowerMode = () => {
    setShowIndicators({
      ma: true,        // Show MA for context
      momentum: false,
      ao: false,
      fibonacci: false,
      vsa: false,      // DISABLE VSA patterns
      vcp: false,      // DISABLE VCP patterns
      candlePower: true, // ONLY show candle power scores
      sr: true,        // Show S/R zones
      signals: true
    });
  };

  const setAnalysisMode = () => {
    setShowIndicators({
      ma: true,
      momentum: true,
      ao: true,
      fibonacci: true,
      vsa: true,
      vcp: true,
      candlePower: true,
      sr: true,        // Show S/R zones
      signals: true
    });
  };

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    // Clean up previous chart instances before creating new ones
    if (chartRef.current) {
      try { chartRef.current.remove(); } catch (e) {}
      chartRef.current = null;
    }
    if (macdChartRef.current) {
      try { macdChartRef.current.remove(); } catch (e) {}
      macdChartRef.current = null;
    }

    // Calculate indicators
    const calculatedIndicators = calculateAllIndicators(data);
    setIndicators(calculatedIndicators);

    // Detect if this chart was opened from the Spring screener (URL param)
    const urlScreenerType = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('screenerType')
      : null;
    const isSpringFromScreener = urlScreenerType === 'spring';

    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

    // Main chart height: price + volume overlay (no MACD here)
    let mainHeight: number;
    if (isMobile)       mainHeight = 380;
    else if (isTablet)  mainHeight = 480;
    else                mainHeight = 540;

    // MACD panel height: ~25-30% of main
    const macdHeight = isMobile ? 110 : 140;

    // ── SHARED CHART OPTIONS ──────────────────────────────────────────────
    const sharedLayout = {
      background: { type: ColorType.Solid, color: '#1a1a1a' },
      textColor: '#d1d5db',
    };
    const sharedGrid = {
      vertLines: { color: '#2a2a2a' },
      horzLines: { color: '#2a2a2a' },
    };
    const sharedTimeScale = {
      timeVisible: true,
      secondsVisible: false,
      borderVisible: true,
      borderColor: '#2a2a2a',
      rightOffset: isMobile ? 5 : 12,
      barSpacing: isMobile ? 8 : 6,
      minBarSpacing: isMobile ? 4 : 2,
    };
    const sharedHandleScroll = {
      mouseWheel: true,
      pressedMouseMove: true,
      horzTouchDrag: true,
      vertTouchDrag: true,
    };
    const sharedHandleScale = {
      axisPressedMouseMove: { time: true, price: true },
      mouseWheel: true,
      pinch: true,
      axisDoubleClickReset: { time: true, price: true },
    };

    // ── MAIN CHART (price + volume overlay) ──────────────────────────────
    const chart = createChart(chartContainerRef.current, {
      layout: sharedLayout,
      grid: sharedGrid,
      width: chartContainerRef.current.clientWidth,
      height: mainHeight,
      timeScale: {
        ...sharedTimeScale,
        visible: true, // always show — hiding breaks scroll/pan
        // Hide tick marks on main when MACD shown (cleaner look), but keep axis
        tickMarkFormatter: showIndicators.momentum
          ? () => ''  // blank labels, MACD chart shows the real time labels below
          : undefined,
      },
      rightPriceScale: {
        borderColor: '#2a2a2a',
        scaleMargins: { top: 0.08, bottom: 0.25 }, // 75% price, 25% volume
        borderVisible: true,
      },
      crosshair: {
        mode: 1,
        vertLine: { color: '#758494', width: isMobile ? 2 : 1, style: 2 },
        horzLine: { color: '#758494', width: isMobile ? 2 : 1, style: 2 },
      },
      handleScroll: sharedHandleScroll,
      handleScale: sharedHandleScale,
    });
    chartRef.current = chart;

    // ── PRICE SERIES ─────────────────────────────────────────────────────
    if (chartType === 'candlestick') {
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: true,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
        borderUpColor: '#1e8a7a',
        borderDownColor: '#d32f2f',
        wickVisible: true,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      candlestickSeries.setData(data as any);

      // Determine if intraday (use AppScript-ported intraday VSA logic)
      const isIntraday = ['5m','15m','1h','4h'].includes(timeframe);

      // Add markers
      if (showIndicators.signals || showIndicators.vsa || showIndicators.vcp || showIndicators.candlePower) {
        const allMarkers: typeof calculatedIndicators.vsaMarkers = [];
        if (showIndicators.candlePower) {
          allMarkers.push(...calculatedIndicators.candlePowerMarkers);
        } else if (isIntraday && (showIndicators.vsa || showIndicators.vcp || showIndicators.signals)) {
          // Intraday: use AppScript intraday scalp markers (🎯 SNIPER, ⚡ HAKA, 🧊, 🥷, 🩸, ⚠️)
          allMarkers.push(...calculateIntradayScalpMarkers(data).markers);
        } else if (showIndicators.vsa || showIndicators.vcp) {
          allMarkers.push(...calculatedIndicators.vsaMarkers);
        } else if (showIndicators.signals) {
          allMarkers.push(...calculatedIndicators.vsaMarkers);
        }

        // Always include Breakout Volume Delta markers when signals or vsa are active
        // These show 🚀BR (real breakout), ⚠️UT (fake/upthrust), 📉BD, 🌱SP (spring)
        // Also force-include when coming from spring screener regardless of toggles
        if (showIndicators.signals || showIndicators.vsa || isSpringFromScreener) {
          allMarkers.push(...calculatedIndicators.breakoutDeltaMarkers);
        }

        if (allMarkers.length > 0) {
          // Deduplicate by time:
          // For Spring screener: BVD markers (🌱SP) have highest priority
          // For others: BVD overrides on breakout bars (more specific info)
          const markerMap = new Map<string, typeof allMarkers[0]>();
          // First pass: add VSA/candle power markers
          allMarkers.forEach(marker => {
            const key = marker.time.toString();
            if (!markerMap.has(key)) markerMap.set(key, marker);
          });
          // Second pass: BVD markers override on breakout/spring bars
          calculatedIndicators.breakoutDeltaMarkers.forEach(marker => {
            markerMap.set(marker.time.toString(), marker);
          });
          const uniqueMarkers = Array.from(markerMap.values()).sort((a, b) => (a.time as number) - (b.time as number));
          candlestickSeries.setMarkers(uniqueMarkers as any);
        }
      }
    } else {
      const lineSeries = chart.addLineSeries({
        color: '#2962FF',
        lineWidth: isMobile ? 3 : 2,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: isMobile ? 6 : 4,
      });
      lineSeries.setData(data.map((d) => ({ time: d.time, value: d.close })) as any);
    }

    // ── MOVING AVERAGES ───────────────────────────────────────────────────
    if (showIndicators.ma) {
      const isMAOnlyMode = !showIndicators.momentum && !showIndicators.ao && !showIndicators.fibonacci &&
                           !showIndicators.vsa && !showIndicators.vcp && !showIndicators.candlePower;
      if (isMAOnlyMode || showIndicators.momentum || showIndicators.ao || showIndicators.fibonacci) {
        if (calculatedIndicators.ma5.length > 0) {
          const s = chart.addLineSeries({ color: '#2962FF', lineWidth: isMobile ? 2 : 1, priceLineVisible: false, lastValueVisible: false });
          s.setData(calculatedIndicators.ma5 as any);
        }
      }
      if (calculatedIndicators.ma20.length > 0) {
        const s = chart.addLineSeries({ color: '#f1c40f', lineWidth: isMobile ? 3 : 2, priceLineVisible: false, lastValueVisible: false });
        s.setData(calculatedIndicators.ma20 as any);
      }
      if (calculatedIndicators.ma50.length > 0) {
        const s = chart.addLineSeries({ color: '#e67e22', lineWidth: isMobile ? 3 : 2, priceLineVisible: false, lastValueVisible: false });
        s.setData(calculatedIndicators.ma50 as any);
      }
      if (isMAOnlyMode || showIndicators.momentum || showIndicators.ao || showIndicators.fibonacci) {
        if (calculatedIndicators.ma200.length > 0) {
          const s = chart.addLineSeries({ color: '#9b59b6', lineWidth: isMobile ? 2 : 1, priceLineVisible: false, lastValueVisible: false });
          s.setData(calculatedIndicators.ma200 as any);
        }
      }
    }

    // ── FIBONACCI ─────────────────────────────────────────────────────────
    if (showIndicators.fibonacci) {
      const fib382Series = chart.addLineSeries({ color: '#3498db', lineWidth: isMobile ? 2 : 1, lineStyle: 2, priceLineVisible: false });
      fib382Series.setData(calculatedIndicators.fibonacci.f382 as any);
      const fib500Series = chart.addLineSeries({ color: '#e74c3c', lineWidth: isMobile ? 2 : 1, lineStyle: 2, priceLineVisible: false });
      fib500Series.setData(calculatedIndicators.fibonacci.f500 as any);
      const fib618Series = chart.addLineSeries({ color: '#00b894', lineWidth: isMobile ? 2 : 1, lineStyle: 2, priceLineVisible: false });
      fib618Series.setData(calculatedIndicators.fibonacci.f618 as any);
    }

    // ── SUPPORT / RESISTANCE ZONES ────────────────────────────────────────
    if (showIndicators.sr) {
      const srZones = calculatedIndicators.supportResistance.zones;
      srZones.forEach((zone) => {
        const isResistance = zone.type === 'resistance';
        const fillColor = isResistance ? 'rgba(239, 83, 80, 0.15)' : 'rgba(38, 166, 154, 0.15)';
        const lineColor  = isResistance ? 'rgba(239, 83, 80, 0.8)' : 'rgba(38, 166, 154, 0.8)';

        const baselineSeries = chart.addBaselineSeries({
          baseValue: { type: 'price', price: zone.bottom },
          topLineColor: fillColor, topFillColor1: fillColor, topFillColor2: fillColor,
          bottomLineColor: fillColor, bottomFillColor1: 'transparent', bottomFillColor2: 'transparent',
          priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
        });
        const areaData = [];
        for (let i = zone.startIndex; i < data.length; i++) areaData.push({ time: data[i].time, value: zone.top });
        baselineSeries.setData(areaData as any);

        const topSeries = chart.addLineSeries({ color: lineColor, lineWidth: isMobile ? 2 : 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: true });
        const topData = [];
        for (let i = zone.startIndex; i < data.length; i++) topData.push({ time: data[i].time, value: zone.top });
        topSeries.setData(topData as any);

        const bottomSeries = chart.addLineSeries({ color: lineColor, lineWidth: isMobile ? 2 : 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: true });
        const bottomData = [];
        for (let i = zone.startIndex; i < data.length; i++) bottomData.push({ time: data[i].time, value: zone.bottom });
        bottomSeries.setData(bottomData as any);
      });
    }

    // ── VOLUME (overlay on main chart, bottom 25%) ────────────────────────
    if (data[0]?.volume) {
      const volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: 'vol',
      });
      chart.priceScale('vol').applyOptions({
        scaleMargins: { top: 0.75, bottom: 0 }, // Bottom 25% of main chart
      });
      const volumeData = data.map((d) => ({
        time: d.time,
        value: d.volume || 0,
        color: d.close >= d.open ? '#26a69a80' : '#ef535080',
      }));
      volumeSeries.setData(volumeData as any);
    }

    // Auto-fit main chart, then sync MACD to same range
    const timeoutId = setTimeout(() => {
      if (chartRef.current) {
        try {
          chart.timeScale().fitContent();
          if (isMobile && data.length > 50) {
            chart.timeScale().setVisibleRange({
              from: data[Math.max(0, data.length - 30)].time as any,
              to: data[data.length - 1].time as any,
            });
          }
          // Sync MACD to match main chart's logical range after fit
          if (macdChartRef.current) {
            try {
              const logicalRange = chart.timeScale().getVisibleLogicalRange();
              if (logicalRange) {
                macdChartRef.current.timeScale().setVisibleLogicalRange(logicalRange);
              }
            } catch (e) {}
          }
        } catch (e) {}
      }
    }, 150);

    // ── MACD CHART (separate container, synced time scale) ────────────────
    if (showIndicators.momentum && calculatedIndicators.momentum.length > 0 && macdContainerRef.current) {
      const macdChart = createChart(macdContainerRef.current, {
        layout: sharedLayout,
        grid: sharedGrid,
        width: macdContainerRef.current.clientWidth,
        height: macdHeight,
        timeScale: {
          ...sharedTimeScale,
          visible: true, // MACD shows the real time labels
        },
        rightPriceScale: {
          borderColor: '#2a2a2a',
          scaleMargins: { top: 0.1, bottom: 0.1 },
          borderVisible: true,
        },
        crosshair: {
          mode: 1,
          vertLine: { color: '#758494', width: isMobile ? 2 : 1, style: 2 },
          horzLine: { color: '#758494', width: isMobile ? 2 : 1, style: 2 },
        },
        handleScroll: sharedHandleScroll,
        handleScale: sharedHandleScale,
      });
      macdChartRef.current = macdChart;

      const macdSeries = macdChart.addHistogramSeries({
        color: '#00b894',
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
        priceScaleId: 'right',
      });
      macdSeries.setData(calculatedIndicators.momentum as any);

      // ── SYNC with lock flag to prevent infinite feedback loop ──────────
      let isSyncing = false;

      // Main → MACD  (primary direction)
      chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (isSyncing || !range || !macdChartRef.current) return;
        isSyncing = true;
        try { macdChartRef.current.timeScale().setVisibleLogicalRange(range); } catch (e) {}
        isSyncing = false;
      });

      // MACD → Main  (secondary direction, so user can also pan MACD)
      macdChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (isSyncing || !range || !chartRef.current) return;
        isSyncing = true;
        try { chartRef.current.timeScale().setVisibleLogicalRange(range); } catch (e) {}
        isSyncing = false;
      });
    }

    // ── RESIZE ────────────────────────────────────────────────────────────
    const handleResize = () => {
      try {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
        if (macdContainerRef.current && macdChartRef.current) {
          macdChartRef.current.applyOptions({ width: macdContainerRef.current.clientWidth });
        }
      } catch (e) {}
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        try { chartRef.current.remove(); } catch (e) {}
        chartRef.current = null;
      }
      if (macdChartRef.current) {
        try { macdChartRef.current.remove(); } catch (e) {}
        macdChartRef.current = null;
      }
    };
  }, [data, chartType, showIndicators]);

  // Additional cleanup effect for component unmounting
  useEffect(() => {
    return () => {
      // Ensure chart is properly disposed when component unmounts
      if (chartRef.current) {
        try {
          chartRef.current.remove();
        } catch (e) {
          console.warn('Error disposing chart on unmount:', e);
        } finally {
          chartRef.current = null;
        }
      }
    };
  }, []);

  return (
    <div className="w-full">
      {/* Compact Sticky Controls - Glassmorphism */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-white/5 border-b border-white/10">
        {/* Main Control Bar - Always Visible */}
        <div className="flex items-center justify-between p-2 md:p-3 gap-2 flex-wrap">
          {/* Left: Quick Mode Buttons with Labels */}
          {/* Left: Quick Mode Buttons */}
          <div className="flex gap-1.5 flex-wrap">
            {/* MA — sinusoidal wave icon */}
            <button
              onClick={setMAMode}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-md ${
                showIndicators.ma && !showIndicators.momentum && !showIndicators.vsa && !showIndicators.candlePower
                  ? 'backdrop-blur-md bg-yellow-500/30 text-white ring-2 ring-yellow-400/50'
                  : 'backdrop-blur-md bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
              }`}
              title="Moving Averages"
            >
              {/* Sine wave / MA ribbon */}
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M2 12 C4 6, 7 6, 9 12 S14 18, 16 12 S21 6, 23 12" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} opacity="0.5"
                  d="M2 16 C4 10, 7 10, 9 16 S14 22, 16 16 S21 10, 23 16" />
              </svg>
              <span className="hidden md:inline">MA</span>
            </button>

            {/* VSA — radar / signal detection */}
            <button
              onClick={setVSAMode}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-md ${
                showIndicators.vsa || showIndicators.vcp
                  ? 'backdrop-blur-md bg-orange-500/30 text-white ring-2 ring-orange-400/50'
                  : 'backdrop-blur-md bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
              }`}
              title="VSA & VCP Patterns"
            >
              {/* Radar pulse icon */}
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="2" strokeWidth={2}/>
                <path strokeLinecap="round" strokeWidth={1.8} d="M12 2a10 10 0 0 1 7.07 17.07"/>
                <path strokeLinecap="round" strokeWidth={1.5} d="M12 5a7 7 0 0 1 4.95 11.95"/>
                <path strokeLinecap="round" strokeWidth={1.2} d="M12 8a4 4 0 0 1 2.83 6.83"/>
                <line x1="12" y1="12" x2="19" y2="5" strokeWidth={1.5} strokeLinecap="round"/>
              </svg>
              <span className="hidden md:inline">VSA</span>
            </button>

            {/* Candle Power — CPU / processor chip */}
            <button
              onClick={setCandlePowerMode}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-md ${
                showIndicators.candlePower
                  ? 'backdrop-blur-md bg-green-500/30 text-white ring-2 ring-green-400/50'
                  : 'backdrop-blur-md bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
              }`}
              title="Candle Power Analysis"
            >
              {/* CPU chip icon */}
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="7" y="7" width="10" height="10" rx="1" strokeWidth={1.8}/>
                <rect x="9" y="9" width="6" height="6" rx="0.5" strokeWidth={1.2}/>
                <path strokeLinecap="round" strokeWidth={1.8} d="M9 4v3M12 4v3M15 4v3M9 17v3M12 17v3M15 17v3M4 9h3M4 12h3M4 15h3M17 9h3M17 12h3M17 15h3"/>
              </svg>
              <span className="hidden md:inline">Power</span>
            </button>
          </div>

          {/* Center: Chart Type */}
          <div className="flex gap-1.5">
            {/* Candlestick — OHLC bars icon */}
            <button
              onClick={() => setChartType('candlestick')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition ${
                chartType === 'candlestick'
                  ? 'backdrop-blur-md bg-blue-500/30 text-white ring-2 ring-blue-400/50'
                  : 'backdrop-blur-md bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
              }`}
              title="Candlestick Chart"
            >
              {/* 3 candle bars: wick + body */}
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="5"  y1="3"  x2="5"  y2="21" strokeWidth={1.2} strokeLinecap="round"/>
                <rect x="3"  y="7"  width="4" height="8"  rx="0.5" strokeWidth={1.8}/>
                <line x1="12" y1="2"  x2="12" y2="22" strokeWidth={1.2} strokeLinecap="round"/>
                <rect x="10" y="5"  width="4" height="10" rx="0.5" strokeWidth={1.8}/>
                <line x1="19" y1="4"  x2="19" y2="20" strokeWidth={1.2} strokeLinecap="round"/>
                <rect x="17" y="8"  width="4" height="7"  rx="0.5" strokeWidth={1.8}/>
              </svg>
              <span className="hidden md:inline">Candle</span>
            </button>

            {/* Line — smooth trend line */}
            <button
              onClick={() => setChartType('line')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition ${
                chartType === 'line'
                  ? 'backdrop-blur-md bg-blue-500/30 text-white ring-2 ring-blue-400/50'
                  : 'backdrop-blur-md bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
              }`}
              title="Line Chart"
            >
              {/* Smooth upward curve */}
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 17 C6 17, 7 10, 10 9 S15 12, 17 8 S20 4, 21 4"/>
                <circle cx="21" cy="4" r="1.5" strokeWidth={1.5}/>
                <circle cx="3"  cy="17" r="1.5" strokeWidth={1.5}/>
              </svg>
              <span className="hidden md:inline">Line</span>
            </button>
          </div>

          {/* Right: Toggle Indicators */}
          <div className="flex gap-1.5 flex-wrap">
            {/* S/R — horizontal zone layers */}
            <button
              onClick={() => setShowIndicators(prev => ({ ...prev, sr: !prev.sr }))}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition ${
                showIndicators.sr
                  ? 'backdrop-blur-md bg-purple-500/30 text-white ring-2 ring-purple-400/50'
                  : 'backdrop-blur-md bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
              }`}
              title="Support/Resistance Zones"
            >
              {/* Two filled zone bands with price line through */}
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="2" y="5"  width="20" height="3" rx="1" strokeWidth={1.5} opacity="0.7"/>
                <rect x="2" y="16" width="20" height="3" rx="1" strokeWidth={1.5} opacity="0.7"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  strokeDasharray="2 2" d="M2 12h20"/>
                <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
              </svg>
              <span className="hidden md:inline">S/R</span>
            </button>

            {/* MACD — waveform histogram bars */}
            <button
              onClick={() => setShowIndicators(prev => ({ ...prev, momentum: !prev.momentum }))}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition ${
                showIndicators.momentum
                  ? 'backdrop-blur-md bg-cyan-500/30 text-white ring-2 ring-cyan-400/50'
                  : 'backdrop-blur-md bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
              }`}
              title="MACD Histogram"
            >
              {/* Diverging histogram bars above/below zero line */}
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="2" y1="12" x2="22" y2="12" strokeWidth={1} strokeDasharray="2 1" opacity="0.5"/>
                <rect x="3"  y="6"  width="3" height="6"  rx="0.5" strokeWidth={1.6}/>
                <rect x="7"  y="4"  width="3" height="8"  rx="0.5" strokeWidth={1.6}/>
                <rect x="11" y="9"  width="3" height="3"  rx="0.5" strokeWidth={1.6}/>
                <rect x="15" y="12" width="3" height="5"  rx="0.5" strokeWidth={1.6}/>
                <rect x="19" y="12" width="3" height="7"  rx="0.5" strokeWidth={1.6}/>
              </svg>
              <span className="hidden md:inline">MACD</span>
            </button>

            {/* More / collapse — chevron with gear hint */}
            <button
              onClick={() => setShowControls(!showControls)}
              className="backdrop-blur-md bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-md"
              title="More Options"
            >
              {/* Settings sliders icon */}
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="4"  y1="6"  x2="20" y2="6"  strokeWidth={1.8} strokeLinecap="round"/>
                <line x1="4"  y1="12" x2="20" y2="12" strokeWidth={1.8} strokeLinecap="round"/>
                <line x1="4"  y1="18" x2="20" y2="18" strokeWidth={1.8} strokeLinecap="round"/>
                <circle cx="8"  cy="6"  r="2" fill="currentColor" strokeWidth={0}/>
                <circle cx="16" cy="12" r="2" fill="currentColor" strokeWidth={0}/>
                <circle cx="10" cy="18" r="2" fill="currentColor" strokeWidth={0}/>
              </svg>
              <span className="hidden md:inline">Tools</span>
              {/* Collapse arrow */}
              <svg className={`w-3 h-3 transition-transform ${showControls ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Expandable Controls */}
        {showControls && (
          <div className="p-3 border-t border-white/10 backdrop-blur-md bg-white/5 space-y-2 animate-in slide-in-from-top duration-200">
            <div className="flex gap-1.5 flex-wrap items-center">
              <span className="text-xs text-gray-400 mr-1 flex items-center gap-1">
                {/* Magnifier with cross-hair */}
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="11" cy="11" r="7" strokeWidth={1.8}/>
                  <line x1="16.5" y1="16.5" x2="22" y2="22" strokeWidth={2} strokeLinecap="round"/>
                  <line x1="11" y1="8" x2="11" y2="14" strokeWidth={1.5} strokeLinecap="round"/>
                  <line x1="8"  y1="11" x2="14" y2="11" strokeWidth={1.5} strokeLinecap="round"/>
                </svg>
                Zoom:
              </span>
              <button
                onClick={() => {
                  if (chartRef.current) {
                    try {
                      const timeScale = chartRef.current.timeScale();
                      const visibleRange = timeScale.getVisibleRange();
                      if (visibleRange) {
                        const duration = visibleRange.to - visibleRange.from;
                        const center = (visibleRange.from + visibleRange.to) / 2;
                        const newDuration = duration * 0.7;
                        timeScale.setVisibleRange({
                          from: (center - newDuration / 2) as any,
                          to: (center + newDuration / 2) as any,
                        });
                      }
                    } catch (e) {}
                  }
                }}
                className="backdrop-blur-md bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 px-2.5 py-1 rounded-lg text-xs text-white font-semibold transition flex items-center gap-1 shadow-md"
              >
                {/* Plus in magnifier */}
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="10" cy="10" r="6" strokeWidth={2}/>
                  <line x1="14.5" y1="14.5" x2="20" y2="20" strokeWidth={2} strokeLinecap="round"/>
                  <line x1="10" y1="7" x2="10" y2="13" strokeWidth={2} strokeLinecap="round"/>
                  <line x1="7"  y1="10" x2="13" y2="10" strokeWidth={2} strokeLinecap="round"/>
                </svg>
                <span>In</span>
              </button>
              <button
                onClick={() => {
                  if (chartRef.current) {
                    try {
                      const timeScale = chartRef.current.timeScale();
                      const visibleRange = timeScale.getVisibleRange();
                      if (visibleRange) {
                        const duration = visibleRange.to - visibleRange.from;
                        const center = (visibleRange.from + visibleRange.to) / 2;
                        const newDuration = duration * 1.4;
                        timeScale.setVisibleRange({
                          from: (center - newDuration / 2) as any,
                          to: (center + newDuration / 2) as any,
                        });
                      }
                    } catch (e) {}
                  }
                }}
                className="backdrop-blur-md bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 px-2.5 py-1 rounded-lg text-xs text-white font-semibold transition flex items-center gap-1 shadow-md"
              >
                {/* Minus in magnifier */}
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="10" cy="10" r="6" strokeWidth={2}/>
                  <line x1="14.5" y1="14.5" x2="20" y2="20" strokeWidth={2} strokeLinecap="round"/>
                  <line x1="7" y1="10" x2="13" y2="10" strokeWidth={2} strokeLinecap="round"/>
                </svg>
                <span>Out</span>
              </button>
              <button
                onClick={() => {
                  if (chartRef.current) {
                    try {
                      chartRef.current.timeScale().fitContent();
                    } catch (e) {}
                  }
                }}
                className="backdrop-blur-md bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 px-2.5 py-1 rounded-lg text-xs text-white font-semibold transition flex items-center gap-1 shadow-md"
              >
                {/* Expand arrows to corners */}
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 14v6h6M20 10V4h-6M4 10V4h6M20 14v6h-6"/>
                </svg>
                <span>Fit</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Trading Signals Panel - Wyckoff + VSA + VCP */}
      {indicators && showIndicators.signals && (
        <div className="backdrop-blur-xl bg-white/5 border-b border-white/10 p-2 md:p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0 space-y-2">

              {/* ── Row 1: Signals ────────────────────────────────────────── */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 items-center">
                {indicators.signals.bandar && indicators.signals.bandar !== '⬜ Netral' && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-white">
                    {/* Signal tower / broadcast */}
                    <svg className="w-3 h-3 text-blue-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeWidth={1.8} d="M5 12.55a11 11 0 0114.08 0"/>
                      <path strokeLinecap="round" strokeWidth={1.8} d="M1.42 9a16 16 0 0121.16 0"/>
                      <path strokeLinecap="round" strokeWidth={1.8} d="M8.53 16.11a6 6 0 016.95 0"/>
                      <circle cx="12" cy="20" r="1.5" fill="currentColor" strokeWidth={0}/>
                    </svg>
                    {indicators.signals.bandar}
                  </span>
                )}
                {indicators.signals.wyckoffPhase && indicators.signals.wyckoffPhase !== '⬜ Analisis...' && (
                  <span className="text-xs text-gray-300">
                    <span className="text-gray-500">Wyckoff: </span>{indicators.signals.wyckoffPhase}
                  </span>
                )}
                {indicators.signals.vcpStatus && indicators.signals.vcpStatus !== '⬜ Tidak Aktif' && (
                  <span className="text-xs text-orange-300">
                    <span className="text-orange-500">VCP: </span>{indicators.signals.vcpStatus}
                  </span>
                )}
              </div>

              {/* ── Row 1b: Breakout Volume Delta ───────────────────────── */}
              {indicators.latestBreakoutDelta && (
                <div className="flex flex-wrap items-center gap-2">
                  {/* Direction badge */}
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                    indicators.latestBreakoutDelta.isFakeBreakout
                      ? 'bg-red-500/20 text-red-300 border-red-500/40'
                      : indicators.latestBreakoutDelta.isRealBreakout
                      ? 'bg-green-500/20 text-green-300 border-green-500/40'
                      : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                  }`}>
                    {indicators.latestBreakoutDelta.isFakeBreakout
                      ? (indicators.latestBreakoutDelta.direction === 'bull' ? '⚠️ FAKE BR (Upthrust)' : '🌱 FAKE BD (Spring)')
                      : indicators.latestBreakoutDelta.isRealBreakout
                      ? (indicators.latestBreakoutDelta.direction === 'bull' ? '🚀 REAL BREAKOUT' : '📉 REAL BREAKDOWN')
                      : '🔶 BREAKOUT (Lemah)'}
                  </span>
                  {/* Volume delta bar */}
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <span className="text-green-400 font-mono">Bull {indicators.latestBreakoutDelta.bullPct}%</span>
                    <span className="text-gray-600">|</span>
                    <span className="text-red-400 font-mono">Bear {indicators.latestBreakoutDelta.bearPct}%</span>
                  </span>
                  {/* Mini visual bar */}
                  <div className="flex-1 max-w-[80px] h-2 rounded-full overflow-hidden bg-gray-700 hidden sm:flex">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${indicators.latestBreakoutDelta.bullPct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">@ {indicators.latestBreakoutDelta.level.toLocaleString('id-ID')}</span>
                </div>
              )}

              {/* ── Row 2: Candle Power + Next Candle ────────────────────── */}
              {showIndicators.candlePower && indicators.signals.cppScore !== undefined && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-gray-400">
                    Power: <span className="text-white font-mono font-bold">
                      {indicators.candlePowerAnalysis.match(/Power: (\d+)/)?.[1] ?? '—'}
                    </span>
                  </span>
                  <span className={`text-xs font-mono ${indicators.signals.cppScore > 0 ? 'text-green-400' : indicators.signals.cppScore < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                    CPP {indicators.signals.cppScore > 0 ? '+' : ''}{indicators.signals.cppScore}
                  </span>
                  {indicators.signals.evrScore !== 0 && (
                    <span className={`text-xs font-mono ${indicators.signals.evrScore > 0 ? 'text-cyan-400' : 'text-orange-400'}`}>
                      EVR {indicators.signals.evrScore > 0 ? '+' : ''}{indicators.signals.evrScore}
                    </span>
                  )}
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                    indicators.signals.cppBias === 'BULLISH' ? 'bg-green-500/20 text-green-300 border-green-500/40'
                    : indicators.signals.cppBias === 'BEARISH' ? 'bg-red-500/20 text-red-300 border-red-500/40'
                    : 'bg-gray-600/30 text-gray-300 border-gray-500/40'
                  }`}>
                    {indicators.signals.cppBias === 'BULLISH' ? '📈 Next: BULLISH'
                     : indicators.signals.cppBias === 'BEARISH' ? '📉 Next: BEARISH'
                     : '➡️ Next: NEUTRAL'}
                  </span>
                </div>
              )}

              {/* ── Row 3: Legend ─────────────────────────────────────────── */}
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 pt-0.5 border-t border-white/5">
                {(['5m','15m','1h','4h'].includes(timeframe) ? ([
                  ['🎯', 'text-yellow-300',  'SCALP SNIPER — VCP+DryUp intraday'],
                  ['⚡', 'text-green-300',   'HAKA! — Scalp breakout kuat'],
                  ['🧊', 'text-cyan-300',    'ICEBERG — Akumulasi tersembunyi'],
                  ['🥷', 'text-blue-300',    'MICRO DRY UP — Pengeringan supply'],
                  ['🩸', 'text-red-300',     'DUMP — Jual paksa, hindari'],
                  ['⚠️', 'text-orange-300',  'PUCUK — Distribusi, jebakan naik'],
                  ['CPP', 'text-gray-300',   'Cumulative Power Prediction'],
                ] as [string, string, string][]) : ([
                  ['NS',    'text-blue-300',   'No Supply — penjual habis'],
                  ['SC',    'text-green-300',  'Selling Climax — akumulasi institusi'],
                  ['BC',    'text-red-300',    'Buying Climax — distribusi institusi'],
                  ['UT',    'text-orange-300', 'Upthrust — jebakan breakout'],
                  ['ND',    'text-yellow-300', 'No Demand — kenaikan palsu'],
                  ['SV',    'text-cyan-300',   'Stopping Volume — smart money masuk'],
                  ['ABS',   'text-pink-300',   'Absorption — distribusi tersembunyi'],
                  ['SOS',   'text-purple-300', 'Sign of Strength — akumulasi tersembunyi'],
                  ['T2/T3', 'text-violet-300', 'VCP Tightening — kontraksi volatilitas'],
                  ['PIVOT', 'text-amber-300',  'VCP Pivot — breakout optimal (RMV≤15)'],
                  ['CPP',   'text-gray-300',   'Cumulative Power Prediction'],
                  ['EVR',   'text-gray-300',   'Effort vs Result anomaly'],
                  ['🚀BR',  'text-green-300',  'Real Breakout — bull vol dominan (≥55%)'],
                  ['⚠️UT',  'text-red-300',    'Fake Breakout / Upthrust — bear vol dominan'],
                  ['📉BD',  'text-red-400',    'Real Breakdown — bear vol dominan'],
                  ['🌱SP',  'text-green-400',  'Fake Breakdown / Spring — bull vol dominan'],
                ] as [string, string, string][])
                ).map(([abbr, color, desc]) => (
                  <span key={abbr} className="text-xs flex items-center gap-1">
                    <span className={`font-bold font-mono ${color}`}>{abbr}</span>
                    <span className="text-gray-500 hidden sm:inline">= {desc}</span>
                  </span>
                ))}
              </div>

              {/* ── Row 4: KESIMPULAN ─────────────────────────────────────── */}
              {(() => {
                const bias    = indicators.signals.cppBias;
                const cpp     = indicators.signals.cppScore ?? 0;
                const evr     = indicators.signals.evrScore ?? 0;
                const vsa     = indicators.signals.bandar ?? '';
                const wyckoff = indicators.signals.wyckoffPhase ?? '';
                const vcp     = indicators.signals.vcpStatus ?? '';
                const bvd     = indicators.latestBreakoutDelta;

                const isHAKA      = vsa.includes('HAKA');
                const isVSABull   = isHAKA || vsa.includes('🟢') || /NS|SC|SV|SOS|Iceberg|Dry Up/i.test(vsa);
                const isVSABear   = vsa.includes('🔴') || /BC|UT|Distribusi|ABS/i.test(vsa);
                const isWyBull    = /ACCUMULATION|MARKUP/.test(wyckoff);
                const isWyBear    = /DISTRIBUTION|MARKDOWN/.test(wyckoff);
                const isVCPReady  = /PIVOT|BASE/.test(vcp);

                // BVD signals
                const isBVDFakeBull = bvd?.direction === 'bull' && bvd.isFakeBreakout;   // Upthrust → bearish
                const isBVDRealBull = bvd?.direction === 'bull' && bvd.isRealBreakout;   // confirmed breakout
                const isBVDFakeBear = bvd?.direction === 'bear' && bvd.isFakeBreakout;   // Spring → bullish
                const isBVDRealBear = bvd?.direction === 'bear' && bvd.isRealBreakout;   // confirmed breakdown

                // Score: BVD has high weight (±2) because it directly addresses
                // the core question "is this breakout real or a trap?"
                const bullScore = (bias === 'BULLISH' ? 2 : 0)
                  + (isVSABull ? 1 : 0) + (isWyBull ? 1 : 0) + (isVCPReady ? 1 : 0)
                  + (evr > 0.3 ? 1 : 0)
                  + (isBVDRealBull ? 2 : 0)   // confirmed bull breakout +2
                  + (isBVDFakeBear ? 2 : 0);  // fake breakdown (spring) +2

                const bearScore = (bias === 'BEARISH' ? 2 : 0)
                  + (isVSABear ? 1 : 0) + (isWyBear ? 1 : 0)
                  + (isBVDRealBear ? 2 : 0)   // confirmed breakdown +2
                  + (isBVDFakeBull ? 2 : 0);  // fake breakout (upthrust) +2

                // BVD context string
                const bvdCtx = isBVDFakeBull
                  ? ` ⚠️ BVD: Breakout PALSU — bear vol ${bvd!.bearPct}% dominan, kemungkinan besar Upthrust/jebakan! Hindari entry.`
                  : isBVDRealBull
                  ? ` 🚀 BVD: Breakout VALID — bull vol ${bvd!.bullPct}% dominan, institusi mendorong harga naik.`
                  : isBVDFakeBear
                  ? ` 🌱 BVD: Breakdown PALSU (Spring) — bull vol ${bvd!.bullPct}% dominan di area support, peluang reversal naik!`
                  : isBVDRealBear
                  ? ` 📉 BVD: Breakdown VALID — bear vol ${bvd!.bearPct}% dominan, jauhi posisi long.`
                  : '';

                let icon = '⬜', col = 'bg-gray-700/30 border-gray-600/30 text-gray-300', text = '';

                // Fake breakout overrides everything — strongest warning
                if (isBVDFakeBull && bearScore >= 2) {
                  icon = '🚨'; col = 'bg-red-900/40 border-red-500/50 text-red-200';
                  text = `JEBAKAN BREAKOUT (Upthrust)! Bear vol ${bvd!.bearPct}% mendominasi saat harga tembus resistance — institusi DISTRIBUSI di atas level ini. CPP ${cpp}.${isVSABear ? ' VSA juga konfirmasi distribusi.' : ''} Sangat disarankan TIDAK entry atau segera kurangi posisi.`;
                // Spring / fake breakdown = strong buy setup
                } else if (isBVDFakeBear && bullScore >= 2) {
                  icon = '🌱'; col = 'bg-green-900/40 border-green-500/50 text-green-200';
                  text = `SPRING terdeteksi! Harga sempat tembus support tapi bull vol ${bvd!.bullPct}% dominan — smart money AKUMULASI di bawah support. CPP ${cpp > 0 ? '+' : ''}${cpp}.${isVSABull ? ' VSA konfirmasi kekuatan.' : ''} Setup reversal naik berkualitas tinggi.`;
                // Real breakout confirmed
                } else if (isBVDRealBull && bullScore >= 3) {
                  icon = '🚀'; col = 'bg-green-900/30 border-green-600/30 text-green-200';
                  text = `Breakout VALID — bull vol ${bvd!.bullPct}% konfirmasi momentum naik. CPP ${cpp > 0 ? '+' : ''}${cpp}.${isHAKA ? ' 🔥 HAKA Cooldown mendukung.' : ''}${isVCPReady ? ' VCP pivot siap.' : ''}${isWyBull ? ' Wyckoff ' + (wyckoff.includes('MARKUP') ? 'markup aktif.' : 'akumulasi.') : ''} Entry dengan stop di bawah level yang ditembus.`;
                // Real breakdown
                } else if (isBVDRealBear && bearScore >= 3) {
                  icon = '🔴'; col = 'bg-red-900/30 border-red-600/30 text-red-200';
                  text = `Breakdown VALID — bear vol ${bvd!.bearPct}% konfirmasi tekanan jual.${bvdCtx} CPP ${cpp}.${isWyBear ? ' Wyckoff markdown aktif.' : ''} Hindari posisi baru, pertimbangkan cut loss.`;
                // Standard scoring without BVD
                } else if (bullScore >= 4) {
                  icon = '🚀'; col = 'bg-green-900/30 border-green-600/30 text-green-200';
                  text = `Sinyal KUAT BELI — CPP ${cpp > 0 ? '+' : ''}${cpp} momentum bullish kuat.${isHAKA ? ' 🔥 HAKA Cooldown: markup agresif dengan sell vol rendah — berpotensi naik lagi!' : ''}${isVCPReady ? ' VCP pivot terbentuk, risiko/reward optimal.' : ''}${isVSABull && !isHAKA ? ' VSA konfirmasi akumulasi institusi.' : ''}${bvdCtx} Entry dengan stop di bawah support.`;
                } else if (bullScore >= 2 && bearScore === 0) {
                  icon = '🟢'; col = 'bg-green-900/20 border-green-700/30 text-green-300';
                  text = `Sinyal MODERAT BELI — CPP ${cpp > 0 ? '+' : ''}${cpp}.${isHAKA ? ' 🔥 HAKA Cooldown.' : isVSABull ? ' VSA bullish.' : ''}${isWyBull ? ' Wyckoff ' + (wyckoff.includes('MARKUP') ? 'markup.' : 'akumulasi.') : ''}${bvdCtx} Tunggu konfirmasi volume.`;
                } else if (bearScore >= 4) {
                  icon = '🔴'; col = 'bg-red-900/30 border-red-600/30 text-red-200';
                  text = `Sinyal KUAT JUAL — CPP ${cpp}.${isVSABear ? ' VSA distribusi.' : ''}${isWyBear ? ' Wyckoff ' + (wyckoff.includes('MARKDOWN') ? 'markdown.' : 'distribusi.') : ''}${bvdCtx} Hindari posisi baru, cut loss.`;
                } else if (bearScore >= 2 && bullScore === 0) {
                  icon = '🟡'; col = 'bg-yellow-900/20 border-yellow-700/30 text-yellow-200';
                  text = `Sinyal WASPADA — CPP ${cpp} melemah.${isVSABear ? ' Tanda distribusi.' : ''}${bvdCtx} Kurangi posisi atau trailing stop.`;
                } else {
                  icon = '⬜'; col = 'bg-gray-700/20 border-gray-600/30 text-gray-300';
                  text = `Sinyal NETRAL — CPP ${cpp}, supply-demand seimbang.${isVCPReady ? ' VCP base, pantau breakout+volume.' : ''}${bvdCtx} Tunggu sinyal tegas.`;
                }

                return (
                  <div className={`mt-1 rounded-lg border px-2 py-1.5 ${col}`}>
                    <p className="text-xs leading-relaxed">
                      <span className="font-bold mr-1">{icon} Kesimpulan:</span>{text}
                    </p>
                  </div>
                );
              })()}

            </div>

            {/* Close signal panel */}
            <button
              onClick={() => setShowIndicators(prev => ({ ...prev, signals: false }))}
              className="text-gray-400 hover:text-red-400 px-1 backdrop-blur-md bg-white/5 rounded-lg flex-shrink-0 mt-0.5"
              title="Hide signals"
            >
              {/* X with circuit dot corners */}
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="7" y1="7" x2="17" y2="17" strokeWidth={2} strokeLinecap="round"/>
                <line x1="17" y1="7" x2="7" y2="17" strokeWidth={2} strokeLinecap="round"/>
                <circle cx="5"  cy="5"  r="1.5" fill="currentColor" strokeWidth={0}/>
                <circle cx="19" cy="5"  r="1.5" fill="currentColor" strokeWidth={0}/>
                <circle cx="5"  cy="19" r="1.5" fill="currentColor" strokeWidth={0}/>
                <circle cx="19" cy="19" r="1.5" fill="currentColor" strokeWidth={0}/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Screener Context Banner ──────────────────────────────────────── */}
      {screenerCtx && showScreenerBanner && (() => {
        const sc = screenerCtx;
        const gradeColor: Record<string,string> = {
          'A+': 'from-emerald-900/60 to-emerald-800/30 border-emerald-500/40',
          'A':  'from-cyan-900/60 to-cyan-800/30 border-cyan-500/40',
          'B':  'from-yellow-900/60 to-yellow-800/30 border-yellow-500/40',
        };
        const bgCls = gradeColor[sc.grade] || 'from-gray-800/60 to-gray-700/30 border-gray-600/40';
        const gradeTextColor: Record<string,string> = {'A+':'text-emerald-300','A':'text-cyan-300','B':'text-yellow-300'};
        const gradeTxt = gradeTextColor[sc.grade] || 'text-gray-300';

        const typeLabel = sc.screenerType === 'scalp' ? '⚡ Scalp' : sc.screenerType === 'vcp' ? '📊 VCP' : sc.screenerType === 'spring' ? '🌱 Spring' : '📈 Swing';
        const entryLabel = sc.entryType === 'SNIPER' ? '🎯 Sniper Entry' : sc.entryType === 'BREAKOUT' ? '🚀 Breakout' : '👁️ Watch';
        const rr = sc.stopLoss > 0 && sc.target > 0 && sc.target > sc.stopLoss
          ? ((sc.target - (sc.stopLoss + sc.target) / 2) / (((sc.stopLoss + sc.target) / 2) - sc.stopLoss)).toFixed(1)
          : null;

        // Kesimpulan screener
        let kesimpulan = '';
        if (sc.screenerType === 'scalp') {
          kesimpulan = `${entryLabel} terdeteksi pada timeframe ${sc.timeframe}. Saham spike +${sc.gainFromBase.toFixed(1)}% lalu masuk fase cooldown dengan sell vol ${Math.round(sc.sellVolRatio * 100)}% (rendah). ` +
            `CPP ${sc.cppScore > 0 ? '+' : ''}${sc.cppScore} (${sc.cppBias}) — momentum ${sc.cppBias === 'BULLISH' ? 'masih bullish, siap markup lagi' : 'netral, tunggu konfirmasi'}. ` +
            `Acc Ratio ${sc.accRatio.toFixed(1)}x = buying pressure > selling. ` +
            (sc.vsaSignal !== 'NEUTRAL' ? `VSA: ${sc.vsaSignal} — sinyal institusi. ` : '') +
            `SL: Rp ${sc.stopLoss.toLocaleString('id-ID')} · TP: Rp ${sc.target.toLocaleString('id-ID')}${rr ? ` · R:R 1:${rr}` : ''}.`;
        } else if (sc.screenerType === 'swing') {
          kesimpulan = `${entryLabel} swing harian. Saham sudah naik +${sc.gainFromBase.toFixed(1)}% lalu calmdown dengan sell vol ${Math.round(sc.sellVolRatio * 100)}% (rendah). ` +
            `CPP ${sc.cppScore > 0 ? '+' : ''}${sc.cppScore} (${sc.cppBias}) — bias ${sc.cppBias === 'BULLISH' ? 'bullish: momentum lanjutan 1–5 hari ke depan' : 'netral: tunggu konfirmasi volume'}. ` +
            `Acc ${sc.accRatio.toFixed(1)}x · Power ${sc.powerScore}. ` +
            (sc.vsaSignal !== 'NEUTRAL' ? `VSA: ${sc.vsaSignal}. ` : '') +
            `SL: Rp ${sc.stopLoss.toLocaleString('id-ID')} · TP: Rp ${sc.target.toLocaleString('id-ID')}${rr ? ` · R:R 1:${rr}` : ''}.`;
        } else if (sc.screenerType === 'spring') {
          const barsAgo = sc.springBarsAgo ?? 0;
          const pivot = sc.pivotLevel ? `Rp ${Math.round(sc.pivotLevel).toLocaleString('id-ID')}` : 'pivot';
          kesimpulan = `🌱 Wyckoff Spring terdeteksi ${barsAgo === 0 ? 'hari ini' : barsAgo + ' hari lalu'}. ` +
            `Harga sempat breakdown ${pivot} (support pivot) namun volume beli mendominasi ${sc.springBullPct ?? '--'}% — tanda akumulasi institusional tersembunyi. ` +
            `CPP ${sc.cppScore > 0 ? '+' : ''}${sc.cppScore} (${sc.cppBias}). Acc ${sc.accRatio.toFixed(1)}x. ` +
            (sc.vsaSignal && sc.vsaSignal !== 'NEUTRAL' ? `VSA: ${sc.vsaSignal}. ` : '') +
            `Spring adalah setup terkuat Wyckoff: harga dipaksa turun untuk ambil likuiditas ritel, lalu langsung balik naik. ` +
            `SL: Rp ${sc.stopLoss.toLocaleString('id-ID')} (di bawah pivot) · TP: Rp ${sc.target.toLocaleString('id-ID')}${rr ? ` · R:R 1:${rr}` : ''}.`;
        } else {
          kesimpulan = `${entryLabel} VCP/Wyckoff setup. RMV ${Math.round(sc.rmv)} (${sc.rmv <= 15 ? 'kompresi ekstrem — pivot ready' : sc.rmv <= 30 ? 'kompresi sedang' : 'volatilitas normal'}). ` +
            `CPP ${sc.cppScore > 0 ? '+' : ''}${sc.cppScore} (${sc.cppBias}). Acc ${sc.accRatio.toFixed(1)}x. ` +
            (sc.vsaSignal !== 'NEUTRAL' ? `VSA: ${sc.vsaSignal}. ` : '') +
            `SL: Rp ${sc.stopLoss.toLocaleString('id-ID')} · TP: Rp ${sc.target.toLocaleString('id-ID')}${rr ? ` · R:R 1:${rr}` : ''}.`;
        }

        return (
          <div className={`border-b border-t-0 bg-gradient-to-r ${bgCls} px-3 py-2 md:px-4 md:py-3`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0 space-y-1.5">
                {/* Header row */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-white bg-black/30 px-2 py-0.5 rounded-full">
                    {typeLabel} Screener Signal
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-black/30 ${gradeTxt}`}>
                    Grade {sc.grade}
                  </span>
                  <span className="text-xs font-semibold text-white bg-black/20 px-2 py-0.5 rounded-full">
                    {entryLabel}
                  </span>
                  {sc.cppBias === 'BULLISH' && (
                    <span className="text-xs font-bold text-emerald-300 bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      📈 CPP {sc.cppScore > 0 ? '+' : ''}{sc.cppScore} BULLISH
                    </span>
                  )}
                  {sc.vsaSignal && sc.vsaSignal !== 'NEUTRAL' && (
                    <span className="text-xs font-bold text-cyan-300 bg-cyan-900/30 px-2 py-0.5 rounded-full border border-cyan-500/30">
                      VSA: {sc.vsaSignal}
                    </span>
                  )}
                </div>

                {/* Stats row */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {sc.screenerType === 'spring' ? (<>
                    <span><span className="text-gray-400">Spring: </span><span className="text-green-400 font-bold">{sc.springBarsAgo === 0 ? 'Today' : `${sc.springBarsAgo}d ago`}</span></span>
                    <span><span className="text-gray-400">Bull Vol: </span><span className="text-green-400 font-bold">{sc.springBullPct ?? '--'}%</span></span>
                    {sc.pivotLevel && <span><span className="text-gray-400">Pivot: </span><span className="text-white font-bold">Rp {Math.round(sc.pivotLevel).toLocaleString('id-ID')}</span></span>}
                    <span><span className="text-gray-400">Acc: </span><span className={`font-bold ${sc.accRatio >= 1.5 ? 'text-emerald-400' : 'text-yellow-400'}`}>{sc.accRatio.toFixed(1)}x</span></span>
                    <span><span className="text-gray-400">Power: </span><span className={`font-bold ${sc.powerScore >= 70 ? 'text-emerald-400' : 'text-yellow-400'}`}>{sc.powerScore}</span></span>
                  </>) : (<>
                    <span><span className="text-gray-400">Gain: </span><span className="text-white font-bold">+{sc.gainFromBase.toFixed(1)}%</span></span>
                    <span><span className="text-gray-400">Sell Vol: </span><span className={`font-bold ${sc.sellVolRatio < 0.3 ? 'text-emerald-400' : 'text-yellow-400'}`}>{Math.round(sc.sellVolRatio * 100)}%</span></span>
                    <span><span className="text-gray-400">Acc: </span><span className={`font-bold ${sc.accRatio >= 1.5 ? 'text-emerald-400' : 'text-yellow-400'}`}>{sc.accRatio.toFixed(1)}x</span></span>
                    <span><span className="text-gray-400">Power: </span><span className={`font-bold ${sc.powerScore >= 70 ? 'text-emerald-400' : 'text-yellow-400'}`}>{sc.powerScore}</span></span>
                    <span><span className="text-gray-400">RMV: </span><span className={`font-bold ${sc.rmv <= 15 ? 'text-blue-400' : sc.rmv <= 30 ? 'text-cyan-400' : 'text-gray-300'}`}>{Math.round(sc.rmv)}</span></span>
                  </>)}
                  {sc.stopLoss > 0 && <span><span className="text-red-400">SL: </span><span className="text-white font-bold">Rp {sc.stopLoss.toLocaleString('id-ID')}</span></span>}
                  {sc.target > 0 && <span><span className="text-emerald-400">TP: </span><span className="text-white font-bold">Rp {sc.target.toLocaleString('id-ID')}</span></span>}
                  {rr && <span><span className="text-gray-400">R:R </span><span className={`font-bold ${parseFloat(rr) >= 2 ? 'text-emerald-400' : 'text-yellow-400'}`}>1:{rr}</span></span>}
                </div>

                {/* Reason chips */}
                {sc.reason && (
                  <div className="flex flex-wrap gap-1">
                    {sc.reason.split(' · ').map((r, i) => (
                      <span key={i} className="text-xs bg-black/20 text-gray-300 px-1.5 py-0.5 rounded border border-white/10">{r}</span>
                    ))}
                  </div>
                )}

                {/* Kesimpulan */}
                <div className="bg-black/20 rounded-lg px-2.5 py-1.5 border border-white/10">
                  <p className="text-xs text-gray-200 leading-relaxed">
                    <span className="font-bold text-white mr-1">
                      {sc.grade === 'A+' ? '🚀' : sc.grade === 'A' ? '🟢' : '🟡'} Analisis Screener:
                    </span>
                    {kesimpulan}
                  </p>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={() => setShowScreenerBanner(false)}
                className="flex-shrink-0 text-gray-400 hover:text-white backdrop-blur-md bg-black/20 hover:bg-black/40 rounded-lg p-1 transition"
                title="Tutup banner screener"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── Chart Area ───────────────────────────────────────────────────── */}
      <div className="p-1 md:p-2 space-y-0">

        {/* Main Chart — Price + Volume overlay */}
        <div className="relative">
          {/* Volume label — bottom-left corner */}
          <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
            <span className="text-xs font-semibold text-gray-400 bg-gray-900/70 px-1.5 py-0.5 rounded">
              VOL
            </span>
          </div>
          {/* MA legend strip */}
          {showIndicators.ma && (
            <div className="absolute top-1 left-1 z-10 flex gap-2 pointer-events-none">
              <span className="text-xs font-bold text-blue-400 bg-gray-900/70 px-1 py-0.5 rounded">MA5</span>
              <span className="text-xs font-bold text-yellow-400 bg-gray-900/70 px-1 py-0.5 rounded">MA20</span>
              <span className="text-xs font-bold text-orange-400 bg-gray-900/70 px-1 py-0.5 rounded">MA50</span>
              <span className="text-xs font-bold text-purple-400 bg-gray-900/70 px-1 py-0.5 rounded">MA200</span>
            </div>
          )}
          <div ref={chartContainerRef} className="w-full" />
        </div>

        {/* MACD Histogram Panel — separate chart, synced */}
        {showIndicators.momentum && (
          <div className="relative border-t border-gray-700/60">
            {/* MACD label */}
            <div className="absolute top-1 left-2 z-10 pointer-events-none flex items-center gap-2">
              <span className="text-xs font-bold text-cyan-400 bg-gray-900/70 px-1.5 py-0.5 rounded">
                MACD Histogram
              </span>
              <span className="text-xs text-gray-500 bg-gray-900/60 px-1 py-0.5 rounded hidden sm:inline">
                Momentum indicator — green = bullish / red = bearish
              </span>
            </div>
            {/* Zero line label */}
            <div className="absolute right-12 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
              <span className="text-xs text-gray-600">0</span>
            </div>
            <div ref={macdContainerRef} className="w-full" />
          </div>
        )}
      </div>
    </div>
  );
}

