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

export default function CandlestickChart({ data = [], ticker }) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('All');
  const [chartData, setChartData] = useState(data);

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

  // ApexCharts configuration
  const chartOptions = useMemo(() => ({
    chart: {
      type: 'candlestick',
      height: 500,
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true,
        },
      },
      zoom: {
        enabled: true,
        type: 'x',
        autoScaleYaxis: true,
      },
    },
    series: [
      {
        name: 'Price',
        data: seriesData,
      },
    ],
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
    },
    tooltip: {
      x: {
        format: 'MMM dd, yyyy',
      },
      custom: function({ seriesIndex, dataPointIndex, w }) {
        const data = w.globals.initialSeries[seriesIndex].data[dataPointIndex];
        if (!data || !Array.isArray(data[1])) return '';
        
        const [open, high, low, close] = data[1];
        const change = ((close - open) / open * 100);
        const changeSymbol = close >= open ? '↑' : '↓';
        
        return `
          <div style="padding: 10px;">
            <div style="font-weight: bold; margin-bottom: 5px;">${new Date(data[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            <div>Open: <strong>$${open.toFixed(2)}</strong></div>
            <div>High: <strong>$${high.toFixed(2)}</strong></div>
            <div>Low: <strong>$${low.toFixed(2)}</strong></div>
            <div>Close: <strong>$${close.toFixed(2)}</strong></div>
            <div style="margin-top: 5px;">${changeSymbol} <strong>${change.toFixed(2)}%</strong></div>
          </div>
        `;
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
    grid: {
      borderColor: '#e5e7eb',
      strokeDashArray: 4,
    },
  }), [seriesData, yAxisMin, yAxisMax]);

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
      
      {/* Chart */}
      <div style={{ height: '500px', position: 'relative' }}>
        <Chart
          options={chartOptions}
          series={chartOptions.series}
          type="candlestick"
          height={500}
        />
      </div>
    </div>
  );
}
