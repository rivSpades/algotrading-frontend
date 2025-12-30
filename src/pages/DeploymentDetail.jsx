/**
 * Deployment Detail Page
 * Detailed view of a live trading deployment with statistics and trades
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Square, TrendingUp, TrendingDown, RefreshCw, Loader, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  getDeployment,
  activateDeployment,
  pauseDeployment,
  stopDeployment,
  promoteToRealMoney,
  getDeploymentStatistics,
  checkEvaluation
} from '../data/liveTrading';
import { liveTradingAPI } from '../data/liveTrading';
import { motion } from 'framer-motion';
import StatisticsCard from '../components/StatisticsCard';

export default function DeploymentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deployment, setDeployment] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [trades, setTrades] = useState({ results: [], count: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    let interval;
    if (autoRefresh && deployment?.status === 'evaluating' || deployment?.status === 'active') {
      interval = setInterval(() => {
        loadData();
      }, 5000); // Refresh every 5 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, deployment?.status]);

  const loadData = async () => {
    try {
      const [deploymentData, statsData, tradesData] = await Promise.all([
        getDeployment(id),
        getDeploymentStatistics(id),
        liveTradingAPI.trades.getTrades(1, id),
      ]);
      
      setDeployment(deploymentData);
      setStatistics(statsData);
      if (tradesData.success) {
        setTrades({
          results: Array.isArray(tradesData.data) ? tradesData.data : tradesData.data.results || [],
          count: tradesData.data.count || 0,
        });
      }
    } catch (error) {
      console.error('Error loading deployment data:', error);
      alert('Failed to load deployment: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    setActionLoading(true);
    try {
      switch (action) {
        case 'activate':
          await activateDeployment(id);
          break;
        case 'pause':
          await pauseDeployment(id);
          break;
        case 'stop':
          await stopDeployment(id);
          break;
        case 'promote':
          await promoteToRealMoney(id);
          break;
        case 'check-evaluation':
          await checkEvaluation(id);
          break;
      }
      await loadData();
    } catch (error) {
      console.error(`Error ${action}:`, error);
      alert(`Failed to ${action}: ` + (error.message || 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-800',
      evaluating: 'bg-blue-100 text-blue-800',
      passed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      stopped: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!deployment) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-red-600">Deployment not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => navigate('/deployments')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Deployments
      </motion.button>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {deployment.name || `${deployment.backtest_info?.strategy_name || 'Deployment'}`}
            </h1>
            <p className="text-gray-600 mt-1">
              {deployment.broker_info?.name} • {deployment.position_mode.toUpperCase()} • {deployment.deployment_type === 'paper' ? 'Paper Trading' : 'Real Money'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(deployment.status)}`}>
              {deployment.status}
            </div>
            {(deployment.status === 'evaluating' || deployment.status === 'active') && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-600">Auto-refresh</span>
              </label>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          {deployment.status === 'pending' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleAction('activate')}
              disabled={actionLoading}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Play className="w-5 h-5" />
              Activate
            </motion.button>
          )}
          
          {deployment.status === 'active' && (
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleAction('pause')}
                disabled={actionLoading}
                className="flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
              >
                <Pause className="w-5 h-5" />
                Pause
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleAction('stop')}
                disabled={actionLoading}
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Square className="w-5 h-5" />
                Stop
              </motion.button>
            </>
          )}
          
          {deployment.status === 'paused' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleAction('activate')}
              disabled={actionLoading}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Play className="w-5 h-5" />
              Resume
            </motion.button>
          )}

          {deployment.status === 'passed' && deployment.deployment_type === 'paper' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (window.confirm('Are you sure you want to promote this deployment to real money trading?')) {
                  handleAction('promote');
                }
              }}
              disabled={actionLoading}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <TrendingUp className="w-5 h-5" />
              Promote to Real Money
            </motion.button>
          )}

          {deployment.status === 'evaluating' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleAction('check-evaluation')}
              disabled={actionLoading}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="w-5 h-5" />
              Check Evaluation
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </motion.button>
        </div>
      </div>

      {/* Evaluation Results */}
      {deployment.deployment_type === 'paper' && deployment.evaluation_results && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Evaluation Results</h2>
          <div className={`p-4 rounded-lg ${
            deployment.evaluation_passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              {deployment.evaluation_passed ? (
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600" />
              )}
              <span className={`font-semibold ${
                deployment.evaluation_passed ? 'text-green-800' : 'text-red-800'
              }`}>
                {deployment.evaluation_passed ? 'Evaluation Passed' : 'Evaluation Failed'}
              </span>
            </div>
            {statistics?.evaluation_results && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Trades</p>
                  <p className="text-lg font-semibold">
                    {statistics.evaluation_results.trades_count} / {statistics.evaluation_results.criteria?.min_trades}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Sharpe Ratio</p>
                  <p className="text-lg font-semibold">
                    {statistics.evaluation_results.sharpe_ratio?.toFixed(2) || 'N/A'} &gt; {statistics.evaluation_results.criteria?.min_sharpe_ratio}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total PnL</p>
                  <p className="text-lg font-semibold">
                    ${statistics.evaluation_results.total_pnl?.toFixed(2) || '0.00'} &gt; ${statistics.evaluation_results.criteria?.min_pnl || '0.00'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatisticsCard
            title="Total Trades"
            value={statistics.total_trades || 0}
            icon={<TrendingUp className="w-6 h-6" />}
          />
          <StatisticsCard
            title="Open Trades"
            value={statistics.open_trades || 0}
            icon={<Play className="w-6 h-6" />}
          />
          <StatisticsCard
            title="Closed Trades"
            value={statistics.closed_trades || 0}
            icon={<CheckCircle2 className="w-6 h-6" />}
          />
          <StatisticsCard
            title="Total PnL"
            value={`$${(statistics.total_pnl || 0).toFixed(2)}`}
            icon={<TrendingUp className="w-6 h-6" />}
            color={statistics.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'}
          />
        </div>
      )}

      {/* Trades Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Trades</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entry Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exit Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PnL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {trades.results.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    No trades yet
                  </td>
                </tr>
              ) : (
                trades.results.map((trade) => (
                  <tr key={trade.id} className="hover:bg-gray-50">
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
                      {trade.pnl ? `$${trade.pnl.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        trade.status === 'open' ? 'bg-blue-100 text-blue-800' :
                        trade.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {trade.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

