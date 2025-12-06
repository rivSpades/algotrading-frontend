/**
 * Strategy Backtest Symbol Detail Page
 * Shows statistics, candlestick chart with indicators, and entry/exit points for a symbol in a backtest
 * URL: /strategies/:id/backtests/:backtestId/:ticker
 */

import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, BarChart3, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { getStrategy } from '../data/strategies';
import { getBacktest, getAllBacktestTrades } from '../data/backtests';
import { getSymbolOHLCV } from '../data/symbols';
import StatisticsCard from '../components/StatisticsCard';
import CandlestickChart from '../components/CandlestickChart';
import Chart from 'react-apexcharts';

export default function StrategyBacktestSymbolDetail() {
  const { id, backtestId, ticker } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [strategy, setStrategy] = useState(null);
  const [backtest, setBacktest] = useState(null);
  const [statistics, setStatistics] = useState(null); // Backend stats for 'all' mode only
  const [allTrades, setAllTrades] = useState([]); // All trades for this symbol (loaded once, used for both signals and table)
  const [ohlcvData, setOhlcvData] = useState([]);
  const [indicatorsMetadata, setIndicatorsMetadata] = useState({});
  const [loading, setLoading] = useState(true);
  const [positionModeTab, setPositionModeTab] = useState('all'); // 'all', 'long', 'short'
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const page = parseInt(searchParams.get('page') || '1');
    setCurrentPage(page);
    loadData();
  }, [id, backtestId, ticker]); // Only reload when backtest/symbol changes, not on page change

  // Update current page when searchParams change (for client-side pagination)
  useEffect(() => {
    const page = parseInt(searchParams.get('page') || '1');
    setCurrentPage(page);
  }, [searchParams]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all data in parallel - use endpoint without pagination
      const [strategyData, backtestData, ohlcvResponse, allTradesList] = await Promise.all([
        getStrategy(id),
        getBacktest(backtestId),
        getSymbolOHLCV(ticker, 'daily', null, null, 1, 1000, parseInt(backtestId), parseInt(id)),
        getAllBacktestTrades(backtestId), // Get ALL trades without pagination
      ]);
      
      console.log(`Loaded ${allTradesList.length} total trades from single endpoint`);

      setStrategy(strategyData);
      setBacktest(backtestData);

      // Get symbol statistics from backend (only 'all' mode stats)
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

      const symbolStatsEntry = statsArray.find(s => {
        const symbolTicker = s?.symbol_info?.ticker || s?.symbol?.ticker || s?.symbol_ticker;
        return symbolTicker === ticker;
      });

      setStatistics(symbolStatsEntry || null);

      // Filter trades for this symbol (all trades - used for both signals and table)
      const symbolTrades = allTradesList.filter(t => {
        const tradeSymbolTicker = t?.symbol_info?.ticker || t?.symbol?.ticker || t?.symbol_ticker;
        return tradeSymbolTicker === ticker;
      });
      
      console.log(`Filtered ${symbolTrades.length} trades for symbol ${ticker} from ${allTradesList.length} total trades`);
      setAllTrades(symbolTrades);

      // Ensure OHLCV data is set even if response structure is different
      if (ohlcvResponse && ohlcvResponse.results) {
        setOhlcvData(ohlcvResponse.results);
      } else if (Array.isArray(ohlcvResponse)) {
        setOhlcvData(ohlcvResponse);
      } else {
        console.warn('Unexpected OHLCV response format:', ohlcvResponse);
        setOhlcvData([]);
      }
      
      setIndicatorsMetadata(ohlcvResponse?.indicators || {});

    } catch (error) {
      console.error('Error loading backtest symbol data:', error);
      setStatistics(null);
      setAllTrades([]);
    } finally {
      setLoading(false);
    }
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
    const numValue = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(numValue)) return 'N/A';
    return `${numValue.toFixed(2)}%`;
  };

  // NO CALCULATIONS IN FRONTEND - All statistics come from backend

  // Extract statistics from backend for each tab
  // Backend stores symbol stats: main fields = 'all' mode, additional_stats = long/short modes
  // NO CALCULATIONS - All stats come from backend
  const allSymbolStatistics = useMemo(() => {
    if (!statistics) return null;
    
    // Backend structure:
    // - Main fields: 'all' mode stats (total_trades, cagr, equity_curve, etc.)
    // - additional_stats: { 'long': {...}, 'short': {...} }
    //   Each mode has its own complete stats including equity_curve
    
    // 'all' mode stats are in main fields
    const allStats = {
      total_trades: statistics.total_trades,
      winning_trades: statistics.winning_trades,
      losing_trades: statistics.losing_trades,
      win_rate: statistics.win_rate,
      total_pnl: statistics.total_pnl,
      total_pnl_percentage: statistics.total_pnl_percentage,
      average_pnl: statistics.average_pnl,
      average_winner: statistics.average_winner,
      average_loser: statistics.average_loser,
      profit_factor: statistics.profit_factor,
      max_drawdown: statistics.max_drawdown,
      max_drawdown_duration: statistics.max_drawdown_duration,
      sharpe_ratio: statistics.sharpe_ratio,
      cagr: statistics.cagr,
      total_return: statistics.total_return,
      equity_curve: statistics.equity_curve || [],
    };
    
    // Get long and short stats from additional_stats (complete stats from backend)
    const additionalStats = statistics.additional_stats || {};
    const longStats = additionalStats.long || {};
    const shortStats = additionalStats.short || {};
    
    return {
      all: allStats,
      long: longStats, // Complete stats from backend (no calculations)
      short: shortStats, // Complete stats from backend (no calculations)
    };
  }, [statistics]);

  // Get current stats based on selected tab - ALL FROM BACKEND
  const currentStats = useMemo(() => {
    if (!allSymbolStatistics) return null;
    return allSymbolStatistics[positionModeTab] || allSymbolStatistics.all || null;
  }, [allSymbolStatistics, positionModeTab]);

  // Filter trades by position mode for table display
  const allFilteredTrades = useMemo(() => {
    return allTrades.filter(trade => {
      const metadata = trade.metadata || {};
      if (positionModeTab === 'all') {
        return metadata.position_mode === 'all' || !metadata.position_mode;
      } else if (positionModeTab === 'long') {
        if (metadata.position_mode !== undefined) {
          return metadata.position_mode === 'long';
        }
        // Backward compatibility
        return (trade.trade_type || trade.tradeType) === 'buy';
      } else if (positionModeTab === 'short') {
        if (metadata.position_mode !== undefined) {
          return metadata.position_mode === 'short';
        }
        // Backward compatibility
        return (trade.trade_type || trade.tradeType) === 'sell';
      }
      return true;
    });
  }, [allTrades, positionModeTab]);

  // Client-side pagination for table (20 items per page)
  const filteredTrades = useMemo(() => {
    const itemsPerPage = 20;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return allFilteredTrades.slice(startIndex, endIndex);
  }, [allFilteredTrades, currentPage]);

  // Calculate pagination info for client-side pagination
  const totalFilteredCount = allFilteredTrades.length;
  const itemsPerPage = 20;
  const totalPages = Math.ceil(totalFilteredCount / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  // Convert filtered trades to signals for chart - FILTER BY POSITION MODE (same as datatable)
  const signals = useMemo(() => {
    if (!allFilteredTrades || allFilteredTrades.length === 0) {
      console.log('No filtered trades available for signals');
      return [];
    }

    const signalArray = [];

    allFilteredTrades.forEach(trade => {
      // Determine position type exactly as in datatable
      const positionType = trade.trade_type === 'buy' ? 'Long' : 'Short';
      const isLong = trade.trade_type === 'buy';

      // Entry signal
      if (trade.entry_timestamp && trade.entry_price) {
        const timestamp = new Date(trade.entry_timestamp).getTime();
        const price = parseFloat(trade.entry_price);
        if (!isNaN(timestamp) && !isNaN(price)) {
          signalArray.push({
            timestamp: timestamp,
            price: price,
            type: 'entry',
            positionType: isLong ? 'long' : 'short', // lowercase for chart component
            signal: positionType, // 'Long' or 'Short' for display
            tradeId: trade.id,
          });
        }
      }

      // Exit signal (only if exit exists)
      if (trade.exit_timestamp && trade.exit_price) {
        const timestamp = new Date(trade.exit_timestamp).getTime();
        const price = parseFloat(trade.exit_price);
        if (!isNaN(timestamp) && !isNaN(price)) {
          signalArray.push({
            timestamp: timestamp,
            price: price,
            type: 'exit',
            positionType: isLong ? 'long' : 'short', // lowercase for chart component
            signal: 'Exit',
            tradeId: trade.id,
          });
        }
      }
    });

    console.log(`Generated ${signalArray.length} signals from ${allFilteredTrades.length} filtered trades (mode: ${positionModeTab})`);
    return signalArray;
  }, [allFilteredTrades, positionModeTab]);

  // Prepare indicators for the chart based on strategy's required tools
  const chartIndicators = useMemo(() => {
    if (!ohlcvData || ohlcvData.length === 0 || !strategy || !strategy.required_tool_configs) {
      return [];
    }

    const indicatorList = [];
    const firstRow = ohlcvData[0];
    const strategyParams = strategy.default_parameters || {};

    // Process each tool config - use for loop to ensure all tools are processed
    for (const toolConfig of strategy.required_tool_configs) {
      const toolName = toolConfig.tool_name;
      const parameterMapping = toolConfig.parameter_mapping || {};
      const resolvedParams = { ...(toolConfig.parameters || {}) };
      
      // Map strategy parameters to tool parameters
      for (const [toolParam, strategyParam] of Object.entries(parameterMapping)) {
        if (strategyParams[strategyParam] !== undefined) {
          resolvedParams[toolParam] = strategyParams[strategyParam];
        }
      }

      // Build indicator key: toolName_param1_param2 or just toolName
      let indicatorKey = Object.keys(resolvedParams).length > 0
        ? `${toolName}_${Object.values(resolvedParams).join('_')}`
        : toolName;

      // Try to find the indicator key in the data (with and without underscores)
      let foundKey = null;
      if (firstRow[indicatorKey] !== undefined) {
        foundKey = indicatorKey;
      } else {
        // Try without underscores (e.g., SMA_20 -> SMA20)
        const altKey = indicatorKey.replace(/_/g, '');
        if (firstRow[altKey] !== undefined) {
          foundKey = altKey;
        } else {
          // Try with sorted parameter values (in case order differs)
          const sortedParams = Object.entries(resolvedParams)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([, v]) => v);
          if (sortedParams.length > 0) {
            const sortedKey = `${toolName}_${sortedParams.join('_')}`;
            if (firstRow[sortedKey] !== undefined) {
              foundKey = sortedKey;
            } else {
              const sortedAltKey = sortedKey.replace(/_/g, '');
              if (firstRow[sortedAltKey] !== undefined) {
                foundKey = sortedAltKey;
              }
            }
          }
        }
      }

      // Skip this tool if indicator key not found
      if (!foundKey) {
        // Log all available keys for debugging
        const allKeys = Object.keys(firstRow);
        const smaKeys = allKeys.filter(k => k.toUpperCase().includes('SMA'));
        console.warn(`Indicator key not found for tool: ${toolName} with params:`, resolvedParams);
        console.warn(`  Tried keys: ${indicatorKey}, ${indicatorKey.replace(/_/g, '')}`);
        console.warn(`  Available SMA keys:`, smaKeys);
        console.warn(`  All available keys (first 20):`, allKeys.slice(0, 20));
        continue; // Skip to next tool
      }

      const indicatorMetadata = indicatorsMetadata?.[foundKey];
      const displayName = indicatorMetadata?.display_name || toolConfig.display_name || toolName;

      // Extract values for this indicator
      const values = ohlcvData
        .map(item => ({
          timestamp: item.timestamp,
          value: item[foundKey] !== null && item[foundKey] !== undefined ? parseFloat(item[foundKey]) : null
        }))
        .filter(item => item.value !== null && !isNaN(item.value));

      // Add indicator to list if we have valid values
      if (values.length > 0) {
        indicatorList.push({
          toolName: displayName,
          enabled: true,
          subchart: toolConfig.subchart || false,
          style: toolConfig.style || indicatorMetadata?.style || {
            color: '#3B82F6',
            line_width: 2,
          },
          values: values,
          indicatorKey: foundKey,
        });
      } else {
        console.warn(`No valid values found for indicator: ${foundKey}`);
      }
    }

    return indicatorList;
  }, [strategy, indicatorsMetadata, ohlcvData]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">Loading symbol data...</div>
      </div>
    );
  }

  if (!backtest || !strategy) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">
          <p className="text-gray-600">Backtest or strategy not found</p>
          <button
            onClick={() => navigate(`/strategies/${id}/backtests/${backtestId}`)}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Back to Symbols
          </button>
        </div>
      </div>
    );
  }

  if (backtest.status === 'running') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">
          <p className="text-gray-600">Backtest is still running. Results will appear here once it completes.</p>
          <button
            onClick={() => navigate(`/strategies/${id}/backtests/${backtestId}`)}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Back to Symbols
          </button>
        </div>
      </div>
    );
  }

  if (!currentStats && backtest.status === 'completed' && (!allTrades || allTrades.length === 0)) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">
          <p className="text-gray-600">No statistics available for this symbol in this backtest.</p>
          <button
            onClick={() => navigate(`/strategies/${id}/backtests/${backtestId}`)}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Back to Symbols
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(`/strategies/${id}/backtests/${backtestId}`)}
        className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Symbols
      </button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {ticker} - {strategy.name}
        </h1>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>Backtest: {backtest.name || `#${backtest.id}`}</span>
          <span>•</span>
          <span>Status: <span className={`font-medium ${backtest.status === 'completed' ? 'text-green-600' : backtest.status === 'failed' ? 'text-red-600' : 'text-yellow-600'}`}>{backtest.status}</span></span>
        </div>
      </div>

      {/* Statistics Cards with Tabs */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Performance Metrics</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setPositionModeTab('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                positionModeTab === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ALL
            </button>
            <button
              onClick={() => setPositionModeTab('long')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                positionModeTab === 'long'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              LONG
            </button>
            <button
              onClick={() => setPositionModeTab('short')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                positionModeTab === 'short'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              SHORT
            </button>
          </div>
        </div>

        {currentStats && Object.keys(currentStats).length > 0 ? (
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
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm font-medium">
              No statistics available for {positionModeTab.toUpperCase()} trades
            </p>
          </div>
        )}
      </div>

      {/* Equity Curve Chart */}
      {currentStats?.equity_curve && Array.isArray(currentStats.equity_curve) && currentStats.equity_curve.length > 0 && (
        <div className="mb-6 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Equity Curve ({positionModeTab.toUpperCase()})
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
                text: `Equity Curve - ${ticker} (${positionModeTab.toUpperCase()})`,
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
              data: currentStats.equity_curve
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

      {/* Strategy Analytical Tools */}
      {strategy && strategy.required_tool_configs && strategy.required_tool_configs.length > 0 && (
        <div className="mb-6 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Strategy Analytical Tools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {strategy.required_tool_configs.map((toolConfig, index) => {
              const toolName = toolConfig.tool_name;
              const displayName = toolConfig.display_name || toolName;
              const parameters = toolConfig.parameters || {};
              const parameterMapping = toolConfig.parameter_mapping || {};
              const strategyParams = strategy.default_parameters || {};

              const resolvedParams = { ...parameters };
              for (const [toolParam, strategyParam] of Object.entries(parameterMapping)) {
                if (strategyParams[strategyParam] !== undefined) {
                  resolvedParams[toolParam] = strategyParams[strategyParam];
                }
              }

              return (
                <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{displayName}</h3>
                    {toolConfig.locked && (
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        Locked
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    <p className="mb-1"><span className="font-medium">Tool:</span> {toolName}</p>
                    {Object.keys(resolvedParams).length > 0 && (
                      <div>
                        <p className="font-medium mb-1">Parameters:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {Object.entries(resolvedParams).map(([key, value]) => (
                            <li key={key}>
                              <span className="capitalize">{key.replace(/_/g, ' ')}:</span> {value}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {toolConfig.subchart && (
                      <p className="mt-2 text-xs text-gray-500 italic">Displayed in separate subchart</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Candlestick Chart with Indicators and Signals */}
      <div className="mb-6 bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Price Chart with Strategy Signals</h2>
        {signals.length > 0 && (
          <div className="mb-4 text-sm text-gray-600">
            <p>Showing {signals.filter(s => s.type === 'entry').length} entry signals and {signals.filter(s => s.type === 'exit').length} exit signals (all trades)</p>
          </div>
        )}
        <CandlestickChart
          data={ohlcvData}
          ticker={ticker}
          indicators={chartIndicators}
          signals={signals}
        />
      </div>

      {/* Trading History Datatable */}
      {filteredTrades.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Trading History ({positionModeTab.toUpperCase()})</h2>

          {totalFilteredCount > 0 && (
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Found {totalFilteredCount} trade{totalFilteredCount !== 1 ? 's' : ''} ({positionModeTab.toUpperCase()})
                {filteredTrades.length > 0 && totalFilteredCount > 0 && (
                  <span className="text-gray-500">
                    {' '}(Showing {((currentPage - 1) * 20) + 1}-{Math.min(currentPage * 20, totalFilteredCount)})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (hasPreviousPage) {
                      setSearchParams({ page: currentPage - 1 });
                    }
                  }}
                  disabled={!hasPreviousPage}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <span className="text-sm text-gray-600 px-2">
                  Page {currentPage} {totalPages > 0 && `of ${totalPages}`}
                </span>
                <button
                  onClick={() => {
                    if (hasNextPage) {
                      setSearchParams({ page: currentPage + 1 });
                    }
                  }}
                  disabled={!hasNextPage}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

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
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{ticker}</td>
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
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{ticker}</td>
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
        </div>
      )}
    </div>
  );
}
