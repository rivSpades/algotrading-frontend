/**
 * Strategy Backtest Symbol Detail Page
 * Shows statistics, candlestick chart with indicators, and entry/exit points for a symbol in a backtest
 * URL: /strategies/:id/backtests/:backtestId/:ticker
 */

import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, BarChart3, Settings, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { getStrategy } from '../data/strategies';
import {
  getBacktest,
  getBacktestStatisticsOptimized,
  getAllBacktestTrades,
  getSymbolRun,
  getSymbolRunStatisticsOptimized,
  getAllSymbolRunTrades,
} from '../data/backtests';
import { exportTradesToCsvFile } from '../utils/tradeHistoryExport';
import { downloadJson } from '../utils/exportCsv';
import ExportTableToolbar from '../components/ExportTableToolbar';
import { getSymbolOHLCV } from '../data/symbols';
import StatisticsCard from '../components/StatisticsCard';
import CandlestickChart from '../components/CandlestickChart';
import Chart from 'react-apexcharts';
import { buildChronologicalTradeTableRows } from '../utils/chronologicalTradeTableRows';
import { positionModesAvailable, positionModeRunLabel } from '../utils/backtestPositionMode';
import {
  HedgeTradeInvestedHeaderCells,
  HedgeTradePnlHeaderCells,
  HedgeTradeInvestedBodyCells,
  HedgeTradePnlBodyCells,
} from '../components/BacktestHedgeTradeTableCols';
import BacktestParametersPanel from '../components/BacktestParametersPanel';

