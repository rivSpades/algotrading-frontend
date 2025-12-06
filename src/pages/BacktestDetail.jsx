/**
 * Backtest Detail Page Component
 * Displays detailed results of a backtest
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { getBacktest, getBacktestStatistics, getBacktestTrades } from '../data/backtests';
import StatisticsCard from '../components/StatisticsCard';
import Chart from 'react-apexcharts';

export default function BacktestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [backtest, setBacktest] = useState(null);
  const [statistics, setStatistics] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [backtestData, statsData, tradesData] = await Promise.all([
        getBacktest(id),
        getBacktestStatistics(id),
        getBacktestTrades(id),
      ]);
      setBacktest(backtestData);
      setStatistics(statsData);
      setTrades(tradesData);
      
      // Set first symbol as default if available
      if (statsData.length > 0 && statsData[0].symbol_info) {
        setSelectedSymbol(statsData[0].symbol_info.ticker);
      }
    } catch (error) {
      console.error('Error loading backtest data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return `${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">Loading backtest results...</div>
      </div>
    );
  }

  if (!backtest) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">
          <p className="text-gray-600">Backtest not found</p>
          <button
            onClick={() => navigate('/backtests')}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Back to Backtests
          </button>
        </div>
      </div>
    );
  }

  const selectedStats = statistics.find(s => 
    selectedSymbol ? s.symbol_info?.ticker === selectedSymbol : !s.symbol_info
  ) || statistics[0];

  const selectedTrades = trades.filter(t => 
    selectedSymbol ? t.symbol_info?.ticker === selectedSymbol : true
  );

  // Prepare equity curve chart data
  const equityCurveData = selectedStats?.equity_curve || [];
  const equityChartOptions = {
    chart: {
      type: 'line',
      toolbar: { show: false },
    },
    xaxis: {
      type: 'datetime',
    },
    yaxis: {
      title: { text: 'Equity ($)' },
    },
    title: {
      text: 'Equity Curve',
    },
    colors: ['#3B82F6'],
  };
  const equityChartSeries = [{
    name: 'Equity',
    data: equityCurveData.map(point => ({
      x: new Date(point.timestamp).getTime(),
      y: point.equity,
    })),
  }];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/backtests')}
        className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Backtests
      </button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {backtest.name || `${backtest.strategy_info?.name || 'Backtest'} #${backtest.id}`}
        </h1>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>Strategy: {backtest.strategy_info?.name || 'N/A'}</span>
          <span>•</span>
          <span>Date Range: {formatDate(backtest.start_date)} - {formatDate(backtest.end_date)}</span>
          <span>•</span>
          <span>Status: <span className={`font-medium ${backtest.status === 'completed' ? 'text-green-600' : backtest.status === 'failed' ? 'text-red-600' : 'text-yellow-600'}`}>{backtest.status}</span></span>
        </div>
      </div>

      {/* Symbol Selector (if multiple symbols) */}
      {backtest.symbols_info && backtest.symbols_info.length > 1 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Symbol
          </label>
          <select
            value={selectedSymbol || ''}
            onChange={(e) => setSelectedSymbol(e.target.value || null)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">All Symbols (Portfolio)</option>
            {backtest.symbols_info.map((symbol) => (
              <option key={symbol.ticker} value={symbol.ticker}>
                {symbol.ticker}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Statistics Cards */}
      {selectedStats && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Performance Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatisticsCard
              title="Total Trades"
              value={selectedStats.total_trades || 0}
              unit=""
              description="Total number of trades executed"
              icon={BarChart3}
            />
            <StatisticsCard
              title="Win Rate"
              value={selectedStats.win_rate ? formatPercentage(selectedStats.win_rate) : 'N/A'}
              unit=""
              description="Percentage of winning trades"
              icon={TrendingUp}
            />
            <StatisticsCard
              title="Total PnL"
              value={formatCurrency(selectedStats.total_pnl)}
              unit=""
              description="Total profit/loss"
              icon={selectedStats.total_pnl >= 0 ? TrendingUp : TrendingDown}
            />
            <StatisticsCard
              title="Profit Factor"
              value={selectedStats.profit_factor ? selectedStats.profit_factor.toFixed(2) : 'N/A'}
              unit=""
              description="Ratio of gross profit to gross loss"
              icon={TrendingUp}
            />
            <StatisticsCard
              title="Sharpe Ratio"
              value={selectedStats.sharpe_ratio ? selectedStats.sharpe_ratio.toFixed(2) : 'N/A'}
              unit=""
              description="Risk-adjusted return measure"
              icon={TrendingUp}
            />
            <StatisticsCard
              title="CAGR"
              value={selectedStats.cagr ? formatPercentage(selectedStats.cagr) : 'N/A'}
              unit=""
              description="Compound Annual Growth Rate"
              icon={TrendingUp}
            />
            <StatisticsCard
              title="Max Drawdown"
              value={selectedStats.max_drawdown ? formatPercentage(selectedStats.max_drawdown) : 'N/A'}
              unit=""
              description="Maximum peak-to-trough decline"
              icon={TrendingDown}
            />
            <StatisticsCard
              title="Average PnL"
              value={formatCurrency(selectedStats.average_pnl)}
              unit=""
              description="Average profit/loss per trade"
              icon={TrendingUp}
            />
          </div>
        </div>
      )}

      {/* Equity Curve Chart */}
      {equityCurveData.length > 0 && (
        <div className="mb-6 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Equity Curve</h2>
          <Chart
            options={equityChartOptions}
            series={equityChartSeries}
            type="line"
            height={400}
          />
        </div>
      )}

      {/* Trades Table */}
      {selectedTrades.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Trade List</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entry Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exit Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entry Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exit Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PnL</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PnL %</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {selectedTrades.map((trade) => (
                  <tr key={trade.id} className={trade.is_winner ? 'bg-green-50' : 'bg-red-50'}>
                    <td className="px-4 py-3 text-sm text-gray-900">{trade.symbol_info?.ticker || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 capitalize">{trade.trade_type}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(trade.entry_price)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(trade.exit_price)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{formatDate(trade.entry_timestamp)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{formatDate(trade.exit_timestamp)}</td>
                    <td className={`px-4 py-3 text-sm font-medium ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(trade.pnl)}
                    </td>
                    <td className={`px-4 py-3 text-sm font-medium ${trade.pnl_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercentage(trade.pnl_percentage)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

