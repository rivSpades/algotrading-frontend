/**
 * Strategy Detail Page Component
 * Shows strategy details and allows backtesting
 */

import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  TrendingUp,
  Code,
  Settings,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Trash2,
  List,
  Search,
  Loader,
} from 'lucide-react';
import { getStrategy, getStrategySnapshotSymbols, deleteAllStrategySymbolSnapshots } from '../data/strategies';
import { getBacktests, deleteBacktest } from '../data/backtests';
import BacktestConfig from '../components/BacktestConfig';
import SymbolCard from '../components/SymbolCard';

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
  const [deleting, setDeleting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [snapshotSymbols, setSnapshotSymbols] = useState([]);
  const [snapshotSymbolsLoading, setSnapshotSymbolsLoading] = useState(false);
  const [snapshotSearch, setSnapshotSearch] = useState('');
  const [snapshotPage, setSnapshotPage] = useState(1);
  const SNAPSHOT_PAGE_SIZE = 20;
  const [deletingAllSnapshots, setDeletingAllSnapshots] = useState(false);

  const reloadSnapshotSymbols = useCallback(async () => {
    setSnapshotSymbolsLoading(true);
    try {
      const rows = await getStrategySnapshotSymbols(id);
      setSnapshotSymbols(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error(e);
      setSnapshotSymbols([]);
    } finally {
      setSnapshotSymbolsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadStrategy();
    const page = parseInt(searchParams.get('page') || '1');
    setCurrentPage(page);
    loadBacktests(page);
  }, [id, searchParams]);

  useEffect(() => {
    setSnapshotSearch('');
    setSnapshotPage(1);
    reloadSnapshotSymbols();
  }, [id, reloadSnapshotSymbols]);

  const filteredSnapshotSymbols = useMemo(() => {
    const q = snapshotSearch.trim().toLowerCase();
    if (!q) return snapshotSymbols;
    return snapshotSymbols.filter((s) => String(s.ticker || '').toLowerCase().includes(q));
  }, [snapshotSymbols, snapshotSearch]);

  const pagedSnapshotSymbols = useMemo(() => {
    const start = (snapshotPage - 1) * SNAPSHOT_PAGE_SIZE;
    return filteredSnapshotSymbols.slice(start, start + SNAPSHOT_PAGE_SIZE);
  }, [filteredSnapshotSymbols, snapshotPage]);

  const snapshotTotalPages = Math.max(1, Math.ceil(filteredSnapshotSymbols.length / SNAPSHOT_PAGE_SIZE));

  const handleSnapshotSearchChange = (e) => {
    setSnapshotSearch(e.target.value);
    setSnapshotPage(1);
  };

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

  const handleStrategyBacktestCreated = (backtest, ctx) => {
    if (ctx?.runMode === 'single_symbol_bulk') {
      const q = Array.isArray(ctx?.queued)
        ? ctx.queued.find((x) => x && x.ticker && (x.run_id || x.id))
        : null;
      loadBacktests();
      reloadSnapshotSymbols();
      if (q) {
        navigate(`/strategies/${id}/${q.ticker}?run=${q.run_id || q.id}`);
      } else {
        navigate(`/strategies/${id}`);
      }
      return;
    }
    if (ctx?.runMode === 'single_symbol' && ctx?.ticker && backtest?.id) {
      loadBacktests();
      reloadSnapshotSymbols();
      navigate(`/strategies/${id}/${ctx.ticker}?run=${backtest.id}`);
      return;
    }
    if (backtest?.id) {
      navigate(`/strategies/${id}/backtests/${backtest.id}`);
      loadBacktests();
      reloadSnapshotSymbols();
      return;
    }
    navigate(`/strategies/${id}`);
    loadBacktests();
    reloadSnapshotSymbols();
  };

  const handleDeleteAllSnapshots = async () => {
    if (!strategy || snapshotSymbols.length === 0) return;
    const msg = `Delete every single-symbol snapshot run for "${strategy.name}"?\n\nThis removes all saved per-symbol backtests for this strategy (every symbol, every run). Portfolio backtests are not affected. This cannot be undone.`;
    if (!window.confirm(msg)) return;
    setDeletingAllSnapshots(true);
    try {
      await deleteAllStrategySymbolSnapshots(parseInt(id, 10));
      setSnapshotSearch('');
      setSnapshotPage(1);
      await reloadSnapshotSymbols();
    } catch (e) {
      console.error(e);
      alert(e.message || 'Failed to delete snapshot runs');
    } finally {
      setDeletingAllSnapshots(false);
    }
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
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center shrink-0">
            <BacktestConfig
              runMode="portfolio"
              defaultStrategyId={strategy.id}
              onBacktestCreated={handleStrategyBacktestCreated}
            />
            <BacktestConfig
              runMode="single_symbol"
              defaultStrategyId={strategy.id}
              onBacktestCreated={handleStrategyBacktestCreated}
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

      {/* Single-symbol snapshots (card grid + search); portfolio runs also list symbols on each backtest detail page */}
      <div className="mb-6 bg-white rounded-lg shadow-lg p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <List className="w-5 h-5 shrink-0" />
            Single-symbol snapshots ({filteredSnapshotSymbols.length})
          </h2>
          {snapshotSymbols.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteAllSnapshots}
              disabled={deletingAllSnapshots || snapshotSymbolsLoading}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              {deletingAllSnapshots ? 'Deleting…' : 'Delete all snapshots'}
            </button>
          )}
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Click a card to open the symbol page for this strategy (latest run is pre-selected). Use{' '}
          <strong>Delete all snapshots</strong> to remove every stored single-symbol run for this strategy; portfolio
          backtests stay.
        </p>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={snapshotSearch}
              onChange={handleSnapshotSearchChange}
              placeholder="Search symbols by ticker..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {snapshotSearch && (
              <button
                type="button"
                onClick={() => {
                  setSnapshotSearch('');
                  setSnapshotPage(1);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {snapshotSymbolsLoading ? (
          <div className="text-center py-12">
            <Loader className="w-8 h-8 animate-spin mx-auto text-primary-600" />
            <p className="text-gray-600 mt-4">Loading symbols...</p>
          </div>
        ) : pagedSnapshotSymbols.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {pagedSnapshotSymbols.map((sym, index) => {
                const footer =
                  sym.snapshot_count != null
                    ? `${sym.snapshot_count} saved run(s) · latest: ${sym.latest_run_status || '—'}`
                    : null;
                return (
                  <motion.div
                    key={sym.ticker || index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <SymbolCard
                      symbol={sym}
                      footer={footer}
                      onClick={(s) => {
                        if (s.latest_run_id) {
                          navigate(
                            `/strategies/${id}/${encodeURIComponent(s.ticker)}?run=${s.latest_run_id}`,
                          );
                        } else {
                          navigate(`/strategies/${id}/${encodeURIComponent(s.ticker)}`);
                        }
                      }}
                    />
                  </motion.div>
                );
              })}
            </div>

            {snapshotTotalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setSnapshotPage((p) => Math.max(1, p - 1))}
                  disabled={snapshotPage <= 1}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    snapshotPage > 1
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {snapshotPage} of {snapshotTotalPages} ({filteredSnapshotSymbols.length} total)
                </span>
                <button
                  type="button"
                  onClick={() => setSnapshotPage((p) => Math.min(snapshotTotalPages, p + 1))}
                  disabled={snapshotPage >= snapshotTotalPages}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    snapshotPage < snapshotTotalPages
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500 text-lg">
              {snapshotSymbols.length === 0
                ? 'No single-symbol snapshots yet.'
                : 'No symbols match your search.'}
            </p>
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

