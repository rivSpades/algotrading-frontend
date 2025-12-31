/**
 * Strategy Backtest Symbols List Page
 * Shows list of symbols in a backtest (similar to market data page)
 * URL: /strategies/:id/backtests/:backtestId
 */

import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, Search, BarChart3, TrendingUp, TrendingDown, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { getStrategy } from '../data/strategies';
import { getBacktest, getBacktestTrades } from '../data/backtests';
import { motion } from 'framer-motion';
import TaskProgress from '../components/TaskProgress';
import StatisticsCard from '../components/StatisticsCard';
import Chart from 'react-apexcharts';

export default function StrategyBacktestSymbols() {
  const { id, backtestId } = useParams();
  const navigate = useNavigate();
  const [strategy, setStrategy] = useState(null);
  const [backtest, setBacktest] = useState(null);
  const [symbols, setSymbols] = useState([]);
  const [statistics, setStatistics] = useState([]);
  const [portfolioStats, setPortfolioStats] = useState(null);
  const [allTrades, setAllTrades] = useState([]);
  const [tradesCount, setTradesCount] = useState(0);
  const [tradesNext, setTradesNext] = useState(null);
  const [tradesPrevious, setTradesPrevious] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [portfolioStatsTab, setPortfolioStatsTab] = useState('all'); // 'all', 'long', 'short'
  const [searchTerm, setSearchTerm] = useState('');
  const [taskId, setTaskId] = useState(null);
  const [showTaskProgress, setShowTaskProgress] = useState(false);
  const pollingIntervalRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Filter trades based on selected tab
  // Each mode (ALL, LONG, SHORT) has its own set of trades stored with position_mode in metadata
  const filteredTrades = useMemo(() => {
    if (!allTrades || allTrades.length === 0) {
      return [];
    }
    
    if (portfolioStatsTab === 'all') {
      // Show trades from 'all' mode execution, or all trades if position_mode not available (backward compatibility)
      const allModeTrades = allTrades.filter(trade => {
        const metadata = trade.metadata || {};
        return metadata.position_mode === 'all' || !metadata.position_mode;
      });
      
      // Debug logging
      console.log('ALL mode trades filter:', {
        totalTrades: allTrades.length,
        allModeTrades: allModeTrades.length,
        buyTrades: allModeTrades.filter(t => (t.trade_type || t.tradeType) === 'buy').length,
        sellTrades: allModeTrades.filter(t => (t.trade_type || t.tradeType) === 'sell').length,
        sampleTrades: allModeTrades.slice(0, 3).map(t => ({
          id: t.id,
          trade_type: t.trade_type || t.tradeType,
          position_mode: t.metadata?.position_mode
        }))
      });
      
      return allModeTrades;
    } else if (portfolioStatsTab === 'long') {
      // Show trades from 'long' mode execution
      // Fallback to filtering by trade_type for backward compatibility
      return allTrades.filter(trade => {
        const metadata = trade.metadata || {};
        if (metadata.position_mode !== undefined) {
          // New format: filter by position_mode
          return metadata.position_mode === 'long';
        } else {
          // Backward compatibility: filter by trade_type
          const tradeType = trade.trade_type || trade.tradeType;
          return tradeType === 'buy';
        }
      });
    } else if (portfolioStatsTab === 'short') {
      // Show trades from 'short' mode execution
      // Fallback to filtering by trade_type for backward compatibility
      return allTrades.filter(trade => {
        const metadata = trade.metadata || {};
        if (metadata.position_mode !== undefined) {
          // New format: filter by position_mode
          return metadata.position_mode === 'short';
        } else {
          // Backward compatibility: filter by trade_type
          const tradeType = trade.trade_type || trade.tradeType;
          return tradeType === 'sell';
        }
      });
    }
    return allTrades;
  }, [allTrades, portfolioStatsTab]);
  
  // Calculate trades count for current tab
  const filteredTradesCount = filteredTrades.length;

  useEffect(() => {
    const page = parseInt(searchParams.get('page') || '1');
    setCurrentPage(page);
    loadData(page);
    
    // Set up polling if backtest is running
    if (backtest?.status === 'running' && backtest?.task_id) {
      setTaskId(backtest.task_id);
      setShowTaskProgress(true);
      
      // Poll for updates every 2 seconds
      pollingIntervalRef.current = setInterval(() => {
        loadData(page);
      }, 2000);
    } else if (backtest?.status === 'completed' || backtest?.status === 'failed') {
      // Stop polling when backtest is done
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setShowTaskProgress(false);
      setTaskId(null);
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [id, backtestId, backtest?.status, backtest?.task_id, searchParams]);

  const loadData = async (page = 1) => {
    setLoading(true);
    try {
      const [strategyData, backtestData, tradesResponse] = await Promise.all([
        getStrategy(id),
        getBacktest(backtestId),
        getBacktestTrades(backtestId, page),
      ]);
      setStrategy(strategyData);
      setBacktest(backtestData);
      
      // Process statistics from backtest response - statistics are already included
      let statsArray = [];
      if (backtestData?.statistics) {
        if (Array.isArray(backtestData.statistics)) {
          statsArray = backtestData.statistics;
        } else if (backtestData.statistics.results) {
          statsArray = backtestData.statistics.results;
        } else if (backtestData.statistics.data) {
          statsArray = Array.isArray(backtestData.statistics.data) 
            ? backtestData.statistics.data 
            : [backtestData.statistics.data];
        }
      }
      
      // Extract unique symbols from statistics (each stat has symbol_info)
      // If no statistics yet (backtest still running), symbols will be empty
      const symbolsFromStats = statsArray
        .map(s => s?.symbol_info)
        .filter(Boolean)
        .filter((symbol, index, self) => 
          index === self.findIndex(s => s?.ticker === symbol?.ticker)
        );
      setSymbols(symbolsFromStats);
      
      // Separate portfolio stats (symbol is null) from symbol-specific stats
      const portfolio = statsArray.find(s => {
        const hasSymbolInfo = s.symbol_info !== null && s.symbol_info !== undefined;
        const hasSymbol = s.symbol !== null && s.symbol !== undefined;
        return !hasSymbolInfo && !hasSymbol;
      });
      const symbolStats = statsArray.filter(s => {
        const hasSymbolInfo = s.symbol_info !== null && s.symbol_info !== undefined;
        const hasSymbol = s.symbol !== null && s.symbol !== undefined;
        return hasSymbolInfo || hasSymbol;
      });
      
      // Reconstruct portfolio stats structure from additional_stats
      if (portfolio && portfolio.additional_stats) {
        setPortfolioStats({
          all: portfolio,
          long: portfolio.additional_stats.long || {},
          short: portfolio.additional_stats.short || {},
        });
      } else {
        setPortfolioStats(portfolio || null);
      }
      setStatistics(symbolStats);
      
      // Handle paginated trades response
      let tradesList = [];
      if (tradesResponse) {
        if (Array.isArray(tradesResponse)) {
          tradesList = tradesResponse;
          setAllTrades(tradesResponse);
          setTradesCount(tradesResponse.length);
          setTradesNext(null);
          setTradesPrevious(null);
        } else {
          tradesList = tradesResponse.results || [];
          setAllTrades(tradesList);
          setTradesCount(tradesResponse.count || 0);
          setTradesNext(tradesResponse.next || null);
          setTradesPrevious(tradesResponse.previous || null);
        }
      } else {
        setAllTrades([]);
        setTradesCount(0);
        setTradesNext(null);
        setTradesPrevious(null);
      }

      
      // Update task progress state
      if (backtestData?.status === 'running' && backtestData?.task_id) {
        setTaskId(backtestData.task_id);
        setShowTaskProgress(true);
      } else {
        setShowTaskProgress(false);
        setTaskId(null);
      }
    } catch (error) {
      console.error('Error loading backtest data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskComplete = () => {
    setShowTaskProgress(false);
    setTaskId(null);
    // Reload data to show completed results
    loadData();
  };

  const handleTaskClose = () => {
    setShowTaskProgress(false);
    setTaskId(null);
  };

  const handleSymbolClick = (ticker) => {
    navigate(`/strategies/${id}/backtests/${backtestId}/${ticker}`);
  };

  const filteredSymbols = symbols.filter(symbol => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      symbol.ticker?.toLowerCase().includes(search) ||
      symbol.name?.toLowerCase().includes(search) ||
      symbol.exchange_name?.toLowerCase().includes(search) ||
      symbol.exchange?.toLowerCase().includes(search)
    );
  });

  // Helper function to get statistics for a symbol
  const getSymbolStats = (ticker) => {
    return statistics.find(s => {
      const symbolTicker = s?.symbol_info?.ticker || s?.symbol?.ticker || s?.symbol_ticker;
      return symbolTicker === ticker;
    });
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'N/A';
    const numValue = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(numValue)) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numValue);
  };

  const formatPercentage = (value) => {
    if (value === null || value === undefined) return 'N/A';
    const numValue = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(numValue)) return 'N/A';
    return `${numValue.toFixed(2)}%`;
  };


  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">Loading backtest symbols...</div>
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

  return (
    <>
      {showTaskProgress && taskId && (
        <TaskProgress
          taskId={taskId}
          onComplete={handleTaskComplete}
          onClose={handleTaskClose}
        />
      )}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <span>Status: <span className={`font-medium ${backtest.status === 'completed' ? 'text-green-600' : backtest.status === 'failed' ? 'text-red-600' : 'text-yellow-600'}`}>{backtest.status}</span></span>
        </div>
      </div>

      {/* Portfolio Statistics (excluding aggregated PnL and aggregated Sharpe ratio) */}
      {backtest.status === 'completed' && portfolioStats && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Portfolio Statistics</h2>
            {/* Tabs for filtering by trade type */}
            <div className="flex gap-2">
              <button
                onClick={() => setPortfolioStatsTab('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  portfolioStatsTab === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ALL
              </button>
              <button
                onClick={() => setPortfolioStatsTab('long')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  portfolioStatsTab === 'long'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                LONG
              </button>
              <button
                onClick={() => setPortfolioStatsTab('short')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  portfolioStatsTab === 'short'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                SHORT
              </button>
            </div>
          </div>
          
          {/* Get the appropriate stats based on selected tab */}
          {(() => {
            const currentStats = portfolioStats[portfolioStatsTab] || portfolioStats.all || portfolioStats;
            if (!currentStats || Object.keys(currentStats).length === 0) {
              return (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm font-medium">
                    No statistics available for {portfolioStatsTab.toUpperCase()} trades
                  </p>
                </div>
              );
            }
            
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatisticsCard
                  title="Total Trades"
                  value={currentStats.total_trades || 0}
                  unit=""
                  description="Total number of trades executed"
                  icon={BarChart3}
                />
                <StatisticsCard
                  title="Win Rate"
                  value={currentStats.win_rate !== null && currentStats.win_rate !== undefined ? formatPercentage(currentStats.win_rate) : 'N/A'}
                  unit=""
                  description="Percentage of winning trades"
                  icon={TrendingUp}
                />
                <StatisticsCard
                  title="Average PnL"
                  value={formatCurrency(currentStats.average_pnl)}
                  unit=""
                  description="Average profit/loss per trade"
                  icon={TrendingUp}
                />
                <StatisticsCard
                  title="Average Winner"
                  value={formatCurrency(currentStats.average_winner)}
                  unit=""
                  description="Average profit from winning trades"
                  icon={TrendingUp}
                />
                <StatisticsCard
                  title="Average Loser"
                  value={formatCurrency(currentStats.average_loser)}
                  unit=""
                  description="Average loss from losing trades"
                  icon={TrendingDown}
                />
                <StatisticsCard
                  title="Total PnL"
                  value={formatCurrency(currentStats.total_pnl)}
                  unit=""
                  description="Total profit/loss"
                  icon={currentStats.total_pnl >= 0 ? TrendingUp : TrendingDown}
                />
                <StatisticsCard
                  title="Profit Factor"
                  value={currentStats.profit_factor !== null && currentStats.profit_factor !== undefined 
                    ? (typeof currentStats.profit_factor === 'number' 
                      ? currentStats.profit_factor.toFixed(2) 
                      : parseFloat(currentStats.profit_factor).toFixed(2))
                    : 'N/A'}
                  unit=""
                  description="Ratio of gross profit to gross loss"
                  icon={TrendingUp}
                />
                <StatisticsCard
                  title="CAGR"
                  value={currentStats.cagr !== null && currentStats.cagr !== undefined ? formatPercentage(currentStats.cagr) : 'N/A'}
                  unit=""
                  description="Compound Annual Growth Rate"
                  icon={TrendingUp}
                />
                <StatisticsCard
                  title="Max Drawdown"
                  value={currentStats.max_drawdown !== null && currentStats.max_drawdown !== undefined ? formatPercentage(currentStats.max_drawdown) : 'N/A'}
                  unit=""
                  description="Average maximum drawdown"
                  icon={TrendingDown}
                />
              </div>
            );
          })()}
        </div>
      )}

      {/* Equity Curve Chart */}
      {(() => {
        const currentStats = portfolioStats?.[portfolioStatsTab] || portfolioStats?.all || portfolioStats;
        const equityCurve = currentStats?.equity_curve;
        
        if (backtest.status === 'completed' && equityCurve && equityCurve.length > 0) {
          return (
            <div className="mb-6 bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Portfolio Equity Curve ({portfolioStatsTab.toUpperCase()})
              </h2>
              <Chart
                options={{
                  chart: {
                    type: 'line',
                    toolbar: { show: true },
                    zoom: { enabled: false },
                  },
                  xaxis: {
                    type: 'datetime',
                    title: { text: 'Date' },
                  },
                  yaxis: {
                    title: { text: 'Equity ($)' },
                  },
                  title: {
                    text: `Portfolio Equity Curve - ${strategy.name} (${portfolioStatsTab.toUpperCase()})`,
                    align: 'left',
                  },
                  colors: ['#3B82F6'],
                  tooltip: {
                    x: {
                      format: 'dd MMM yyyy'
                    },
                  },
                }}
                series={[{
                  name: 'Equity',
                  data: equityCurve.map(point => ({
                    x: new Date(point.timestamp).getTime(),
                    y: point.equity,
                  })),
                }]}
                type="line"
                height={350}
              />
            </div>
          );
        }
        return null;
      })()}

      {/* Search Bar */}
      <div className="mb-6">
        <form onSubmit={(e) => e.preventDefault()} className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search symbols by ticker..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </form>
      </div>

      {/* Symbols Grid */}
      {filteredSymbols.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">
            {searchTerm ? 'No symbols found matching your search' : 'No symbols in this backtest'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredSymbols.map((symbol) => {
            const symbolStats = getSymbolStats(symbol.ticker);
            return (
              <motion.div
                key={symbol.ticker}
                whileHover={{ y: -4 }}
                className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleSymbolClick(symbol.ticker)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{symbol.ticker}</h3>
                    <p className="text-sm text-gray-600">
                      {symbol.exchange_name || symbol.exchange || 'N/A'}
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Exchange:</span>
                    <span>{symbol.exchange || 'N/A'}</span>
                  </div>
                  {symbol.name && symbol.name !== symbol.ticker && (
                    <div className="text-xs text-gray-500 truncate" title={symbol.name}>
                      {symbol.name}
                    </div>
                  )}
                </div>

                {/* Statistics Preview */}
                {backtest.status === 'completed' && symbolStats && (
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Trades:</span>
                      <span className="font-semibold text-gray-900">{symbolStats.total_trades || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Win Rate:</span>
                      <span className="font-semibold text-gray-900">
                        {symbolStats.win_rate ? formatPercentage(symbolStats.win_rate) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">PnL:</span>
                      <span className={`font-semibold ${symbolStats.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(symbolStats.total_pnl)}
                      </span>
                    </div>
                  </div>
                )}
                {backtest.status === 'completed' && !symbolStats && (
                  <div className="border-t pt-4 text-xs text-gray-500 text-center">
                    No statistics available
                  </div>
                )}
                {backtest.status === 'running' && (
                  <div className="border-t pt-4 text-xs text-yellow-600 text-center">
                    Computing...
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Trading History Datatable */}
      {backtest.status === 'completed' && (
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <List className="w-5 h-5" />
            Trading History
          </h2>
          
          {/* Results Count and Pagination Info */}
          {filteredTradesCount > 0 && (
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Found {filteredTradesCount} trade{filteredTradesCount !== 1 ? 's' : ''} ({portfolioStatsTab.toUpperCase()})
                {filteredTrades.length > 0 && filteredTradesCount > 0 && (
                  <span className="text-gray-500">
                    {' '}(Showing {((currentPage - 1) * 20) + 1}-{Math.min(currentPage * 20, filteredTradesCount)})
                  </span>
                )}
              </div>
              {(tradesNext || tradesPrevious) && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (tradesPrevious) {
                        const url = new URL(tradesPrevious);
                        const page = url.searchParams.get('page') || '1';
                        setSearchParams({ page });
                      }
                    }}
                    disabled={!tradesPrevious}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <span className="text-sm text-gray-600 px-2">
                    Page {currentPage}
                  </span>
                  <button
                    onClick={() => {
                      if (tradesNext) {
                        const url = new URL(tradesNext);
                        const page = url.searchParams.get('page') || '1';
                        setSearchParams({ page });
                      }
                    }}
                    disabled={!tradesNext}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {filteredTrades.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticker</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Invested</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entry Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exit Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PnL</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ROI %</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max Drawdown</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTrades.flatMap((trade) => {
                    const symbolTicker = trade?.symbol_info?.ticker || trade?.symbol?.ticker || trade?.symbol_ticker || 'N/A';
                    const tradeType = trade.trade_type || trade.tradeType;
                    const positionType = tradeType === 'buy' ? 'Long' : 'Short';
                    // Max drawdown is now calculated in the backend
                    const maxDrawdown = trade.max_drawdown;
                    
                    const rows = [];
                    
                    // Entry signal row
                    rows.push(
                      <tr 
                        key={`${trade.id}-entry`} 
                        className="hover:bg-gray-50 bg-blue-50"
                      >
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {trade.entry_timestamp ? new Date(trade.entry_timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{symbolTicker}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            positionType === 'Long'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {positionType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {(() => {
                            // Use bet_amount from metadata if available (actual amount invested from portfolio capital)
                            // Otherwise fall back to entry_price * quantity for backward compatibility
                            const betAmount = trade.metadata?.bet_amount;
                            if (betAmount !== undefined && betAmount !== null) {
                              return formatCurrency(parseFloat(betAmount));
                            }
                            if (trade.entry_price && trade.quantity) {
                              return formatCurrency(parseFloat(trade.entry_price) * parseFloat(trade.quantity));
                            }
                            return 'N/A';
                          })()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{trade.quantity ? parseFloat(trade.quantity).toFixed(4) : 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {trade.entry_timestamp ? new Date(trade.entry_timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">-</td>
                        <td className="px-4 py-3 text-sm text-gray-900">-</td>
                        <td className="px-4 py-3 text-sm text-gray-900">-</td>
                        <td className="px-4 py-3 text-sm text-gray-900">-</td>
                      </tr>
                    );
                    
                    // Exit signal row (only if exit exists)
                    if (trade.exit_timestamp) {
                      rows.push(
                        <tr 
                          key={`${trade.id}-exit`} 
                          className={`hover:bg-gray-50 ${trade.is_winner ? 'bg-green-50' : 'bg-red-50'}`}
                        >
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Date(trade.exit_timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{symbolTicker}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Exit
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {trade.entry_price && trade.quantity 
                              ? formatCurrency(parseFloat(trade.entry_price) * parseFloat(trade.quantity))
                              : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{trade.quantity ? parseFloat(trade.quantity).toFixed(4) : 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {trade.entry_timestamp ? new Date(trade.entry_timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Date(trade.exit_timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </td>
                          <td className={`px-4 py-3 text-sm font-medium ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(trade.pnl)}
                          </td>
                          <td className={`px-4 py-3 text-sm font-medium ${trade.pnl_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {trade.pnl_percentage !== null && trade.pnl_percentage !== undefined ? formatPercentage(trade.pnl_percentage) : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {maxDrawdown !== null ? formatPercentage(maxDrawdown) : 'N/A'}
                          </td>
                        </tr>
                      );
                    }
                    
                    return rows;
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <List className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No trades found for this backtest</p>
            </div>
          )}
        </div>
      )}
      </div>
    </>
  );
}

