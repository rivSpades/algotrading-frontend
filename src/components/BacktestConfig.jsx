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
import { getBrokers, liveTradingAPI } from '../data/liveTrading';
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
  const [brokerSymbols, setBrokerSymbols] = useState([]); // Symbols available from broker
  const [loadingBrokerSymbols, setLoadingBrokerSymbols] = useState(false);

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
  
  // Load broker symbols when broker is selected
  useEffect(() => {
    if (useBrokerFilter && selectedBroker) {
      loadBrokerSymbols();
    } else {
      setBrokerSymbols([]);
    }
  }, [useBrokerFilter, selectedBroker, brokerExchangeCode]);
  
  const loadBrokerSymbols = async () => {
    if (!selectedBroker) return;
    
    setLoadingBrokerSymbols(true);
    try {
      // Fetch all broker symbols (with large page_size to get all at once)
      // The API returns paginated response, so we need to handle the results array
      const associationsResponse = await liveTradingAPI.brokers.getBrokerSymbols(selectedBroker.id, 1, '');
      if (associationsResponse.success) {
        // Handle paginated response structure: {count, next, previous, results: [...]}
        const responseData = associationsResponse.data || {};
        let associations = Array.isArray(responseData) ? responseData : (responseData.results || []);
        
        // If paginated and there are more pages, fetch all pages
        if (!Array.isArray(responseData) && responseData.next) {
          let nextPage = 2;
          let allAssociations = [...associations];
          let hasMore = responseData.next;
          
          while (hasMore && (responseData.count ? allAssociations.length < responseData.count : true)) {
            const nextResponse = await liveTradingAPI.brokers.getBrokerSymbols(selectedBroker.id, nextPage, '');
            if (nextResponse.success && nextResponse.data && nextResponse.data.results) {
              allAssociations = [...allAssociations, ...nextResponse.data.results];
              hasMore = nextResponse.data.next;
              nextPage++;
            } else {
              break;
            }
          }
          
          associations = allAssociations;
        }
        
        // Filter by exchange if provided
        if (brokerExchangeCode) {
          associations = associations.filter(a => 
            a.symbol_info?.exchange?.code === brokerExchangeCode
          );
        }
        
        // Get all symbols with at least one active flag (long_active or short_active)
        // The backend will handle filtering by position mode automatically
        const filtered = associations.filter(assoc => 
          assoc.long_active || assoc.short_active
        );
        
        setBrokerSymbols(filtered.map(a => a.symbol_info));
      }
    } catch (error) {
      console.error('Error loading broker symbols:', error);
      setBrokerSymbols([]);
    } finally {
      setLoadingBrokerSymbols(false);
    }
  };
  
  // Load broker symbols when broker is selected
  useEffect(() => {
    if (useBrokerFilter && selectedBroker) {
      loadBrokerSymbols();
    } else {
      setBrokerSymbols([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useBrokerFilter, selectedBroker, brokerExchangeCode]);

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
      const symbol = await getSymbolDetails(ticker);
      if (symbol && symbol.status === 'active') {
        // If broker filtering is enabled, check if symbol is linked to the broker
        if (useBrokerFilter && selectedBroker) {
          const isLinked = brokerSymbols.some(s => s.ticker === ticker);
          if (!isLinked) {
            alert(`${ticker} is not linked to broker ${selectedBroker.name}. Only symbols linked to this broker can be added.`);
            setValidatingTicker(false);
            return;
          }
        }
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
      let allSymbols = [];
      
      if (useBrokerFilter && selectedBroker) {
        // Reload broker symbols to ensure we have the latest data
        // Get broker's associated symbols directly (fetch all pages)
        const associationsResponse = await liveTradingAPI.brokers.getBrokerSymbols(selectedBroker.id, 1, '');
        if (associationsResponse.success) {
          // Handle paginated response structure: {count, next, previous, results: [...]}
          const responseData = associationsResponse.data || {};
          let associations = Array.isArray(responseData) ? responseData : (responseData.results || []);
          
          // If paginated and there are more pages, fetch all pages
          if (!Array.isArray(responseData) && responseData.next) {
            let nextPage = 2;
            let allAssociations = [...associations];
            let hasMore = responseData.next;
            
            while (hasMore && (responseData.count ? allAssociations.length < responseData.count : true)) {
              const nextResponse = await liveTradingAPI.brokers.getBrokerSymbols(selectedBroker.id, nextPage, '');
              if (nextResponse.success && nextResponse.data && nextResponse.data.results) {
                allAssociations = [...allAssociations, ...nextResponse.data.results];
                hasMore = nextResponse.data.next;
                nextPage++;
              } else {
                break;
              }
            }
            
            associations = allAssociations;
          }
          
          // Filter by exchange if provided
          if (brokerExchangeCode) {
            associations = associations.filter(a => 
              a.symbol_info?.exchange?.code === brokerExchangeCode
            );
          }
          
          // Get all symbols with at least one active flag (long_active or short_active)
          // The backend will handle filtering by position mode automatically
          const filtered = associations.filter(assoc => 
            assoc.long_active || assoc.short_active
          );
          
          allSymbols = filtered.map(a => a.symbol_info);
        }
        
        // Use broker symbols - these are already filtered by broker linkage
        if (allSymbols.length === 0) {
          alert('No symbols are linked to this broker with active trading flags (long_active or short_active). Please link symbols to the broker first and verify their capabilities.');
          setLoading(false);
          return;
        }
      } else {
        // Fetch all active symbols (no broker filtering)
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const response = await marketDataAPI.getSymbols('', page, null, 'active');
          if (response.success && response.data) {
            const symbols = response.data.results || [];
            allSymbols = [...allSymbols, ...symbols];
            
            // Check if there are more pages
            hasMore = response.data.next !== null && response.data.next !== undefined;
            page++;
          } else {
            hasMore = false;
          }
        }
      }

      if (allSymbols.length === 0) {
        alert(useBrokerFilter && selectedBroker 
          ? 'No symbols are linked to this broker. Please link symbols to the broker first.'
          : 'No active symbols found');
        setLoading(false);
        return;
      }

      if (randomCount > allSymbols.length) {
        alert(`Only ${allSymbols.length} ${useBrokerFilter && selectedBroker ? 'broker-linked ' : ''}symbols available. Selecting all.`);
        setRandomCount(allSymbols.length);
      }

      // Randomly select the specified number
      const shuffled = [...allSymbols].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, randomCount).map(s => s.ticker);
      setRandomSelectedSymbols(selected);
    } catch (error) {
      console.error('Error fetching symbols:', error);
      alert('Failed to fetch symbols: ' + (error.message || 'Unknown error'));
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
    if (useBrokerFilter && selectedBroker) {
      // Broker-based filtering - fetch symbols directly from API
      brokerId = selectedBroker.id;
      if (brokerExchangeCode) {
        exchangeCode = brokerExchangeCode;
      }
      
      // Fetch broker's associated symbols directly (fetch all pages)
      const associationsResponse = await liveTradingAPI.brokers.getBrokerSymbols(selectedBroker.id, 1, '');
      let availableBrokerSymbols = [];
      if (associationsResponse.success) {
        // Handle paginated response structure: {count, next, previous, results: [...]}
        const responseData = associationsResponse.data || {};
        let associations = Array.isArray(responseData) ? responseData : (responseData.results || []);
        
        // If paginated and there are more pages, fetch all pages
        if (!Array.isArray(responseData) && responseData.next) {
          let nextPage = 2;
          let allAssociations = [...associations];
          let hasMore = responseData.next;
          
          while (hasMore && (responseData.count ? allAssociations.length < responseData.count : true)) {
            const nextResponse = await liveTradingAPI.brokers.getBrokerSymbols(selectedBroker.id, nextPage, '');
            if (nextResponse.success && nextResponse.data && nextResponse.data.results) {
              allAssociations = [...allAssociations, ...nextResponse.data.results];
              hasMore = nextResponse.data.next;
              nextPage++;
            } else {
              break;
            }
          }
          
          associations = allAssociations;
        }
        
        // Filter by exchange if provided
        if (brokerExchangeCode) {
          associations = associations.filter(a => 
            a.symbol_info?.exchange?.code === brokerExchangeCode
          );
        }
        
        // Get all symbols with at least one active flag (long_active or short_active)
        const filtered = associations.filter(assoc => 
          assoc.long_active || assoc.short_active
        );
        
        availableBrokerSymbols = filtered.map(a => a.symbol_info);
      }
      
      // Get list of valid broker symbol tickers for validation
      const validBrokerTickers = new Set(availableBrokerSymbols.map(s => s.ticker));
      
      // If specific symbols selected, validate they're all linked to broker with active flags
      if (selectedSymbols.length > 0) {
        const invalidSymbols = selectedSymbols.filter(t => !validBrokerTickers.has(t));
        if (invalidSymbols.length > 0) {
          alert(`The following symbols are not linked to broker ${selectedBroker.name} with active trading flags (long_active or short_active): ${invalidSymbols.join(', ')}. Please remove them or link them to the broker first and verify their capabilities.`);
          setCreating(false);
          return;
        }
        symbolTickers = selectedSymbols;
      } else if (selectAllActive) {
        // Use all broker symbols (already filtered by broker linkage)
        if (availableBrokerSymbols.length === 0) {
          alert('No symbols are linked to this broker with active trading flags (long_active or short_active). Please link symbols to the broker first and verify their capabilities.');
          setCreating(false);
          return;
        }
        symbolTickers = availableBrokerSymbols.map(s => s.ticker);
      } else if (randomCountMode && randomSelectedSymbols.length > 0) {
        // Validate random symbols are all linked to broker with active flags
        const invalidSymbols = randomSelectedSymbols.filter(t => !validBrokerTickers.has(t));
        if (invalidSymbols.length > 0) {
          alert(`The following symbols are not linked to broker ${selectedBroker.name} with active trading flags: ${invalidSymbols.join(', ')}. Please select random symbols again.`);
          setCreating(false);
          return;
        }
        symbolTickers = randomSelectedSymbols;
      } else {
        // No symbols selected
        alert('Please select at least one symbol from the broker, or use "Select All" or random selection');
        setCreating(false);
        return;
      }
      
      if (symbolTickers.length === 0) {
        alert('No symbols available for the selected broker and filters');
        setCreating(false);
        return;
      }
    } else if (selectAllActive) {
      // If "Select All Active" is checked, fetch all active tickers
      setCreating(true);
      try {
        // Fetch all active symbols
        let allActiveTickers = [];
        let page = 1;
        let hasMore = true;
        const MAX_PAGES = 50; // Increased limit for "select all"
        
        while (hasMore && page <= MAX_PAGES) {
          const response = await marketDataAPI.getSymbols('', page, null, 'active');
          if (response.success && response.data) {
            const pageTickers = (response.data.results || [])
              .filter(s => s.status === 'active')
              .map(s => s.ticker);
            allActiveTickers = [...allActiveTickers, ...pageTickers];
            hasMore = !!response.data.next;
            page++;
          } else {
            hasMore = false;
          }
        }
        
        symbolTickers = allActiveTickers;
      } catch (error) {
        console.error('Error fetching all active symbols:', error);
        alert('Failed to fetch all active symbols. Please try again.');
        setCreating(false);
        return;
      }
    } else if (randomCountMode) {
      // Use randomly selected symbols
      if (randomSelectedSymbols.length === 0) {
        alert('Please click "Select Random Symbols" to generate random symbols first');
        return;
      }
      symbolTickers = randomSelectedSymbols;
    } else {
      // Use manually selected symbols
      symbolTickers = [...selectedSymbols];
    }

    if (symbolTickers.length === 0) {
      alert('Please add at least one symbol, select "Select All Active", or use random selection');
      setCreating(false);
      return;
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
    setBrokerSymbols([]);
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
                          setBrokerSymbols([]);
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
                          
                          {/* Available Symbols Info */}
                          {loadingBrokerSymbols ? (
                            <div className="text-sm text-gray-500">Loading broker symbols...</div>
                          ) : brokerSymbols.length > 0 ? (
                            <div className="text-sm text-gray-600">
                              {brokerSymbols.length} symbol(s) available for this broker and filters
                            </div>
                          ) : selectedBroker ? (
                            <div className="text-sm text-orange-600">
                              No symbols found for this broker with the selected filters
                            </div>
                          ) : null}
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

