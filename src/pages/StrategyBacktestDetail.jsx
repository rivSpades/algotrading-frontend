/**
 * Strategy Backtest Detail Page Component
 * Displays detailed results of a backtest for a specific strategy
 * URL: /strategies/:id/backtests/:backtestId
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, BarChart3, List, Loader } from 'lucide-react';
import { getStrategy } from '../data/strategies';
import { getBacktest, getBacktestStatistics, getBacktestTrades } from '../data/backtests';
import { marketDataAPI } from '../data/api';
import StatisticsCard from '../components/StatisticsCard';
import Chart from 'react-apexcharts';
import TaskProgress from '../components/TaskProgress';

export default function StrategyBacktestDetail() {
  const { id, backtestId } = useParams();
  const navigate = useNavigate();
  const [strategy, setStrategy] = useState(null);
  const [backtest, setBacktest] = useState(null);
  const [statistics, setStatistics] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [taskId, setTaskId] = useState(null);
  const [showTaskProgress, setShowTaskProgress] = useState(false);
  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    loadData();
    
    // Set up polling for running backtests
    if (backtest?.status === 'running') {
      const interval = setInterval(() => {
        loadData();
      }, 3000); // Poll every 3 seconds
      pollingIntervalRef.current = interval;
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [id, backtestId, backtest?.status]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [strategyData, backtestData, statsData, tradesData] = await Promise.all([
        getStrategy(id),
        getBacktest(backtestId),
        getBacktestStatistics(backtestId),
        getBacktestTrades(backtestId),
      ]);
      
      console.log('Loaded data:', {
        strategy: strategyData,
        backtest: backtestData,
        statistics: statsData,
        trades: tradesData,
      });
      
      setStrategy(strategyData);
      setBacktest(backtestData);
      
      // Handle statistics - check if it's an array or wrapped in a response
      const statsArray = Array.isArray(statsData) ? statsData : (statsData?.results || statsData?.data || []);
      setStatistics(statsArray);
      
      // Handle trades - check if it's an array or wrapped in a response
      const tradesArray = Array.isArray(tradesData) ? tradesData : (tradesData?.results || tradesData?.data || []);
      setTrades(tradesArray);
      
      // Get symbols from backtest if statistics are empty (backtest still running)
      if (statsArray.length === 0 && backtestData?.symbols_info) {
        // Symbols are available even when backtest is running
      }
      
      // Set first symbol as default if available
      if (statsArray.length > 0 && statsArray[0].symbol_info) {
        setSelectedSymbol(statsArray[0].symbol_info.ticker);
      } else if (backtestData?.symbols_info && backtestData.symbols_info.length > 0) {
        // Use first symbol from backtest if no statistics yet
        setSelectedSymbol(backtestData.symbols_info[0].ticker);
      }
      
      // Try to find task ID from active tasks if backtest is running
      if (backtestData?.status === 'running') {
        try {
          const activeTasksResponse = await marketDataAPI.getActiveTasks();
          if (activeTasksResponse.success && activeTasksResponse.data?.results) {
            // Find task that matches this backtest (by name or args)
            const matchingTask = activeTasksResponse.data.results.find(task => {
              const taskName = task.name || '';
              return taskName.includes('backtest') || 
                     (task.args && task.args.includes(parseInt(backtestId)));
            });
            if (matchingTask) {
              setTaskId(matchingTask.task_id);
              setShowTaskProgress(true);
            }
          }
        } catch (error) {
          console.error('Error finding task ID:', error);
        }
      }
    } catch (error) {
      console.error('Error loading backtest data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    // Check if date is the default "all data" date (1900-01-01 or similar)
    const year = date.getFullYear();
    if (year < 2000) {
      return 'All Available Data';
    }
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

  if (!backtest || !strategy) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">
          <p className="text-gray-600">Backtest or strategy not found</p>
          <button
            onClick={() => navigate(`/strategies/${id}`)}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Back to Strategy
          </button>
        </div>
      </div>
    );
  }

  // Get unique symbols from statistics or backtest
  const symbolsFromStats = statistics
    .map(s => s?.symbol_info)
    .filter(Boolean)
    .filter((symbol, index, self) => 
      index === self.findIndex(s => s?.ticker === symbol?.ticker)
    );
  
  // If no statistics yet, get symbols from backtest
  const symbols = symbolsFromStats.length > 0 
    ? symbolsFromStats 
    : (backtest?.symbols_info || []);

  // Get selected symbol statistics
  const selectedStats = selectedSymbol
    ? statistics.find(s => s?.symbol_info?.ticker === selectedSymbol)
    : null;

  // Get portfolio-level statistics (aggregated or first available)
  // Portfolio stats have symbol_info as null/undefined
  const portfolioStats = statistics.find(s => !s?.symbol_info) || statistics[0] || null;

  // Get trades for selected symbol or all trades
  const selectedTrades = selectedSymbol
    ? trades.filter(t => t.symbol_info?.ticker === selectedSymbol)
    : trades;

  // Prepare equity curve chart data
  const equityCurveData = (selectedStats || portfolioStats)?.equity_curve || [];
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
      text: selectedSymbol ? `Equity Curve - ${selectedSymbol}` : 'Portfolio Equity Curve',
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

  // Statistics to display (use selected symbol stats if available, otherwise portfolio)
  const displayStats = selectedStats || portfolioStats;

  const handleTaskComplete = () => {
    // Reload data when task completes
    loadData();
    setShowTaskProgress(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {showTaskProgress && taskId && (
        <TaskProgress
          taskId={taskId}
          onComplete={handleTaskComplete}
          onClose={() => setShowTaskProgress(false)}
        />
      )}
      
      <button
        onClick={() => navigate(`/strategies/${id}`)}
        className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Strategy
      </button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {backtest.name || `${strategy.name} - Backtest #${backtest.id}`}
        </h1>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>Strategy: {strategy.name}</span>
          <span>•</span>
          <span>Date Range: {formatDate(backtest.start_date)} - {formatDate(backtest.end_date)}</span>
          <span>•</span>
          <span className="flex items-center gap-2">
            Status: 
            {backtest.status === 'running' && <Loader className="w-4 h-4 animate-spin" />}
            <span className={`font-medium ${backtest.status === 'completed' ? 'text-green-600' : backtest.status === 'failed' ? 'text-red-600' : 'text-yellow-600'}`}>
              {backtest.status}
            </span>
          </span>
          {backtest.status === 'failed' && backtest.error_message && (
            <div className="mt-2 p-3 bg-red-50 border-l-4 border-red-400 rounded">
              <p className="text-sm text-red-700">
                <strong>Error:</strong> {backtest.error_message}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Symbol List */}
      {symbols.length > 0 ? (
        <div className="mb-6 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <List className="w-5 h-5" />
            Symbols Backtested
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedSymbol(null)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                !selectedSymbol
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Portfolio (All)
            </button>
            {symbols.map((symbol) => (
              <button
                key={symbol.ticker}
                onClick={() => setSelectedSymbol(symbol.ticker)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedSymbol === symbol.ticker
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {symbol.ticker}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-6 bg-white rounded-lg shadow-lg p-6">
          <p className="text-gray-600">No symbols found for this backtest.</p>
        </div>
      )}

      {/* Statistics Cards */}
      {displayStats ? (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {selectedSymbol ? `Performance Metrics - ${selectedSymbol}` : 'Portfolio Performance Metrics'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatisticsCard
              title="Total Trades"
              value={displayStats.total_trades || 0}
              unit=""
              description="Total number of trades executed"
              icon={BarChart3}
            />
            <StatisticsCard
              title="Win Rate"
              value={displayStats.win_rate ? formatPercentage(displayStats.win_rate) : 'N/A'}
              unit=""
              description="Percentage of winning trades"
              icon={TrendingUp}
            />
            <StatisticsCard
              title="Total PnL"
              value={formatCurrency(displayStats.total_pnl)}
              unit=""
              description="Total profit/loss"
              icon={displayStats.total_pnl >= 0 ? TrendingUp : TrendingDown}
            />
            <StatisticsCard
              title="Profit Factor"
              value={displayStats.profit_factor ? displayStats.profit_factor.toFixed(2) : 'N/A'}
              unit=""
              description="Ratio of gross profit to gross loss"
              icon={TrendingUp}
            />
            <StatisticsCard
              title="Sharpe Ratio"
              value={displayStats.sharpe_ratio ? displayStats.sharpe_ratio.toFixed(2) : 'N/A'}
              unit=""
              description="Risk-adjusted return measure"
              icon={TrendingUp}
            />
            <StatisticsCard
              title="CAGR"
              value={displayStats.cagr ? formatPercentage(displayStats.cagr) : 'N/A'}
              unit=""
              description="Compound Annual Growth Rate"
              icon={TrendingUp}
            />
            <StatisticsCard
              title="Max Drawdown"
              value={displayStats.max_drawdown ? formatPercentage(displayStats.max_drawdown) : 'N/A'}
              unit=""
              description="Maximum peak-to-trough decline"
              icon={TrendingDown}
            />
            <StatisticsCard
              title="Average PnL"
              value={formatCurrency(displayStats.average_pnl)}
              unit=""
              description="Average profit/loss per trade"
              icon={TrendingUp}
            />
          </div>
        </div>
      ) : (
        <div className="mb-6 bg-white rounded-lg shadow-lg p-6">
          <p className="text-gray-600">No statistics available for this backtest.</p>
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
      {selectedTrades.length > 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Trading History {selectedSymbol ? `- ${selectedSymbol}` : '(All Symbols)'}
          </h2>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PnL</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PnL %</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {selectedTrades.map((trade) => (
                  <tr key={trade.id} className={trade.is_winner ? 'bg-green-50' : 'bg-red-50'}>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{trade.symbol_info?.ticker || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 capitalize">{trade.trade_type}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(trade.entry_price)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(trade.exit_price)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{formatDate(trade.entry_timestamp)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{formatDate(trade.exit_timestamp)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{trade.quantity || 'N/A'}</td>
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
      ) : (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Trading History {selectedSymbol ? `- ${selectedSymbol}` : '(All Symbols)'}
          </h2>
          <p className="text-gray-600">
            {backtest?.status === 'running' 
              ? 'Backtest is still running. Trades will appear here once the backtest completes.'
              : 'No trades found for this backtest.'}
          </p>
        </div>
      )}
    </div>
  );
}

