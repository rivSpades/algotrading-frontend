/**
 * Backtests Page Component
 * Lists all backtests and allows viewing results
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Clock, CheckCircle, XCircle, Eye, TrendingUp } from 'lucide-react';
import { getBacktests } from '../data/backtests';
import BacktestConfig from '../components/BacktestConfig';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  running: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

const STATUS_ICONS = {
  pending: Clock,
  running: Clock,
  completed: CheckCircle,
  failed: XCircle,
};

export default function Backtests() {
  const [backtests, setBacktests] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadBacktests();
  }, []);

  const loadBacktests = async () => {
    setLoading(true);
    try {
      const data = await getBacktests();
      setBacktests(data);
    } catch (error) {
      console.error('Error loading backtests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBacktestCreated = (newBacktest) => {
    loadBacktests();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">Loading backtests...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Backtests</h1>
          <p className="text-gray-600">View and manage your trading strategy backtests</p>
        </div>
        <BacktestConfig onBacktestCreated={handleBacktestCreated} />
      </div>

      {backtests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No backtests yet</h3>
          <p className="text-gray-600 mb-4">Create your first backtest to test a trading strategy</p>
          <BacktestConfig onBacktestCreated={handleBacktestCreated} />
        </div>
      ) : (
        <div className="space-y-4">
          {backtests.map((backtest) => {
            const StatusIcon = STATUS_ICONS[backtest.status] || Clock;
            const statusColor = STATUS_COLORS[backtest.status] || STATUS_COLORS.pending;
            const symbolsList = backtest.symbols_info?.map(s => s.ticker).join(', ') || 'N/A';

            return (
              <div
                key={backtest.id}
                className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {backtest.name || `${backtest.strategy_info?.name || 'Backtest'} #${backtest.id}`}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${statusColor}`}>
                        <StatusIcon className="w-4 h-4" />
                        {backtest.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Strategy:</span> {backtest.strategy_info?.name || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Symbols:</span> {symbolsList}
                      </div>
                      <div>
                        <span className="font-medium">Date Range:</span> {formatDate(backtest.start_date)} - {formatDate(backtest.end_date)}
                      </div>
                      <div>
                        <span className="font-medium">Created:</span> {formatDate(backtest.created_at)}
                      </div>
                    </div>
                    {backtest.error_message && (
                      <div className="mt-3 p-3 bg-red-50 border-l-4 border-red-400 rounded">
                        <p className="text-sm text-red-700">
                          <strong>Error:</strong> {backtest.error_message}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {backtest.status === 'completed' && (
                      <button
                        onClick={() => navigate(`/backtests/${backtest.id}`)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View Results
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

