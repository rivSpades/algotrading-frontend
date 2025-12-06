/**
 * Strategy Backtest Detail Page Component
 * Displays detailed results of a backtest for a specific strategy
 * URL: /strategies/:id/backtests/:backtestId
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, BarChart3, List, Loader, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import SymbolCard from '../components/SymbolCard';
import { getStrategy } from '../data/strategies';
import { getBacktest, getBacktestStatisticsOptimized, getBacktestTrades, getBacktestSymbols } from '../data/backtests';
import { marketDataAPI } from '../data/api';
import StatisticsCard from '../components/StatisticsCard';
import Chart from 'react-apexcharts';
import TaskProgress from '../components/TaskProgress';
import { motion } from 'framer-motion';

export default function StrategyBacktestDetail() {
  const { id, backtestId } = useParams();
  const navigate = useNavigate();
  const [strategy, setStrategy] = useState(null);
  const [backtest, setBacktest] = useState(null);
  const [statistics, setStatistics] = useState({ portfolio: null, symbols: [] });
  const [trades, setTrades] = useState({ results: [], count: 0, next: null, previous: null }); // Paginated trades from server
  const [tradesLoading, setTradesLoading] = useState(false);
  const [symbols, setSymbols] = useState({ results: [], count: 0, next: null, previous: null });
  const [loading, setLoading] = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [selectedMode, setSelectedMode] = useState('all'); // 'all', 'long', 'short'
  const [taskId, setTaskId] = useState(null);
  const [showTaskProgress, setShowTaskProgress] = useState(false);
  const [tradesPage, setTradesPage] = useState(1);
  const [symbolsPage, setSymbolsPage] = useState(1);
  const [symbolSearch, setSymbolSearch] = useState('');
  const [symbolsLoading, setSymbolsLoading] = useState(false);
  const pollingIntervalRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    console.log('=== useEffect triggered ===', { id, backtestId });
    loadData();
    
    return () => {
      // Cleanup
    };
  }, [id, backtestId]);
  
  // Separate effect for polling
  useEffect(() => {
    if (backtest?.status === 'running') {
      const interval = setInterval(() => {
        loadData();
      }, 3000); // Poll every 3 seconds
      pollingIntervalRef.current = interval;
      
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [backtest?.status]);

  // Trades are loaded once in loadData, then filtered client-side

  useEffect(() => {
    // Skip initial mount - loadData handles that
    if (!backtestId) return;
    
    // Debounce search to avoid too many API calls
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    const timeoutId = setTimeout(() => {
      console.log('useEffect: Loading symbols with search:', symbolSearch, 'page:', symbolsPage);
      loadSymbols(symbolsPage, symbolSearch);
    }, symbolSearch ? 300 : 0); // 300ms debounce only when searching
    
    searchTimeoutRef.current = timeoutId;
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [symbolsPage, symbolSearch, backtestId]); // Reload when search or page changes

  // Load trades with server-side pagination and filtering
  useEffect(() => {
    if (!backtestId) return;
    
    const loadTrades = async () => {
      setTradesLoading(true);
      try {
        const tradesData = await getBacktestTrades(backtestId, tradesPage, 20, selectedSymbol || null, selectedMode);
        setTrades(tradesData || { results: [], count: 0, next: null, previous: null });
      } catch (error) {
        console.error('Error loading trades:', error);
        setTrades({ results: [], count: 0, next: null, previous: null });
      } finally {
        setTradesLoading(false);
      }
    };
    
    loadTrades();
  }, [backtestId, tradesPage, selectedSymbol, selectedMode]);

  const loadData = async () => {
    console.log('=== loadData START ===', { id, backtestId });
    setLoading(true);
    try {
      // Load initial symbols (will be reloaded by useEffect if search/page changes)
      console.log('loadData: Loading initial symbols for backtestId:', backtestId);
      let symbolsData;
      try {
        console.log('loadData: Calling getBacktestSymbols...');
        symbolsData = await getBacktestSymbols(backtestId, 1, 20, ''); // Always load without search initially
        console.log('loadData: Symbols loaded successfully:', symbolsData);
        // Set symbols here so they appear immediately on mount
        setSymbols(symbolsData || { results: [], count: 0, next: null, previous: null });
      } catch (symbolError) {
        console.error('loadData: Error loading symbols:', symbolError);
        symbolsData = { results: [], count: 0, next: null, previous: null };
        setSymbols(symbolsData);
      }
      
      // Load other data (trades are loaded separately with pagination)
      let strategyData, backtestData, statsData;
      try {
        [strategyData, backtestData, statsData] = await Promise.all([
          getStrategy(id),
          getBacktest(backtestId),
          getBacktestStatisticsOptimized(backtestId),
        ]);
      } catch (error) {
        console.error('Error loading other data in Promise.all:', error);
      }
      
      setStrategy(strategyData);
      setBacktest(backtestData);
      setStatistics(statsData || { portfolio: null, symbols: [] });
      
      // Debug: Log what we received
      console.log('=== SYMBOLS DEBUG START ===');
      console.log('symbolsData received:', symbolsData);
      console.log('symbolsData type:', typeof symbolsData);
      console.log('Is symbolsData truthy?', !!symbolsData);
      console.log('symbolsData.results:', symbolsData?.results);
      console.log('symbolsData.results type:', typeof symbolsData?.results);
      console.log('symbolsData.results isArray?', Array.isArray(symbolsData?.results));
      console.log('symbolsData.results length:', symbolsData?.results?.length);
      console.log('symbolsData.count:', symbolsData?.count);
      
      // Use symbols from API if available, otherwise try multiple fallbacks
      let finalSymbolsData = symbolsData;
      
      if (!symbolsData || !symbolsData.results || symbolsData.results.length === 0) {
        console.log('Symbols endpoint returned empty, trying fallbacks...');
        
        // Fallback 1: Extract from statistics
        if (statsData?.symbols && statsData.symbols.length > 0) {
          const tickersFromStats = statsData.symbols
            .map(s => s.symbol_ticker)
            .filter(Boolean);
          if (tickersFromStats.length > 0) {
            console.log(`Found ${tickersFromStats.length} symbols from statistics`);
            finalSymbolsData = {
              results: tickersFromStats,
              count: tickersFromStats.length,
              next: null,
              previous: null
            };
          }
        }
        
        // Fallback 2: Skip - trades are loaded separately with pagination, can't use them here
      }
      
      // Only use fallback if the API call failed
      if (!symbolsData || !symbolsData.results || symbolsData.results.length === 0) {
        setSymbols(finalSymbolsData || { results: [], count: 0, next: null, previous: null });
      }
      
      // Debug logging
      console.log('=== SYMBOLS DEBUG END ===');
      console.log('Final symbols data:', finalSymbolsData);
      console.log('symbolsData from API:', symbolsData);
      
      // Set first symbol as default if available (but don't override if already set)
      // Note: We don't set selectedSymbol here to avoid interfering with user selection
      
      // Check for task_id in backtest response or find from active tasks if backtest is running
      if (backtestData?.status === 'running') {
        if (backtestData.task_id) {
          setTaskId(backtestData.task_id);
          setShowTaskProgress(true);
        } else {
          // Fallback: Try to find task ID from active tasks
          try {
            const activeTasksResponse = await marketDataAPI.getActiveTasks();
            if (activeTasksResponse.success && activeTasksResponse.data?.results) {
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
      }
    } catch (error) {
      console.error('Error loading backtest data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Pagination info from server response
  const totalTradesCount = trades.count || 0;
  const totalPages = Math.ceil(totalTradesCount / 20);
  const hasNextPage = !!trades.next;
  const hasPreviousPage = !!trades.previous;

  const loadSymbols = async (page = 1, search = '') => {
    setSymbolsLoading(true);
    try {
      console.log('loadSymbols called with:', { page, search, backtestId });
      const symbolsData = await getBacktestSymbols(backtestId, page, 20, search);
      console.log('loadSymbols: Received symbols data:', symbolsData);
      console.log('loadSymbols: Symbols count:', symbolsData?.count || symbolsData?.results?.length || 0);
      console.log('loadSymbols: Symbols results:', symbolsData?.results);
      setSymbols(symbolsData || { results: [], count: 0, next: null, previous: null });
    } catch (error) {
      console.error('Error loading symbols:', error);
      setSymbols({ results: [], count: 0, next: null, previous: null });
    } finally {
      setSymbolsLoading(false);
    }
  };

  const handleSymbolSearch = (e) => {
    const value = e.target.value;
    setSymbolSearch(value);
    setSymbolsPage(1); // Reset to page 1 when searching
    // Search will trigger via useEffect when symbolSearch changes (with debounce)
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const year = date.getFullYear();
    if (year < 2000) {
      return 'All Available Data';
    }
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'N/A';
    // Convert to number if it's a string (backend should send numbers, but handle both)
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
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
    // Convert to number if it's a string (backend should send numbers, but handle both)
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return 'N/A';
    // Backend should already round values, just format for display
    return `${numValue}%`;
  };


  // Get equity curve data - updates based on selectedMode
  // Must be before early returns (React hooks rules)
  const equityCurveForMode = useMemo(() => {
    const portfolioOrSymbol = selectedSymbol
      ? statistics.symbols?.find(s => s.symbol_ticker === selectedSymbol)
      : statistics.portfolio;
    
    if (!portfolioOrSymbol) return null;
    
    // Get stats_by_mode for the selected mode
    const statsByMode = portfolioOrSymbol.stats_by_mode || {};
    const modeStats = statsByMode[selectedMode];
    
    if (!modeStats) return null;
    
    // Try to get equity curve from mode stats (now includes equity_curve_x and equity_curve_y)
    if (modeStats.equity_curve_x && modeStats.equity_curve_y) {
      const x = modeStats.equity_curve_x;
      const y = modeStats.equity_curve_y;
      if (x.length === 0 || y.length === 0) return null;
      
      // Convert x/y arrays to array of {timestamp, equity} objects
      return x.map((timestamp, index) => ({
        timestamp: timestamp,
        equity: y[index]
      })).filter(point => point.timestamp && point.equity !== null && point.equity !== undefined);
    }
    
    // Fallback: use equity_curve array directly if available
    if (modeStats.equity_curve && Array.isArray(modeStats.equity_curve)) {
      return modeStats.equity_curve.filter(point => 
        point && point.timestamp && point.equity !== null && point.equity !== undefined
      );
    }
    
    // Last fallback: use portfolio/symbol level equity_curve_x and equity_curve_y (for 'all' mode)
    if (selectedMode === 'all') {
      const x = portfolioOrSymbol.equity_curve_x || [];
      const y = portfolioOrSymbol.equity_curve_y || [];
      if (x.length === 0 || y.length === 0) return null;
      
      return x.map((timestamp, index) => ({
        timestamp: timestamp,
        equity: y[index]
      })).filter(point => point.timestamp && point.equity !== null && point.equity !== undefined);
    }
    
    return null;
  }, [selectedSymbol, selectedMode, statistics]);
  
  // Get current stats for display
  const currentStatsForDisplay = useMemo(() => {
    const portfolioOrSymbol = selectedSymbol
      ? statistics.symbols?.find(s => s.symbol_ticker === selectedSymbol)
      : statistics.portfolio;
    
    if (!portfolioOrSymbol) return null;
    
    const statsByMode = portfolioOrSymbol.stats_by_mode || {};
    return statsByMode[selectedMode] || null;
  }, [selectedSymbol, selectedMode, statistics]);

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

  const handleTaskComplete = (data) => {
    setShowTaskProgress(false);
    setTaskId(null);
    
    if (data.status === 'completed' || data.status === 'failed') {
      window.location.reload();
    }
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

      {/* Mode Selector */}
      <div className="mb-6 bg-white rounded-lg shadow-lg p-4">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Position Mode</h2>
        <div className="flex gap-3">
          {['all', 'long', 'short'].map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setSelectedMode(mode);
                setTradesPage(1); // Reset to page 1 when mode changes
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                selectedMode === mode
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {mode.toUpperCase()}
            </button>
          ))}
        </div>
      </div>


      {/* Statistics Cards */}
      {currentStatsForDisplay ? (
        <div className="mb-6 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {selectedSymbol ? `Performance Metrics - ${selectedSymbol} (${selectedMode.toUpperCase()})` : `Portfolio Performance Metrics (${selectedMode.toUpperCase()})`}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatisticsCard
              title="Total Trades"
              value={currentStatsForDisplay.total_trades || 0}
              unit=""
              description="Total number of trades executed"
              icon={BarChart3}
            />
            <StatisticsCard
              title="Win Rate"
              value={currentStatsForDisplay.win_rate ? formatPercentage(currentStatsForDisplay.win_rate) : 'N/A'}
              unit=""
              description="Percentage of winning trades"
              icon={TrendingUp}
            />
            <StatisticsCard
              title="Total PnL"
              value={currentStatsForDisplay.total_pnl !== null && currentStatsForDisplay.total_pnl !== undefined ? formatCurrency(currentStatsForDisplay.total_pnl) : 'N/A'}
              unit=""
              description="Total profit/loss"
              icon={currentStatsForDisplay.total_pnl >= 0 ? TrendingUp : TrendingDown}
            />
            <StatisticsCard
              title="Profit Factor"
              value={currentStatsForDisplay.profit_factor !== null && currentStatsForDisplay.profit_factor !== undefined ? currentStatsForDisplay.profit_factor : 'N/A'}
              unit=""
              description="Ratio of gross profit to gross loss"
              icon={TrendingUp}
            />
            <StatisticsCard
              title="Sharpe Ratio"
              value={currentStatsForDisplay.sharpe_ratio !== null && currentStatsForDisplay.sharpe_ratio !== undefined ? currentStatsForDisplay.sharpe_ratio : 'N/A'}
              unit=""
              description="Risk-adjusted return measure"
              icon={TrendingUp}
            />
            <StatisticsCard
              title="CAGR"
              value={currentStatsForDisplay.cagr ? formatPercentage(currentStatsForDisplay.cagr) : 'N/A'}
              unit=""
              description="Compound Annual Growth Rate"
              icon={TrendingUp}
            />
            <StatisticsCard
              title="Max Drawdown"
              value={currentStatsForDisplay.max_drawdown !== null && currentStatsForDisplay.max_drawdown !== undefined ? formatPercentage(currentStatsForDisplay.max_drawdown) : 'N/A'}
              unit=""
              description="Maximum peak-to-trough decline"
              icon={TrendingDown}
            />
            <StatisticsCard
              title="Average PnL"
              value={currentStatsForDisplay.average_pnl !== null && currentStatsForDisplay.average_pnl !== undefined ? formatCurrency(currentStatsForDisplay.average_pnl) : 'N/A'}
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
      {equityCurveForMode && Array.isArray(equityCurveForMode) && equityCurveForMode.length > 0 && (
        <div className="mb-6 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Equity Curve ({selectedMode.toUpperCase()})
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
                text: selectedSymbol 
                  ? `Equity Curve - ${selectedSymbol} (${selectedMode.toUpperCase()})` 
                  : `Portfolio Equity Curve (${selectedMode.toUpperCase()})`,
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
              data: equityCurveForMode
                .filter(point => point && point.timestamp && point.equity !== null && point.equity !== undefined)
                .map(point => {
                  const timestamp = new Date(point.timestamp).getTime();
                  const equity = parseFloat(point.equity);
                  if (isNaN(timestamp) || isNaN(equity)) {
                    return null;
                  }
                  return {
                    x: timestamp,
                    y: equity,
                  };
                })
                .filter(point => point !== null),
            }]}
            type="line"
            height={350}
          />
        </div>
      )}

      {/* Symbols Card View with Search and Pagination */}
      <div className="mb-6 bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <List className="w-5 h-5" />
          Symbols Backtested ({symbols.count || symbols.results?.length || 0})
        </h2>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={symbolSearch}
              onChange={handleSymbolSearch}
              placeholder="Search symbols by ticker..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  // Force reload with current search
                  loadSymbols(1, symbolSearch);
                }
              }}
            />
            {symbolSearch && (
              <button
                onClick={() => {
                  setSymbolSearch('');
                  setSymbolsPage(1);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Symbols Grid */}
        {symbolsLoading ? (
          <div className="text-center py-12">
            <Loader className="w-8 h-8 animate-spin mx-auto text-primary-600" />
            <p className="text-gray-600 mt-4">Loading symbols...</p>
          </div>
        ) : symbols.results && symbols.results.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {symbols.results.map((symbol, index) => {
                return (
                  <motion.div
                    key={symbol.ticker || symbol.id || index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <SymbolCard 
                      symbol={symbol} 
                      onClick={(sym) => {
                        navigate(`/strategies/${id}/backtests/${backtestId}/${sym.ticker}`);
                      }}
                    />
                  </motion.div>
                );
              })}
            </div>

            {/* Pagination for Symbols */}
            {(symbols.count > 20 || symbols.next || symbols.previous) && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setSymbolsPage(prev => Math.max(1, prev - 1))}
                  disabled={!symbols.previous}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    symbols.previous
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {symbolsPage} of {Math.ceil((symbols.count || 0) / 20)} ({symbols.count || 0} total)
                </span>
                <button
                  onClick={() => setSymbolsPage(prev => prev + 1)}
                  disabled={!symbols.next}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    symbols.next
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500 text-lg">No symbols found</p>
            {symbolSearch && (
              <p className="text-gray-400 text-sm mt-2">
                Try a different search term
              </p>
            )}
          </div>
        )}
      </div>

      {/* Trades Table with Pagination */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Trading History {selectedSymbol ? `- ${selectedSymbol}` : '(All Symbols)'} ({selectedMode.toUpperCase()})
        </h2>

        {tradesLoading ? (
          <div className="text-center py-12">
            <Loader className="w-8 h-8 animate-spin mx-auto text-primary-600" />
            <p className="text-gray-600 mt-4">Loading trades...</p>
          </div>
        ) : (
          <>
            {totalTradesCount > 0 && (
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Found {totalTradesCount} trade{totalTradesCount !== 1 ? 's' : ''} ({selectedMode.toUpperCase()})
                  {trades.results.length > 0 && totalTradesCount > 0 && (
                    <span className="text-gray-500">
                      {' '}(Showing {((tradesPage - 1) * 20) + 1}-{Math.min(tradesPage * 20, totalTradesCount)})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTradesPage(prev => Math.max(1, prev - 1))}
                    disabled={!hasPreviousPage}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <span className="text-sm text-gray-600 px-2">
                    Page {tradesPage} {totalPages > 0 && `of ${totalPages}`}
                  </span>
                  <button
                    onClick={() => setTradesPage(prev => prev + 1)}
                    disabled={!hasNextPage}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {trades.results && trades.results.length > 0 ? (
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
                    {trades.results.flatMap((trade) => {
                  const tradeSymbolTicker = trade?.symbol_info?.ticker || trade?.symbol?.ticker || trade?.symbol_ticker || 'N/A';
                  const positionType = trade.trade_type === 'buy' ? 'Long' : 'Short';
                  const maxDrawdown = trade.max_drawdown;
                  const rows = [];

                  // Entry signal row
                  rows.push(
                    <tr
                      key={`${trade.id}-entry`}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {trade.entry_timestamp ? new Date(trade.entry_timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{tradeSymbolTicker}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          positionType === 'Long'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {positionType}
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
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{tradeSymbolTicker}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            positionType === 'Long'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}>
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
                          {formatPercentage(trade.pnl_percentage)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {maxDrawdown !== null && maxDrawdown !== undefined ? formatPercentage(maxDrawdown) : 'N/A'}
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
              <p className="text-gray-600">
                {backtest?.status === 'running' 
                  ? 'Backtest is still running. Trades will appear here once the backtest completes.'
                  : `No trades found for ${selectedMode.toUpperCase()} mode.`}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
