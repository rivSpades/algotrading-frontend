/**
 * Dashboard Page
 * Main dashboard with trading history for paper trading and real money
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, BarChart3, RefreshCw, Loader, ExternalLink } from 'lucide-react';
import { getTrades } from '../data/liveTrading';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const navigate = useNavigate();
  const [paperTrades, setPaperTrades] = useState({ results: [], count: 0 });
  const [realMoneyTrades, setRealMoneyTrades] = useState({ results: [], count: 0 });
  const [paperLoading, setPaperLoading] = useState(true);
  const [realMoneyLoading, setRealMoneyLoading] = useState(true);
  const [paperPage, setPaperPage] = useState(1);
  const [realMoneyPage, setRealMoneyPage] = useState(1);

  useEffect(() => {
    loadPaperTrades();
    loadRealMoneyTrades();
  }, [paperPage, realMoneyPage]);

  const loadPaperTrades = async () => {
    setPaperLoading(true);
    try {
      const data = await getTrades({
        page: paperPage,
        deploymentType: 'paper',
        status: 'closed', // Only show closed trades in history
      });
      setPaperTrades(data);
    } catch (error) {
      console.error('Error loading paper trades:', error);
    } finally {
      setPaperLoading(false);
    }
  };

  const loadRealMoneyTrades = async () => {
    setRealMoneyLoading(true);
    try {
      const data = await getTrades({
        page: realMoneyPage,
        deploymentType: 'real_money',
        status: 'closed', // Only show closed trades in history
      });
      setRealMoneyTrades(data);
    } catch (error) {
      console.error('Error loading real money trades:', error);
    } finally {
      setRealMoneyLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateTotalPnL = (trades) => {
    return trades.reduce((sum, trade) => sum + (parseFloat(trade.pnl) || 0), 0);
  };

  const paperTotalPnL = calculateTotalPnL(paperTrades.results);
  const realMoneyTotalPnL = calculateTotalPnL(realMoneyTrades.results);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Trading history overview</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-md p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Paper Trading</h2>
            <BarChart3 className="w-8 h-8 text-blue-500" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Trades:</span>
              <span className="font-semibold">{paperTrades.count}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total PnL:</span>
              <span className={`font-semibold ${paperTotalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${paperTotalPnL.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Showing:</span>
              <span className="font-semibold">{paperTrades.results.length} trades</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-md p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Real Money Trading</h2>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Trades:</span>
              <span className="font-semibold">{realMoneyTrades.count}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total PnL:</span>
              <span className={`font-semibold ${realMoneyTotalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${realMoneyTotalPnL.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Showing:</span>
              <span className="font-semibold">{realMoneyTrades.results.length} trades</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Paper Trading History */}
      <div className="bg-white rounded-lg shadow-md mb-8">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Paper Trading History</h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/deployments?deployment_type=paper')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
          >
            View All Deployments
            <ExternalLink className="w-4 h-4" />
          </motion.button>
        </div>
        <div className="overflow-x-auto">
          {paperLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entry Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exit Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PnL</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deployment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paperTrades.results.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                        No paper trading history yet
                      </td>
                    </tr>
                  ) : (
                    paperTrades.results.map((trade) => (
                      <tr key={trade.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {formatDate(trade.exit_timestamp || trade.entry_timestamp)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium">{trade.symbol_info?.ticker}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            trade.trade_type === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {trade.trade_type.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">${trade.entry_price}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {trade.exit_price ? `$${trade.exit_price}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{trade.quantity}</td>
                        <td className={`px-6 py-4 whitespace-nowrap font-medium ${
                          trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {trade.pnl ? `$${parseFloat(trade.pnl).toFixed(2)}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => navigate(`/deployments/${trade.deployment}`)}
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {paperTrades.results.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Showing {paperTrades.results.length} of {paperTrades.count} trades
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPaperPage(prev => Math.max(1, prev - 1))}
                      disabled={!paperTrades.previous}
                      className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPaperPage(prev => prev + 1)}
                      disabled={!paperTrades.next}
                      className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Real Money Trading History */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Real Money Trading History</h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/deployments?deployment_type=real_money')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
          >
            View All Deployments
            <ExternalLink className="w-4 h-4" />
          </motion.button>
        </div>
        <div className="overflow-x-auto">
          {realMoneyLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entry Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exit Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PnL</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deployment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {realMoneyTrades.results.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                        No real money trading history yet
                      </td>
                    </tr>
                  ) : (
                    realMoneyTrades.results.map((trade) => (
                      <tr key={trade.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {formatDate(trade.exit_timestamp || trade.entry_timestamp)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium">{trade.symbol_info?.ticker}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            trade.trade_type === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {trade.trade_type.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">${trade.entry_price}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {trade.exit_price ? `$${trade.exit_price}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{trade.quantity}</td>
                        <td className={`px-6 py-4 whitespace-nowrap font-medium ${
                          trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {trade.pnl ? `$${parseFloat(trade.pnl).toFixed(2)}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {typeof trade.deployment === 'number' || typeof trade.deployment === 'string' ? (
                            <button
                              onClick={() => navigate(`/deployments/${trade.deployment}`)}
                              className="text-blue-600 hover:text-blue-700 text-sm"
                            >
                              View
                            </button>
                          ) : (
                            <span className="text-gray-400 text-sm">N/A</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {realMoneyTrades.results.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Showing {realMoneyTrades.results.length} of {realMoneyTrades.count} trades
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRealMoneyPage(prev => Math.max(1, prev - 1))}
                      disabled={!realMoneyTrades.previous}
                      className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setRealMoneyPage(prev => prev + 1)}
                      disabled={!realMoneyTrades.next}
                      className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

