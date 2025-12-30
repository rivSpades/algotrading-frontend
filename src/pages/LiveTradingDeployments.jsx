/**
 * Live Trading Deployments Page
 * List and manage live trading deployments
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Play, Pause, Square, TrendingUp, TrendingDown, Loader, Filter } from 'lucide-react';
import { getDeployments } from '../data/liveTrading';
import { motion } from 'framer-motion';

export default function LiveTradingDeployments() {
  const navigate = useNavigate();
  const [deployments, setDeployments] = useState({ results: [], count: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    deploymentType: '',
    status: '',
  });

  useEffect(() => {
    loadDeployments();
  }, [filters]);

  const loadDeployments = async () => {
    setLoading(true);
    try {
      const data = await getDeployments({
        deploymentType: filters.deploymentType || null,
        status: filters.status || null,
      });
      setDeployments(data);
    } catch (error) {
      console.error('Error loading deployments:', error);
    } finally {
      setLoading(false);
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Live Trading Deployments</h1>
          <p className="text-gray-600 mt-1">Manage your active trading deployments</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/deployments/new')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Deployment
        </motion.button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex gap-4 items-center">
          <Filter className="w-5 h-5 text-gray-500" />
          <select
            value={filters.deploymentType}
            onChange={(e) => setFilters({ ...filters, deploymentType: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="paper">Paper Trading</option>
            <option value="real_money">Real Money</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="evaluating">Evaluating</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="stopped">Stopped</option>
          </select>
        </div>
      </div>

      {deployments.results.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No deployments found</h3>
          <p className="text-gray-600 mb-4">Create your first deployment to start live trading</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/deployments/new')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            New Deployment
          </motion.button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {deployments.results.map((deployment) => (
            <motion.div
              key={deployment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/deployments/${deployment.id}`)}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {deployment.name || `${deployment.strategy_name} Deployment`}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {deployment.broker_name} • {deployment.position_mode.toUpperCase()}
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(deployment.status)}`}>
                  {deployment.status}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium">
                    {deployment.deployment_type === 'paper' ? 'Paper Trading' : 'Real Money'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Symbols:</span>
                  <span className="font-medium">{deployment.symbols_count}</span>
                </div>
                {deployment.evaluation_results && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Evaluation:</span>
                    <span className={`font-medium ${
                      deployment.evaluation_passed ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {deployment.evaluation_passed ? 'Passed' : 'Failed'}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/deployments/${deployment.id}`);
                  }}
                  className="flex-1 bg-blue-100 text-blue-700 px-3 py-2 rounded hover:bg-blue-200 transition-colors text-sm"
                >
                  View Details
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}



