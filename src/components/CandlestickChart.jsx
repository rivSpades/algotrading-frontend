/**
 * Candlestick Chart Component
 * Displays OHLCV data as a candlestick chart using ApexCharts
 * Always shows candlestick chart with all years
 */

import { useMemo, useState, useEffect } from 'react';
import Chart from 'react-apexcharts';

const TIMEFRAME_OPTIONS = [
  { label: '1D', days: 1 },
  { label: '1W', days: 7 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
  { label: 'All', days: null },
];

export default function CandlestickChart({ data = [], ticker, indicators = [], signals = [] }) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('All');
  const [chartData, setChartData] = useState(data);
  // Use a stable key that only changes with ticker to prevent unnecessary remounts
  const chartKey = useMemo(() => `${ticker || 'default'}`, [ticker]);

  // Filter data based on selected timeframe
  useEffect(() => {
    let filtered = data;

    // Filter by timeframe if not 'All'
    const timeframe = TIMEFRAME_OPTIONS.find(tf => tf.label === selectedTimeframe);
    if (timeframe && timeframe.days) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeframe.days);
      
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.timestamp);
        return itemDate >= startDate && itemDate <= endDate;
      });
    }

    setChartData(filtered);
  }, [selectedTimeframe, data]);

  // Process data for ApexCharts candlestick format
  // Limit to 1000 data points max to prevent browser crashes
  const seriesData = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
    
    // Sort by timestamp (oldest first, left to right)
    const sorted = chartData
      .slice()
      .sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return dateA - dateB; // Ascending: oldest first
      })
      .slice(-1000) // Limit to last 1000 points for performance
      .map((item) => {
        const open = parseFloat(item.open);
        const high = parseFloat(item.high);
        const low = parseFloat(item.low);
        const close = parseFloat(item.close);
        
        const timestamp = new Date(item.timestamp).getTime();
        
        // Validate data
        if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close) || isNaN(timestamp)) {
          return null;
        }
        
        // ApexCharts candlestick format: [timestamp, [open, high, low, close]]
        return [timestamp, [open, high, low, close]];
      })
      .filter(item => item !== null); // Remove invalid data points
    
    return sorted;
  }, [chartData]);

  // Calculate Y-axis min/max with padding
  const yAxisMin = useMemo(() => {
    if (seriesData.length === 0) return 0;
    const allPrices = seriesData.flatMap(d => d[1]); // Extract all OHLC values
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice;
    return Math.max(0, minPrice - priceRange * 0.1);
  }, [seriesData]);

  const yAxisMax = useMemo(() => {
    if (seriesData.length === 0) return 100;
    const allPrices = seriesData.flatMap(d => d[1]); // Extract all OHLC values
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice;
    return maxPrice + priceRange * 0.1;
  }, [seriesData]);

  // Process indicator data for chart - separate main chart and subchart indicators
  const { mainChartIndicators, subchartIndicators } = useMemo(() => {
    console.log('🔍 Processing indicators for chart:', {
      indicatorsCount: indicators?.length || 0,
      seriesDataCount: seriesData?.length || 0,
      indicators: indicators?.map(ind => ({
        name: ind.toolName,
        valuesCount: ind.values?.length || 0,
        enabled: ind.enabled,
        subchart: ind.subchart
      }))
    });
    
    if (!indicators || indicators.length === 0 || !seriesData || seriesData.length === 0) {
      console.warn('⚠ No indicators or seriesData to process');
      return { mainChartIndicators: [], subchartIndicators: [] };
    }
    
    // Create a map of candlestick timestamps for fast lookup (from processed seriesData)
    const candlestickTimestamps = new Set(
      seriesData.map(item => item[0]) // item[0] is the timestamp
    );
    
    console.log('📊 Candlestick timestamps:', {
      count: candlestickTimestamps.size,
      sample: Array.from(candlestickTimestamps).slice(0, 5).map(ts => ({
        timestamp: ts,
        date: new Date(ts).toISOString()
      }))
    });
    
    const processIndicator = (ind) => {
      // Process indicator values - match with candlestick timestamps
      // Limit to same number of points as candlestick data
      let matchedCount = 0;
      let unmatchedCount = 0;
      
      const indicatorData = ind.values
        .slice(-1000) // Limit to last 1000 points
        .map(item => {
          // Convert timestamp to milliseconds (same format as candlestick data)
          let timestamp;
          if (typeof item.timestamp === 'string') {
            timestamp = new Date(item.timestamp).getTime();
          } else if (typeof item.timestamp === 'number') {
            // If already a number, assume it's milliseconds
            timestamp = item.timestamp;
          } else if (item.timestamp instanceof Date) {
            timestamp = item.timestamp.getTime();
          } else {
            return null;
          }
          
          const value = parseFloat(item.value);
          
          // Validate timestamp and value
          if (isNaN(timestamp) || isNaN(value)) {
            unmatchedCount++;
            return null;
          }
          
          // Check if timestamp matches a candlestick timestamp exactly
          if (candlestickTimestamps.has(timestamp)) {
            matchedCount++;
            return [timestamp, value];
          }
          
          // If no exact match, try to find the closest candlestick timestamp (within same day)
          // This handles timezone or precision differences
          const dayMs = 24 * 60 * 60 * 1000;
          let closestTs = null;
          let minDiff = Infinity;
          
          for (const candlestickTs of candlestickTimestamps) {
            const diff = Math.abs(timestamp - candlestickTs);
            if (diff < dayMs && diff < minDiff) {
              minDiff = diff;
              closestTs = candlestickTs;
            }
          }
          
          // If found a close match, use the candlestick timestamp for alignment
          if (closestTs !== null) {
            matchedCount++;
            return [closestTs, value];
          }
          
          // No match found
          unmatchedCount++;
          return null;
        })
        .filter(item => item !== null)
        .sort((a, b) => a[0] - b[0]); // Sort by timestamp
      
      console.log(`🔍 Indicator ${ind.toolName || 'Unknown'} matching: ${matchedCount} matched, ${unmatchedCount} unmatched out of ${ind.values.length} total`);
      
      if (indicatorData.length === 0) {
        console.warn(`⚠ Indicator ${ind.toolName || 'Unknown'} has no matching timestamps.`, {
          indicatorValuesCount: ind.values.length,
          candlestickTimestampsCount: candlestickTimestamps.size,
          matched: matchedCount,
          unmatched: unmatchedCount,
          sampleIndicatorTimestamps: ind.values.slice(0, 5).map(v => ({
            original: v.timestamp,
            type: typeof v.timestamp,
            parsed: new Date(v.timestamp).getTime(),
            value: v.value
          })),
          sampleCandlestickTimestamps: Array.from(candlestickTimestamps).slice(0, 5).map(ts => ({
            timestamp: ts,
            date: new Date(ts).toISOString()
          }))
        });
        return null;
      }
      
      console.log(`✓ Processed indicator ${ind.toolName || 'Unknown'}: ${indicatorData.length} data points (from ${ind.values.length} indicator values)`);
      
      return {
        name: ind.toolName || ind.tool?.name || 'Unknown',
        type: 'line',
        data: indicatorData,
        color: ind.style?.color || '#3B82F6',
        strokeWidth: ind.style?.line_width || 2,
      };
    };
    
    const mainChart = [];
    const subchart = [];
    
    const enabledIndicators = indicators.filter(ind => ind.enabled && ind.values && ind.values.length > 0);
    console.log(`📈 Processing ${enabledIndicators.length} enabled indicators`);
    
    enabledIndicators.forEach(ind => {
      const processed = processIndicator(ind);
      if (processed) {
        console.log(`  ✓ Added ${ind.toolName} to ${ind.subchart ? 'subchart' : 'main chart'}: ${processed.data.length} points`);
        if (ind.subchart) {
          subchart.push(processed);
        } else {
          mainChart.push(processed);
        }
      } else {
        console.warn(`  ✗ Failed to process ${ind.toolName}`);
      }
    });
    
    console.log('📊 Final processed indicators:', {
      mainChart: mainChart.length,
      subchart: subchart.length,
      mainChartNames: mainChart.map(ind => ind.name),
      subchartNames: subchart.map(ind => ind.name)
    });
    
    return { mainChartIndicators: mainChart, subchartIndicators: subchart };
  }, [indicators, seriesData]);

  // Main chart series: candlestick + main chart indicators only
  // Always ensure candlestick data is first and present
  const mainChartSeries = useMemo(() => {
    console.log('🔧 Building mainChartSeries:', {
      seriesDataLength: seriesData?.length || 0,
      mainChartIndicatorsLength: mainChartIndicators?.length || 0
    });
    
    // Always start with candlestick data - this must never be empty
    if (!seriesData || seriesData.length === 0) {
      console.warn('⚠ No seriesData available');
      return [];
    }
    
    // Validate that seriesData is actually candlestick data format
    const isValidCandlestick = seriesData.every(item => 
      Array.isArray(item) && 
      item.length === 2 && 
      Array.isArray(item[1]) && 
      item[1].length === 4
    );
    
    if (!isValidCandlestick) {
      console.warn('Invalid candlestick data format');
      return [];
    }
    
    const series = [
      {
        name: 'Price',
        type: 'candlestick',
        data: seriesData,
      },
    ];
    
    // Add main chart indicator series (overlay on price chart)
    // Only add indicators that are NOT subchart indicators
    if (mainChartIndicators && mainChartIndicators.length > 0) {
      console.log(`📊 Adding ${mainChartIndicators.length} main chart indicators to series`);
      mainChartIndicators.forEach((ind, index) => {
        if (ind && ind.data && ind.data.length > 0 && ind.type === 'line') {
          console.log(`  ✓ Adding ${ind.name}: ${ind.data.length} data points, color: ${ind.color}`);
          series.push({
            name: ind.name,
            type: 'line',
            data: ind.data,
          });
        } else {
          console.warn(`  ✗ Skipping ${ind?.name || 'unknown'}: invalid data`, {
            hasInd: !!ind,
            hasData: !!ind?.data,
            dataLength: ind?.data?.length || 0,
            type: ind?.type
          });
        }
      });
    } else {
      console.warn('⚠ No main chart indicators to add');
    }
    
    console.log(`📊 Final main chart series: ${series.length} series`, series.map(s => ({
      name: s.name,
      type: s.type,
      dataLength: s.data?.length || 0
    })));
    
    // Final validation: ensure first series is always candlestick
    if (series.length === 0 || series[0].type !== 'candlestick') {
      console.error('Main chart series must start with candlestick data');
      return [];
    }
    
    return series;
  }, [seriesData, mainChartIndicators]);

  // Create separate subchart configurations for each indicator
  // Each indicator gets its own subchart
  const subchartConfigs = useMemo(() => {
    return subchartIndicators.map((ind, index) => {
      // Calculate y-axis min/max for this specific indicator
      const allValues = ind.data.map(d => d[1]);
      const minValue = allValues.length > 0 ? Math.min(...allValues) : 0;
      const maxValue = allValues.length > 0 ? Math.max(...allValues) : 100;
      const range = maxValue - minValue;
      const yAxisMin = Math.max(0, minValue - range * 0.1);
      const yAxisMax = maxValue + range * 0.1;
      
      // Create series for this single indicator
      const series = [{
        name: ind.name,
        type: 'line',
        data: ind.data,
      }];
      
      // Create options for this specific subchart
      const chartId = `subchart-${chartKey}-${index}`;
      const options = {
        chart: {
          id: chartId,
          type: 'line',
          height: 200,
          toolbar: {
            show: false, // Hide toolbar on subchart
          },
          zoom: {
            enabled: false, // Disable zoom on subchart
          },
          animations: {
            enabled: false,
          },
        },
        xaxis: {
          type: 'datetime',
          labels: {
            format: 'MMM dd, yyyy',
            rotate: -45,
            rotateAlways: false,
          },
        },
        yaxis: {
          labels: {
            formatter: function (value) {
              return value.toFixed(2);
            },
          },
          min: yAxisMin,
          max: yAxisMax,
          title: {
            text: ind.name,
          },
        },
        tooltip: {
          x: {
            format: 'MMM dd, yyyy',
          },
          shared: true,
        },
        stroke: {
          curve: 'smooth',
          width: ind.strokeWidth || 2,
        },
        colors: [ind.color],
        grid: {
          borderColor: '#e5e7eb',
          strokeDashArray: 4,
        },
        legend: {
          show: true,
          position: 'top',
        },
      };
      
      return {
        id: chartId,
        series,
        options,
        indicator: ind,
      };
    });
  }, [subchartIndicators, chartKey]);

  // Main chart configuration (candlestick + main chart indicators)
  const mainChartOptions = useMemo(() => {
    const colors = ['#3B82F6', ...mainChartIndicators.map(ind => ind.color)];
    const strokeWidths = [2, ...mainChartIndicators.map(ind => ind.strokeWidth || 2)];
    
    // Use stable chart ID based on ticker only
    const chartId = `mainChart-${chartKey}`;
    
    return {
      chart: {
        id: chartId,
        type: 'candlestick',
        height: 400,
        // Removed group to prevent chart swapping - will use manual synchronization
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: false, // Disable selection/zoom
            zoom: false, // Disable zoom
            zoomin: false, // Disable zoom in
            zoomout: false, // Disable zoom out
            pan: false, // Disable pan
            reset: true, // Keep reset button
          },
        },
        zoom: {
          enabled: false, // Disable zoom completely
        },
        animations: {
          enabled: false,
        },
      },
      xaxis: {
        type: 'datetime',
        labels: {
          format: 'MMM dd, yyyy',
          rotate: -45,
          rotateAlways: false,
        },
      },
      yaxis: {
        labels: {
          formatter: function (value) {
            return `$${value.toFixed(2)}`;
          },
        },
        min: yAxisMin,
        max: yAxisMax,
        title: {
          text: 'Price',
        },
      },
      tooltip: {
        x: {
          format: 'MMM dd, yyyy',
        },
        shared: true,
        custom: function({ seriesIndex, dataPointIndex, w }) {
          // Safely get timestamp from candlestick data
          const candlestickSeries = w.globals.initialSeries[0];
          if (!candlestickSeries || !candlestickSeries.data || !candlestickSeries.data[dataPointIndex]) {
            return '';
          }
          
          const candlestickData = candlestickSeries.data[dataPointIndex];
          const timestamp = candlestickData[0];
          const dateStr = new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          
          let tooltipContent = `<div style="padding: 10px;"><div style="font-weight: bold; margin-bottom: 5px;">${dateStr}</div>`;
          
          // Add candlestick data
          if (candlestickData && Array.isArray(candlestickData[1])) {
            const [open, high, low, close] = candlestickData[1];
            const change = ((close - open) / open * 100);
            const changeSymbol = close >= open ? '↑' : '↓';
            
            tooltipContent += `
              <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb;">
                <div>Open: <strong>$${open.toFixed(2)}</strong></div>
                <div>High: <strong>$${high.toFixed(2)}</strong></div>
                <div>Low: <strong>$${low.toFixed(2)}</strong></div>
                <div>Close: <strong>$${close.toFixed(2)}</strong></div>
                <div style="margin-top: 5px;">${changeSymbol} <strong>${change.toFixed(2)}%</strong></div>
              </div>
            `;
          }
          
          // Add indicator values (only main chart indicators in this tooltip)
          for (let i = 1; i < w.globals.initialSeries.length; i++) {
            const series = w.globals.initialSeries[i];
            if (series.data && series.data[dataPointIndex]) {
              const value = series.data[dataPointIndex][1];
              const color = series.color || '#3B82F6';
              tooltipContent += `
                <div style="margin-top: 4px;">
                  <span style="display: inline-block; width: 12px; height: 12px; background-color: ${color}; margin-right: 6px; border-radius: 2px;"></span>
                  ${series.name}: <strong>${typeof value === 'number' ? value.toFixed(2) : value}</strong>
                </div>
              `;
            }
          }
          
          tooltipContent += '</div>';
          return tooltipContent;
        },
      },
      plotOptions: {
        candlestick: {
          colors: {
            upward: '#10b981', // Green for up candles
            downward: '#ef4444', // Red for down candles
          },
        },
      },
      stroke: {
        curve: 'smooth',
        width: strokeWidths,
      },
      colors: colors, // Colors array: first for candlestick, then for each indicator in order
      grid: {
        borderColor: '#e5e7eb',
        strokeDashArray: 4,
      },
      legend: {
        show: true,
        position: 'top',
      },
      annotations: signals && signals.length > 0 && seriesData.length > 0 ? {
        points: signals
          .filter(signal => {
            // Basic validation - just check that timestamp and price exist
            // Don't filter by time range - show all signals (they should all be within the data range)
            return signal.timestamp && signal.price && !isNaN(signal.timestamp) && !isNaN(signal.price);
          })
          .map((signal, idx) => {
            // Debug logging
            if (idx === 0) {
              const validSignals = signals.filter(s => s.timestamp && s.price && !isNaN(s.timestamp) && !isNaN(s.price));
              console.log('CandlestickChart: Processing signals', {
                totalSignals: signals.length,
                filteredSignals: validSignals.length,
                firstSignal: signal,
                seriesDataLength: seriesData.length,
                dataTimeRange: {
                  min: new Date(Math.min(...seriesData.map(d => d[0]))).toISOString(),
                  max: new Date(Math.max(...seriesData.map(d => d[0]))).toISOString(),
                },
                sampleSignalTime: new Date(signal.timestamp).toISOString(),
              });
            }
            
            // Determine color and triangle direction based on signal type and position
            // Colors must match the badge colors in the datatable exactly:
            // Long entry: bg-green-100 text-green-800 -> Green #10b981 or #22c55e
            // Short entry: bg-blue-100 text-blue-800 -> Blue #3b82f6 or #2563eb
            // Long exit: bg-red-100 text-red-800 -> Red #ef4444 or #dc2626
            // Short exit: bg-orange-100 text-orange-800 -> Orange #f97316 or #ea580c
            let fillColor;
            let triangleDirection; // 'up' for entry, 'down' for exit
            
            if (signal.type === 'entry') {
              triangleDirection = 'up';
              if (signal.positionType === 'long') {
                fillColor = '#22c55e'; // Green for long entry (matches bg-green-100 text-green-800)
              } else {
                fillColor = '#2563eb'; // Blue for short entry (matches bg-blue-100 text-blue-800)
              }
            } else { // exit
              triangleDirection = 'down';
              if (signal.positionType === 'long') {
                fillColor = '#dc2626'; // Red for long exit (matches bg-red-100 text-red-800)
              } else {
                fillColor = '#ea580c'; // Orange for short exit (matches bg-orange-100 text-orange-800)
              }
            }
            
            // Create triangle SVG
            // Triangle pointing up: for entry signals
            // Triangle pointing down: for exit signals
            const triangleSize = 24; // Increased size for better visibility
            let svgContent;
            if (triangleDirection === 'up') {
              // Upward triangle (entry) - points up
              svgContent = `<svg width="${triangleSize}" height="${triangleSize}" xmlns="http://www.w3.org/2000/svg">
                <polygon points="${triangleSize/2},2 ${triangleSize-2},${triangleSize-2} 2,${triangleSize-2}" fill="${fillColor}" stroke="#fff" stroke-width="1.5"/>
              </svg>`;
            } else {
              // Downward triangle (exit) - points down
              svgContent = `<svg width="${triangleSize}" height="${triangleSize}" xmlns="http://www.w3.org/2000/svg">
                <polygon points="2,2 ${triangleSize-2},2 ${triangleSize/2},${triangleSize-2}" fill="${fillColor}" stroke="#fff" stroke-width="1.5"/>
              </svg>`;
            }
            
            // Encode SVG as data URI
            const svgDataUri = `data:image/svg+xml;base64,${btoa(svgContent)}`;
            
            return {
              x: signal.timestamp,
              y: signal.price,
              marker: {
                size: 0, // Hide default circular marker
              },
              image: {
                path: svgDataUri,
                width: triangleSize,
                height: triangleSize,
                offsetX: -triangleSize/2,
                offsetY: -triangleSize/2,
              },
            };
          }),
      } : {},
    };
  }, [seriesData, yAxisMin, yAxisMax, mainChartIndicators, mainChartSeries, chartKey, signals]);


  if (seriesData.length === 0) {
    return (
      <div className="h-[500px] flex items-center justify-center text-gray-500 bg-white rounded-lg border border-gray-200">
        <div className="text-center">
          <p className="text-lg font-medium">No data available</p>
          <p className="text-sm text-gray-400 mt-1">Fetch OHLCV data to see the chart</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 p-4">
      {/* Controls */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-lg font-semibold text-gray-900">Price Chart</h3>
          
          {/* Timeframe filters */}
          <div className="flex gap-1">
            {TIMEFRAME_OPTIONS.map((tf) => (
              <button
                key={tf.label}
                onClick={() => setSelectedTimeframe(tf.label)}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                  selectedTimeframe === tf.label
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Main Chart - Always render if we have data and first series is candlestick */}
      {mainChartSeries.length > 0 && 
       mainChartSeries[0]?.type === 'candlestick' && 
       mainChartSeries[0]?.name === 'Price' && (
        <div key={`main-chart-container-${chartKey}`} style={{ height: '400px', position: 'relative' }}>
          <Chart
            key={`main-chart-${chartKey}`}
            options={mainChartOptions}
            series={mainChartSeries}
            type="candlestick"
            height={400}
          />
        </div>
      )}
      
      {/* Subcharts - One separate chart for each indicator below main chart */}
      {subchartConfigs.map((subchartConfig, index) => (
        <div 
          key={`subchart-container-${subchartConfig.id}`} 
          className="mt-4" 
          style={{ height: '200px', position: 'relative' }}
        >
          <Chart
            key={subchartConfig.id}
            options={subchartConfig.options}
            series={subchartConfig.series}
            type="line"
            height={200}
          />
        </div>
      ))}
      
      {/* Indicator Legend */}
      {(mainChartIndicators.length > 0 || subchartIndicators.length > 0) && (
        <div className="mt-4">
          {mainChartIndicators.length > 0 && (
            <div className="mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase">Main Chart:</span>
              <div className="mt-1 flex flex-wrap gap-3">
                {mainChartIndicators.map((ind, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div
                      className="w-4 h-0.5"
                      style={{ backgroundColor: ind.color }}
                    />
                    <span className="text-sm text-gray-600">{ind.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {subchartIndicators.length > 0 && (
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase">Subchart:</span>
              <div className="mt-1 flex flex-wrap gap-3">
                {subchartIndicators.map((ind, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div
                      className="w-4 h-0.5"
                      style={{ backgroundColor: ind.color }}
                    />
                    <span className="text-sm text-gray-600">{ind.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
