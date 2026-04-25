/**
 * Strategy Backtest Detail Page Component
 * Displays detailed results of a backtest for a specific strategy
 * URL: /strategies/:id/backtests/:backtestId
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, TrendingDown, BarChart3, Loader, ChevronLeft, ChevronRight, Search, List } from 'lucide-react';
import { getStrategy } from '../data/strategies';
import {
  getBacktest,
  getBacktestStatisticsOptimized,
  getBacktestTrades,
  getAllBacktestTrades,
  getBacktestSymbols,
} from '../data/backtests';
import { marketDataAPI } from '../data/api';
import StatisticsCard from '../components/StatisticsCard';
import Chart from 'react-apexcharts';
import TaskProgress from '../components/TaskProgress';
import TopPerformersChart from '../components/TopPerformersChart';
import { buildChronologicalTradeTableRows } from '../utils/chronologicalTradeTableRows';
import { exportTradesToCsvFile } from '../utils/tradeHistoryExport';
import { downloadJson } from '../utils/exportCsv';
import ExportTableToolbar from '../components/ExportTableToolbar';
import {
  HedgeTradeInvestedHeaderCells,
  HedgeTradePnlHeaderCells,
  HedgeTradeInvestedBodyCells,
  HedgeTradePnlBodyCells,
} from '../components/BacktestHedgeTradeTableCols';
import BacktestParametersPanel from '../components/BacktestParametersPanel';
import SymbolCard from '../components/SymbolCard';
import { positionModesAvailable, positionModeRunLabel } from '../utils/backtestPositionMode';

export default function StrategyBacktestDetail() {
  const { id, backtestId } = useParams();
  const navigate = useNavigate();
  const [strategy, setStrategy] = useState(null);
  const [backtest, setBacktest] = useState(null);
  const [statistics, setStatistics] = useState({ portfolio: null, symbols: [] });
  const [trades, setTrades] = useState({ results: [], count: 0, next: null, previous: null }); // Paginated trades from server
  const [tradesLoading, setTradesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedSymbol] = useState(null);
  const [selectedMode, setSelectedMode] = useState('long'); // 'long', 'short'
  const [taskId, setTaskId] = useState(null);
  const [showTaskProgress, setShowTaskProgress] = useState(false);
  const [tradesPage, setTradesPage] = useState(1);
  const [tradesPageInput, setTradesPageInput] = useState('1');
  const pollingIntervalRef = useRef(null);
  const [exportingTrades, setExportingTrades] = useState(false);

  /** Symbols included in this portfolio backtest (paginated + searchable) */
  const SYMBOL_PAGE_SIZE = 20;
  const [symbolListLoading, setSymbolListLoading] = useState(false);
  const [symbolList, setSymbolList] = useState({ results: [], count: 0, next: null, previous: null });
  const [symbolSearch, setSymbolSearch] = useState('');
  const [symbolPage, setSymbolPage] = useState(1);

  /** All trades for current mode — used to rebuild top/worst performers without symbol-level BacktestStatistics rows */
  const [performerTrades, setPerformerTrades] = useState([]);
  const [performerTradesLoading, setPerformerTradesLoading] = useState(false);

  useEffect(() => {
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

  const positionModesKey = backtest?.position_modes?.length
    ? [...backtest.position_modes].sort().join(',')
    : '';

  useEffect(() => {
    if (!backtest) return;
    const avail = positionModesAvailable(backtest);
    setSelectedMode((m) => (avail.includes(m) ? m : avail[0]));
  }, [backtest?.id, positionModesKey]);

  // Trades are loaded once in loadData, then filtered client-side

  // Load trades with server-side pagination and filtering
  useEffect(() => {
    if (!backtestId) return;
    
    const loadTrades = async () => {
      setTradesLoading(true);
      try {
        const tradesData = await getBacktestTrades(backtestId, tradesPage, 20, selectedSymbol || null, selectedMode);
        setTrades(tradesData || { results: [], count: 0, next: null, previous: null });
      } catch (error) {
        setTrades({ results: [], count: 0, next: null, previous: null });
      } finally {
        setTradesLoading(false);
      }
    };
    
    loadTrades();
  }, [backtestId, tradesPage, selectedSymbol, selectedMode]);

  useEffect(() => {
    setSymbolPage(1);
    setSymbolSearch('');
  }, [backtestId]);

  const loadSymbolList = useCallback(async () => {
    if (!backtestId) return;
    setSymbolListLoading(true);
    try {
      const data = await getBacktestSymbols(parseInt(backtestId, 10), symbolPage, SYMBOL_PAGE_SIZE, symbolSearch);
      setSymbolList(data || { results: [], count: 0, next: null, previous: null });
    } catch {
      setSymbolList({ results: [], count: 0, next: null, previous: null });
    } finally {
      setSymbolListLoading(false);
    }
  }, [backtestId, symbolPage, symbolSearch]);

  useEffect(() => {
    loadSymbolList();
  }, [loadSymbolList]);

  useEffect(() => {
    if (!backtestId || backtest?.status !== 'completed') {
      setPerformerTrades([]);
      setPerformerTradesLoading(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setPerformerTradesLoading(true);
      try {
        const all = await getAllBacktestTrades(parseInt(backtestId, 10), null, selectedMode);
        if (!cancelled) {
          setPerformerTrades(Array.isArray(all) ? all : []);
        }
      } catch {
        if (!cancelled) setPerformerTrades([]);
      } finally {
        if (!cancelled) setPerformerTradesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [backtestId, backtest?.status, selectedMode]);

  const symbolsForTopPerformers = useMemo(() => {
    const fromTrades = () => {
      if (!performerTrades.length) return [];
      const byTicker = new Map();
      for (const t of performerTrades) {
        const ticker = t?.symbol_info?.ticker;
        if (!ticker) continue;
        const raw = t?.pnl;
        const pnl = raw === null || raw === undefined ? 0 : Number(raw);
        if (Number.isNaN(pnl)) continue;
        byTicker.set(ticker, (byTicker.get(ticker) || 0) + pnl);
      }
      return [...byTicker.entries()].map(([symbol_ticker, total_pnl]) => ({
        symbol_ticker,
        stats_by_mode: {
          [selectedMode]: { total_pnl },
        },
      }));
    };
    const aggregated = fromTrades();
    if (aggregated.length > 0) return aggregated;
    return statistics.symbols && statistics.symbols.length > 0 ? statistics.symbols : [];
  }, [performerTrades, statistics.symbols, selectedMode]);

  const loadData = async () => {
    setLoading(true);
    try {
      let strategyData, backtestData, statsData;
      try {
        [strategyData, backtestData, statsData] = await Promise.all([
          getStrategy(id),
          getBacktest(backtestId),
          getBacktestStatisticsOptimized(backtestId),
        ]);
      } catch (error) {
        // Error loading data
      }

      setStrategy(strategyData);
      setBacktest(backtestData);
      setStatistics(statsData || { portfolio: null, symbols: [] });

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
            // Error finding task ID
          }
        }
      }
    } catch (error) {
      // Error loading backtest data
    } finally {
      setLoading(false);
    }
  };

  // Pagination info from server response
  const totalTradesCount = trades.count || 0;
  const totalPages = Math.ceil(totalTradesCount / 20);
  const hasNextPage = !!trades.next;
  const hasPreviousPage = !!trades.previous;

  // Handle page navigation from input
  const handleTradesPageChange = (newPage) => {
    const page = parseInt(newPage, 10);
    if (isNaN(page) || page < 1 || page > totalPages || totalPages === 0) {
      // Invalid page, reset to current page
      setTradesPageInput(tradesPage.toString());
      return;
    }
    setTradesPage(page);
    setTradesPageInput(page.toString());
  };

  // Sync input value with current page
  useEffect(() => {
    setTradesPageInput(tradesPage.toString());
  }, [tradesPage]);

  const handleExportPortfolioTradesCsv = async () => {
    setExportingTrades(true);
    try {
      const all = await getAllBacktestTrades(
        parseInt(backtestId, 10),
        selectedSymbol || null,
        selectedMode
      );
      const slug = `${selectedSymbol || 'portfolio'}-${selectedMode}`;
      exportTradesToCsvFile(all, `backtest-${backtestId}-${slug}-trades.csv`, {
        hedgeEnabled: !!backtest?.hedge_enabled,
      });
    } catch (e) {
      console.error(e);
      alert(`Export failed: ${e.message || 'Unknown error'}`);
    } finally {
      setExportingTrades(false);
    }
  };

  const handleExportPortfolioTradesJson = async () => {
    setExportingTrades(true);
    try {
      const all = await getAllBacktestTrades(
        parseInt(backtestId, 10),
        selectedSymbol || null,
        selectedMode
      );
      downloadJson(`backtest-${backtestId}-${selectedSymbol || 'portfolio'}-${selectedMode}-trades.json`, {
        exportedAt: new Date().toISOString(),
        backtestId: parseInt(backtestId, 10),
        strategyId: parseInt(id, 10),
        symbol: selectedSymbol || null,
        positionMode: selectedMode,
        trades: all,
      });
    } catch (e) {
      console.error(e);
      alert(`Export failed: ${e.message || 'Unknown error'}`);
    } finally {
      setExportingTrades(false);
    }
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

  /** Entry/exit rows sorted by event date (portfolio table spans many symbols; trade order alone is not chronological per row) */
  const chronologicalTradeRows = useMemo(
    () => buildChronologicalTradeTableRows(trades.results || []),
    [trades.results]
  );

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
    
    // Last fallback: top-level equity_curve_x/y match long-mode (main stats row)
    if (selectedMode === 'long') {
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

  /** S&P 500 buy-and-hold benchmark (portfolio view only); same window as strategy equity curve */
  const benchmarkSeriesForChart = useMemo(() => {
    if (selectedSymbol) return null;
    const p = statistics.portfolio;
    if (!p?.stats_by_mode) return null;
    const modeStats = p.stats_by_mode[selectedMode];
    const x = modeStats?.benchmark_equity_curve_x;
    const y = modeStats?.benchmark_equity_curve_y;
    if (!Array.isArray(x) || !Array.isArray(y) || x.length === 0 || x.length !== y.length) {
      return null;
    }
    const data = x
      .map((timestamp, index) => {
        const ts = new Date(timestamp).getTime();
        const equity = parseFloat(y[index]);
        if (Number.isNaN(ts) || Number.isNaN(equity)) return null;
        return { x: ts, y: equity };
      })
      .filter(Boolean);
    return data.length > 0 ? data : null;
  }, [selectedSymbol, selectedMode, statistics?.portfolio]);

  const benchmarkErrorPortfolio = useMemo(() => {
    if (selectedSymbol) return null;
    return statistics?.portfolio?.benchmark_error || null;
  }, [selectedSymbol, statistics?.portfolio]);

  /** Baseline equity (portfolio or selected symbol, same mode) when dual pass ran */
  const strategyOnlySeriesForChart = useMemo(() => {
    const portfolioOrSymbol = selectedSymbol
      ? statistics.symbols?.find(s => s.symbol_ticker === selectedSymbol)
      : statistics.portfolio;
    if (!portfolioOrSymbol?.stats_by_mode) return null;
    const modeStats = portfolioOrSymbol.stats_by_mode[selectedMode];
    const x = modeStats?.strategy_only_equity_curve_x;
    const y = modeStats?.strategy_only_equity_curve_y;
    if (!Array.isArray(x) || !Array.isArray(y) || x.length === 0 || x.length !== y.length) {
      return null;
    }
    const data = x
      .map((timestamp, index) => {
        const ts = new Date(timestamp).getTime();
        const equity = parseFloat(y[index]);
        if (Number.isNaN(ts) || Number.isNaN(equity)) return null;
        return { x: ts, y: equity };
      })
      .filter(Boolean);
    return data.length > 1 ? data : null;
  }, [selectedSymbol, selectedMode, statistics?.portfolio, statistics?.symbols]);

  // Get current stats for display
  // On the main backtest detail page, always show portfolio stats (not symbol-specific)
  // Only show symbol stats when a symbol is explicitly selected
  const currentStatsForDisplay = useMemo(() => {
    let portfolioOrSymbol = null;
    
    if (selectedSymbol) {
      // If a symbol is selected, show that symbol's stats
      portfolioOrSymbol = statistics.symbols?.find(s => s.symbol_ticker === selectedSymbol);
    } else {
      // If no symbol selected, show portfolio stats (main backtest detail page)
      portfolioOrSymbol = statistics.portfolio;
    }
    
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
          <span>Modes: {positionModeRunLabel(backtest)}</span>
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
        {positionModesAvailable(backtest).length > 1 ? (
          <div className="flex gap-3">
            {positionModesAvailable(backtest).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setSelectedMode(mode);
                  setTradesPage(1);
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
        ) : (
          <p className="text-sm text-gray-600">
            This backtest was run in <strong>{positionModesAvailable(backtest)[0].toUpperCase()}</strong> mode only.
          </p>
        )}
      </div>

      {/* Warning Banner for Skipped Trades */}
      {statistics.portfolio && statistics.portfolio.stats_by_mode && statistics.portfolio.stats_by_mode.skipped_trades_insufficient_cash && (
        (() => {
          const skippedTrades = statistics.portfolio.stats_by_mode.skipped_trades_insufficient_cash;
          const totalSkipped = (skippedTrades.long || 0) + (skippedTrades.short || 0);
          if (totalSkipped > 0) {
            return (
              <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-yellow-800">
                      {totalSkipped} trade{totalSkipped !== 1 ? 's' : ''} skipped due to insufficient cash
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        The bet size ({backtest.bet_size_percentage}%) may be too high for the trading volume. 
                        Consider lowering the bet size to avoid missing trading opportunities.
                      </p>
                      {skippedTrades.long > 0 && <p className="mt-1">• LONG mode: {skippedTrades.long} skipped</p>}
                      {skippedTrades.short > 0 && <p className="mt-1">• SHORT mode: {skippedTrades.short} skipped</p>}
                    </div>
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })()
      )}

      {backtest && <BacktestParametersPanel backtest={backtest} title="Backtest parameters" />}

      {/* Symbols in this portfolio backtest — quick navigation to per-symbol view (same backtest id) */}
      <div className="mb-6 bg-white rounded-lg shadow-lg p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <List className="w-5 h-5 shrink-0" />
            Symbols in this backtest ({symbolList.count ?? 0})
          </h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          These are the tickers included in this portfolio run. Open a card to see trades and charts for that symbol
          within backtest #{backtestId} (shared bankroll simulation).
        </p>
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={symbolSearch}
              onChange={(e) => {
                setSymbolSearch(e.target.value);
                setSymbolPage(1);
              }}
              placeholder="Search symbols by ticker..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {symbolSearch ? (
              <button
                type="button"
                onClick={() => {
                  setSymbolSearch('');
                  setSymbolPage(1);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title="Clear search"
              >
                ✕
              </button>
            ) : null}
          </div>
        </div>

        {symbolListLoading ? (
          <div className="text-center py-12">
            <Loader className="w-8 h-8 animate-spin mx-auto text-primary-600" />
            <p className="text-gray-600 mt-4">Loading symbols…</p>
          </div>
        ) : symbolList.results && symbolList.results.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {symbolList.results.map((sym, index) => (
                <motion.div
                  key={sym.ticker || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <SymbolCard
                    symbol={sym}
                    footer="Open symbol view in this backtest"
                    onClick={(s) => {
                      navigate(`/strategies/${id}/backtests/${backtestId}/${encodeURIComponent(s.ticker)}`);
                    }}
                  />
                </motion.div>
              ))}
            </div>
            {(() => {
              const total = symbolList.count || 0;
              const totalPages = Math.max(1, Math.ceil(total / SYMBOL_PAGE_SIZE));
              if (totalPages <= 1) return null;
              return (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setSymbolPage((p) => Math.max(1, p - 1))}
                    disabled={symbolPage <= 1}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                      symbolPage > 1
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {symbolPage} of {totalPages} ({total} symbols)
                  </span>
                  <button
                    type="button"
                    onClick={() => setSymbolPage((p) => Math.min(totalPages, p + 1))}
                    disabled={symbolPage >= totalPages}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                      symbolPage < totalPages
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })()}
          </>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500 text-lg">
              {symbolSearch.trim() ? 'No symbols match your search.' : 'No symbols linked to this backtest.'}
            </p>
          </div>
        )}
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
              value={currentStatsForDisplay.sharpe_ratio !== null && currentStatsForDisplay.sharpe_ratio !== undefined 
                ? (typeof currentStatsForDisplay.sharpe_ratio === 'number' 
                  ? currentStatsForDisplay.sharpe_ratio.toFixed(2) 
                  : parseFloat(currentStatsForDisplay.sharpe_ratio).toFixed(2))
                : 'N/A'}
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
            <StatisticsCard
              title="Average Winner"
              value={currentStatsForDisplay.average_winner !== null && currentStatsForDisplay.average_winner !== undefined ? formatCurrency(currentStatsForDisplay.average_winner) : 'N/A'}
              unit=""
              description="Average profit from winning trades"
              icon={TrendingUp}
            />
            <StatisticsCard
              title="Average Loser"
              value={currentStatsForDisplay.average_loser !== null && currentStatsForDisplay.average_loser !== undefined ? formatCurrency(currentStatsForDisplay.average_loser) : 'N/A'}
              unit=""
              description="Average loss from losing trades"
              icon={TrendingDown}
            />
          </div>

          {backtest.hedge_enabled &&
            currentStatsForDisplay.strategy_only_metrics &&
            Object.keys(currentStatsForDisplay.strategy_only_metrics).length > 0 && (
              <div className="mt-6 border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Strategy only vs strategy + hedge
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Cards above reflect the <strong>strategy + hedge</strong> run (trades saved to this backtest).
                  The left column is a separate baseline pass <strong>without</strong> the VIX sleeve split (capital
                  path can differ, so trade counts may not match).
                  {selectedSymbol ? (
                    <> Shown for <strong>{selectedSymbol}</strong> in {selectedMode.toUpperCase()} mode.</>
                  ) : null}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                    <h4 className="font-medium text-slate-800 mb-3">Strategy only (baseline)</h4>
                    <ul className="space-y-2 text-gray-700">
                      <li>
                        Total return:{' '}
                        {formatPercentage(currentStatsForDisplay.strategy_only_metrics.total_return)}
                      </li>
                      <li>
                        Total PnL:{' '}
                        {formatCurrency(currentStatsForDisplay.strategy_only_metrics.total_pnl)}
                      </li>
                      <li>Trades: {currentStatsForDisplay.strategy_only_metrics.total_trades ?? '—'}</li>
                      <li>
                        Win rate:{' '}
                        {currentStatsForDisplay.strategy_only_metrics.win_rate != null
                          ? formatPercentage(currentStatsForDisplay.strategy_only_metrics.win_rate)
                          : 'N/A'}
                      </li>
                      <li>
                        Max drawdown:{' '}
                        {currentStatsForDisplay.strategy_only_metrics.max_drawdown != null
                          ? formatPercentage(currentStatsForDisplay.strategy_only_metrics.max_drawdown)
                          : 'N/A'}
                      </li>
                      <li>
                        Sharpe:{' '}
                        {currentStatsForDisplay.strategy_only_metrics.sharpe_ratio != null
                          ? Number(currentStatsForDisplay.strategy_only_metrics.sharpe_ratio).toFixed(2)
                          : 'N/A'}
                      </li>
                    </ul>
                  </div>
                  <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
                    <h4 className="font-medium text-blue-900 mb-3">Strategy + hedge (primary)</h4>
                    <ul className="space-y-2 text-gray-800">
                      <li>Total return: {formatPercentage(currentStatsForDisplay.total_return)}</li>
                      <li>Total PnL: {formatCurrency(currentStatsForDisplay.total_pnl)}</li>
                      <li>Trades: {currentStatsForDisplay.total_trades ?? '—'}</li>
                      <li>
                        Win rate:{' '}
                        {currentStatsForDisplay.win_rate != null
                          ? formatPercentage(currentStatsForDisplay.win_rate)
                          : 'N/A'}
                      </li>
                      <li>
                        Max drawdown:{' '}
                        {currentStatsForDisplay.max_drawdown != null
                          ? formatPercentage(currentStatsForDisplay.max_drawdown)
                          : 'N/A'}
                      </li>
                      <li>
                        Sharpe:{' '}
                        {currentStatsForDisplay.sharpe_ratio != null
                          ? Number(currentStatsForDisplay.sharpe_ratio).toFixed(2)
                          : 'N/A'}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
        </div>
      ) : (
        <div className="mb-6 bg-white rounded-lg shadow-lg p-6">
          <p className="text-gray-600">No statistics available for this backtest.</p>
        </div>
      )}

      {/* Top/Worst performers: from trade PnL aggregation (portfolio no longer stores per-symbol stats rows) */}
      {!selectedSymbol && backtest?.status === 'completed' && (
        performerTradesLoading ? (
          <div className="mb-6 bg-white rounded-lg shadow-lg p-6 flex items-center gap-3 text-gray-600">
            <Loader className="w-5 h-5 animate-spin text-primary-600" />
            <span>Loading symbol rankings…</span>
          </div>
        ) : symbolsForTopPerformers.length > 0 ? (
          <TopPerformersChart symbols={symbolsForTopPerformers} mode={selectedMode} topCount={10} />
        ) : null
      )}

      {/* Equity Curve Chart */}
      {equityCurveForMode && Array.isArray(equityCurveForMode) && equityCurveForMode.length > 0 && (
        <div className="mb-6 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Equity Curve ({selectedMode.toUpperCase()})
          </h2>
          {backtest.hedge_enabled && strategyOnlySeriesForChart && (
            <p className="text-sm text-gray-600 mb-3">
              Blue = strategy + VIX sleeve; slate = strategy-only baseline
              {!selectedSymbol ? '; orange = S&P 500 buy-and-hold (if available)' : ''}.
            </p>
          )}
          {benchmarkErrorPortfolio && !benchmarkSeriesForChart && (
            <p className="text-sm text-amber-700 mb-3">
              Benchmark (^GSPC) unavailable: {benchmarkErrorPortfolio}
            </p>
          )}
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
              colors: (() => {
                const c = ['#3B82F6'];
                if (strategyOnlySeriesForChart) c.push('#64748B');
                if (benchmarkSeriesForChart) c.push('#F97316');
                return c;
              })(),
              stroke: {
                width: (() => {
                  let n = 1;
                  if (strategyOnlySeriesForChart) n += 1;
                  if (benchmarkSeriesForChart) n += 1;
                  return Array(n).fill(2);
                })(),
                curve: 'straight',
              },
              legend: {
                show: !!(benchmarkSeriesForChart || strategyOnlySeriesForChart),
                position: 'top',
              },
              tooltip: {
                x: {
                  format: 'dd MMM yyyy'
                },
              },
            }}
            series={(() => {
              const strategyData = equityCurveForMode
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
                .filter(point => point !== null);
              const hedgedLabel =
                backtest.hedge_enabled && strategyOnlySeriesForChart
                  ? 'Strategy + hedge'
                  : selectedSymbol
                    ? 'Equity'
                    : 'Strategy';
              const seriesList = [{ name: hedgedLabel, data: strategyData }];
              if (strategyOnlySeriesForChart) {
                seriesList.push({
                  name: 'Strategy only',
                  data: strategyOnlySeriesForChart,
                });
              }
              if (benchmarkSeriesForChart) {
                seriesList.push({
                  name: 'S&P 500 (buy & hold)',
                  data: benchmarkSeriesForChart,
                });
              }
              return seriesList;
            })()}
            type="line"
            height={350}
          />
        </div>
      )}

      {/* Trades Table with Pagination */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Trading History {selectedSymbol ? `- ${selectedSymbol}` : '(All Symbols)'} ({selectedMode.toUpperCase()})
          </h2>
          <ExportTableToolbar
            onExportCsv={handleExportPortfolioTradesCsv}
            onExportJson={handleExportPortfolioTradesJson}
            csvLabel="Export all trades (CSV)"
            jsonLabel="Export all trades (JSON)"
            disabled={totalTradesCount === 0 || backtest?.status === 'running'}
            loading={exportingTrades}
          />
        </div>

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
                  {chronologicalTradeRows.length > 0 && totalTradesCount > 0 && (
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
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Page</span>
                    <input
                      type="number"
                      min="1"
                      max={totalPages || 1}
                      value={tradesPageInput}
                      onChange={(e) => setTradesPageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleTradesPageChange(e.target.value);
                        }
                      }}
                      onBlur={(e) => {
                        handleTradesPageChange(e.target.value);
                      }}
                      className="w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <span className="text-sm text-gray-600">
                      {totalPages > 0 && `of ${totalPages}`}
                    </span>
                  </div>
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

            {chronologicalTradeRows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticker</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Invested</th>
                      <HedgeTradeInvestedHeaderCells show={!!backtest?.hedge_enabled} />
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entry Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exit Date</th>
                      <HedgeTradePnlHeaderCells show={!!backtest?.hedge_enabled} />
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PnL</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ROI %</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max Drawdown</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {chronologicalTradeRows.map(({ key, rowType, trade }) => {
                      const tradeSymbolTicker = trade?.symbol_info?.ticker || trade?.symbol?.ticker || trade?.symbol_ticker || 'N/A';
                      const positionType = trade.trade_type === 'buy' ? 'Long' : 'Short';
                      const maxDrawdown = trade.max_drawdown;

                      if (rowType === 'entry') {
                        return (
                          <tr key={key} className="hover:bg-gray-50">
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
                              {(() => {
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
                            <HedgeTradeInvestedBodyCells
                              show={!!backtest?.hedge_enabled}
                              trade={trade}
                              formatCurrency={formatCurrency}
                            />
                            <td className="px-4 py-3 text-sm text-gray-900">{trade.quantity ? parseFloat(trade.quantity).toFixed(4) : 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {trade.entry_timestamp ? new Date(trade.entry_timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">-</td>
                            <HedgeTradePnlBodyCells
                              show={!!backtest?.hedge_enabled}
                              rowType="entry"
                              trade={trade}
                              formatCurrency={formatCurrency}
                            />
                            <td className="px-4 py-3 text-sm text-gray-900">-</td>
                            <td className="px-4 py-3 text-sm text-gray-900">-</td>
                          </tr>
                        );
                      }

                      return (
                        <tr
                          key={key}
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
                            {(() => {
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
                          <HedgeTradeInvestedBodyCells
                            show={!!backtest?.hedge_enabled}
                            trade={trade}
                            formatCurrency={formatCurrency}
                          />
                          <td className="px-4 py-3 text-sm text-gray-900">{trade.quantity ? parseFloat(trade.quantity).toFixed(4) : 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {trade.entry_timestamp ? new Date(trade.entry_timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Date(trade.exit_timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </td>
                          <HedgeTradePnlBodyCells
                            show={!!backtest?.hedge_enabled}
                            rowType="exit"
                            trade={trade}
                            formatCurrency={formatCurrency}
                          />
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
