/**
 * Brokers Management Page
 * Displays and manages trading brokers
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Key, CheckCircle2, XCircle, Loader } from 'lucide-react';
import { getBrokers, deleteBroker } from '../data/liveTrading';
import { motion } from 'framer-motion';

export default function Brokers() {
  const navigate = useNavigate();
  const [brokers, setBrokers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadBrokers();
  }, []);

  const loadBrokers = async () => {
    setLoading(true);
    try {
      const data = await getBrokers();
      setBrokers(data);
    } catch (error) {
      console.error('Error loading brokers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this broker?')) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteBroker(id);
      await loadBrokers();
    } catch (error) {
      console.error('Error deleting broker:', error);
      alert('Failed to delete broker: ' + (error.message || 'Unknown error'));
    } finally {
      setDeletingId(null);
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Brokers</h1>
          <p className="text-gray-600 mt-1">Manage your trading broker connections</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/brokers/new')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Broker
        </motion.button>
      </div>

      {brokers.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No brokers configured</h3>
          <p className="text-gray-600 mb-4">Get started by adding your first broker</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/brokers/new')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Broker
          </motion.button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brokers.map((broker) => (
            <motion.div
              key={broker.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{broker.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">Code: {broker.code}</p>
                </div>
                <div className="flex gap-2">
                  {broker.paper_trading_active && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                      Paper
                    </span>
                  )}
                  {broker.real_money_active && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                      Real Money
                    </span>
                  )}
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Paper Trading:</span>
                  {broker.has_paper_trading ? (
                    <span className={`font-medium ${broker.paper_trading_active ? 'text-green-600' : 'text-yellow-600'}`}>
                      {broker.paper_trading_active ? 'Active' : 'Not Tested'}
                    </span>
                  ) : (
                    <span className="text-gray-400">Not Configured</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Real Money:</span>
                  {broker.has_real_money ? (
                    <span className={`font-medium ${broker.real_money_active ? 'text-green-600' : 'text-yellow-600'}`}>
                      {broker.real_money_active ? 'Active' : 'Not Tested'}
                    </span>
                  ) : (
                    <span className="text-gray-400">Not Configured</span>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2 pt-4 border-t">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(`/brokers/${broker.id}`)}
                  className="flex-1 bg-blue-100 text-blue-700 px-3 py-2 rounded hover:bg-blue-200 transition-colors text-sm"
                >
                  View
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleDelete(broker.id)}
                  disabled={deletingId === broker.id}
                  className="bg-red-100 text-red-700 px-3 py-2 rounded hover:bg-red-200 transition-colors text-sm disabled:opacity-50"
                >
                  {deletingId === broker.id ? (
                    <Loader className="w-4 h-4 animate-spin inline" />
                  ) : (
                    <Trash2 className="w-4 h-4 inline" />
                  )}
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}


