/**
 * Backtest Configuration Component
 * Allows users to configure and start a new backtest
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Play, Plus, Trash2 } from 'lucide-react';
import { getStrategies } from '../data/strategies';
import { getSymbolDetails } from '../data/symbols';
import { createBacktest } from '../data/backtests';
import { marketDataAPI } from '../data/api';
import { getBrokers } from '../data/liveTrading';
import TaskProgress from './TaskProgress';

export default function BacktestConfig({ onBacktestCreated, defaultStrategyId = null }) {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [validatingTicker, setValidatingTicker] = useState(false);
  const [taskId, setTaskId] = useState(null);
  const [showProgress, setShowProgress] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [selectedSymbols, setSelectedSymbols] = useState([]); // Array of ticker strings
  const [tickerInput, setTickerInput] = useState('');
  const [selectAllActive, setSelectAllActive] = useState(false);
  const [randomCountMode, setRandomCountMode] = useState(false);
  const [randomCount, setRandomCount] = useState(10);
  const [randomSelectedSymbols, setRandomSelectedSymbols] = useState([]);
  const [splitRatio, setSplitRatio] = useState(0.7);
  const [initialCapital, setInitialCapital] = useState(10000.0);
  const [betSizePercentage, setBetSizePercentage] = useState(100.0);
  const [strategyParameters, setStrategyParameters] = useState({});
  
  // Broker filtering state
  const [useBrokerFilter, setUseBrokerFilter] = useState(false);
  const [brokers, setBrokers] = useState([]);
  const [selectedBroker, setSelectedBroker] = useState(null);
  const [brokerExchangeCode, setBrokerExchangeCode] = useState('');

  useEffect(() => {
    if (showModal) {
      loadData();
    }
  }, [showModal]);


  const loadData = async () => {
    setLoading(true);
    try {
      const [strategiesData, brokersData] = await Promise.all([
        getStrategies(),
        getBrokers(),
      ]);
      setStrategies(strategiesData);
      setBrokers(brokersData || []);
      
      // If defaultStrategyId is provided, automatically select it
      if (defaultStrategyId) {
        const strategy = strategiesData.find(s => s.id === defaultStrategyId || s.id === parseInt(defaultStrategyId));
        if (strategy) {
          setSelectedStrategy(strategy);
          setStrategyParameters(strategy.default_parameters || {});
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStrategySelect = (strategyId) => {
    const strategy = strategies.find(s => s.id === strategyId);
    setSelectedStrategy(strategy);
    // Initialize parameters with default values
    setStrategyParameters(strategy?.default_parameters || {});
  };

  const handleAddTicker = async () => {
    const ticker = tickerInput.trim().toUpperCase();
    if (!ticker) return;
    
    // Check if already added
    if (selectedSymbols.includes(ticker)) {
      alert(`${ticker} is already in the list`);
      setTickerInput('');
      return;
    }
    
    setValidatingTicker(true);
    try {
      // Validate ticker by fetching symbol details
      // Backend will validate broker linkage when creating the backtest
      const symbol = await getSymbolDetails(ticker);
      if (symbol && symbol.status === 'active') {
        setSelectedSymbols(prev => [...prev, ticker]);
        setTickerInput('');
      } else {
        alert(`${ticker} is not an active symbol. Only active symbols can be added.`);
      }
    } catch (error) {
      console.error('Error validating ticker:', error);
      alert(`${ticker} is not a valid symbol or is not active.`);
    } finally {
      setValidatingTicker(false);
    }
  };

  const handleRemoveTicker = (ticker) => {
    setSelectedSymbols(prev => prev.filter(t => t !== ticker));
    setSelectAllActive(false);
  };

  const handleSelectAllActive = () => {
    if (selectAllActive) {
      setSelectedSymbols([]);
      setSelectAllActive(false);
    } else {
      // Just set the flag - will fetch active tickers when starting backtest
      setSelectAllActive(true);
      setRandomCountMode(false); // Disable random mode when selecting all
    }
  };

  const handleRandomCountMode = () => {
    if (randomCountMode) {
      setRandomSelectedSymbols([]);
      setRandomCountMode(false);
    } else {
      setRandomCountMode(true);
      setSelectAllActive(false); // Disable select all when using random mode
      setSelectedSymbols([]); // Clear manually selected symbols
    }
  };

  const handleSelectRandomSymbols = async () => {
    if (randomCount <= 0) {
      alert('Please enter a valid number greater than 0');
      return;
    }

    setLoading(true);
    try {
      // Use backend endpoint to get random symbols (much more efficient than fetching all)
      // Pass broker_id if broker filtering is enabled
      const brokerId = useBrokerFilter && selectedBroker ? selectedBroker.id : null;
      const response = await marketDataAPI.getRandomSymbols(randomCount, 'active', null, brokerId);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch random symbols');
      }

      const data = response.data;
      if (!data || !data.results || data.results.length === 0) {
        const message = brokerId 
          ? 'No active symbols found linked to this broker'
          : 'No active symbols found';
        alert(message);
        setLoading(false);
        return;
      }

      // Extract tickers from the random symbols returned by the backend
      const selected = data.results.map(s => s.ticker);
      setRandomSelectedSymbols(selected);

      // If requested count exceeds available symbols, show a message
      if (data.total_available && randomCount > data.total_available) {
        alert(`Only ${data.total_available} symbols available. Selected ${selected.length} symbols.`);
      }
    } catch (error) {
      console.error('Error fetching random symbols:', error);
      alert('Failed to fetch random symbols: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const updateParameter = (key, value) => {
    setStrategyParameters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const [pendingBacktest, setPendingBacktest] = useState(null);

  const handleBacktestCreated = (backtest) => {
    // Store backtest info for navigation after task completes
    setPendingBacktest(backtest);
    // Don't navigate immediately - wait for task to complete
  };

  const handleTaskComplete = (data) => {
    setShowProgress(false);
    setTaskId(null);
    setShowModal(false);
    resetForm();
    
    // Navigate to backtest detail page and refresh when task completes
    if (data.status === 'completed' && pendingBacktest && onBacktestCreated) {
      // Navigate to the backtest detail page
      onBacktestCreated(pendingBacktest);
      // The detail page will refresh automatically when loaded
      setPendingBacktest(null);
    } else if (data.status === 'failed') {
      // If failed, still navigate so user can see the error
      if (pendingBacktest && onBacktestCreated) {
        onBacktestCreated(pendingBacktest);
        setPendingBacktest(null);
      }
    }
  };

  const handleTaskClose = () => {
    setShowProgress(false);
    setTaskId(null);
  };

  const handleCreateBacktest = async () => {
    if (!selectedStrategy) {
      alert('Please select a strategy');
      return;
    }

    let symbolTickers = [];
    let brokerId = null;
    let exchangeCode = null;

    // Determine which symbols to use based on selection mode
    // All symbol filtering and validation is done in the backend using ORM
    if (useBrokerFilter && selectedBroker) {
      // Broker-based filtering - backend will handle all ORM filtering
      brokerId = selectedBroker.id;
      if (brokerExchangeCode) {
        exchangeCode = brokerExchangeCode;
      }
      
      // If specific symbols selected, send them (backend will validate they're linked to broker)
      if (selectedSymbols.length > 0) {
        symbolTickers = selectedSymbols;
      } else if (selectAllActive) {
        // Empty array means "select all" - backend will fetch all broker symbols
        symbolTickers = [];
      } else if (randomCountMode && randomSelectedSymbols.length > 0) {
        // Use randomly selected symbols (backend will validate)
        symbolTickers = randomSelectedSymbols;
      } else {
        // No symbols selected
        alert('Please select at least one symbol from the broker, or use "Select All" or random selection');
        return;
      }
    } else if (selectAllActive) {
      // If "Select All Active" is checked, send empty array (backend will fetch all active symbols)
      symbolTickers = [];
    } else if (randomCountMode) {
      // Use randomly selected symbols
      if (randomSelectedSymbols.length === 0) {
        alert('Please click "Select Random Symbols" to generate random symbols first');
        return;
      }
      symbolTickers = randomSelectedSymbols;
    } else {
      // Use manually selected symbols
      if (selectedSymbols.length === 0) {
        alert('Please add at least one symbol, select "Select All Active", or use random selection');
        return;
      }
      symbolTickers = [...selectedSymbols];
    }

    setCreating(true);
    try {
      // Get current date for end_date, and a very old date for start_date to get all data
      const endDate = new Date().toISOString();
      const startDate = new Date('1900-01-01').toISOString(); // Very old date to get all available data

      const backtestData = {
        name: name || undefined,
        strategy_id: selectedStrategy.id,
        symbol_tickers: symbolTickers,
        start_date: startDate,
        end_date: endDate,
        split_ratio: splitRatio,
        initial_capital: initialCapital,
        bet_size_percentage: betSizePercentage,
        strategy_parameters: strategyParameters,
      };
      
      // Add broker filtering parameters if broker mode is enabled
      if (useBrokerFilter && brokerId) {
        backtestData.broker_id = brokerId;
        if (exchangeCode) {
          backtestData.exchange_code = exchangeCode;
        }
      }

      const backtest = await createBacktest(backtestData);
      
      // Capture task_id if available and show progress
      if (backtest.task_id) {
        setTaskId(backtest.task_id);
        setShowProgress(true);
        // Close modal - progress will show in overlay
        setShowModal(false);
      }
      
      // Store backtest info for navigation after task completion
      // Don't navigate immediately - wait for task to complete
      handleBacktestCreated(backtest);
    } catch (error) {
      console.error('Error creating backtest:', error);
      alert('Failed to create backtest: ' + (error.message || 'Unknown error'));
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setName('');
    setSelectedStrategy(null);
    setSelectedSymbols([]);
    setTickerInput('');
    setSelectAllActive(false);
    setRandomCountMode(false);
    setRandomCount(10);
    setRandomSelectedSymbols([]);
    setSplitRatio(0.7);
    setInitialCapital(10000.0);
    setBetSizePercentage(100.0);
    setStrategyParameters({});
    setUseBrokerFilter(false);
    setSelectedBroker(null);
    setBrokerExchangeCode('');
  };

  return (
    <>
      {/* Task Progress Overlay */}
      {showProgress && taskId && (
        <TaskProgress
          taskId={taskId}
          onComplete={handleTaskComplete}
          onClose={handleTaskClose}
        />
      )}

      <button
        onClick={() => setShowModal(true)}
        className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium flex items-center gap-2"
      >
        <Play className="w-5 h-5" />
        Run Backtest
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Configure Backtest</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <div className="space-y-6">
                {/* Backtest Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Backtest Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., SMA Crossover Test - Jan 2024"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Strategy Selection */}
                {!defaultStrategyId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Strategy <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedStrategy?.id || ''}
                      onChange={(e) => handleStrategySelect(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Select a strategy</option>
                      {strategies.map((strategy) => (
                        <option key={strategy.id} value={strategy.id}>
                          {strategy.name}
                        </option>
                      ))}
                    </select>
                    {selectedStrategy && (
                      <div className="mt-2 bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-700">{selectedStrategy.description_short}</p>
                      </div>
                    )}
                  </div>
                )}
                {defaultStrategyId && selectedStrategy && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Strategy
                    </label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                      <p className="text-gray-900 font-medium">{selectedStrategy.name}</p>
                      {selectedStrategy.description_short && (
                        <p className="text-sm text-gray-600 mt-1">{selectedStrategy.description_short}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Broker Filtering (Optional) */}
                <div className="border-t pt-4">
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={useBrokerFilter}
                      onChange={(e) => {
                        setUseBrokerFilter(e.target.checked);
                        if (!e.target.checked) {
                          setSelectedBroker(null);
                          setBrokerExchangeCode('');
                        }
                      }}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Filter by Broker (Optional)</span>
                  </label>
                  
                  {useBrokerFilter && (
                    <div className="space-y-4 ml-6 p-4 bg-gray-50 rounded-lg">
                      {/* Broker Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Broker <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={selectedBroker?.id || ''}
                          onChange={(e) => {
                            const broker = brokers.find(b => b.id === parseInt(e.target.value));
                            setSelectedBroker(broker || null);
                            setBrokerExchangeCode('');
                            setSelectedSymbols([]);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="">Select a broker</option>
                          {brokers.map((broker) => (
                            <option key={broker.id} value={broker.id}>
                              {broker.name} ({broker.code})
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {selectedBroker && (
                        <>
                          {/* Exchange Filter (Optional) */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Exchange Filter (Optional)
                            </label>
                            <input
                              type="text"
                              value={brokerExchangeCode}
                              onChange={(e) => {
                                setBrokerExchangeCode(e.target.value);
                                setSelectedSymbols([]);
                              }}
                              placeholder="e.g., NASDAQ, NYSE (leave empty for all exchanges)"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          </div>
                          
                          {/* Info message */}
                          {selectedBroker && (
                            <div className="text-sm text-gray-600">
                              Symbol filtering will be handled by the backend when creating the backtest.
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Symbols Selection */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Symbols <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectAllActive}
                          onChange={handleSelectAllActive}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700 font-medium">Select All Active</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={randomCountMode}
                          onChange={handleRandomCountMode}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700 font-medium">Random Selection</span>
                      </label>
                    </div>
                  </div>
                  
                  {!selectAllActive && !randomCountMode && (
                    <>
                      <div className="flex gap-2 mb-3">
                        <input
                          type="text"
                          value={tickerInput}
                          onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleAddTicker();
                            }
                          }}
                          placeholder="Enter ticker (e.g., AAPL)"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          disabled={validatingTicker}
                        />
                        <button
                          type="button"
                          onClick={handleAddTicker}
                          disabled={validatingTicker || !tickerInput.trim()}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {validatingTicker ? (
                            'Validating...'
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              Add
                            </>
                          )}
                        </button>
                      </div>
                      
                      {selectedSymbols.length > 0 && (
                        <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                          <div className="flex flex-wrap gap-2">
                            {selectedSymbols.map((ticker) => (
                              <span
                                key={ticker}
                                className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 text-primary-700 rounded-lg text-sm"
                              >
                                {ticker}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTicker(ticker)}
                                  className="text-primary-600 hover:text-primary-800"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedSymbols.length === 0 && (
                        <p className="text-sm text-gray-500 italic">
                          No symbols added. Enter a ticker and click "Add" to add symbols.
                        </p>
                      )}
                    </>
                  )}
                  
                  {/* Random Count Mode */}
                  {randomCountMode && (
                    <div className="mb-4 p-4 border border-gray-300 rounded-lg bg-gray-50">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <label className="text-sm text-gray-700 font-medium">
                            Number of symbols:
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={randomCount}
                            onChange={(e) => setRandomCount(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                          <button
                            type="button"
                            onClick={handleSelectRandomSymbols}
                            disabled={loading || randomCount <= 0}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          >
                            {loading ? 'Loading...' : useBrokerFilter && selectedBroker ? 'Select Random from Broker' : 'Select Random Symbols'}
                          </button>
                        </div>
                        
                        {randomSelectedSymbols.length > 0 && (
                          <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-white">
                            <p className="text-sm text-gray-600 mb-2">
                              Selected {randomSelectedSymbols.length} random symbol(s):
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {randomSelectedSymbols.map((ticker) => (
                                <span
                                  key={ticker}
                                  className="inline-flex items-center px-3 py-1 bg-primary-50 text-primary-700 rounded-lg text-sm"
                                >
                                  {ticker}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {randomSelectedSymbols.length === 0 && (
                          <p className="text-sm text-gray-500 italic">
                            Click "Select Random Symbols" to randomly select {randomCount} {useBrokerFilter && selectedBroker ? 'symbol(s) from the broker' : 'active symbol(s)'}.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {selectAllActive && (
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                      <p className="text-sm text-blue-700">
                        {useBrokerFilter && selectedBroker ? (
                          <>
                            <strong>All available symbols</strong> from the selected broker{brokerExchangeCode ? ` on exchange ${brokerExchangeCode}` : ''} will be included in the backtest.
                          </>
                        ) : (
                          <>
                            <strong>All active symbols</strong> will be included in the backtest. Active tickers will be fetched when you start the backtest.
                          </>
                        )}
                      </p>
                    </div>
                  )}
                  
                  {selectedSymbols.length > 0 && !selectAllActive && !randomCountMode && (
                    <p className="mt-2 text-sm text-gray-600">
                      {selectedSymbols.length} symbol(s) selected
                    </p>
                  )}
                </div>

                {/* Split Ratio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Training/Test Split Ratio: {Math.round(splitRatio * 100)}% / {Math.round((1 - splitRatio) * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.1"
                    value={splitRatio}
                    onChange={(e) => setSplitRatio(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Initial Capital */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Initial Capital ($)
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={initialCapital}
                    onChange={(e) => setInitialCapital(parseFloat(e.target.value) || 10000.0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="10000.00"
                  />
                  <p className="mt-1 text-xs text-gray-500">Starting capital for the backtest</p>
                </div>

                {/* Bet Size Percentage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bet Size Per Trade (%): {betSizePercentage}%
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="100"
                    step="0.1"
                    value={betSizePercentage}
                    onChange={(e) => setBetSizePercentage(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <p className="mt-1 text-xs text-gray-500">Percentage of available capital to bet per trade (0.1% - 100%)</p>
                </div>

                {/* Strategy Parameters */}
                {selectedStrategy && Object.keys(selectedStrategy.default_parameters || {}).length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Strategy Parameters
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(selectedStrategy.default_parameters || {}).map(([key, defaultValue]) => (
                        <div key={key}>
                          <label className="block text-xs text-gray-600 mb-1 capitalize">
                            {key.replace(/_/g, ' ')}
                          </label>
                          <input
                            type={typeof defaultValue === 'number' ? 'number' : 'text'}
                            value={strategyParameters[key] !== undefined ? strategyParameters[key] : defaultValue}
                            onChange={(e) => {
                              const value = typeof defaultValue === 'number' ? parseFloat(e.target.value) : e.target.value;
                              updateParameter(key, value);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            step={typeof defaultValue === 'number' ? 'any' : undefined}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={creating}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateBacktest}
                    disabled={creating || !selectedStrategy || (!selectAllActive && !randomCountMode && selectedSymbols.length === 0) || (randomCountMode && randomSelectedSymbols.length === 0)}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {creating ? 'Creating...' : (
                      <>
                        <Play className="w-4 h-4" />
                        Start Backtest
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

