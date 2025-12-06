/**
 * Strategy Symbol Detail Page Component
 * Shows strategy applied to a specific symbol with required indicators enabled and locked
 */

import { useParams, useNavigate, useLoaderData, useRevalidator } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, Lock, TrendingUp, TrendingDown } from 'lucide-react';
import { getStrategy } from '../data/strategies';
import { getSymbolDetails, getSymbolOHLCV } from '../data/symbols';
import { getSymbolAssignments, createAssignment } from '../data/tools';
import { getTools } from '../data/tools';
import CandlestickChart from '../components/CandlestickChart';
import StatisticsCard from '../components/StatisticsCard';

export default function StrategySymbolDetail() {
  const { id, ticker } = useParams();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const [strategy, setStrategy] = useState(null);
  const [symbol, setSymbol] = useState(null);
  const [ohlcv, setOhlcv] = useState([]);
  const [indicators, setIndicators] = useState({});
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(true);
  const [requiredTools, setRequiredTools] = useState([]);
  const [signals, setSignals] = useState([]); // Entry/exit signals

  useEffect(() => {
    loadData();
  }, [id, ticker]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [strategyData, symbolData, ohlcvData, toolsData, assignmentsData] = await Promise.all([
        getStrategy(id),
        getSymbolDetails(ticker),
        getSymbolOHLCV(ticker, 'daily', null, null, 1, 1000),
        getTools(),
        getSymbolAssignments(ticker),
      ]);

      setStrategy(strategyData);
      setSymbol(symbolData);
      setOhlcv(ohlcvData.results || []);
      setIndicators(ohlcvData.indicators || {});
      setStatistics(ohlcvData.statistics || {});

      // Process required tool configs from strategy
      if (strategyData.required_tool_configs && strategyData.required_tool_configs.length > 0) {
        await ensureRequiredTools(strategyData, toolsData, assignmentsData);
      }

      // Calculate entry/exit signals
      calculateSignals(strategyData, ohlcvData.results || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const ensureRequiredTools = async (strategy, tools, existingAssignments) => {
    if (!strategy.required_tool_configs) return;

    const requiredConfigs = [];
    const strategyParams = strategy.default_parameters || {};

    for (const toolConfig of strategy.required_tool_configs) {
      // Resolve parameters using parameter_mapping
      const resolvedParams = { ...toolConfig.parameters };
      if (toolConfig.parameter_mapping) {
        for (const [toolParam, strategyParam] of Object.entries(toolConfig.parameter_mapping)) {
          if (strategyParams[strategyParam] !== undefined) {
            resolvedParams[toolParam] = strategyParams[strategyParam];
          }
        }
      }

      // Find the tool
      const tool = tools.find(t => t.name === toolConfig.tool_name);
      if (!tool) {
        console.warn(`Tool ${toolConfig.tool_name} not found`);
        continue;
      }

      // Check if assignment already exists with these parameters
      const existingAssignment = existingAssignments.find(a => {
        if (a.tool.name !== toolConfig.tool_name) return false;
        const assignmentParams = a.parameters || {};
        return Object.keys(resolvedParams).every(key => assignmentParams[key] === resolvedParams[key]);
      });

      if (!existingAssignment) {
        // Create the required assignment
        try {
          const assignmentData = {
            tool_name: toolConfig.tool_name,
            parameters: resolvedParams,
            enabled: true,
            subchart: false,
            style: {
              color: toolConfig.color || '#3B82F6',
              line_width: 2,
            },
            is_global: true,
          };
          await createAssignment(assignmentData);
          console.log(`Created required tool assignment: ${toolConfig.tool_name}`, resolvedParams);
        } catch (error) {
          console.error(`Error creating required tool assignment: ${error}`);
        }
      }

      requiredConfigs.push({
        ...toolConfig,
        tool,
        resolvedParams,
        assignment: existingAssignment,
      });
    }

    setRequiredTools(requiredConfigs);
    // Refresh data after creating assignments
    if (requiredConfigs.some(c => !c.assignment)) {
      setTimeout(() => {
        revalidator.revalidate();
      }, 1000);
    }
  };

  const calculateSignals = (strategy, ohlcvData) => {
    if (!strategy || !ohlcvData || !ohlcvData.length) return;

    if (strategy.name === 'Simple Moving Average Crossover') {
      const fastPeriod = strategy.default_parameters?.fast_period || 20;
      const slowPeriod = strategy.default_parameters?.slow_period || 50;

      // Find SMA indicators in OHLCV data (indicators are embedded as columns)
      const fastSMAKey = `SMA_${fastPeriod}`;
      const slowSMAKey = `SMA_${slowPeriod}`;

      const signals = [];
      for (let i = 1; i < ohlcvData.length; i++) {
        const prevItem = ohlcvData[i - 1];
        const currItem = ohlcvData[i];

        const prevFast = prevItem[fastSMAKey] !== undefined && prevItem[fastSMAKey] !== null ? parseFloat(prevItem[fastSMAKey]) : null;
        const currFast = currItem[fastSMAKey] !== undefined && currItem[fastSMAKey] !== null ? parseFloat(currItem[fastSMAKey]) : null;
        const prevSlow = prevItem[slowSMAKey] !== undefined && prevItem[slowSMAKey] !== null ? parseFloat(prevItem[slowSMAKey]) : null;
        const currSlow = currItem[slowSMAKey] !== undefined && currItem[slowSMAKey] !== null ? parseFloat(currItem[slowSMAKey]) : null;

        if (prevFast === null || currFast === null || prevSlow === null || currSlow === null) {
          continue;
        }

        const timestamp = new Date(currItem.timestamp).getTime();
        const price = parseFloat(currItem.close);

        // Golden cross: fast crosses above slow (BUY signal)
        if (prevFast <= prevSlow && currFast > currSlow) {
          signals.push({
            timestamp,
            price,
            type: 'entry',
            signal: 'BUY',
          });
        }
        // Death cross: fast crosses below slow (SELL signal)
        else if (prevFast >= prevSlow && currFast < currSlow) {
          signals.push({
            timestamp,
            price,
            type: 'exit',
            signal: 'SELL',
          });
        }
      }

      setSignals(signals);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">Loading strategy and symbol data...</div>
      </div>
    );
  }

  if (!strategy || !symbol) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">
          <p className="text-gray-600">Strategy or symbol not found</p>
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
          {strategy.name} - {symbol.ticker}
        </h1>
        <p className="text-gray-600">{symbol.name || symbol.ticker}</p>
      </div>

      {/* Required Tools Info */}
      {requiredTools.length > 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded">
          <div className="flex items-start">
            <Lock className="w-5 h-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-800 mb-2">
                Required Indicators (Auto-enabled and Locked)
              </h3>
              <div className="space-y-2">
                {requiredTools.map((config, idx) => (
                  <div key={idx} className="text-sm text-blue-700">
                    <span className="font-medium">{config.display_name || config.tool_name}:</span>{' '}
                    {Object.entries(config.resolvedParams).map(([key, value]) => (
                      <span key={key} className="ml-2">
                        {key.replace(/_/g, ' ')}: {value}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Signals Summary */}
      {signals.length > 0 && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatisticsCard
            title="Entry Signals"
            value={signals.filter(s => s.type === 'entry').length}
            unit=""
            description="Total BUY signals generated"
            icon={TrendingUp}
          />
          <StatisticsCard
            title="Exit Signals"
            value={signals.filter(s => s.type === 'exit').length}
            unit=""
            description="Total SELL signals generated"
            icon={TrendingDown}
          />
        </div>
      )}

      {/* Chart with Entry/Exit Points */}
      {ohlcv.length > 0 && (
        <div className="mb-6">
          <CandlestickChart
            data={ohlcv}
            ticker={ticker}
            indicators={Object.values(indicators)}
            signals={signals}
          />
        </div>
      )}
    </div>
  );
}

