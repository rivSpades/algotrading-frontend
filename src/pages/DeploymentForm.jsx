/**
 * Deployment Creation Form
 * Multi-step form for creating live trading deployments
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Loader, AlertCircle } from 'lucide-react';
import { createDeployment } from '../data/liveTrading';
import { getBacktest } from '../data/backtests';
import { backtestsAPI } from '../data/backtests';
import { getBrokers } from '../data/liveTrading';
import { marketDataAPI } from '../data/api';
import { motion, AnimatePresence } from 'framer-motion';

export default function DeploymentForm() {
  const navigate = useNavigate();
  const { backtestId } = useParams(); // Optional: pre-select backtest
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Step 1: Backtest Selection
  const [backtests, setBacktests] = useState([]);
  const [selectedBacktest, setSelectedBacktest] = useState(null);
  const [positionMode, setPositionMode] = useState('all');
  
  // Step 2: Broker Selection
  const [brokers, setBrokers] = useState([]);
  const [selectedBroker, setSelectedBroker] = useState(null);
  
  // Step 3: Symbol Selection
  const [availableSymbols, setAvailableSymbols] = useState([]);
  const [selectedSymbols, setSelectedSymbols] = useState([]);
  const [symbolSelectionMode, setSymbolSelectionMode] = useState('individual'); // 'individual' or 'exchange'
  const [exchangeCode, setExchangeCode] = useState('');
  const [symbolSearch, setSymbolSearch] = useState('');
  
  // Step 4: Evaluation Criteria
  const [evaluationCriteria, setEvaluationCriteria] = useState({
    min_trades: 10,
    min_sharpe_ratio: 1.0,
    min_pnl: 0.0,
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedBacktest && selectedBroker) {
      loadAvailableSymbols();
    }
  }, [selectedBacktest, selectedBroker, positionMode]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [backtestsResponse, brokersData] = await Promise.all([
        backtestsAPI.getBacktests(1),
        getBrokers(),
      ]);
      
      if (backtestsResponse.success) {
        setBacktests(Array.isArray(backtestsResponse.data) ? backtestsResponse.data : backtestsResponse.data.results || []);
      }
      // Filter brokers - all brokers are shown, but only active ones for the deployment type will be usable
      setBrokers(brokersData || []);
      
      // Pre-select backtest if provided in URL
      if (backtestId) {
        try {
          const backtest = await getBacktest(backtestId);
          setSelectedBacktest(backtest);
        } catch (error) {
          console.error('Error loading backtest:', error);
        }
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      alert('Failed to load data: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSymbols = async () => {
    try {
      // Get broker's associated symbols
      const associationsResponse = await marketDataAPI.apiRequest(`/brokers/${selectedBroker.id}/symbols/`);
      if (associationsResponse.success) {
        const associations = associationsResponse.data || [];
        
        // Filter by position mode
        const filtered = associations.filter(assoc => {
          if (positionMode === 'all') {
            return assoc.long_active && assoc.short_active;
          } else if (positionMode === 'long') {
            return assoc.long_active;
          } else if (positionMode === 'short') {
            return assoc.short_active;
          }
          return false;
        });
        
        setAvailableSymbols(filtered.map(a => a.symbol_info));
      }
    } catch (error) {
      console.error('Error loading available symbols:', error);
    }
  };

  const handleNext = () => {
    if (step === 1 && !selectedBacktest) {
      alert('Please select a backtest');
      return;
    }
    if (step === 2 && !selectedBroker) {
      alert('Please select a broker');
      return;
    }
    if (step === 3 && selectedSymbols.length === 0 && symbolSelectionMode === 'individual') {
      alert('Please select at least one symbol');
      return;
    }
    if (step === 3 && symbolSelectionMode === 'exchange' && !exchangeCode.trim()) {
      alert('Please enter an exchange code');
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const deploymentData = {
        backtest_id: selectedBacktest.id,
        position_mode: positionMode,
        broker_id: selectedBroker.id,
        symbol_tickers: symbolSelectionMode === 'individual' ? selectedSymbols : [],
        exchange_code: symbolSelectionMode === 'exchange' ? exchangeCode : '',
        evaluation_criteria: evaluationCriteria,
      };

      const deployment = await createDeployment(deploymentData);
      navigate(`/deployments/${deployment.id}`);
    } catch (error) {
      console.error('Error creating deployment:', error);
      alert('Failed to create deployment: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const filteredSymbols = availableSymbols.filter(symbol =>
    symbol.ticker.toLowerCase().includes(symbolSearch.toLowerCase()) ||
    symbol.name?.toLowerCase().includes(symbolSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => navigate('/deployments')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Deployments
      </motion.button>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((stepNum) => (
            <div key={stepNum} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step >= stepNum
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step > stepNum ? <Check className="w-5 h-5" /> : stepNum}
                </div>
                <div className="mt-2 text-xs text-center text-gray-600">
                  {stepNum === 1 && 'Backtest'}
                  {stepNum === 2 && 'Broker'}
                  {stepNum === 3 && 'Symbols'}
                  {stepNum === 4 && 'Criteria'}
                </div>
              </div>
              {stepNum < 4 && (
                <div
                  className={`h-1 flex-1 mx-2 ${
                    step > stepNum ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="bg-white rounded-lg shadow-md p-6"
      >
        {/* Step 1: Backtest Selection */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Backtest</h2>
            <p className="text-gray-600 mb-6">Choose a backtest to deploy</p>

            <div className="space-y-4 mb-6">
              {backtests.map((backtest) => (
                <motion.div
                  key={backtest.id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedBacktest(backtest)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    selectedBacktest?.id === backtest.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{backtest.strategy_name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(backtest.start_date).toLocaleDateString()} - {new Date(backtest.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    {selectedBacktest?.id === backtest.id && (
                      <Check className="w-6 h-6 text-blue-600" />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {selectedBacktest && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position Mode
                </label>
                <div className="flex gap-4">
                  {['all', 'long', 'short'].map((mode) => (
                    <label key={mode} className="flex items-center gap-2">
                      <input
                        type="radio"
                        value={mode}
                        checked={positionMode === mode}
                        onChange={(e) => setPositionMode(e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="capitalize">{mode}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Broker Selection */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Broker</h2>
            <p className="text-gray-600 mb-6">Choose a broker for this deployment (paper trading deployments require active paper trading credentials)</p>

            <div className="space-y-4">
              {brokers.map((broker) => {
                // Check if broker is active for paper trading (since all deployments start as paper)
                const isActiveForPaper = broker.paper_trading_active && broker.has_paper_trading;
                const isDisabled = !isActiveForPaper;
                
                return (
                  <motion.div
                    key={broker.id}
                    whileHover={!isDisabled ? { scale: 1.02 } : {}}
                    onClick={() => !isDisabled && setSelectedBroker(broker)}
                    className={`p-4 border-2 rounded-lg transition-colors ${
                      isDisabled
                        ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                        : selectedBroker?.id === broker.id
                        ? 'border-blue-600 bg-blue-50 cursor-pointer'
                        : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-900">{broker.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">Code: {broker.code}</p>
                        <div className="flex gap-4 mt-2 text-xs">
                          <span className={broker.paper_trading_active ? 'text-green-600 font-medium' : broker.has_paper_trading ? 'text-yellow-600' : 'text-gray-400'}>
                            Paper: {broker.paper_trading_active ? 'Active' : broker.has_paper_trading ? 'Not Tested' : 'Not Configured'}
                          </span>
                          <span className={broker.real_money_active ? 'text-green-600 font-medium' : broker.has_real_money ? 'text-yellow-600' : 'text-gray-400'}>
                            Real Money: {broker.real_money_active ? 'Active' : broker.has_real_money ? 'Not Tested' : 'Not Configured'}
                          </span>
                        </div>
                        {isDisabled && (
                          <p className="text-xs text-red-600 mt-2">
                            Paper trading credentials must be tested and active
                          </p>
                        )}
                      </div>
                      {selectedBroker?.id === broker.id && !isDisabled && (
                        <Check className="w-6 h-6 text-blue-600" />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Symbol Selection */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Symbols</h2>
            <p className="text-gray-600 mb-6">
              Choose symbols that support {positionMode.toUpperCase()} mode on {selectedBroker?.name}
            </p>

            {availableSymbols.length === 0 ? (
              <div className="text-center py-8 bg-yellow-50 rounded-lg border border-yellow-200">
                <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
                <p className="text-yellow-800">
                  No symbols available for {positionMode.toUpperCase()} mode on this broker.
                  Please link symbols to the broker first.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Selection Mode</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="individual"
                        checked={symbolSelectionMode === 'individual'}
                        onChange={(e) => setSymbolSelectionMode(e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span>Individual Symbols</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="exchange"
                        checked={symbolSelectionMode === 'exchange'}
                        onChange={(e) => setSymbolSelectionMode(e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span>By Exchange</span>
                    </label>
                  </div>
                </div>

                {symbolSelectionMode === 'individual' ? (
                  <div>
                    <input
                      type="text"
                      value={symbolSearch}
                      onChange={(e) => setSymbolSearch(e.target.value)}
                      placeholder="Search symbols..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-2">
                      {filteredSymbols.map((symbol) => {
                        const isSelected = selectedSymbols.includes(symbol.ticker);
                        return (
                          <label
                            key={symbol.ticker}
                            className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedSymbols([...selectedSymbols, symbol.ticker]);
                                } else {
                                  setSelectedSymbols(selectedSymbols.filter(t => t !== symbol.ticker));
                                }
                              }}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="font-medium">{symbol.ticker}</span>
                            <span className="text-gray-500 text-sm">{symbol.name}</span>
                          </label>
                        );
                      })}
                    </div>
                    {selectedSymbols.length > 0 && (
                      <p className="mt-2 text-sm text-gray-600">
                        {selectedSymbols.length} symbol(s) selected
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exchange Code
                    </label>
                    <input
                      type="text"
                      value={exchangeCode}
                      onChange={(e) => setExchangeCode(e.target.value)}
                      placeholder="e.g., NASDAQ, NYSE"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 4: Evaluation Criteria */}
        {step === 4 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Evaluation Criteria</h2>
            <p className="text-gray-600 mb-6">
              Set criteria for paper trading evaluation. Deployment must pass all criteria to enable real money trading.
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Trades *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={evaluationCriteria.min_trades}
                  onChange={(e) =>
                    setEvaluationCriteria({
                      ...evaluationCriteria,
                      min_trades: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Minimum number of closed trades required for evaluation
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Sharpe Ratio * (must be &gt; 1.0)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  required
                  value={evaluationCriteria.min_sharpe_ratio}
                  onChange={(e) =>
                    setEvaluationCriteria({
                      ...evaluationCriteria,
                      min_sharpe_ratio: parseFloat(e.target.value) || 1.0,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Sharpe ratio must be strictly greater than this value
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum PnL * (must be &gt; 0)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={evaluationCriteria.min_pnl}
                  onChange={(e) =>
                    setEvaluationCriteria({
                      ...evaluationCriteria,
                      min_pnl: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Total PnL must be strictly greater than this value
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> All criteria must pass for the deployment to be eligible for real money trading.
                  Evaluation runs automatically when the minimum trades threshold is reached.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBack}
            disabled={step === 1}
            className="flex items-center gap-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </motion.button>

          {step < 4 ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Next
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Create Deployment
                </>
              )}
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

