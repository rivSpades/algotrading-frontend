/**
 * Strategy Detail Page Component
 * Shows strategy details and allows backtesting
 */

import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, Code, Settings, Clock, CheckCircle, XCircle, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { getStrategy } from '../data/strategies';
import { getBacktests, deleteBacktest } from '../data/backtests';
import BacktestConfig from '../components/BacktestConfig';

export default function StrategyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [strategy, setStrategy] = useState(null);
  const [backtests, setBacktests] = useState([]);
  const [backtestsCount, setBacktestsCount] = useState(0);
  const [backtestsNext, setBacktestsNext] = useState(null);
  const [backtestsPrevious, setBacktestsPrevious] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [backtestsLoading, setBacktestsLoading] = useState(true);
  const [showBacktestConfig, setShowBacktestConfig] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    loadStrategy();
    const page = parseInt(searchParams.get('page') || '1');
    setCurrentPage(page);
    loadBacktests(page);
  }, [id, searchParams]);

  const loadStrategy = async () => {
    setLoading(true);
    try {
      const data = await getStrategy(id);
      // Handle both direct data and nested data structure
      setStrategy(data && typeof data === 'object' ? data : null);
    } catch (error) {
      console.error('Error loading strategy:', error);
      setStrategy(null);
    } finally {
      setLoading(false);
    }
  };

  const loadBacktests = async (page = 1) => {
    setBacktestsLoading(true);
    try {
      const response = await getBacktests(page, parseInt(id));
      if (Array.isArray(response)) {
        // Fallback for non-paginated response
        const strategyBacktests = response.filter(bt => bt.strategy_info?.id === parseInt(id) || bt.strategy === parseInt(id));
        setBacktests(strategyBacktests);
        setBacktestsCount(strategyBacktests.length);
        setBacktestsNext(null);
        setBacktestsPrevious(null);
      } else {
        // Paginated response
        const strategyBacktests = (response.results || []).filter(bt => bt.strategy_info?.id === parseInt(id) || bt.strategy === parseInt(id));
        setBacktests(strategyBacktests);
        setBacktestsCount(response.count || 0);
        setBacktestsNext(response.next || null);
        setBacktestsPrevious(response.previous || null);
      }
    } catch (error) {
      console.error('Error loading backtests:', error);
      setBacktests([]);
      setBacktestsCount(0);
      setBacktestsNext(null);
      setBacktestsPrevious(null);
    } finally {
      setBacktestsLoading(false);
    }
  };

  const handleDeleteBacktest = async (backtestId) => {
    if (!window.confirm('Are you sure you want to delete this backtest? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      await deleteBacktest(backtestId);
      // Reload backtests after deletion
      const page = parseInt(searchParams.get('page') || '1');
      await loadBacktests(page);
    } catch (error) {
      console.error('Error deleting backtest:', error);
      alert('Failed to delete backtest: ' + (error.message || 'Unknown error'));
    } finally {
      setDeleting(false);
    }
  };

  const handleBacktestCreated = (backtest) => {
    // Navigate immediately to the backtest detail page
    navigate(`/strategies/${id}/backtests/${backtest.id}`);
    // Reload backtests in the background
    loadBacktests();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'running':
        return <Clock className="w-5 h-5 text-yellow-600 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">Loading strategy...</div>
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">
          <p className="text-gray-600">Strategy not found</p>
          <button
            onClick={() => navigate('/strategies')}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Back to Strategies
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/strategies')}
        className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Strategies
      </button>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{strategy.name}</h1>
            {strategy.description_short && (
              <p className="text-lg text-gray-600 mb-4">{strategy.description_short}</p>
            )}
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              strategy.globally_enabled
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {strategy.globally_enabled ? 'Globally Enabled' : 'Disabled'}
            </span>
          </div>
          <div>
            <BacktestConfig
              onBacktestCreated={handleBacktestCreated}
              defaultStrategyId={strategy.id}
            />
          </div>
        </div>

        {/* Long Description */}
        {strategy.description_long && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Description
            </h2>
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-line">{strategy.description_long.trim()}</p>
            </div>
          </div>
        )}

        {/* Analytical Tools Used */}
        {strategy.analytic_tools_used && strategy.analytic_tools_used.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Required Indicators
            </h2>
            <div className="flex flex-wrap gap-2">
              {strategy.analytic_tools_used.map((tool) => (
                <span
                  key={tool}
                  className="px-4 py-2 bg-primary-50 text-primary-700 rounded-lg font-medium"
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>
        )}


        {/* Default Parameters */}
        {strategy.default_parameters && Object.keys(strategy.default_parameters).length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Default Parameters
            </h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(strategy.default_parameters).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-sm font-medium text-gray-500 capitalize mb-1">
                      {key.replace(/_/g, ' ')}
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}

        {/* Example Code */}
        {strategy.example_code && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Code className="w-5 h-5" />
              Example Code
            </h2>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-gray-100 whitespace-pre-wrap">
                {strategy.example_code.trim()}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Backtest History */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-6 h-6" />
          Backtest History
        </h2>
        
        {backtestsLoading ? (
          <div className="text-center py-8 text-gray-500">Loading backtest history...</div>
        ) : backtests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No backtests yet. Run a backtest to see results here.</div>
        ) : (
          <>
            {/* Results Count and Pagination Info */}
            {backtestsCount > 0 && (
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Found {backtestsCount} backtest{backtestsCount !== 1 ? 's' : ''}
                  {backtests.length > 0 && backtestsCount > 0 && (
                    <span className="text-gray-500">
                      {' '}(Showing {((currentPage - 1) * 20) + 1}-{Math.min(currentPage * 20, backtestsCount)})
                    </span>
                  )}
                </div>
                {(backtestsNext || backtestsPrevious) && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (backtestsPrevious) {
                          const url = new URL(backtestsPrevious);
                          const page = url.searchParams.get('page') || '1';
                          setSearchParams({ page });
                        }
                      }}
                      disabled={!backtestsPrevious}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>
                    <span className="text-sm text-gray-600 px-2">
                      Page {currentPage}
                    </span>
                    <button
                      onClick={() => {
                        if (backtestsNext) {
                          const url = new URL(backtestsNext);
                          const page = url.searchParams.get('page') || '1';
                          setSearchParams({ page });
                        }
                      }}
                      disabled={!backtestsNext}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Range</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Symbols</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {backtests.map((backtest) => (
                    <tr key={backtest.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {backtest.name || `Backtest #${backtest.id}`}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(backtest.start_date)} - {formatDate(backtest.end_date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {backtest.symbols_count ?? backtest.symbols_info?.length ?? backtest.symbols?.length ?? 0} symbol(s)
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(backtest.status)}
                          <span className={`font-medium capitalize ${
                            backtest.status === 'completed' ? 'text-green-600' :
                            backtest.status === 'failed' ? 'text-red-600' :
                            backtest.status === 'running' ? 'text-yellow-600' :
                            'text-gray-600'
                          }`}>
                            {backtest.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(backtest.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => navigate(`/strategies/${id}/backtests/${backtest.id}`)}
                            className="text-primary-600 hover:text-primary-800 font-medium"
                          >
                            View Symbols
                          </button>
                          <button
                            onClick={() => handleDeleteBacktest(backtest.id)}
                            disabled={deleting || backtest.status === 'running'}
                            className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            title={backtest.status === 'running' ? 'Cannot delete running backtest' : 'Delete backtest'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

