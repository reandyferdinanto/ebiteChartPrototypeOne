'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import { calculateAllIndicators, type IndicatorResult } from '@/lib/indicators';

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
}

export default function StockChart({ data }: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [chartType, setChartType] = useState<'candlestick' | 'line'>('candlestick');
  const [showControls, setShowControls] = useState(true);
  const [showIndicators, setShowIndicators] = useState({
    ma: true,       // Keep MA20/50 for trend
    momentum: true, // MACD enabled by default
    ao: false,
    fibonacci: false,
    vsa: false,     // Disabled by default
    vcp: false,     // Disabled by default
    candlePower: false, // User must explicitly enable
    sr: true,       // Support/Resistance enabled by default
    signals: true   // Always show signals panel
  });
  const [indicators, setIndicators] = useState<IndicatorResult | null>(null);


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

    // Clean up previous chart instance before creating a new one
    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch (e) {
        console.warn('Error removing previous chart:', e);
      }
      chartRef.current = null;
    }

    // Calculate indicators
    const calculatedIndicators = calculateAllIndicators(data);
    setIndicators(calculatedIndicators);

    // Create chart with better mobile dimensions
    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

    // Significantly larger chart heights for better mobile experience
    let chartHeight;
    if (isMobile) {
      chartHeight = 450; // Increased from 300 to 450 for much better mobile experience
    } else if (isTablet) {
      chartHeight = 550; // Good size for tablets
    } else {
      chartHeight = 600; // Larger even for desktop for better analysis
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#1a1a1a' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#2a2a2a' },
        horzLines: { color: '#2a2a2a' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        // Better mobile time scale options
        borderVisible: true,
        borderColor: '#2a2a2a',
        rightOffset: isMobile ? 5 : 12, // Less right padding on mobile
        barSpacing: isMobile ? 8 : 6, // Wider bar spacing on mobile for better touch interaction
        minBarSpacing: isMobile ? 4 : 2, // Minimum spacing to prevent candles from being too close
      },
      rightPriceScale: {
        borderColor: '#2a2a2a',
        // Better price scale for mobile
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        borderVisible: true,
      },
      crosshair: {
        mode: 1, // Magnet mode for easier mobile interaction
        vertLine: {
          color: '#758494',
          width: isMobile ? 2 : 1, // Thicker crosshair lines on mobile
          style: 2,
        },
        horzLine: {
          color: '#758494',
          width: isMobile ? 2 : 1,
          style: 2,
        },
      },
      // Enhanced interaction for proper zoom functionality
      handleScroll: {
        mouseWheel: true, // Enable mouse wheel zoom on desktop
        pressedMouseMove: true, // Enable drag to pan
        horzTouchDrag: true, // Enable horizontal touch drag (pan left/right)
        vertTouchDrag: true, // Enable vertical touch drag (zoom in/out on mobile)
      },
      handleScale: {
        axisPressedMouseMove: {
          time: true, // Enable time axis scaling via mouse drag
          price: true, // Enable price axis scaling via mouse drag
        },
        mouseWheel: true, // Enable mouse wheel zooming
        pinch: true, // Enable pinch-to-zoom on touch devices
        axisDoubleClickReset: {
          time: true, // Double-click time axis to reset zoom
          price: true, // Double-click price axis to reset zoom
        },
      },
    });

    chartRef.current = chart;

    // Add main price series with mobile-optimized settings
    if (chartType === 'candlestick') {
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: true, // Make borders visible for better candle definition
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
        borderUpColor: '#1e8a7a', // Darker border for up candles
        borderDownColor: '#d32f2f', // Darker border for down candles
        wickVisible: true,
        // Better mobile candle appearance
        priceLineVisible: false,
        lastValueVisible: true,
      });
      candlestickSeries.setData(data as any);

      // Add markers based on selected patterns - PROPERLY SEPARATED
      if (showIndicators.signals || showIndicators.vsa || showIndicators.vcp || showIndicators.candlePower) {
        const allMarkers: typeof calculatedIndicators.vsaMarkers = [];

        // CANDLE POWER MODE: Show ONLY candle power markers (colored dots with scores)
        if (showIndicators.candlePower) {
          // Pure Candle Power mode - show ONLY colored score dots
          allMarkers.push(...calculatedIndicators.candlePowerMarkers);
        }
        // VSA/VCP MODE: Show ONLY VSA patterns (🎯 SNIPER, 🧊 ICEBERG, 🥷 DRY UP, etc.)
        else if (showIndicators.vsa || showIndicators.vcp) {
          // Pure VSA mode - show ONLY VSA pattern markers
          allMarkers.push(...calculatedIndicators.vsaMarkers);
        }
        // SIGNALS MODE (default): Show VSA patterns
        else if (showIndicators.signals) {
          // In signals-only mode, show VSA patterns by default
          allMarkers.push(...calculatedIndicators.vsaMarkers);
        }


        if (allMarkers.length > 0) {
          // Remove duplicates - keep first occurrence
          const markerMap = new Map();
          allMarkers.forEach(marker => {
            const key = marker.time.toString();
            if (!markerMap.has(key)) {
              markerMap.set(key, marker);
            }
          });


          const uniqueMarkers = Array.from(markerMap.values()).sort((a, b) => a.time - b.time);
          candlestickSeries.setMarkers(uniqueMarkers as any);
        }
      }
    } else {
      const lineSeries = chart.addLineSeries({
        color: '#2962FF',
        lineWidth: isMobile ? 3 : 2, // Thicker line on mobile for better visibility
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: isMobile ? 6 : 4, // Larger crosshair marker on mobile
      });
      const lineData = data.map((d) => ({ time: d.time, value: d.close }));
      lineSeries.setData(lineData as any);
    }

    // Add Moving Averages with proper logic for different modes
    if (showIndicators.ma) {
      // Determine if we're in a clean mode (only MA without other complex indicators)
      const isMAOnlyMode = !showIndicators.momentum && !showIndicators.ao && !showIndicators.fibonacci &&
                          !showIndicators.vsa && !showIndicators.vcp && !showIndicators.candlePower;

      // Always show MA5 in MA-only mode, or when in full analysis mode
      if (isMAOnlyMode || (showIndicators.momentum || showIndicators.ao || showIndicators.fibonacci)) {
        if (calculatedIndicators.ma5.length > 0) {
          const ma5Series = chart.addLineSeries({
            color: '#2962FF',
            lineWidth: isMobile ? 2 : 1, // Thicker on mobile
            priceLineVisible: false,
            lastValueVisible: false
          });
          ma5Series.setData(calculatedIndicators.ma5 as any);
        }
      }

      // Always show MA20
      if (calculatedIndicators.ma20.length > 0) {
        const ma20Series = chart.addLineSeries({
          color: '#f1c40f',
          lineWidth: isMobile ? 3 : 2, // Much thicker for better mobile visibility
          priceLineVisible: false,
          lastValueVisible: false
        });
        ma20Series.setData(calculatedIndicators.ma20 as any);
      }

      // Always show MA50
      if (calculatedIndicators.ma50.length > 0) {
        const ma50Series = chart.addLineSeries({
          color: '#e67e22',
          lineWidth: isMobile ? 3 : 2, // Much thicker for better mobile visibility
          priceLineVisible: false,
          lastValueVisible: false
        });
        ma50Series.setData(calculatedIndicators.ma50 as any);
      }

      // Show MA200 in MA-only mode or full analysis mode
      if (isMAOnlyMode || (showIndicators.momentum || showIndicators.ao || showIndicators.fibonacci)) {
        if (calculatedIndicators.ma200.length > 0) {
          const ma200Series = chart.addLineSeries({
            color: '#9b59b6',
            lineWidth: isMobile ? 2 : 1, // Thicker on mobile
            priceLineVisible: false,
            lastValueVisible: false
          });
          ma200Series.setData(calculatedIndicators.ma200 as any);
        }
      }
    }

    // Add Fibonacci levels with better mobile visibility
    if (showIndicators.fibonacci) {
      const fib382Series = chart.addLineSeries({
        color: '#3498db',
        lineWidth: isMobile ? 2 : 1, // Thicker on mobile
        lineStyle: 2,
        priceLineVisible: false
      });
      fib382Series.setData(calculatedIndicators.fibonacci.f382 as any);

      const fib500Series = chart.addLineSeries({
        color: '#e74c3c',
        lineWidth: isMobile ? 2 : 1, // Thicker on mobile
        lineStyle: 2,
        priceLineVisible: false
      });
      fib500Series.setData(calculatedIndicators.fibonacci.f500 as any);

      const fib618Series = chart.addLineSeries({
        color: '#00b894',
        lineWidth: isMobile ? 2 : 1, // Thicker on mobile
        lineStyle: 2,
        priceLineVisible: false
      });
      fib618Series.setData(calculatedIndicators.fibonacci.f618 as any);
    }

    // Add Support/Resistance Zones - Colored areas between dotted lines
    if (showIndicators.sr) {
      const srZones = calculatedIndicators.supportResistance.zones;

      srZones.forEach((zone) => {
        const isResistance = zone.type === 'resistance';

        // Colors for the filled area between boundaries
        const fillColor = isResistance
          ? 'rgba(239, 83, 80, 0.15)'   // Semi-transparent red for resistance
          : 'rgba(38, 166, 154, 0.15)'; // Semi-transparent green for support

        const lineColor = isResistance
          ? 'rgba(239, 83, 80, 0.8)'  // Solid red for boundary lines
          : 'rgba(38, 166, 154, 0.8)'; // Solid green for boundary lines

        // Create baseline series (bottom line) - this will be the base for our area
        const baselineSeries = chart.addBaselineSeries({
          baseValue: { type: 'price', price: zone.bottom },
          topLineColor: fillColor,
          topFillColor1: fillColor,
          topFillColor2: fillColor,
          bottomLineColor: fillColor,
          bottomFillColor1: 'transparent',
          bottomFillColor2: 'transparent',
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });

        // Set data for the filled area (top boundary)
        const areaData = [];
        for (let i = zone.startIndex; i < data.length; i++) {
          areaData.push({
            time: data[i].time,
            value: zone.top // This creates filled area from bottom to top
          });
        }
        baselineSeries.setData(areaData as any);

        // Add TOP boundary line (dotted)
        const topLineSeries = chart.addLineSeries({
          color: lineColor,
          lineWidth: isMobile ? 2 : 1,
          lineStyle: 2, // Dashed/dotted line
          priceLineVisible: false, // ✅ NO helper line to right axis!
          lastValueVisible: false, // ✅ NO value bubble on right!
          crosshairMarkerVisible: true, // Show value on crosshair
        });

        const topData = [];
        for (let i = zone.startIndex; i < data.length; i++) {
          topData.push({ time: data[i].time, value: zone.top });
        }
        topLineSeries.setData(topData as any);

        // Add BOTTOM boundary line (dotted)
        const bottomLineSeries = chart.addLineSeries({
          color: lineColor,
          lineWidth: isMobile ? 2 : 1,
          lineStyle: 2, // Dashed/dotted line
          priceLineVisible: false, // ✅ NO helper line to right axis!
          lastValueVisible: false, // ✅ NO value bubble on right!
          crosshairMarkerVisible: true, // Show value on crosshair
        });

        const bottomData = [];
        for (let i = zone.startIndex; i < data.length; i++) {
          bottomData.push({ time: data[i].time, value: zone.bottom });
        }
        bottomLineSeries.setData(bottomData as any);
      });
    }

    // Add volume series
    if (data[0]?.volume) {
      const volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
      });

      // Better volume chart margins for mobile
      chart.priceScale('').applyOptions({
        scaleMargins: {
          top: isMobile ? 0.75 : 0.8, // Slightly more space for price chart on mobile
          bottom: 0,
        },
      });

      const volumeData = data.map((d) => ({
        time: d.time,
        value: d.volume || 0,
        color: d.close >= d.open ? '#26a69a80' : '#ef535080',
      }));

      volumeSeries.setData(volumeData as any);
    }

    // Add MACD Histogram (Momentum Indicator) - shown by default
    if (showIndicators.momentum && calculatedIndicators.momentum.length > 0) {
      const macdSeries = chart.addHistogramSeries({
        color: '#00b894',
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
        priceScaleId: 'macd', // Separate scale for MACD
      });

      // Configure MACD scale to appear below volume
      chart.priceScale('macd').applyOptions({
        scaleMargins: {
          top: 0.85, // Position MACD below volume and chart
          bottom: 0,
        },
      });

      // Set MACD data with colors based on histogram values
      macdSeries.setData(calculatedIndicators.momentum as any);
    }

    // Auto-fit content with mobile-specific behavior
    const timeoutId = setTimeout(() => {
      if (chartRef.current) {
        try {
          chart.timeScale().fitContent();
          // On mobile, ensure proper initial zoom level
          if (isMobile && data.length > 50) {
            chart.timeScale().setVisibleRange({
              from: data[Math.max(0, data.length - 30)].time as any,
              to: data[data.length - 1].time as any,
            });
          }
        } catch (e) {
          console.warn('Error setting chart content:', e);
        }
      }
    }, 100);

    // Handle resize with improved error handling
    const handleResize = () => {
      try {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
      } catch (e) {
        console.warn('Error resizing chart:', e);
      }
    };

    // Use a reference to track if component is mounted
    let isMounted = true;

    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);

      // Improved cleanup with error handling
      if (chartRef.current) {
        try {
          chartRef.current.remove();
        } catch (e) {
          console.warn('Error disposing chart:', e);
        } finally {
          chartRef.current = null;
        }
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
            <div className="flex-1 min-w-0 space-y-1">
              {/* VSA Signal */}
              <div className="flex items-center gap-2">
                <svg className="w-3 h-3 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-white font-semibold truncate">{indicators.signals.bandar}</p>
              </div>
              {/* Wyckoff Phase */}
              {indicators.signals.wyckoffPhase && indicators.signals.wyckoffPhase !== '⬜ Analisis...' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 flex-shrink-0">Wyckoff:</span>
                  <p className="text-xs text-gray-200 truncate">{indicators.signals.wyckoffPhase}</p>
                </div>
              )}
              {/* VCP Status */}
              {indicators.signals.vcpStatus && indicators.signals.vcpStatus !== '⬜ Tidak Aktif' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-orange-400 flex-shrink-0">VCP:</span>
                  <p className="text-xs text-orange-200 truncate">{indicators.signals.vcpStatus}</p>
                </div>
              )}
              {/* Candle Power + CPP Prediction */}
              {showIndicators.candlePower && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-purple-400 flex-shrink-0">Power:</span>
                    <p className="text-xs text-gray-300 truncate">{indicators.candlePowerAnalysis}</p>
                  </div>
                  {indicators.signals.cppScore !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 flex-shrink-0">Next Candle:</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        indicators.signals.cppBias === 'BULLISH'
                          ? 'bg-green-500/20 text-green-300 border border-green-500/40'
                          : indicators.signals.cppBias === 'BEARISH'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                          : 'bg-gray-500/20 text-gray-300 border border-gray-500/40'
                      }`}>
                        {indicators.signals.cppBias === 'BULLISH' ? '📈 BULLISH' : indicators.signals.cppBias === 'BEARISH' ? '📉 BEARISH' : '➡️ NEUTRAL'}
                      </span>
                      <span className={`text-xs font-mono flex-shrink-0 ${
                        indicators.signals.cppScore > 0 ? 'text-green-400' : indicators.signals.cppScore < 0 ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        CPP:{indicators.signals.cppScore > 0 ? '+' : ''}{indicators.signals.cppScore}
                      </span>
                      {indicators.signals.evrScore !== 0 && (
                        <span className={`text-xs font-mono flex-shrink-0 ${indicators.signals.evrScore > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          EVR:{indicators.signals.evrScore > 0 ? '+' : ''}{indicators.signals.evrScore}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowIndicators(prev => ({ ...prev, signals: false }))}
              className="text-gray-400 hover:text-red-400 px-1 backdrop-blur-md bg-white/5 rounded-lg flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Chart Container - Maximum space for chart */}
      <div className="p-1 md:p-2">
        <div ref={chartContainerRef} className="w-full min-h-[400px] md:min-h-[500px] lg:min-h-[600px]" />
      </div>
    </div>
  );
}

