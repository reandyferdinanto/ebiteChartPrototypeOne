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

export default function StockChart({ data, timeframe = '1d' }: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef  = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const macdChartRef = useRef<any>(null);
  const [chartType, setChartType] = useState<'candlestick' | 'line'>('candlestick');
  const [showControls, setShowControls] = useState(true);
  // scalpSignal: populated when chart is opened from scalp screener
  const [scalpSignal, setScalpSignal] = useState<{ type: string; label: string } | null>(null);
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

  // Read scalpSignal from URL params when chart mounts
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const sig  = params.get('scalpSignal');
    const lbl  = params.get('scalpLabel');
    if (sig && lbl) {
      // URLSearchParams.get() already decodes the value, so use it directly.
      // Only attempt decodeURIComponent if the value still looks encoded.
      let safeLabel = lbl;
      try {
        // Only decode if it contains % sequences (double-encoded scenario)
        if (lbl.includes('%')) {
          safeLabel = decodeURIComponent(lbl);
        }
      } catch {
        // If decoding fails (malformed URI), use the raw value as-is
        safeLabel = lbl;
      }
      setScalpSignal({ type: sig, label: safeLabel });
      // Auto-enable VSA mode so user sees the markers immediately
      setShowIndicators(prev => ({ ...prev, vsa: true, vcp: true, candlePower: false, signals: true }));
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
        if (allMarkers.length > 0) {
          const markerMap = new Map();
          allMarkers.forEach(marker => {
            if (!markerMap.has(marker.time.toString())) markerMap.set(marker.time.toString(), marker);
          });
          const uniqueMarkers = Array.from(markerMap.values()).sort((a, b) => a.time - b.time);
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
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={setMAMode}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-md ${
                showIndicators.ma && !showIndicators.momentum && !showIndicators.vsa && !showIndicators.candlePower
                  ? 'backdrop-blur-md bg-yellow-500/30 text-white ring-2 ring-yellow-400/50' 
                  : 'backdrop-blur-md bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
              }`}
              title="Moving Averages"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <span className="hidden md:inline">MA</span>
            </button>
            <button
              onClick={setVSAMode}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-md ${
                showIndicators.vsa || showIndicators.vcp
                  ? 'backdrop-blur-md bg-orange-500/30 text-white ring-2 ring-orange-400/50' 
                  : 'backdrop-blur-md bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
              }`}
              title="VSA & VCP Patterns"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="hidden md:inline">VSA</span>
            </button>
            <button
              onClick={setCandlePowerMode}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-md ${
                showIndicators.candlePower
                  ? 'backdrop-blur-md bg-green-500/30 text-white ring-2 ring-green-400/50' 
                  : 'backdrop-blur-md bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
              }`}
              title="Candle Power Analysis"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="hidden md:inline">Power</span>
            </button>
          </div>

          {/* Center: Chart Type with Labels */}
          <div className="flex gap-1.5">
            <button
              onClick={() => setChartType('candlestick')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition ${
                chartType === 'candlestick'
                  ? 'backdrop-blur-md bg-blue-500/30 text-white ring-2 ring-blue-400/50'
                  : 'backdrop-blur-md bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
              }`}
              title="Candlestick Chart"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="hidden md:inline">Candle</span>
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition ${
                chartType === 'line'
                  ? 'backdrop-blur-md bg-blue-500/30 text-white ring-2 ring-blue-400/50'
                  : 'backdrop-blur-md bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
              }`}
              title="Line Chart"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <span className="hidden md:inline">Line</span>
            </button>
          </div>

          {/* Right: Toggle Controls & Indicators with Labels */}
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setShowIndicators(prev => ({ ...prev, sr: !prev.sr }))}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition ${
                showIndicators.sr
                  ? 'backdrop-blur-md bg-purple-500/30 text-white ring-2 ring-purple-400/50' 
                  : 'backdrop-blur-md bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
              }`}
              title="Support/Resistance Zones"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="hidden md:inline">S/R</span>
            </button>
            <button
              onClick={() => setShowIndicators(prev => ({ ...prev, momentum: !prev.momentum }))}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition ${
                showIndicators.momentum
                  ? 'backdrop-blur-md bg-cyan-500/30 text-white ring-2 ring-cyan-400/50' 
                  : 'backdrop-blur-md bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
              }`}
              title="MACD Histogram"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span className="hidden md:inline">MACD</span>
            </button>
            <button
              onClick={() => setShowControls(!showControls)}
              className="backdrop-blur-md bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-md"
              title="More Options"
            >
              <svg className={`w-3.5 h-3.5 transition-transform ${showControls ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <span className="hidden md:inline">More</span>
            </button>
          </div>
        </div>

        {/* Expandable Controls - Glassmorphism */}
        {showControls && (
          <div className="p-3 border-t border-white/10 backdrop-blur-md bg-white/5 space-y-2 animate-in slide-in-from-top duration-200">
            {/* Zoom Controls with Labels */}
            <div className="flex gap-1.5 flex-wrap items-center">
              <span className="text-xs text-gray-400 mr-1 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
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
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Zoom In</span>
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
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
                <span>Zoom Out</span>
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
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                <span>Fit All</span>
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
                    <svg className="w-3 h-3 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                const bias   = indicators.signals.cppBias;
                const cpp    = indicators.signals.cppScore ?? 0;
                const evr    = indicators.signals.evrScore ?? 0;
                const vsa    = indicators.signals.bandar ?? '';
                const wyckoff= indicators.signals.wyckoffPhase ?? '';
                const vcp    = indicators.signals.vcpStatus ?? '';

                const isHAKA     = vsa.includes('HAKA');
                const isVSABull  = isHAKA || vsa.includes('🟢') || /NS|SC|SV|SOS|Iceberg|Dry Up/i.test(vsa);
                const isVSABear  = vsa.includes('🔴') || /BC|UT|Distribusi|ABS/i.test(vsa);
                const isWyBull   = /ACCUMULATION|MARKUP/.test(wyckoff);
                const isWyBear   = /DISTRIBUTION|MARKDOWN/.test(wyckoff);
                const isVCPReady = /PIVOT|BASE/.test(vcp);

                const bullScore = (bias === 'BULLISH' ? 2 : 0) + (isVSABull ? 1 : 0) + (isWyBull ? 1 : 0) + (isVCPReady ? 1 : 0) + (evr > 0.3 ? 1 : 0);
                const bearScore = (bias === 'BEARISH' ? 2 : 0) + (isVSABear ? 1 : 0) + (isWyBear ? 1 : 0);

                let icon = '⬜', col = 'bg-gray-700/30 border-gray-600/30 text-gray-300', text = '';

                if (bullScore >= 4) {
                  icon = '🚀'; col = 'bg-green-900/30 border-green-600/30 text-green-200';
                  text = `Sinyal KUAT BELI — CPP ${cpp > 0 ? '+' : ''}${cpp} momentum bullish kuat.${isHAKA ? ' 🔥 HAKA Cooldown: markup agresif sebelumnya dengan sell vol rendah — berpotensi naik lagi!' : ''}${isVCPReady ? ' VCP pivot terbentuk, risiko/reward optimal.' : ''}${isVSABull && !isHAKA ? ' VSA konfirmasi akumulasi institusi.' : ''} Pertimbangkan entry dengan stop di bawah support.`;
                } else if (bullScore >= 2 && bearScore === 0) {
                  icon = '🟢'; col = 'bg-green-900/20 border-green-700/30 text-green-300';
                  text = `Sinyal MODERAT BELI — CPP ${cpp > 0 ? '+' : ''}${cpp}.${isHAKA ? ' 🔥 HAKA Cooldown terdeteksi.' : isVSABull ? ' VSA bullish.' : ''}${isWyBull ? ' Wyckoff ' + (wyckoff.includes('MARKUP') ? 'markup aktif.' : 'akumulasi.') : ''} Tunggu konfirmasi volume sebelum entry penuh.`;
                } else if (bearScore >= 4) {
                  icon = '🔴'; col = 'bg-red-900/30 border-red-600/30 text-red-200';
                  text = `Sinyal KUAT JUAL — CPP ${cpp}.${isVSABear ? ' VSA distribusi institusi.' : ''}${isWyBear ? ' Wyckoff ' + (wyckoff.includes('MARKDOWN') ? 'markdown aktif.' : 'distribusi.') : ''} Hindari posisi baru, pertimbangkan cut loss.`;
                } else if (bearScore >= 2 && bullScore === 0) {
                  icon = '🟡'; col = 'bg-yellow-900/20 border-yellow-700/30 text-yellow-200';
                  text = `Sinyal WASPADA — Momentum melemah (CPP ${cpp}).${isVSABear ? ' Ada tanda distribusi.' : ''}${isWyBear ? ' Wyckoff ' + (wyckoff.includes('MARKDOWN') ? 'downtrend.' : 'distribusi.') : ''} Kurangi posisi atau pasang trailing stop.`;
                } else {
                  icon = '⬜'; col = 'bg-gray-700/20 border-gray-600/30 text-gray-300';
                  text = `Sinyal NETRAL — CPP ${cpp}, supply-demand seimbang.${isVCPReady ? ' VCP base terbentuk, pantau breakout dengan volume.' : ''} Tunggu sinyal tegas sebelum posisi baru.`;
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

            {/* Close button */}
            <button
              onClick={() => setShowIndicators(prev => ({ ...prev, signals: false }))}
              className="text-gray-400 hover:text-red-400 px-1 backdrop-blur-md bg-white/5 rounded-lg flex-shrink-0 mt-0.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

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

