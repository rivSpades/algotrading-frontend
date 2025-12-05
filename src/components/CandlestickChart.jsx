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

export default function CandlestickChart({ data = [], ticker, indicators = [] }) {
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
    if (!indicators || indicators.length === 0 || !seriesData || seriesData.length === 0) {
      return { mainChartIndicators: [], subchartIndicators: [] };
    }
    
    // Create a map of candlestick timestamps for fast lookup (from processed seriesData)
    const candlestickTimestamps = new Set(
      seriesData.map(item => item[0]) // item[0] is the timestamp
    );
    
    const processIndicator = (ind) => {
      // Process indicator values - only include those that match candlestick timestamps
      // Limit to same number of points as candlestick data
      const indicatorData = ind.values
        .slice(-1000) // Limit to last 1000 points
        .map(item => {
          const timestamp = new Date(item.timestamp).getTime();
          const value = parseFloat(item.value);
          
          // Only include if timestamp matches a candlestick timestamp and value is valid
          if (isNaN(timestamp) || isNaN(value) || !candlestickTimestamps.has(timestamp)) {
            return null;
          }
          
          return [timestamp, value];
        })
        .filter(item => item !== null)
        .sort((a, b) => a[0] - b[0]); // Sort by timestamp
      
      if (indicatorData.length === 0) return null;
      
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
    
    indicators
      .filter(ind => ind.enabled && ind.values && ind.values.length > 0)
      .forEach(ind => {
        const processed = processIndicator(ind);
        if (processed) {
          if (ind.subchart) {
            subchart.push(processed);
          } else {
            mainChart.push(processed);
          }
        }
      });
    
    return { mainChartIndicators: mainChart, subchartIndicators: subchart };
  }, [indicators, seriesData]);

  // Main chart series: candlestick + main chart indicators only
  // Always ensure candlestick data is first and present
  const mainChartSeries = useMemo(() => {
    // Always start with candlestick data - this must never be empty
    if (!seriesData || seriesData.length === 0) {
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
      mainChartIndicators.forEach(ind => {
        if (ind && ind.data && ind.data.length > 0 && ind.type === 'line') {
          series.push({
            name: ind.name,
            type: 'line',
            data: ind.data,
          });
        }
      });
    }
    
    // Final validation: ensure first series is always candlestick
    if (series.length === 0 || series[0].type !== 'candlestick') {
      console.error('Main chart series must start with candlestick data');
      return [];
    }
    
    return series;
  }, [seriesData, mainChartIndicators]);

  // Subchart series: subchart indicators only (separate chart)
  const subchartSeries = useMemo(() => {
    return subchartIndicators.map(ind => ({
      name: ind.name,
      type: 'line',
      data: ind.data,
    }));
  }, [subchartIndicators]);

  // Calculate subchart y-axis min/max if there are subchart indicators
  const subchartYAxisMin = useMemo(() => {
    if (subchartIndicators.length === 0) return 0;
    const allValues = subchartIndicators.flatMap(ind => ind.data.map(d => d[1]));
    if (allValues.length === 0) return 0;
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const range = maxValue - minValue;
    return Math.max(0, minValue - range * 0.1);
  }, [subchartIndicators]);

  const subchartYAxisMax = useMemo(() => {
    if (subchartIndicators.length === 0) return 100;
    const allValues = subchartIndicators.flatMap(ind => ind.data.map(d => d[1]));
    if (allValues.length === 0) return 100;
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const range = maxValue - minValue;
    return maxValue + range * 0.1;
  }, [subchartIndicators]);

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
      colors: colors,
      grid: {
        borderColor: '#e5e7eb',
        strokeDashArray: 4,
      },
      legend: {
        show: true,
        position: 'top',
      },
    };
  }, [seriesData, yAxisMin, yAxisMax, mainChartIndicators, mainChartSeries, chartKey]);

  // Subchart configuration (subchart indicators only)
  const subchartOptions = useMemo(() => {
    if (subchartIndicators.length === 0) return null;
    
    const colors = subchartIndicators.map(ind => ind.color);
    const strokeWidths = subchartIndicators.map(ind => ind.strokeWidth || 2);
    
    // Use stable chart ID based on ticker only
    const chartId = `subchart-${chartKey}`;
    const groupName = `priceChart-${chartKey}`;
    
    return {
      chart: {
        id: chartId,
        type: 'line',
        height: 200,
        // Removed group to prevent chart swapping - will use manual synchronization
        toolbar: {
          show: false, // Hide toolbar on subchart
        },
        zoom: {
          enabled: false, // Disable zoom on subchart (controlled by main chart)
        },
        animations: {
          enabled: false,
        },
        events: {
          // Subchart should not control main chart - only main chart controls subchart
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
        min: subchartYAxisMin,
        max: subchartYAxisMax,
        title: {
          text: subchartIndicators.map(ind => ind.name).join(', '),
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
        width: strokeWidths,
      },
      colors: colors,
      grid: {
        borderColor: '#e5e7eb',
        strokeDashArray: 4,
      },
      legend: {
        show: true,
        position: 'top',
      },
    };
  }, [subchartIndicators, subchartSeries, subchartYAxisMin, subchartYAxisMax, chartKey]);

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
      
      {/* Subchart - Separate chart below main chart - Only line charts, never candlestick */}
      {subchartIndicators.length > 0 && 
       subchartOptions && 
       subchartSeries.length > 0 && 
       subchartSeries.every(s => s.type === 'line') && (
        <div key={`subchart-container-${chartKey}`} className="mt-4" style={{ height: '200px', position: 'relative' }}>
          <Chart
            key={`subchart-${chartKey}`}
            options={subchartOptions}
            series={subchartSeries}
            type="line"
            height={200}
          />
        </div>
      )}
      
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