export default function StrategyBacktestSymbolDetail({
  embeddedBacktestId = null,
  embeddedRunId = null,
  /** Parent increments when the same symbol run was re-queued in place (recalculate) so we refetch despite unchanged run id. */
  symbolRunReloadNonce = 0,
  standalone = false,
  onRecalculate = null,
  onDeleteRun = null,
  recalculateDisabled = false,
}) {
  const params = useParams();
  const id = params.id;
  const ticker = params.ticker;
  const routeBacktestId = params.backtestId;
  const backtestId = embeddedBacktestId != null ? String(embeddedBacktestId) : routeBacktestId;
  const runId = embeddedRunId != null ? String(embeddedRunId) : null;
  const isSymbolRun = runId != null;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [strategy, setStrategy] = useState(null);
  const [backtest, setBacktest] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [allTrades, setAllTrades] = useState([]); // All trades for this symbol (loaded once, used for both signals and table)
  const [allOhlcvData, setAllOhlcvData] = useState([]); // All OHLCV data (will be filtered by mode in useMemo)
  const [indicatorsMetadata, setIndicatorsMetadata] = useState({});
  const [loading, setLoading] = useState(true);
  const [positionModeTab, setPositionModeTab] = useState('long'); // 'long', 'short'
  const [currentPage, setCurrentPage] = useState(1);
  const [exportingSymbolTrades, setExportingSymbolTrades] = useState(false);

  const backNavHref = standalone
    ? `/strategies/${id}`
    : isSymbolRun
      ? `/strategies/${id}/${ticker}?run=${runId}`
      : `/strategies/${id}/backtests/${backtestId}`;
  const backNavLabel = standalone ? 'Back to strategy' : isSymbolRun ? 'Back' : 'Back to Symbols';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [strategyData, runOrBacktestData, statsData] = await Promise.all([
        getStrategy(id),
        isSymbolRun ? getSymbolRun(runId) : getBacktest(backtestId),
        isSymbolRun ? getSymbolRunStatisticsOptimized(runId) : getBacktestStatisticsOptimized(backtestId),
      ]);

      const ohlcvStart = isSymbolRun ? runOrBacktestData?.start_date : null;
      const ohlcvEnd = isSymbolRun ? runOrBacktestData?.end_date : null;
      const ohlcvResponse = await getSymbolOHLCV(
        ticker,
        'daily',
        ohlcvStart,
        ohlcvEnd,
        1,
        10000,
        isSymbolRun ? null : parseInt(backtestId),
        parseInt(id),
      );

      setStrategy(strategyData);
      setBacktest(runOrBacktestData);

      // Get symbol statistics from optimized statistics endpoint
      // stats_by_mode: long (main row) + short
      let symbolStatsEntry = null;
      if (statsData?.symbols && Array.isArray(statsData.symbols)) {
        symbolStatsEntry = statsData.symbols.find(s => {
          const symbolTicker = s?.symbol_ticker;
          return symbolTicker === ticker;
        });
      }

      setStatistics(symbolStatsEntry || null);

      // Ensure OHLCV data is set - when backtest_id is provided, backend returns all data
      // Response can be: {results: [...]} or [...] (array directly)
      let ohlcvResults = [];
      if (ohlcvResponse) {
        if (ohlcvResponse.results && Array.isArray(ohlcvResponse.results)) {
          ohlcvResults = ohlcvResponse.results;
        } else if (Array.isArray(ohlcvResponse)) {
          ohlcvResults = ohlcvResponse;
        }
      }
      // Store all OHLCV data - will be filtered by mode in useMemo based on selected positionModeTab
      setAllOhlcvData(ohlcvResults);
      console.log(`Loaded ${ohlcvResults.length} OHLCV data points for ${ticker} (will be filtered by mode)`);

      setIndicatorsMetadata(ohlcvResponse?.indicators || {});

    } catch (error) {
      console.error('Error loading backtest symbol data:', error);
      setStatistics(null);
      setAllTrades([]);
    } finally {
      setLoading(false);
    }
  }, [id, backtestId, runId, isSymbolRun, ticker, positionModeTab]);

  useEffect(() => {
    const page = parseInt(searchParams.get('page') || '1');
    setCurrentPage(page);
    loadData();
  }, [
    id,
    backtestId,
    runId,
    isSymbolRun,
    ticker,
    embeddedBacktestId,
    embeddedRunId,
    symbolRunReloadNonce,
    loadData,
  ]);

  // Load trades for this symbol run/backtest (and reload when mode changes).
  // We intentionally do this outside `loadData()` to avoid duplicate fetches on page load.
  useEffect(() => {
    const reloadTradesForMode = async () => {
      const idToUse = isSymbolRun ? runId : backtestId;
      if (!idToUse || !ticker) return;
      try {
        const symbolTrades = isSymbolRun
          ? await getAllSymbolRunTrades(idToUse, ticker, positionModeTab)
          : await getAllBacktestTrades(idToUse, ticker, positionModeTab);
        setAllTrades(Array.isArray(symbolTrades) ? symbolTrades : []);
      } catch (tradeError) {
        console.error('Error reloading trades for mode:', tradeError);
        setAllTrades([]);
      }
    };
    reloadTradesForMode();
  }, [positionModeTab, backtestId, runId, isSymbolRun, ticker]);

  // Update current page when searchParams change (for client-side pagination)
  useEffect(() => {
    const page = parseInt(searchParams.get('page') || '1');
    setCurrentPage(page);
  }, [searchParams]);

  const positionModesKey = backtest?.position_modes?.length
    ? [...backtest.position_modes].sort().join(',')
    : '';

  useEffect(() => {
    if (!backtest) return;
    const avail = positionModesAvailable(backtest);
    setPositionModeTab((m) => (avail.includes(m) ? m : avail[0]));
  }, [backtest?.id, positionModesKey]);

  // When a backtest is still running/pending, poll its status so this page doesn't get stuck.
  // Once it completes, reload the full dataset (stats/trades/ohlcv).
  useEffect(() => {
    const idToPoll = isSymbolRun ? runId : backtestId;
    if (!idToPoll) return undefined;
    const s = backtest?.status;
    if (s !== 'running' && s !== 'pending') return undefined;

    let cancelled = false;
    const t = setInterval(async () => {
      if (cancelled) return;
      try {
        const bt = isSymbolRun ? await getSymbolRun(idToPoll) : await getBacktest(idToPoll);
        if (cancelled) return;
        setBacktest(bt);
        if (bt?.status === 'completed' || bt?.status === 'failed') {
          clearInterval(t);
          // Pull stats/trades now that the backtest is done.
          loadData();
        }
      } catch (e) {
        // keep polling; transient errors are ok
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [backtestId, runId, isSymbolRun, backtest?.status, loadData]);

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
  // Backend optimized statistics endpoint provides stats_by_mode structure
  // LONG / SHORT stats from backend (including equity_curve)
  const allSymbolStatistics = useMemo(() => {
    if (!statistics) return null;
    const statsByMode = statistics.stats_by_mode || {};
    return {
      long: statsByMode.long || {},
      short: statsByMode.short || {},
    };
  }, [statistics]);

  const currentStats = useMemo(() => {
    if (!allSymbolStatistics) return null;
    return allSymbolStatistics[positionModeTab] || allSymbolStatistics.long || null;
  }, [allSymbolStatistics, positionModeTab]);

  const strategyOnlySeriesForChart = useMemo(() => {
    if (!backtest?.hedge_enabled || !currentStats) return null;
    const x = currentStats.strategy_only_equity_curve_x;
    const y = currentStats.strategy_only_equity_curve_y;
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
  }, [backtest?.hedge_enabled, currentStats]);

  const allFilteredTrades = useMemo(() => {
    return allTrades.filter(trade => {
      const metadata = trade.metadata || {};
      if (positionModeTab === 'long') {
        if (metadata.position_mode !== undefined) {
          return metadata.position_mode === 'long';
        }
        return (trade.trade_type || trade.tradeType) === 'buy';
      }
      if (positionModeTab === 'short') {
        if (metadata.position_mode !== undefined) {
          return metadata.position_mode === 'short';
        }
        return (trade.trade_type || trade.tradeType) === 'sell';
      }
      return false;
    });
  }, [allTrades, positionModeTab]);

  // Client-side pagination for table (20 items per page)
  const filteredTrades = useMemo(() => {
    const itemsPerPage = 20;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return allFilteredTrades.slice(startIndex, endIndex);
  }, [allFilteredTrades, currentPage]);

  const chronologicalSymbolTradeRows = useMemo(
    () => buildChronologicalTradeTableRows(filteredTrades),
    [filteredTrades]
  );

  const handleExportSymbolTradesCsv = async () => {
    setExportingSymbolTrades(true);
    try {
      const idToUse = isSymbolRun ? parseInt(runId, 10) : parseInt(backtestId, 10);
      const all = isSymbolRun
        ? await getAllSymbolRunTrades(idToUse, ticker, positionModeTab)
        : await getAllBacktestTrades(idToUse, ticker, positionModeTab);
      const prefix = isSymbolRun ? `symbol-run-${runId}` : `backtest-${backtestId}`;
      exportTradesToCsvFile(all, `${prefix}-${ticker}-${positionModeTab}-trades.csv`, {
        hedgeEnabled: !!backtest?.hedge_enabled,
      });
    } catch (e) {
      console.error(e);
      alert(`Export failed: ${e.message || 'Unknown error'}`);
    } finally {
      setExportingSymbolTrades(false);
    }
  };

  const handleExportSymbolTradesJson = async () => {
    setExportingSymbolTrades(true);
    try {
      const idToUse = isSymbolRun ? parseInt(runId, 10) : parseInt(backtestId, 10);
      const all = isSymbolRun
        ? await getAllSymbolRunTrades(idToUse, ticker, positionModeTab)
        : await getAllBacktestTrades(idToUse, ticker, positionModeTab);
      const prefix = isSymbolRun ? `symbol-run-${runId}` : `backtest-${backtestId}`;
      downloadJson(`${prefix}-${ticker}-${positionModeTab}-trades.json`, {
        exportedAt: new Date().toISOString(),
        backtestId: isSymbolRun ? null : parseInt(backtestId, 10),
        symbolRunId: isSymbolRun ? parseInt(runId, 10) : null,
        strategyId: parseInt(id, 10),
        ticker,
        positionMode: positionModeTab,
        trades: all,
      });
    } catch (e) {
      console.error(e);
      alert(`Export failed: ${e.message || 'Unknown error'}`);
    } finally {
      setExportingSymbolTrades(false);
    }
  };

  // Calculate pagination info for client-side pagination
  const totalFilteredCount = allFilteredTrades.length;
  const itemsPerPage = 20;
  const totalPages = Math.ceil(totalFilteredCount / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  // Filter OHLCV data to match the filtered trades date range (with 30-day buffer)
  // This ensures the chart shows data aligned with the trading history table for the selected mode
  const ohlcvData = useMemo(() => {
    if (!allOhlcvData || allOhlcvData.length === 0) {
      return [];
    }
    
    if (!allFilteredTrades || allFilteredTrades.length === 0) {
      return allOhlcvData; // No trades to filter by, show all data
    }
    
    // Calculate trade date range from filtered trades (current mode)
    const entryTimestamps = allFilteredTrades
      .filter(t => t.entry_timestamp)
      .map(t => new Date(t.entry_timestamp).getTime());
    const exitTimestamps = allFilteredTrades
      .filter(t => t.exit_timestamp)
      .map(t => new Date(t.exit_timestamp).getTime());
    
    const allTradeTimestamps = [...entryTimestamps, ...exitTimestamps];
    if (allTradeTimestamps.length === 0) {
      return allOhlcvData;
    }
    
    const minTimestamp = Math.min(...allTradeTimestamps);
    const maxTimestamp = Math.max(...allTradeTimestamps);
    
    // Add 30-day buffer (in milliseconds)
    const bufferMs = 30 * 24 * 60 * 60 * 1000;
    const startTime = minTimestamp - bufferMs;
    const endTime = maxTimestamp + bufferMs;
    
    // Filter OHLCV data to trade date range
    const filtered = allOhlcvData.filter(ohlcv => {
      if (!ohlcv.timestamp) return false;
      const ohlcvTime = new Date(ohlcv.timestamp).getTime();
      if (isNaN(ohlcvTime)) return false;
      return ohlcvTime >= startTime && ohlcvTime <= endTime;
    });
    
    console.log(`Filtered OHLCV data to ${positionModeTab} mode trade date range: ${filtered.length} of ${allOhlcvData.length} data points`);
    console.log(`Trade date range (${positionModeTab}): ${new Date(minTimestamp).toLocaleDateString()} to ${new Date(maxTimestamp).toLocaleDateString()}`);
    
    return filtered;
  }, [allOhlcvData, allFilteredTrades, positionModeTab]);

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
    // Use backtest's strategy_parameters if available, otherwise use strategy's default_parameters
    // This ensures we use the actual parameters used in the backtest (e.g., short_period=15, long_period=35)
    // instead of the strategy defaults (e.g., short_period=20, long_period=50)
    const strategyParams = (backtest?.strategy_parameters || strategy.default_parameters || {});

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
      // Check if key exists in any row (not just first, since first rows might have null values)
      let foundKey = null;
      const keyExists = (key) => ohlcvData.some(row => row[key] !== undefined);
      
      if (keyExists(indicatorKey)) {
        foundKey = indicatorKey;
      } else {
        // Try without underscores (e.g., SMA_20 -> SMA20)
        const altKey = indicatorKey.replace(/_/g, '');
        if (keyExists(altKey)) {
          foundKey = altKey;
        } else {
          // Try with sorted parameter values (in case order differs)
          const sortedParams = Object.entries(resolvedParams)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([, v]) => v);
          if (sortedParams.length > 0) {
            const sortedKey = `${toolName}_${sortedParams.join('_')}`;
            if (keyExists(sortedKey)) {
              foundKey = sortedKey;
            } else {
              const sortedAltKey = sortedKey.replace(/_/g, '');
              if (keyExists(sortedAltKey)) {
                foundKey = sortedAltKey;
              }
            }
          }
        }
      }

      // Skip this tool if indicator key not found
      if (!foundKey) {
        // Log all available keys for debugging
        const allKeys = new Set();
        ohlcvData.forEach(row => {
          Object.keys(row).forEach(key => allKeys.add(key));
        });
        const allKeysArray = Array.from(allKeys);
        const toolKeys = allKeysArray.filter(k => 
          k.toUpperCase().includes(toolName.toUpperCase()) || 
          k.toUpperCase().includes('RETURNS') || 
          k.toUpperCase().includes('ROLLING') ||
          k.toUpperCase().includes('STD')
        );
        console.warn(`Indicator key not found for tool: ${toolName} with params:`, resolvedParams);
        console.warn(`  Tried keys: ${indicatorKey}, ${indicatorKey.replace(/_/g, '')}`);
        console.warn(`  Available ${toolName} keys:`, toolKeys);
        console.warn(`  All available keys (first 30):`, allKeysArray.slice(0, 30));
        continue; // Skip to next tool
      }

      const indicatorMetadata = indicatorsMetadata?.[foundKey];
      const displayName = indicatorMetadata?.display_name || toolConfig.display_name || toolName;

      // Extract values for this indicator
      // Ensure timestamp is in the same format as candlestick data (ISO string or Date object)
      // IMPORTANT: Keep null values - don't filter them out! Chart libraries can handle nulls
      // (they just won't plot those points). Indicators like RollingSTD_90 start with nulls
      // during warmup period, but we still want to plot the non-null values that come later.
      const values = ohlcvData
        .map(item => {
          const rawValue = item[foundKey];
          // Handle both number and string values
          let parsedValue = null;
          if (rawValue !== null && rawValue !== undefined) {
            if (typeof rawValue === 'number') {
              parsedValue = rawValue;
            } else if (typeof rawValue === 'string') {
              parsedValue = parseFloat(rawValue);
            } else {
              parsedValue = parseFloat(rawValue);
            }
            // Check if parsing resulted in NaN - convert to null (chart can handle nulls)
            if (isNaN(parsedValue)) {
              parsedValue = null;
            }
          }
          
          // Ensure timestamp is in consistent format (ISO string)
          let timestamp = item.timestamp;
          if (timestamp instanceof Date) {
            timestamp = timestamp.toISOString();
          } else if (typeof timestamp === 'string') {
            // Already a string, use as-is
            timestamp = timestamp;
          } else if (typeof timestamp === 'number') {
            // Convert number to ISO string
            timestamp = new Date(timestamp).toISOString();
          }
          
          return {
            timestamp: timestamp,
            value: parsedValue
          };
        });
        // DON'T filter out null values - keep them so chart can plot non-null values
        // Chart libraries handle nulls by simply not plotting those points

      // Add indicator to list if we have at least some data points (even if some are null)
      // Check if there's at least one non-null value
      const hasValidValues = values.some(item => item.value !== null && !isNaN(item.value));
      
      if (values.length > 0 && hasValidValues) {
        const validCount = values.filter(item => item.value !== null && !isNaN(item.value)).length;
        console.log(`✓ Adding indicator: ${foundKey} (${displayName}) - ${validCount}/${values.length} valid values`);
        indicatorList.push({
          toolName: displayName,
          enabled: true,
          subchart: toolConfig.subchart || indicatorMetadata?.subchart || false,
          style: toolConfig.style || indicatorMetadata || {
            color: '#3B82F6',
            line_width: 2,
          },
          values: values, // Keep all values including nulls - chart will handle them
          indicatorKey: foundKey,
        });
      } else {
        // Check if the key exists but all values are null/NaN
        const hasKey = ohlcvData.some(item => item[foundKey] !== undefined);
        if (hasKey) {
          const sampleValues = ohlcvData.slice(0, 10).map(item => ({
            timestamp: item.timestamp,
            rawValue: item[foundKey],
            type: typeof item[foundKey],
            parsedValue: item[foundKey] !== null && item[foundKey] !== undefined ? parseFloat(item[foundKey]) : null
          }));
          console.warn(`⚠ Indicator key ${foundKey} exists but all values are null/NaN. Sample:`, sampleValues);
        } else {
          console.warn(`✗ Indicator key ${foundKey} not found in data`);
        }
      }
    }

    console.log(`📊 Chart indicators prepared: ${indicatorList.length} indicators`, {
      indicators: indicatorList.map(ind => ({
        name: ind.toolName,
        key: ind.indicatorKey,
        valuesCount: ind.values.length,
        enabled: ind.enabled,
        subchart: ind.subchart,
        firstValue: ind.values[0],
        lastValue: ind.values[ind.values.length - 1]
      }))
    });
    
    return indicatorList;
  }, [strategy, backtest, indicatorsMetadata, ohlcvData]);

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
            onClick={() => navigate(backNavHref)}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            {backNavLabel}
          </button>
        </div>
      </div>
    );
  }

  if (backtest.status === 'running' || backtest.status === 'pending') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">
          <p className="text-gray-600">
            Backtest is still running. Results will appear here once it completes.
          </p>
          <button
            type="button"
            onClick={() => loadData()}
            className="mt-4 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Refresh now
          </button>
          <button
            onClick={() => navigate(backNavHref)}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            {backNavLabel}
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
            onClick={() => navigate(backNavHref)}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            {backNavLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(backNavHref)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          {backNavLabel}
        </button>
        {standalone && (
          <div className="flex items-center gap-2">
            {typeof onDeleteRun === 'function' && (
              <button
                type="button"
                onClick={onDeleteRun}
                disabled={recalculateDisabled}
                title={recalculateDisabled ? 'Wait for the current run to finish' : 'Delete this stored run'}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete run
              </button>
            )}
            {typeof onRecalculate === 'function' && (
              <button
                type="button"
                onClick={onRecalculate}
                disabled={recalculateDisabled}
                title={
                  recalculateDisabled
                    ? 'Wait for the current run to finish or for recalculate to complete'
                    : 'Re-run with the same saved settings (no configuration step)'
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-4 h-4" />
                Recalculate
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {ticker} - {strategy.name}
        </h1>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>Backtest: {backtest.name || `#${backtest.id}`}</span>
          <span>•</span>
          <span>Modes: {positionModeRunLabel(backtest)}</span>
          <span>•</span>
          <span>Status: <span className={`font-medium ${backtest.status === 'completed' ? 'text-green-600' : backtest.status === 'failed' ? 'text-red-600' : 'text-yellow-600'}`}>{backtest.status}</span></span>
        </div>
      </div>

      <BacktestParametersPanel backtest={backtest} />

      {/* Statistics Cards with Tabs */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Performance Metrics</h2>
          {positionModesAvailable(backtest).length > 1 ? (
            <div className="flex gap-2">
              {positionModesAvailable(backtest).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPositionModeTab(mode)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    positionModeTab === mode
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>
          ) : (
            <span className="text-sm text-gray-600">
              <strong>{positionModesAvailable(backtest)[0].toUpperCase()}</strong> only
            </span>
          )}
        </div>

        {currentStats && Object.keys(currentStats).length > 0 ? (
          <>
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
              title="Sharpe Ratio"
              value={currentStats.sharpe_ratio !== null && currentStats.sharpe_ratio !== undefined 
                ? (typeof currentStats.sharpe_ratio === 'number' 
                  ? currentStats.sharpe_ratio.toFixed(2) 
                  : parseFloat(currentStats.sharpe_ratio).toFixed(2))
                : 'N/A'}
              unit=""
              description="Risk-adjusted return measure"
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
              description="Maximum peak-to-trough decline"
              icon={TrendingDown}
            />
          </div>
          {backtest.hedge_enabled &&
            currentStats.strategy_only_metrics &&
            Object.keys(currentStats.strategy_only_metrics).length > 0 && (
              <div className="mt-6 border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Strategy only vs strategy + hedge
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Cards above reflect the <strong>strategy + hedge</strong> run (trades saved to this backtest).
                  The left column is a baseline pass <strong>without</strong> the VIX sleeve split for{' '}
                  <strong>{ticker}</strong> ({positionModeTab.toUpperCase()}).
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                    <h4 className="font-medium text-slate-800 mb-3">Strategy only (baseline)</h4>
                    <ul className="space-y-2 text-gray-700">
                      <li>Total return: {formatPercentage(currentStats.strategy_only_metrics.total_return)}</li>
                      <li>Total PnL: {formatCurrency(currentStats.strategy_only_metrics.total_pnl)}</li>
                      <li>Trades: {currentStats.strategy_only_metrics.total_trades ?? '—'}</li>
                      <li>
                        Win rate:{' '}
                        {currentStats.strategy_only_metrics.win_rate != null
                          ? formatPercentage(currentStats.strategy_only_metrics.win_rate)
                          : 'N/A'}
                      </li>
                      <li>
                        Max drawdown:{' '}
                        {currentStats.strategy_only_metrics.max_drawdown != null
                          ? formatPercentage(currentStats.strategy_only_metrics.max_drawdown)
                          : 'N/A'}
                      </li>
                      <li>
                        Sharpe:{' '}
                        {currentStats.strategy_only_metrics.sharpe_ratio != null
                          ? Number(currentStats.strategy_only_metrics.sharpe_ratio).toFixed(2)
                          : 'N/A'}
                      </li>
                    </ul>
                  </div>
                  <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
                    <h4 className="font-medium text-blue-900 mb-3">Strategy + hedge (primary)</h4>
                    <ul className="space-y-2 text-gray-800">
                      <li>Total return: {formatPercentage(currentStats.total_return)}</li>
                      <li>Total PnL: {formatCurrency(currentStats.total_pnl)}</li>
                      <li>Trades: {currentStats.total_trades ?? '—'}</li>
                      <li>
                        Win rate:{' '}
                        {currentStats.win_rate != null ? formatPercentage(currentStats.win_rate) : 'N/A'}
                      </li>
                      <li>
                        Max drawdown:{' '}
                        {currentStats.max_drawdown != null ? formatPercentage(currentStats.max_drawdown) : 'N/A'}
                      </li>
                      <li>
                        Sharpe:{' '}
                        {currentStats.sharpe_ratio != null
                          ? Number(currentStats.sharpe_ratio).toFixed(2)
                          : 'N/A'}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm font-medium">
              No statistics available for {positionModeTab.toUpperCase()} trades
            </p>
          </div>
        )}
      </div>

      {/* Equity Curve Chart */}
      {(() => {
        // Get equity curve data from stats_by_mode structure
        // Backend provides equity_curve_x and equity_curve_y arrays
        const equityCurveX = currentStats?.equity_curve_x || [];
        const equityCurveY = currentStats?.equity_curve_y || [];

        // Fallback: if x/y arrays not available, try equity_curve array
        let equityCurveData = [];
        if (equityCurveX.length > 0 && equityCurveY.length > 0) {
          equityCurveData = equityCurveX.map((timestamp, index) => ({
            x: new Date(timestamp).getTime(),
            y: parseFloat(equityCurveY[index] || 0),
          })).filter(point => !isNaN(point.x) && !isNaN(point.y));
        } else if (currentStats?.equity_curve && Array.isArray(currentStats.equity_curve)) {
          equityCurveData = currentStats.equity_curve
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
        }
        
        if (equityCurveData.length === 0) {
          return null;
        }

        const nSeries = 1 + (strategyOnlySeriesForChart ? 1 : 0);
        const colors = ['#3B82F6'];
        if (strategyOnlySeriesForChart) colors.push('#64748B');
        
        return (
          <div className="mb-6 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Equity Curve ({positionModeTab.toUpperCase()})
            </h2>
            {backtest.hedge_enabled && strategyOnlySeriesForChart && (
              <p className="text-sm text-gray-600 mb-3">
                Blue = strategy + VIX sleeve; slate = strategy-only baseline.
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
                  text: `Equity Curve - ${ticker} (${positionModeTab.toUpperCase()})`,
                  align: 'left',
                },
                colors,
                stroke: { width: Array(nSeries).fill(2), curve: 'straight' },
                legend: { show: nSeries > 1, position: 'top' },
                tooltip: {
                  x: {
                    format: 'dd MMM yyyy'
                  },
                },
              }}
              series={(() => {
                const primaryName =
                  backtest.hedge_enabled && strategyOnlySeriesForChart ? 'Strategy + hedge' : 'Equity';
                const out = [{ name: primaryName, data: equityCurveData }];
                if (strategyOnlySeriesForChart) {
                  out.push({ name: 'Strategy only', data: strategyOnlySeriesForChart });
                }
                return out;
              })()}
              type="line"
              height={350}
            />
          </div>
        );
      })()}

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
      {totalFilteredCount > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Trading History ({positionModeTab.toUpperCase()})</h2>
            <ExportTableToolbar
              onExportCsv={handleExportSymbolTradesCsv}
              onExportJson={handleExportSymbolTradesJson}
              csvLabel="Export all trades (CSV)"
              jsonLabel="Export all trades (JSON)"
              disabled={backtest?.status === 'running'}
              loading={exportingSymbolTrades}
            />
          </div>

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
                {chronologicalSymbolTradeRows.map(({ key, rowType, trade }) => {
                  const positionType = trade.trade_type === 'buy' ? 'Long' : 'Short';
                  const maxDrawdown = trade.max_drawdown;
                  const investedCell = () => {
                    const independentBetAmount = trade.metadata?.independent_bet_amount;
                    if (independentBetAmount !== undefined && independentBetAmount !== null) {
                      return formatCurrency(parseFloat(independentBetAmount));
                    }
                    const betAmount = trade.metadata?.bet_amount;
                    if (betAmount !== undefined && betAmount !== null) {
                      return formatCurrency(parseFloat(betAmount));
                    }
                    if (trade.entry_price && trade.quantity) {
                      return formatCurrency(parseFloat(trade.entry_price) * parseFloat(trade.quantity));
                    }
                    return 'N/A';
                  };

                  if (rowType === 'entry') {
                    return (
                      <tr key={key} className="hover:bg-gray-50">
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
                        <td className="px-4 py-3 text-sm text-gray-900">{investedCell()}</td>
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
                      <td className="px-4 py-3 text-sm text-gray-900">{investedCell()}</td>
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
                        {maxDrawdown !== null ? formatPercentage(maxDrawdown) : 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
