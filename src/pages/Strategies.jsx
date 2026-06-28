/**
 * Strategies Page Component
 * Lists all available trading strategies
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TrendingUp, ArrowRight, Play } from 'lucide-react';
import { withReturnState } from '../lib/navigation';
import { getStrategies } from '../data/strategies';

export default function Strategies() {
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

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
        <h1 className="text-3xl font-bold text-ink mb-2">Trading Strategies</h1>
        <p className="text-ink-secondary">Browse and configure trading strategies for backtesting</p>
      </div>

      {strategies.length === 0 ? (
        <div className="text-center py-12 bg-surface rounded-lg shadow">
          <TrendingUp className="w-16 h-16 text-ink-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-ink mb-2">No strategies available</h3>
          <p className="text-ink-secondary">Strategies will appear here once they are configured</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {strategies.map((strategy) => (
            <div
              key={strategy.id}
              className="bg-surface rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => navigate(`/strategies/${strategy.id}`, { state: withReturnState(location) })}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-ink mb-2">{strategy.name}</h3>
                  {strategy.description_short && (
                    <p className="text-sm text-ink-secondary mb-3">{strategy.description_short}</p>
                  )}
                </div>
                <TrendingUp className="w-8 h-8 text-accent flex-shrink-0 ml-4" />
              </div>

              {strategy.analytic_tools_used && strategy.analytic_tools_used.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-ink-tertiary uppercase mb-2">Uses Indicators</p>
                  <div className="flex flex-wrap gap-2">
                    {strategy.analytic_tools_used.map((tool) => (
                      <span
                        key={tool}
                        className="px-2 py-1 bg-accent-soft text-accent-ink text-xs rounded-full"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  strategy.globally_enabled
                    ? 'bg-profit-soft text-profit-ink'
                    : 'bg-surface-sunken text-ink'
                }`}>
                  {strategy.globally_enabled ? 'Enabled' : 'Disabled'}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/strategies/${strategy.id}`, { state: withReturnState(location) });
                  }}
                  className="flex items-center gap-2 text-accent hover:text-accent-ink font-medium"
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

