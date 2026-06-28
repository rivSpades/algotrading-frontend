/**
 * Brokers Management Page
 * Displays and manages trading brokers
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Edit, Trash2, Key, CheckCircle2, XCircle, Loader } from 'lucide-react';
import { withReturnState } from '../lib/navigation';
import { getBrokers, deleteBroker } from '../data/liveTrading';
import { motion } from 'framer-motion';

export default function Brokers() {
  const navigate = useNavigate();
  const location = useLocation();
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
          <h1 className="text-3xl font-bold text-ink">Brokers</h1>
          <p className="text-ink-secondary mt-1">Manage your trading broker connections</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/brokers/new')}
          className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-lg hover:bg-accent-hover transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Broker
        </motion.button>
      </div>

      {brokers.length === 0 ? (
        <div className="text-center py-12 bg-bg rounded-lg">
          <Key className="w-12 h-12 text-ink-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-ink mb-2">No brokers configured</h3>
          <p className="text-ink-secondary mb-4">Get started by adding your first broker</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/brokers/new')}
            className="bg-accent text-white px-6 py-2 rounded-lg hover:bg-accent-hover transition-colors"
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
              className="bg-surface rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-ink">{broker.name}</h3>
                  <p className="text-sm text-ink-tertiary mt-1">Code: {broker.code}</p>
                </div>
                <div className="flex gap-2">
                  {broker.paper_trading_active && (
                    <span className="px-2 py-1 bg-status-running-soft text-accent-ink rounded text-xs font-medium">
                      Paper
                    </span>
                  )}
                  {broker.real_money_active && (
                    <span className="px-2 py-1 bg-profit-soft text-profit-ink rounded text-xs font-medium">
                      Real Money
                    </span>
                  )}
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-secondary">Paper Trading:</span>
                  {broker.has_paper_trading ? (
                    <span className={`font-medium ${broker.paper_trading_active ? 'text-profit' : 'text-status-pending'}`}>
                      {broker.paper_trading_active ? 'Active' : 'Not Tested'}
                    </span>
                  ) : (
                    <span className="text-ink-tertiary">Not Configured</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-secondary">Real Money:</span>
                  {broker.has_real_money ? (
                    <span className={`font-medium ${broker.real_money_active ? 'text-profit' : 'text-status-pending'}`}>
                      {broker.real_money_active ? 'Active' : 'Not Tested'}
                    </span>
                  ) : (
                    <span className="text-ink-tertiary">Not Configured</span>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2 pt-4 border-t">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(`/brokers/${broker.id}`, { state: withReturnState(location) })}
                  className="flex-1 bg-status-running-soft text-accent-ink px-3 py-2 rounded hover:bg-accent-soft transition-colors text-sm"
                >
                  View
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleDelete(broker.id)}
                  disabled={deletingId === broker.id}
                  className="bg-loss-soft text-loss-ink px-3 py-2 rounded hover:bg-red-200 transition-colors text-sm disabled:opacity-50"
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


