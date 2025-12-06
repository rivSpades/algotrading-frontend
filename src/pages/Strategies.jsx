/**
 * Strategies Page Component
 * Lists all available trading strategies
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, ArrowRight, Play } from 'lucide-react';
import { getStrategies } from '../data/strategies';

export default function Strategies() {
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadStrategies();
  }, []);

  const loadStrategies = async () => {
    setLoading(true);
    try {
      const data = await getStrategies();
      // Ensure data is an array
      setStrategies(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading strategies:', error);
      setStrategies([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">Loading strategies...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Trading Strategies</h1>
        <p className="text-gray-600">Browse and configure trading strategies for backtesting</p>
      </div>

      {strategies.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No strategies available</h3>
          <p className="text-gray-600">Strategies will appear here once they are configured</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {strategies.map((strategy) => (
            <div
              key={strategy.id}
              className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => navigate(`/strategies/${strategy.id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{strategy.name}</h3>
                  {strategy.description_short && (
                    <p className="text-sm text-gray-600 mb-3">{strategy.description_short}</p>
                  )}
                </div>
                <TrendingUp className="w-8 h-8 text-primary-600 flex-shrink-0 ml-4" />
              </div>

              {strategy.analytic_tools_used && strategy.analytic_tools_used.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">Uses Indicators</p>
                  <div className="flex flex-wrap gap-2">
                    {strategy.analytic_tools_used.map((tool) => (
                      <span
                        key={tool}
                        className="px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded-full"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  strategy.globally_enabled
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {strategy.globally_enabled ? 'Enabled' : 'Disabled'}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/strategies/${strategy.id}`);
                  }}
                  className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
                >
                  View Details
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

