/**
 * Top/Worst Performers Chart Component
 * Displays top and worst performing symbols by total PnL using horizontal bar charts
 */

import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function TopPerformersChart({ symbols, mode = 'all', topCount = 10 }) {
  // Calculate top and worst performers by total_pnl for the selected mode
  const performers = useMemo(() => {
    if (!symbols || symbols.length === 0) {
      return { top: [], worst: [] };
    }

    // Extract symbols with their PnL for the selected mode
    const symbolPnLs = symbols
      .map(symbol => {
        const statsByMode = symbol.stats_by_mode || {};
        const modeStats = statsByMode[mode] || {};
        const totalPnl = modeStats.total_pnl;
        
        // Only include symbols that have stats for this mode
        if (totalPnl === null || totalPnl === undefined) {
          return null;
        }
        
        return {
          ticker: symbol.symbol_ticker,
          totalPnl: typeof totalPnl === 'string' ? parseFloat(totalPnl) : totalPnl,
          stats: modeStats
        };
      })
      .filter(item => item !== null && !isNaN(item.totalPnl))
      .sort((a, b) => b.totalPnl - a.totalPnl); // Sort descending by PnL

    // Get top performers (highest PnL)
    const top = symbolPnLs.slice(0, topCount);
    
    // Get worst performers (lowest PnL) - reverse order for worst
    const worst = [...symbolPnLs]
      .reverse()
      .slice(0, topCount)
      .reverse(); // Reverse back to show worst first (most negative)

    return { top, worst };
  }, [symbols, mode, topCount]);

  const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Top Performers Chart Options
  const topChartOptions = useMemo(() => ({
    chart: {
      type: 'bar',
      horizontal: true,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '70%',
        borderRadius: 4,
        dataLabels: {
          position: 'center', // Position ticker name in center of bar
        },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: function(val, opts) {
        // Return the ticker name for the bar
        const index = opts.dataPointIndex;
        return performers.top[index]?.ticker || '';
      },
      style: {
        fontSize: '12px',
        fontWeight: 600,
        colors: ['#fff'], // White text on colored bars
      },
      offsetX: 0,
      offsetY: 0,
    },
    xaxis: {
      title: { text: 'Total PnL ($)' },
      labels: {
        formatter: (val) => formatCurrency(val),
      },
    },
    yaxis: {
      show: false, // Hide Y-axis labels (we'll show ticker names in bars instead)
    },
    colors: ['#10b981'], // Green for positive
    tooltip: {
      y: {
        formatter: (val) => formatCurrency(val),
      },
    },
    title: {
      text: `Top ${performers.top.length} Performers (${mode.toUpperCase()})`,
      align: 'left',
      style: {
        fontSize: '18px',
        fontWeight: 600,
      },
    },
  }), [performers.top, mode]);

  // Worst Performers Chart Options
  const worstChartOptions = useMemo(() => ({
    chart: {
      type: 'bar',
      horizontal: true,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '70%',
        borderRadius: 4,
        dataLabels: {
          position: 'center', // Position ticker name in center of bar
        },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: function(val, opts) {
        // Return the ticker name for the bar
        const index = opts.dataPointIndex;
        return performers.worst[index]?.ticker || '';
      },
      style: {
        fontSize: '12px',
        fontWeight: 600,
        colors: ['#fff'], // White text on colored bars
      },
      offsetX: 0,
      offsetY: 0,
    },
    xaxis: {
      title: { text: 'Total PnL ($)' },
      labels: {
        formatter: (val) => formatCurrency(val),
      },
    },
    yaxis: {
      show: false, // Hide Y-axis labels (we'll show ticker names in bars instead)
    },
    colors: ['#ef4444'], // Red for negative
    tooltip: {
      y: {
        formatter: (val) => formatCurrency(val),
      },
    },
    title: {
      text: `Worst ${performers.worst.length} Performers (${mode.toUpperCase()})`,
      align: 'left',
      style: {
        fontSize: '18px',
        fontWeight: 600,
      },
    },
  }), [performers.worst, mode]);

  const topSeries = useMemo(() => {
    if (performers.top.length === 0) return [];
    return [{
      name: 'Total PnL',
      data: performers.top.map(p => p.totalPnl),
    }];
  }, [performers.top]);

  const worstSeries = useMemo(() => {
    if (performers.worst.length === 0) return [];
    return [{
      name: 'Total PnL',
      data: performers.worst.map(p => p.totalPnl),
    }];
  }, [performers.worst]);

  // Don't render if no data
  if (performers.top.length === 0 && performers.worst.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <p className="text-gray-600">No performance data available for {mode.toUpperCase()} mode.</p>
      </div>
    );
  }

  return (
    <div className="mb-6 bg-white rounded-lg shadow-lg p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        {performers.top.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
            </div>
            <Chart
              options={topChartOptions}
              series={topSeries}
              type="bar"
              height={Math.max(300, performers.top.length * 35)}
            />
          </div>
        )}

        {/* Worst Performers */}
        {performers.worst.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-5 h-5 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">Worst Performers</h3>
            </div>
            <Chart
              options={worstChartOptions}
              series={worstSeries}
              type="bar"
              height={Math.max(300, performers.worst.length * 35)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
