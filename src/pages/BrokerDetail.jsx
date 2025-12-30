/**
 * Broker Detail Page
 * Interactive interface to test broker adapter methods
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, Search, TrendingUp, Activity, Loader, CheckCircle2, XCircle, Edit, Link as LinkIcon, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { getBroker, linkSymbolsToBroker } from '../data/liveTrading';
import { liveTradingAPI } from '../data/liveTrading';
import { marketDataAPI } from '../data/api';
import { motion } from 'framer-motion';
import TaskProgress from '../components/TaskProgress';

export default function BrokerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [broker, setBroker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deploymentType, setDeploymentType] = useState('paper'); // 'paper' or 'real_money'
  
  // Account Balance
  const [accountBalance, setAccountBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  
  // Symbol Check
  const [symbolCheckInput, setSymbolCheckInput] = useState('');
  const [symbolResult, setSymbolResult] = useState(null);
  const [loadingSymbol, setLoadingSymbol] = useState(false);
  
  // Positions
  const [positions, setPositions] = useState(null);
  const [loadingPositions, setLoadingPositions] = useState(false);
  
  // Symbol Linking
  const [linkedSymbols, setLinkedSymbols] = useState([]);
  const [loadingSymbols, setLoadingSymbols] = useState(false);
  const [symbolsPage, setSymbolsPage] = useState(1);
  const [symbolsCount, setSymbolsCount] = useState(0);
  const [symbolsNext, setSymbolsNext] = useState(null);
  const [symbolsPrevious, setSymbolsPrevious] = useState(null);
  const [symbolsSearchTerm, setSymbolsSearchTerm] = useState('');
  const [linkingSymbols, setLinkingSymbols] = useState(false);
  const [linkMode, setLinkMode] = useState('individual'); // 'individual', 'list', 'exchange', 'all_available'
  const [symbolInput, setSymbolInput] = useState(''); // For individual symbol
  const [symbolListInput, setSymbolListInput] = useState(''); // For list (comma-separated)
  const [exchangeCode, setExchangeCode] = useState(''); // For exchange
  const [availableExchanges, setAvailableExchanges] = useState([]);
  
  // Task tracking for symbol linking
  const [linkingTaskId, setLinkingTaskId] = useState(null);
  
  // Search debouncing
  const searchTimeoutRef = useRef(null);
  
  useEffect(() => {
    loadBroker();
    loadLinkedSymbols(1);
  }, [id]);
  
  const handleSymbolsPageChange = (newPage) => {
    loadLinkedSymbols(newPage, symbolsSearchTerm);
  };
  
  const handleSymbolsSearch = (e) => {
    const searchValue = e.target.value;
    setSymbolsSearchTerm(searchValue);
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Debounce search - only trigger API call after user stops typing
    searchTimeoutRef.current = setTimeout(() => {
      // Reset to page 1 when searching
      loadLinkedSymbols(1, searchValue);
    }, searchValue ? 500 : 0); // 500ms debounce when typing, immediate when clearing
  };
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);
  
  useEffect(() => {
    loadExchanges();
  }, []);
  
  const loadBroker = async () => {
    setLoading(true);
    try {
      const brokerData = await getBroker(id);
      setBroker(brokerData);
    } catch (error) {
      console.error('Error loading broker:', error);
      alert('Failed to load broker: ' + (error.message || 'Unknown error'));
      navigate('/brokers');
    } finally {
      setLoading(false);
    }
  };
  
  const loadLinkedSymbols = async (page = 1, search = '') => {
    setLoadingSymbols(true);
    try {
      const response = await liveTradingAPI.brokers.getBrokerSymbols(id, page, search);
      if (response.success) {
        // Handle paginated response
        if (response.data.results) {
          // Paginated response
          setLinkedSymbols(response.data.results || []);
          setSymbolsCount(response.data.count || 0);
          setSymbolsNext(response.data.next);
          setSymbolsPrevious(response.data.previous);
          setSymbolsPage(page);
        } else {
          // Non-paginated response (backward compatibility)
          const activeSymbols = (response.data || []).filter(assoc => assoc.long_active || assoc.short_active);
          setLinkedSymbols(activeSymbols);
          setSymbolsCount(activeSymbols.length);
          setSymbolsNext(null);
          setSymbolsPrevious(null);
          setSymbolsPage(1);
        }
      }
    } catch (error) {
      console.error('Error loading linked symbols:', error);
    } finally {
      setLoadingSymbols(false);
    }
  };
  
  const loadExchanges = async () => {
    try {
      const response = await marketDataAPI.apiRequest('/symbols/available_exchanges/');
      if (response.success && response.data) {
        setAvailableExchanges(response.data.results || []);
      }
    } catch (error) {
      console.error('Error loading exchanges:', error);
    }
  };
  
  const handleLinkSymbols = async () => {
    setLinkingSymbols(true);
    try {
      let symbolTickers = [];
      let exchange = '';
      
      if (linkMode === 'individual') {
        if (!symbolInput.trim()) {
          alert('Please enter a symbol');
          setLinkingSymbols(false);
          return;
        }
        symbolTickers = [symbolInput.trim().toUpperCase()];
      } else if (linkMode === 'list') {
        if (!symbolListInput.trim()) {
          alert('Please enter symbols (comma-separated)');
          setLinkingSymbols(false);
          return;
        }
        symbolTickers = symbolListInput.split(',').map(s => s.trim().toUpperCase()).filter(s => s);
      } else if (linkMode === 'exchange') {
        if (!exchangeCode.trim()) {
          alert('Please select an exchange');
          setLinkingSymbols(false);
          return;
        }
        exchange = exchangeCode.trim();
      } else if (linkMode === 'all_available') {
        // This will be handled by the link_all_available flag
        symbolTickers = [];
        exchange = '';
      }
      
      // Prepare link data based on mode
      let linkData = {
        verify_capabilities: true
      };
      
      if (linkMode === 'all_available') {
        linkData.link_all_available = true;
      } else if (linkMode === 'exchange') {
        linkData.exchange_code = exchange;
      } else if (symbolTickers.length > 0) {
        linkData.symbol_tickers = symbolTickers;
      }
      
      // Call the API - it now returns a task_id
      const response = await liveTradingAPI.brokers.linkSymbols(id, linkData);
      
        if (response.success) {
          // Check if we got a task_id (async task)
          if (response.data.task_id) {
            setLinkingTaskId(response.data.task_id);
          } else {
            // Legacy sync response (shouldn't happen, but handle it)
            alert(`Successfully linked ${response.data.created || 0} symbols!`);
            await loadLinkedSymbols(1, symbolsSearchTerm);
          }
      } else {
        alert('Failed to start linking task: ' + (response.error || 'Unknown error'));
        setLinkingSymbols(false);
      }
      
      // Clear inputs if not async
      if (!response.data.task_id) {
        setSymbolInput('');
        setSymbolListInput('');
        setExchangeCode('');
        setLinkMode('individual'); // Reset to default mode
      }
    } catch (error) {
      console.error('Error linking symbols:', error);
      alert('Failed to link symbols: ' + (error.message || 'Unknown error'));
      setLinkingSymbols(false);
    }
  };
  
  const handleLinkingTaskComplete = async (taskData) => {
    setLinkingSymbols(false);
    setLinkingTaskId(null);
    
    // Show success message with results
    if (taskData.status === 'success' || taskData.status === 'completed') {
      alert(`Successfully linked ${taskData.created || 0} symbols!`);
      // Reload linked symbols (reset to page 1, keep search term)
      await loadLinkedSymbols(1, symbolsSearchTerm);
    } else {
      alert(`Linking task failed: ${taskData.error || 'Unknown error'}`);
    }
    
    // Clear inputs and reset mode
    setSymbolInput('');
    setSymbolListInput('');
    setExchangeCode('');
    setLinkMode('individual');
  };
  
  const handleLinkingTaskClose = () => {
    setLinkingTaskId(null);
    setLinkingSymbols(false);
  };
  
  const handleGetBalance = async () => {
    setLoadingBalance(true);
    setAccountBalance(null);
    try {
      const response = await liveTradingAPI.brokers.getAccountBalance(id, deploymentType);
      if (response.success) {
        setAccountBalance(response.data);
      } else {
        alert('Failed to get account balance: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error getting balance:', error);
      alert('Failed to get account balance: ' + (error.message || 'Unknown error'));
    } finally {
      setLoadingBalance(false);
    }
  };
  
  const handleCheckSymbol = async () => {
    if (!symbolCheckInput.trim()) {
      alert('Please enter a symbol');
      return;
    }
    
    setLoadingSymbol(true);
    setSymbolResult(null);
    try {
      const response = await liveTradingAPI.brokers.checkSymbol(id, symbolCheckInput.toUpperCase(), deploymentType);
      if (response.success) {
        setSymbolResult(response.data);
      } else {
        alert('Failed to check symbol: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error checking symbol:', error);
      alert('Failed to check symbol: ' + (error.message || 'Unknown error'));
    } finally {
      setLoadingSymbol(false);
    }
  };
  
  const handleGetPositions = async () => {
    setLoadingPositions(true);
    setPositions(null);
    try {
      const response = await liveTradingAPI.brokers.getPositions(id, deploymentType);
      if (response.success) {
        setPositions(response.data);
      } else {
        alert('Failed to get positions: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error getting positions:', error);
      alert('Failed to get positions: ' + (error.message || 'Unknown error'));
    } finally {
      setLoadingPositions(false);
    }
  };
  
  const formatCurrency = (value) => {
    if (!value) return 'N/A';
    const num = parseFloat(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }
  
  if (!broker) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-gray-600">Broker not found</p>
      </div>
    );
  }
  
  const isPaperActive = broker.paper_trading_active && broker.has_paper_trading;
  const isRealMoneyActive = broker.real_money_active && broker.has_real_money;
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Task Progress Modal */}
      {linkingTaskId && (
        <TaskProgress
          taskId={linkingTaskId}
          onComplete={handleLinkingTaskComplete}
          onClose={handleLinkingTaskClose}
        />
      )}
      
      {/* Header */}
      <div className="mb-6">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/brokers')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Brokers
        </motion.button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{broker.name}</h1>
            <p className="text-gray-600 mt-1">Code: {broker.code}</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(`/brokers/${id}/edit`)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit className="w-5 h-5" />
            Edit
          </motion.button>
        </div>
      </div>
      
      {/* Deployment Type Selector */}
      <div className="mb-6 bg-white rounded-lg shadow-md p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Deployment Type</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="paper"
              checked={deploymentType === 'paper'}
              onChange={(e) => setDeploymentType(e.target.value)}
              disabled={!isPaperActive}
              className="w-4 h-4 text-blue-600"
            />
            <span className={isPaperActive ? 'text-gray-900' : 'text-gray-400'}>
              Paper Trading {isPaperActive ? '(Active)' : '(Not Active)'}
            </span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="real_money"
              checked={deploymentType === 'real_money'}
              onChange={(e) => setDeploymentType(e.target.value)}
              disabled={!isRealMoneyActive}
              className="w-4 h-4 text-blue-600"
            />
            <span className={isRealMoneyActive ? 'text-gray-900' : 'text-gray-400'}>
              Real Money {isRealMoneyActive ? '(Active)' : '(Not Active)'}
            </span>
          </label>
        </div>
        {(!isPaperActive && !isRealMoneyActive) && (
          <p className="text-sm text-yellow-600 mt-2">
            Please configure and test credentials before using broker functions.
          </p>
        )}
      </div>
      
      {/* Interactive Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-md p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Account Balance</h2>
          </div>
          
          <button
            onClick={handleGetBalance}
            disabled={loadingBalance || (!isPaperActive && !isRealMoneyActive)}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            {loadingBalance ? (
              <span className="flex items-center justify-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                Loading...
              </span>
            ) : (
              'Get Account Balance'
            )}
          </button>
          
          {accountBalance && (
            <div className="space-y-3">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Cash Balance</div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(accountBalance.balance)}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Total Equity</div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(accountBalance.equity)}
                </div>
              </div>
            </div>
          )}
        </motion.div>
        
        {/* Symbol Check Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-md p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Search className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Check Symbol</h2>
          </div>
          
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={symbolCheckInput}
              onChange={(e) => setSymbolCheckInput(e.target.value.toUpperCase())}
              placeholder="Enter symbol (e.g., AAPL)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleCheckSymbol()}
            />
            <button
              onClick={handleCheckSymbol}
              disabled={loadingSymbol || (!isPaperActive && !isRealMoneyActive)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingSymbol ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                'Check'
              )}
            </button>
          </div>
          
          {symbolResult && (
            <div className="space-y-3">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Symbol</span>
                  <span className="text-lg font-bold text-gray-900">{symbolResult.symbol}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Current Price</span>
                  <span className="text-lg font-bold text-gray-900">
                    {symbolResult.current_price ? formatCurrency(symbolResult.current_price) : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Tradable</span>
                  {symbolResult.is_tradable ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-2">Trading Capabilities</div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Long</span>
                    {symbolResult.capabilities.long_supported ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Short</span>
                    {symbolResult.capabilities.short_supported ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
        
        {/* Positions Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-md p-6 lg:col-span-2"
        >
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">Current Positions</h2>
          </div>
          
          <button
            onClick={handleGetPositions}
            disabled={loadingPositions || (!isPaperActive && !isRealMoneyActive)}
            className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            {loadingPositions ? (
              <span className="flex items-center justify-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                Loading...
              </span>
            ) : (
              'Get Positions'
            )}
          </button>
          
          {positions && (
            <div>
              {positions.count === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No open positions
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Symbol
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Current Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unrealized P&L
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {positions.positions.map((position, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {position.symbol}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              position.position_type === 'long'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {position.position_type.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {position.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(position.average_price)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(position.current_price)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                            parseFloat(position.unrealized_pnl) >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {formatCurrency(position.unrealized_pnl)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </motion.div>
        
        {/* Symbol Linking Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-md p-6 lg:col-span-2"
        >
          <div className="flex items-center gap-3 mb-4">
            <LinkIcon className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-900">Link Symbols</h2>
          </div>
          
          {/* Link Mode Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Link Mode</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="individual"
                  checked={linkMode === 'individual'}
                  onChange={(e) => setLinkMode(e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <span>Individual Symbol</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="list"
                  checked={linkMode === 'list'}
                  onChange={(e) => setLinkMode(e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <span>List of Symbols</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="exchange"
                  checked={linkMode === 'exchange'}
                  onChange={(e) => setLinkMode(e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <span>By Exchange</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="all_available"
                  checked={linkMode === 'all_available'}
                  onChange={(e) => setLinkMode(e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <span>All Available (from broker)</span>
              </label>
            </div>
          </div>
          
          {/* Input Fields */}
          <div className="mb-4">
            {linkMode === 'individual' && (
              <input
                type="text"
                value={symbolInput}
                onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
                placeholder="Enter symbol (e.g., AAPL)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            )}
            {linkMode === 'list' && (
              <textarea
                value={symbolListInput}
                onChange={(e) => setSymbolListInput(e.target.value.toUpperCase())}
                placeholder="Enter symbols separated by commas (e.g., AAPL, MSFT, GOOGL)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={3}
              />
            )}
            {linkMode === 'exchange' && (
              <select
                value={exchangeCode}
                onChange={(e) => setExchangeCode(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Select an exchange</option>
                {availableExchanges.map(exchange => (
                  <option key={exchange.Code} value={exchange.Code}>
                    {exchange.Name} ({exchange.Code})
                  </option>
                ))}
              </select>
            )}
            {linkMode === 'all_available' && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 font-medium mb-2">
                  Link All Available Symbols from Broker
                </p>
                <p className="text-sm text-blue-700 mb-2">
                  This will link all symbols that are:
                </p>
                <ul className="text-sm text-blue-700 mb-2 list-disc list-inside space-y-1">
                  <li>Available on the broker (tradable)</li>
                  <li>Exist in the database</li>
                  <li>Have no broker association yet</li>
                </ul>
                <p className="text-xs text-blue-600 mt-2">
                  Note: This may take a few moments as it fetches all tradable symbols from the broker API and verifies their capabilities.
                </p>
              </div>
            )}
          </div>
          
          <button
            onClick={handleLinkSymbols}
            disabled={linkingSymbols || (!isPaperActive && !isRealMoneyActive)}
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            {linkingSymbols ? (
              <span className="flex items-center justify-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                Linking...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" />
                Link Symbols
              </span>
            )}
          </button>
          
          {/* Linked Symbols List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Linked Symbols</h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={symbolsSearchTerm}
                    onChange={handleSymbolsSearch}
                    placeholder="Search symbols by ticker or name..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-64"
                  />
                </div>
              </div>
            </div>
            {loadingSymbols ? (
              <div className="text-center py-8">
                <Loader className="w-6 h-6 animate-spin text-indigo-500 mx-auto" />
              </div>
            ) : linkedSymbols.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No symbols linked yet
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Symbol
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Long Active
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Short Active
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Verified At
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {linkedSymbols.map((assoc) => (
                        <tr key={assoc.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {assoc.symbol_info?.ticker || assoc.symbol}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {assoc.long_active ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600" />
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {assoc.short_active ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600" />
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {assoc.verified_at ? new Date(assoc.verified_at).toLocaleDateString() : 'Not verified'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls */}
                {(symbolsCount > 0 || symbolsNext || symbolsPrevious) && (
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {linkedSymbols.length > 0 ? ((symbolsPage - 1) * 20) + 1 : 0} to{' '}
                      {Math.min((symbolsPage - 1) * 20 + linkedSymbols.length, symbolsCount)} of {symbolsCount} symbols
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSymbolsPageChange(symbolsPage - 1)}
                        disabled={!symbolsPrevious}
                        className={`px-3 py-1 rounded-lg border transition-colors ${
                          symbolsPrevious
                            ? 'border-gray-300 hover:bg-gray-50 text-gray-700'
                            : 'border-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm text-gray-700 px-2">
                        Page {symbolsPage}
                      </span>
                      <button
                        onClick={() => handleSymbolsPageChange(symbolsPage + 1)}
                        disabled={!symbolsNext}
                        className={`px-3 py-1 rounded-lg border transition-colors ${
                          symbolsNext
                            ? 'border-gray-300 hover:bg-gray-50 text-gray-700'
                            : 'border-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
            </div>
          </motion.div>
      </div>
    </div>
  );
}

