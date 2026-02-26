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
    squeeze: false,
    vsa: false,     // Disabled by default
    vcp: false,     // Disabled by default
    candlePower: false, // User must explicitly enable
    signals: true   // Always show signals panel
  });
  const [indicators, setIndicators] = useState<IndicatorResult | null>(null);


  // Quick preset modes - Reorganized for better UX
  const setSqueezeMode = () => {
    setShowIndicators({
      ma: true,        // Show MA for context
      momentum: true,  // Show momentum for squeeze
      ao: false,
      fibonacci: false,
      squeeze: true,   // Main squeeze detection
      vsa: false,      // Focus only on squeeze
      vcp: false,
      candlePower: false,
      signals: true
    });
  };

  const setMAMode = () => {
    setShowIndicators({
      ma: true,        // Show all MA lines (5, 20, 50, 200)
      momentum: false,
      ao: false,
      fibonacci: false,
      squeeze: false,
      vsa: false,      // Clean chart with only MA lines
      vcp: false,
      candlePower: false,
      signals: true
    });
  };

  const setVSAMode = () => {
    setShowIndicators({
      ma: true,        // Show MA for context
      momentum: false,
      ao: false,
      fibonacci: false,
      squeeze: false,
      vsa: true,       // Focus on VSA patterns (iceberg, dry up, VCP base)
      vcp: true,       // Include VCP detection
      candlePower: false,
      signals: true
    });
  };

  const setCandlePowerMode = () => {
    setShowIndicators({
      ma: true,        // Show MA for context
      momentum: false,
      ao: false,
      fibonacci: false,
      squeeze: false,
      vsa: false,      // DISABLE VSA patterns
      vcp: false,      // DISABLE VCP patterns
      candlePower: true, // ONLY show candle power scores
      signals: true
    });
  };

  const setAnalysisMode = () => {
    setShowIndicators({
      ma: true,
      momentum: true,
      ao: true,
      fibonacci: true,
      squeeze: true,
      vsa: true,
      vcp: true,
      candlePower: true,
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
      if (showIndicators.signals || showIndicators.squeeze || showIndicators.vsa || showIndicators.vcp || showIndicators.candlePower) {
        const allMarkers: typeof calculatedIndicators.vsaMarkers = [];

        // CANDLE POWER MODE: Show ONLY candle power markers (colored dots with scores)
        if (showIndicators.candlePower) {
          // Pure Candle Power mode - show ONLY colored score dots
          allMarkers.push(...calculatedIndicators.candlePowerMarkers);
        }
        // SQUEEZE MODE: Show ONLY squeeze markers (🟢 SQZ, 🚀 BREAK, etc.)
        else if (showIndicators.squeeze) {
          // Pure Squeeze mode - show ONLY squeeze-related markers
          allMarkers.push(...calculatedIndicators.squeezeMarkers);
        }
        // VSA/VCP MODE: Show ONLY VSA patterns (🎯 SNIPER, 🧊 ICEBERG, 🥷 DRY UP, etc.)
        else if (showIndicators.vsa || showIndicators.vcp) {
          // Pure VSA mode - show ONLY VSA pattern markers
          allMarkers.push(...calculatedIndicators.vsaMarkers);
        }
        // SIGNALS MODE (default): Show VSA patterns (not squeeze)
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
                          !showIndicators.squeeze && !showIndicators.vsa && !showIndicators.vcp && !showIndicators.candlePower;

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
      {/* Sticky Controls - Mobile Responsive */}
      <div className="sticky top-0 z-50 bg-gray-900 border-b border-gray-700 shadow-lg">
        {/* Mobile Toggle Button */}
        <div className="md:hidden flex items-center justify-between p-3 border-b border-gray-700">
          <span className="text-sm font-semibold text-gray-300">Chart Controls</span>
          <button
            onClick={() => setShowControls(!showControls)}
            className="text-gray-400 hover:text-white text-xl p-1 rounded"
          >
            {showControls ? '▼ Hide' : '▶ Show'}
          </button>
        </div>

        {/* Controls - Collapsible on Mobile */}
        {showControls && (
          <div className="p-3 md:p-4 space-y-3 max-h-[70vh] md:max-h-none overflow-y-auto md:overflow-y-visible">{/* ...existing controls... */}

            {/* Quick Mode Presets */}
            <div className="flex gap-1 md:gap-2 flex-wrap mb-3 p-2 bg-gray-800 rounded">
              <span className="text-xs text-gray-400 py-1">⚡ Quick Modes:</span>
              <button
                onClick={setSqueezeMode}
                className={`px-2 md:px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  showIndicators.squeeze 
                    ? 'bg-purple-600 text-white shadow-lg' 
                    : 'bg-gray-700 hover:bg-purple-700 text-gray-300'
                }`}
                title="TTM Squeeze + Momentum + SQZ/XD patterns"
              >
                {showIndicators.squeeze ? '✓ ' : ''}🔮 Squeeze
              </button>
              <button
                onClick={setMAMode}
                className={`px-2 md:px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  showIndicators.ma && !showIndicators.momentum && !showIndicators.squeeze && !showIndicators.vsa && !showIndicators.candlePower
                    ? 'bg-yellow-600 text-white shadow-lg' 
                    : 'bg-gray-700 hover:bg-yellow-700 text-gray-300'
                }`}
                title="Moving Averages: MA5, MA20, MA50, MA200"
              >
                {showIndicators.ma && !showIndicators.momentum && !showIndicators.squeeze && !showIndicators.vsa && !showIndicators.candlePower ? '✓ ' : ''}📈 MA Lines
              </button>
              <button
                onClick={setVSAMode}
                className={`px-2 md:px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  showIndicators.vsa || showIndicators.vcp
                    ? 'bg-orange-600 text-white shadow-lg' 
                    : 'bg-gray-700 hover:bg-orange-700 text-gray-300'
                }`}
                title="VSA Patterns: Iceberg, Dry Up, VCP Base"
              >
                {showIndicators.vsa || showIndicators.vcp ? '✓ ' : ''}🎯 VSA Patterns
              </button>
              <button
                onClick={setCandlePowerMode}
                className={`px-2 md:px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  showIndicators.candlePower
                    ? 'bg-green-600 text-white shadow-lg ring-2 ring-green-400' 
                    : 'bg-gray-700 hover:bg-green-700 text-gray-300'
                }`}
                title="Candle Power Score & Wyckoff Analysis - Shows colored dots with scores"
              >
                {showIndicators.candlePower ? '✓ ' : ''}🔥 Candle Power
              </button>
              <button
                onClick={setAnalysisMode}
                className={`px-2 md:px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  showIndicators.momentum || showIndicators.ao
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
                title="All Indicators & Analysis"
              >
                {showIndicators.momentum || showIndicators.ao ? '✓ ' : ''}🔬 Full Analysis
              </button>
            </div>

            {/* MACD Status Display */}
            <div className="text-xs text-gray-400 px-2 py-1 bg-gray-800 rounded border border-gray-700">
              📊 Default View: MA Lines + MACD Histogram {showIndicators.momentum ? '✓' : ''}
            </div>

            {/* Chart Type */}
            <div className="flex gap-1 md:gap-2 flex-wrap">
              <button
                onClick={() => setChartType('candlestick')}
                className={`px-2 md:px-4 py-1 md:py-2 rounded text-xs md:text-sm ${
                  chartType === 'candlestick'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Candlestick
              </button>
              <button
                onClick={() => setChartType('line')}
                className={`px-2 md:px-4 py-1 md:py-2 rounded text-xs md:text-sm ${
                  chartType === 'line'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Line
              </button>
            </div>

            {/* Candle Power Toggle - Prominent button */}
            <div className="flex gap-1 md:gap-2 flex-wrap items-center p-2 bg-gray-800 rounded border border-gray-700">
              <span className="text-xs text-gray-400">🔥 Indicator:</span>
              <button
                onClick={() => setShowIndicators(prev => ({
                  ...prev,
                  candlePower: !prev.candlePower,
                  // Disable other patterns when enabling candle power
                  vsa: prev.candlePower ? prev.vsa : false,
                  vcp: prev.candlePower ? prev.vcp : false,
                  squeeze: prev.candlePower ? prev.squeeze : false
                }))}
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded text-xs md:text-sm font-bold transition-all ${
                  showIndicators.candlePower
                    ? 'bg-green-600 text-white shadow-lg ring-2 ring-green-400 animate-pulse' 
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
                }`}
                title={showIndicators.candlePower
                  ? "Candle Power ON - Showing colored score dots on candles"
                  : "Candle Power OFF - Click to show Wyckoff analysis scores"
                }
              >
                {showIndicators.candlePower ? '✓ ON' : 'OFF'} Candle Power
              </button>
              {showIndicators.candlePower && (
                <span className="text-xs text-green-400 animate-pulse">
                  ● Active
                </span>
              )}
            </div>


            {/* Zoom Controls */}
            <div className="flex gap-1 md:gap-2 flex-wrap items-center">
              <span className="text-xs text-gray-400 py-1 px-1 md:px-2 bg-gray-800 rounded">🔍 Zoom:</span>
              <button
                onClick={() => {
                  if (chartRef.current) {
                    try {
                      const timeScale = chartRef.current.timeScale();
                      const visibleRange = timeScale.getVisibleRange();
                      if (visibleRange) {
                        const duration = visibleRange.to - visibleRange.from;
                        const center = (visibleRange.from + visibleRange.to) / 2;
                        const newDuration = duration * 0.7; // Zoom in by 30%
                        timeScale.setVisibleRange({
                          from: (center - newDuration / 2) as any,
                          to: (center + newDuration / 2) as any,
                        });
                      }
                    } catch (e) {
                      console.warn('Error zooming in:', e);
                    }
                  }
                }}
                className="px-2 md:px-3 py-1 rounded text-xs md:text-sm bg-green-700 hover:bg-green-600 text-white font-semibold"
                title="Zoom In"
              >
                🔍+ In
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
                        const newDuration = duration * 1.4; // Zoom out by 40%
                        timeScale.setVisibleRange({
                          from: (center - newDuration / 2) as any,
                          to: (center + newDuration / 2) as any,
                        });
                      }
                    } catch (e) {
                      console.warn('Error zooming out:', e);
                    }
                  }
                }}
                className="px-2 md:px-3 py-1 rounded text-xs md:text-sm bg-red-700 hover:bg-red-600 text-white font-semibold"
                title="Zoom Out"
              >
                🔍- Out
              </button>
              <button
                onClick={() => {
                  if (chartRef.current) {
                    try {
                      chartRef.current.timeScale().fitContent();
                    } catch (e) {
                      console.warn('Error fitting content:', e);
                    }
                  }
                }}
                className="px-2 md:px-3 py-1 rounded text-xs md:text-sm bg-blue-700 hover:bg-blue-600 text-white font-semibold"
                title="Fit to Screen"
              >
                📐 Fit
              </button>
              <button
                onClick={() => {
                  if (chartRef.current && data.length > 50) {
                    try {
                      const timeScale = chartRef.current.timeScale();
                      timeScale.setVisibleRange({
                        from: data[Math.max(0, data.length - 50)].time as any,
                        to: data[data.length - 1].time as any,
                      });
                    } catch (e) {
                      console.warn('Error setting 50-day view:', e);
                    }
                  }
                }}
                className="px-2 md:px-3 py-1 rounded text-xs md:text-sm bg-purple-700 hover:bg-purple-600 text-white font-semibold"
                title="Show Last 50 Candles"
              >
                📊 50D
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Trading Signals Panel - Below Controls */}
      {indicators && showIndicators.signals && (
        <div className="sticky top-0 z-30 bg-gray-900 border-b border-gray-700 shadow-lg">
          <div className="bg-gray-800 border border-gray-700 rounded-b p-3 md:p-4 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs md:text-sm font-semibold text-gray-400">📊 Trading Signals</h3>
              <button
                onClick={() => setShowIndicators(prev => ({ ...prev, signals: false }))}
                className="text-gray-400 hover:text-red-400 text-sm px-1"
                title="Hide Signals"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1 text-xs md:text-sm">
              {/* Main Signal - Always shown */}
              <div className="flex flex-col md:flex-row md:items-start gap-1 md:gap-2 p-2 bg-gray-900 rounded">
                <span className="text-gray-400 md:min-w-[80px] font-semibold">📍 Signal:</span>
                <span className="text-white break-words font-semibold">{indicators.signals.bandar}</span>
              </div>

              {/* Detailed analysis - Only in Full Analysis mode */}
              {(showIndicators.candlePower || showIndicators.momentum || showIndicators.ao) && (
                <>
                  <div className="flex flex-col md:flex-row md:items-start gap-1 md:gap-2 p-2 bg-gray-900 rounded">
                    <span className="text-gray-400 md:min-w-[80px]">🔥 Candle Power:</span>
                    <span className="text-white break-words">{indicators.candlePowerAnalysis}</span>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-start gap-1 md:gap-2 p-2 bg-gray-900 rounded">
                    <span className="text-gray-400 md:min-w-[80px]">🏗️ Base:</span>
                    <span className="text-white break-words">{indicators.signals.base}</span>
                  </div>
                </>
              )}
            </div>

            <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-gray-700">
              <p className="text-xs text-gray-500">
                💡 Signals based on VSA, TTM Squeeze, and Candle Power Analysis
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chart Container - Mobile Responsive */}
      <div className="p-1 md:p-4 overflow-x-auto">
        {/* Chart Container */}
        <div ref={chartContainerRef} className="w-full min-h-[450px] md:min-h-[550px] lg:min-h-[600px]" />
      </div>
    </div>
  );
}

