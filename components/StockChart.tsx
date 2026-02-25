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
    momentum: false,
    ao: false,
    fibonacci: false,
    squeeze: false,
    vsa: true,      // Essential for pattern detection
    vcp: false,     // Can be toggled when needed
    candlePower: false, // Reduce clutter, can be toggled
    signals: true   // Always show signals panel
  });
  const [indicators, setIndicators] = useState<IndicatorResult | null>(null);

  // Helper function to handle button clicks without page scroll
  const handleIndicatorChange = (key: keyof typeof showIndicators) => {
    // Prevent default scroll behavior
    window.scrollY; // Keep current scroll position
    setShowIndicators(prev => ({ ...prev, [key]: !prev[key] }));
    // Maintain scroll position after state update
    const scrollPos = window.scrollY;
    setTimeout(() => window.scrollTo(0, scrollPos), 0);
  };

  // Quick preset modes
  const setCleanMode = () => {
    setShowIndicators({
      ma: true,       // Only MA20 for trend
      momentum: false,
      ao: false,
      fibonacci: false,
      squeeze: false,
      vsa: true,      // Only VSA patterns
      vcp: false,
      candlePower: false,
      signals: true
    });
  };

  const setSqueezeMode = () => {
    setShowIndicators({
      ma: true,
      momentum: false,
      ao: false,
      fibonacci: false,
      squeeze: true,   // Focus on squeeze strategy
      vsa: false,
      vcp: false,
      candlePower: false,
      signals: true
    });
  };

  const setVcpVsaMode = () => {
    setShowIndicators({
      ma: true,
      momentum: false,
      ao: false,
      fibonacci: false,
      squeeze: false,
      vsa: true,       // Focus on VCP/VSA strategy
      vcp: true,
      candlePower: true,
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

  const setMinimalMode = () => {
    setShowIndicators({
      ma: false,       // No indicators
      momentum: false,
      ao: false,
      fibonacci: false,
      squeeze: false,
      vsa: true,       // Only patterns
      vcp: false,
      candlePower: false,
      signals: true
    });
  };

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    // Calculate indicators
    const calculatedIndicators = calculateAllIndicators(data);
    setIndicators(calculatedIndicators);

    // Create chart
    const isMobile = window.innerWidth < 768;
    const chartHeight = isMobile ? 300 : 500;

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
      },
      rightPriceScale: {
        borderColor: '#2a2a2a',
      },
      crosshair: {
        mode: 1,
      },
    });

    chartRef.current = chart;

    // Add main price series
    if (chartType === 'candlestick') {
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });
      candlestickSeries.setData(data as any);

      // Add markers based on selected patterns
      if (showIndicators.signals || showIndicators.squeeze || showIndicators.vsa || showIndicators.vcp || showIndicators.candlePower) {
        const allMarkers: typeof calculatedIndicators.vsaMarkers = [];

        if (showIndicators.squeeze) {
          allMarkers.push(...calculatedIndicators.squeezeMarkers);
        }

        if (showIndicators.vsa || showIndicators.vcp) {
          allMarkers.push(...calculatedIndicators.vsaMarkers);
        }

        if (showIndicators.candlePower) {
          allMarkers.push(...calculatedIndicators.candlePowerMarkers);
        }

        if (showIndicators.signals) {
          allMarkers.push(
            ...calculatedIndicators.vsaMarkers,
            ...calculatedIndicators.squeezeMarkers,
            ...calculatedIndicators.candlePowerMarkers
          );
        }

        if (allMarkers.length > 0) {
          const uniqueMarkers = Array.from(
            new Map(allMarkers.map(m => [m.time + m.text, m])).values()
          ).sort((a, b) => a.time - b.time);

          candlestickSeries.setMarkers(uniqueMarkers as any);
        }
      }
    } else {
      const lineSeries = chart.addLineSeries({
        color: '#2962FF',
        lineWidth: 2,
      });
      const lineData = data.map((d) => ({ time: d.time, value: d.close }));
      lineSeries.setData(lineData as any);
    }

    // Add Moving Averages (simplified for cleaner chart)
    if (showIndicators.ma) {
      // In Clean/Minimal modes, show only MA20 and MA50
      const isCleanMode = !showIndicators.momentum && !showIndicators.ao && !showIndicators.fibonacci;

      if (!isCleanMode && calculatedIndicators.ma5.length > 0) {
        const ma5Series = chart.addLineSeries({
          color: '#2962FF',
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false
        });
        ma5Series.setData(calculatedIndicators.ma5 as any);
      }

      if (calculatedIndicators.ma20.length > 0) {
        const ma20Series = chart.addLineSeries({
          color: '#f1c40f',
          lineWidth: 2,  // Thicker for better visibility
          priceLineVisible: false,
          lastValueVisible: false
        });
        ma20Series.setData(calculatedIndicators.ma20 as any);
      }

      if (calculatedIndicators.ma50.length > 0) {
        const ma50Series = chart.addLineSeries({
          color: '#e67e22',
          lineWidth: 2,  // Thicker for better visibility
          priceLineVisible: false,
          lastValueVisible: false
        });
        ma50Series.setData(calculatedIndicators.ma50 as any);
      }

      // Only show MA200 in Full Analysis mode
      if (!isCleanMode && calculatedIndicators.ma200.length > 0) {
        const ma200Series = chart.addLineSeries({
          color: '#9b59b6',
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false
        });
        ma200Series.setData(calculatedIndicators.ma200 as any);
      }
    }

    // Add Fibonacci levels
    if (showIndicators.fibonacci) {
      const fib382Series = chart.addLineSeries({
        color: '#3498db',
        lineWidth: 1,
        lineStyle: 2,
        priceLineVisible: false
      });
      fib382Series.setData(calculatedIndicators.fibonacci.f382 as any);

      const fib500Series = chart.addLineSeries({
        color: '#e74c3c',
        lineWidth: 1,
        lineStyle: 2,
        priceLineVisible: false
      });
      fib500Series.setData(calculatedIndicators.fibonacci.f500 as any);

      const fib618Series = chart.addLineSeries({
        color: '#00b894',
        lineWidth: 1,
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

      chart.priceScale('').applyOptions({
        scaleMargins: {
          top: 0.8,
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


    // Auto-fit content
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, [data, chartType, showIndicators]);

  return (
    <div className="w-full">
      {/* Sticky Controls - Mobile Responsive */}
      <div className="sticky top-0 z-50 bg-gray-900 border-b border-gray-700 shadow-lg">
        {/* Mobile Toggle Button */}
        <div className="md:hidden flex items-center justify-between p-2 border-b border-gray-700">
          <span className="text-xs font-semibold text-gray-300">Controls</span>
          <button
            onClick={() => setShowControls(!showControls)}
            className="text-gray-400 hover:text-white text-lg"
          >
            {showControls ? '▼' : '▶'}
          </button>
        </div>

        {/* Controls - Collapsible on Mobile */}
        {showControls && (
          <div className="p-2 md:p-4 space-y-2 max-h-96 md:max-h-none overflow-y-auto md:overflow-y-visible">

            {/* Quick Mode Presets */}
            <div className="flex gap-1 md:gap-2 flex-wrap mb-3 p-2 bg-gray-800 rounded">
              <span className="text-xs text-gray-400 py-1">⚡ Quick Modes:</span>
              <button
                onClick={setCleanMode}
                className="px-2 md:px-3 py-1 rounded text-xs bg-green-700 hover:bg-green-600 text-white"
              >
                🧹 Clean
              </button>
              <button
                onClick={setMinimalMode}
                className="px-2 md:px-3 py-1 rounded text-xs bg-blue-700 hover:bg-blue-600 text-white"
              >
                📊 Minimal
              </button>
              <button
                onClick={setSqueezeMode}
                className="px-2 md:px-3 py-1 rounded text-xs bg-purple-700 hover:bg-purple-600 text-white"
              >
                🔮 Squeeze
              </button>
              <button
                onClick={setVcpVsaMode}
                className="px-2 md:px-3 py-1 rounded text-xs bg-orange-700 hover:bg-orange-600 text-white"
              >
                🎯 VCP/VSA
              </button>
              <button
                onClick={setAnalysisMode}
                className="px-2 md:px-3 py-1 rounded text-xs bg-red-700 hover:bg-red-600 text-white"
              >
                🔬 Full Analysis
              </button>
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

            {/* Indicator Toggles - Organized by Strategy */}
            <div className="space-y-1 md:space-y-2">
              {/* Price Indicators */}
              <div className="flex gap-1 md:gap-2 flex-wrap">
                <span className="text-xs text-gray-400 py-1 px-1 md:px-2 bg-gray-800 rounded">📊 Price:</span>
                <button
                  onClick={() => handleIndicatorChange('ma')}
                  className={`px-2 md:px-3 py-1 rounded text-xs md:text-sm ${
                    showIndicators.ma
                      ? 'bg-yellow-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {showIndicators.ma ? '✓' : ''} MA
                </button>
                <button
                  onClick={() => handleIndicatorChange('fibonacci')}
                  className={`px-2 md:px-3 py-1 rounded text-xs md:text-sm ${
                    showIndicators.fibonacci
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {showIndicators.fibonacci ? '✓' : ''} Fib
                </button>
              </div>

              {/* Squeeze Strategy */}
              <div className="bg-purple-900/20 p-2 rounded border border-purple-700/30">
                <div className="flex gap-1 md:gap-2 flex-wrap mb-2">
                  <span className="text-xs text-purple-300 py-1 px-1 md:px-2 bg-purple-800 rounded font-semibold">🔮 Squeeze Strategy</span>
                </div>
                <div className="flex gap-1 md:gap-2 flex-wrap">
                  <button
                    onClick={() => handleIndicatorChange('squeeze')}
                    className={`px-2 md:px-3 py-1 rounded text-xs md:text-sm ${
                      showIndicators.squeeze
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {showIndicators.squeeze ? '✓' : ''} TTM Squeeze
                  </button>
                  <button
                    onClick={() => handleIndicatorChange('momentum')}
                    className={`px-2 md:px-3 py-1 rounded text-xs md:text-sm ${
                      showIndicators.momentum
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {showIndicators.momentum ? '✓' : ''} Momentum
                  </button>
                </div>
              </div>

              {/* VCP/VSA Strategy */}
              <div className="bg-orange-900/20 p-2 rounded border border-orange-700/30">
                <div className="flex gap-1 md:gap-2 flex-wrap mb-2">
                  <span className="text-xs text-orange-300 py-1 px-1 md:px-2 bg-orange-800 rounded font-semibold">🎯 VCP/VSA Strategy</span>
                </div>
                <div className="flex gap-1 md:gap-2 flex-wrap">
                  <button
                    onClick={() => handleIndicatorChange('vsa')}
                    className={`px-2 md:px-3 py-1 rounded text-xs md:text-sm ${
                      showIndicators.vsa
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {showIndicators.vsa ? '✓' : ''} VSA Patterns
                  </button>
                  <button
                    onClick={() => handleIndicatorChange('vcp')}
                    className={`px-2 md:px-3 py-1 rounded text-xs md:text-sm ${
                      showIndicators.vcp
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {showIndicators.vcp ? '✓' : ''} VCP Detection
                  </button>
                  <button
                    onClick={() => handleIndicatorChange('candlePower')}
                    className={`px-2 md:px-3 py-1 rounded text-xs md:text-sm ${
                      showIndicators.candlePower
                        ? 'bg-yellow-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {showIndicators.candlePower ? '✓' : ''} Candle Power
                  </button>
                </div>
              </div>

              {/* General Controls */}
              <div className="flex gap-1 md:gap-2 flex-wrap">
                <span className="text-xs text-gray-400 py-1 px-1 md:px-2 bg-gray-800 rounded">💡 General:</span>
                <button
                  onClick={() => handleIndicatorChange('signals')}
                  className={`px-2 md:px-3 py-1 rounded text-xs md:text-sm ${
                    showIndicators.signals
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {showIndicators.signals ? '✓' : ''} Signals Panel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chart Container - Mobile Responsive */}
      <div className="p-2 md:p-4 overflow-x-auto">
        {/* Trading Signals */}
        {indicators && showIndicators.signals && (
          <div className="bg-gray-800 border border-gray-700 rounded p-2 md:p-4 space-y-2 mb-4">
            <h3 className="text-xs md:text-sm font-semibold text-gray-400 mb-2">📊 Trading Signals</h3>

            <div className="space-y-1 text-xs md:text-sm">
              {/* Main Signal - Always shown */}
              <div className="flex flex-col md:flex-row md:items-start gap-1 md:gap-2 p-2 bg-gray-800 rounded">
                <span className="text-gray-400 md:min-w-[80px] font-semibold">📍 Signal:</span>
                <span className="text-white break-words font-semibold">{indicators.signals.bandar}</span>
              </div>

              {/* Detailed analysis - Only in Full Analysis mode */}
              {(showIndicators.candlePower || showIndicators.momentum || showIndicators.ao) && (
                <>
                  <div className="flex flex-col md:flex-row md:items-start gap-1 md:gap-2">
                    <span className="text-gray-400 md:min-w-[80px]">Candle Power:</span>
                    <span className="text-white break-words">{indicators.candlePowerAnalysis}</span>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-start gap-1 md:gap-2">
                    <span className="text-gray-400 md:min-w-[80px]">Base:</span>
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
        )}

        {/* Chart Container */}
        <div ref={chartContainerRef} className="w-full min-h-96 md:min-h-[500px]" />
      </div>
    </div>
  );
}




