/**
 * Strategy Detail Page Component
 * Shows strategy details and allows backtesting
 */

import { useParams } from 'react-router-dom';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import Chart from 'react-apexcharts';
import {
  TrendingUp,
  Code,
  Settings,
  ChevronLeft,
  ChevronRight,
  Rocket,
  Trash2,
  List,
  Search,
  Loader,
} from 'lucide-react';
import {
  getStrategy,
  getStrategySnapshotSymbols,
  getStrategySymbolRunParameterSets,
  deleteStrategySymbolRunParameterSet,
  deleteAllStrategySymbolSnapshots,
  getStrategySymbolRunSharpeHeatmap,
  getPortfolioBacktestForParameterSet,
  runPortfolioBacktestFromParameterSet,
} from '../data/strategies';
import BacktestConfig from '../components/BacktestConfig';
import SymbolCard from '../components/SymbolCard';
import DeployStrategyModal from '../components/DeployStrategyModal';
import PortfolioRunModal from '../components/PortfolioRunModal';
import TaskProgress from '../components/TaskProgress';
import BackButton from '../components/BackButton';
import { useNavigateBack } from '../lib/navigation';

export default function StrategyDetail() {
  const { id } = useParams();
  const { goBack, navigateWithReturn } = useNavigateBack('/strategies');
  const [strategy, setStrategy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [snapshotSymbols, setSnapshotSymbols] = useState([]);
  const [snapshotSymbolsCount, setSnapshotSymbolsCount] = useState(0);
  const [snapshotSymbolsLoading, setSnapshotSymbolsLoading] = useState(false);
  const [snapshotSearch, setSnapshotSearch] = useState('');
  const [snapshotPage, setSnapshotPage] = useState(1);
  const [snapshotParameterSets, setSnapshotParameterSets] = useState([]);
  const [selectedSnapshotParameterSet, setSelectedSnapshotParameterSet] = useState('');
  const [riskScatter, setRiskScatter] = useState(null);
  const [riskScatterLoading, setRiskScatterLoading] = useState(false);
  const [riskScatterTab, setRiskScatterTab] = useState('long');
  const SNAPSHOT_PAGE_SIZE = 20;
  const [deletingAllSnapshots, setDeletingAllSnapshots] = useState(false);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [portfolioBacktest, setPortfolioBacktest] = useState(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioRunning, setPortfolioRunning] = useState(false);
  const [portfolioTaskId, setPortfolioTaskId] = useState(null);
  const [showPortfolioTaskProgress, setShowPortfolioTaskProgress] = useState(false);
  const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);
  const riskScatterLoadedForRef = useRef('');
  const didInitSnapshotsRef = useRef(false);
  /** Prevents a slow in-flight snapshot request from overwriting a newer search/page result. */
  const snapshotSymbolsFetchIdRef = useRef(0);

  const loadSnapshotParameterSets = useCallback(
    async ({ preferParameterSet = null } = {}) => {
      const rows = await getStrategySymbolRunParameterSets(id);
      const list = Array.isArray(rows) ? rows : [];
      const named = list.filter((ps) => ps && ps.signature && ps.label && String(ps.label).trim());
      setSnapshotParameterSets(named);

      const prefer = preferParameterSet ? String(preferParameterSet) : '';
      const current = selectedSnapshotParameterSet ? String(selectedSnapshotParameterSet) : '';
      const pick = (sig) => named.some((ps) => ps.signature === sig);
      const chosen = (prefer && pick(prefer))
        ? prefer
        : (current && pick(current))
          ? current
          : (named[0]?.signature || '');

      if (chosen !== current) setSelectedSnapshotParameterSet(chosen);
      return chosen;
    },
    [id, selectedSnapshotParameterSet],
  );

  const loadSnapshotSymbolsPage = useCallback(
    async ({ parameterSet, page, search } = {}) => {
      const ps = parameterSet ? String(parameterSet) : '';
      if (!ps) {
        setSnapshotSymbols([]);
        setSnapshotSymbolsCount(0);
        return;
      }
      const effectivePage = Number(page) || 1;
      const effectiveSearch = search != null ? String(search) : '';
      const requestId = ++snapshotSymbolsFetchIdRef.current;
      setSnapshotSymbolsLoading(true);
      try {
        const resp = await getStrategySnapshotSymbols(id, {
          parameterSet: ps,
          page: effectivePage,
          pageSize: SNAPSHOT_PAGE_SIZE,
          search: effectiveSearch,
        });
        if (requestId !== snapshotSymbolsFetchIdRef.current) {
          return;
        }
        setSnapshotSymbols(Array.isArray(resp?.results) ? resp.results : []);
        setSnapshotSymbolsCount(Number(resp?.count) || 0);
      } finally {
        if (requestId === snapshotSymbolsFetchIdRef.current) {
          setSnapshotSymbolsLoading(false);
        }
      }
    },
    [id],
  );

  const loadRiskScatter = useCallback(
    async ({ parameterSet, force = false } = {}) => {
      const ps = parameterSet ? String(parameterSet) : '';
      if (!ps) {
        setRiskScatter(null);
        return;
      }
      if (!force && riskScatterLoadedForRef.current === ps) return;
      setRiskScatterLoading(true);
      try {
        const hm = await getStrategySymbolRunSharpeHeatmap(id, ps);
        setRiskScatter(hm && typeof hm === 'object' ? hm : null);
        riskScatterLoadedForRef.current = ps;
      } catch (e) {
        console.error(e);
        setRiskScatter(null);
        riskScatterLoadedForRef.current = ps;
      } finally {
        setRiskScatterLoading(false);
      }
    },
    [id],
  );

  const refreshAllSnapshotPanels = useCallback(
    async ({ preferParameterSet = null } = {}) => {
      try {
        const chosen = await loadSnapshotParameterSets({ preferParameterSet });
        const ps = chosen || '';
        await loadSnapshotSymbolsPage({ parameterSet: ps, page: 1, search: '' });
        await loadRiskScatter({ parameterSet: ps, force: true });
      } catch (e) {
        console.error(e);
        setSnapshotParameterSets([]);
        setSnapshotSymbols([]);
        setSnapshotSymbolsCount(0);
        setRiskScatter(null);
      }
    },
    [loadSnapshotParameterSets, loadSnapshotSymbolsPage, loadRiskScatter],
  );

  const loadPortfolioBacktest = useCallback(
    async (parameterSet) => {
      const ps = parameterSet ? String(parameterSet) : '';
      if (!ps || !id) {
        setPortfolioBacktest(null);
        return;
      }
      setPortfolioLoading(true);
      try {
        const data = await getPortfolioBacktestForParameterSet(id, ps);
        setPortfolioBacktest(data?.portfolio_backtest || null);
      } catch (e) {
        console.error(e);
        setPortfolioBacktest(null);
      } finally {
        setPortfolioLoading(false);
      }
    },
    [id],
  );

  const handlePortfolioModalSubmit = async ({ name, num_monte_carlo_paths }) => {
    if (!selectedSnapshotParameterSet) return;
    setPortfolioRunning(true);
    setPortfolioModalOpen(false);
    try {
      const data = await runPortfolioBacktestFromParameterSet(id, selectedSnapshotParameterSet, {
        name,
        num_monte_carlo_paths,
      });
      const bt = data?.portfolio_backtest;
      setPortfolioBacktest(bt || null);
      const tid = bt?.task_id;
      if (tid) {
        setPortfolioTaskId(tid);
        setShowPortfolioTaskProgress(true);
      } else if (bt?.id) {
        navigateWithReturn(`/strategies/${id}/backtests/${bt.id}`);
      }
    } catch (e) {
      alert(e.message || 'Failed to start portfolio backtest');
    } finally {
      setPortfolioRunning(false);
    }
  };

  const selectedParameterSetMeta = useMemo(
    () => snapshotParameterSets.find((ps) => ps.signature === selectedSnapshotParameterSet),
    [snapshotParameterSets, selectedSnapshotParameterSet],
  );

  const portfolioConfigSummary = useMemo(() => {
    if (!portfolioBacktest) return null;
    return {
      initial_capital: portfolioBacktest.initial_capital,
      bet_size_percentage: portfolioBacktest.bet_size_percentage,
      split_ratio: portfolioBacktest.split_ratio,
      position_modes: portfolioBacktest.position_modes,
    };
  }, [portfolioBacktest]);

  useEffect(() => {
    loadStrategy();
  }, [id]);

  useEffect(() => {
    // Strategy changed: reset snapshots UI to defaults, then fetch page 1.
    riskScatterLoadedForRef.current = '';
    didInitSnapshotsRef.current = false;
    snapshotSymbolsFetchIdRef.current += 1;
    setSnapshotSearch('');
    setSnapshotPage(1);
    setSnapshotSymbols([]);
    setSnapshotSymbolsCount(0);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    // Initial load: parameter sets -> select -> page 1 + scatter once.
    (async () => {
      if (didInitSnapshotsRef.current) return;
      didInitSnapshotsRef.current = true;
      try {
        const chosen = await loadSnapshotParameterSets();
        // Do not load the snapshot list here: that request can finish after a user search and
        // replace filtered results. The effect below refetches when the global test + page + search are set.
        if (!chosen) {
          setSnapshotSymbols([]);
          setSnapshotSymbolsCount(0);
        }
        await loadRiskScatter({ parameterSet: chosen, force: true });
      } catch (e) {
        console.error(e);
        setSnapshotParameterSets([]);
        setSnapshotSymbols([]);
        setSnapshotSymbolsCount(0);
        setRiskScatter(null);
      }
    })();
  }, [id, loadSnapshotParameterSets, loadSnapshotSymbolsPage, loadRiskScatter]);

  useEffect(() => {
    if (!id) return;
    if (!didInitSnapshotsRef.current) return;
    if (!selectedSnapshotParameterSet) return;
    // Page / search / global test changes refetch cards.
    loadSnapshotSymbolsPage({
      parameterSet: selectedSnapshotParameterSet,
      page: snapshotPage,
      search: snapshotSearch,
    });
  }, [id, snapshotPage, snapshotSearch, selectedSnapshotParameterSet, loadSnapshotSymbolsPage]);

  useEffect(() => {
    if (!selectedSnapshotParameterSet) {
      setPortfolioBacktest(null);
      return;
    }
    loadPortfolioBacktest(selectedSnapshotParameterSet);
  }, [selectedSnapshotParameterSet, loadPortfolioBacktest]);

  useEffect(() => {
    if (!portfolioBacktest || !['pending', 'running'].includes(portfolioBacktest.status)) return undefined;
    const interval = setInterval(() => {
      loadPortfolioBacktest(selectedSnapshotParameterSet);
    }, 3000);
    return () => clearInterval(interval);
  }, [portfolioBacktest?.status, portfolioBacktest?.id, selectedSnapshotParameterSet, loadPortfolioBacktest]);

  const snapshotTotalPages = Math.max(1, Math.ceil((snapshotSymbolsCount || 0) / SNAPSHOT_PAGE_SIZE));

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

  const handleStrategyBacktestCreated = (backtest, ctx) => {
    if (ctx?.runMode === 'single_symbol_bulk') {
      const ps = ctx?.parameterSet ? String(ctx.parameterSet) : '';
      if (ps) {
        setSelectedSnapshotParameterSet(ps);
      }
      const q = Array.isArray(ctx?.queued)
        ? ctx.queued.find((x) => x && x.ticker && (x.run_id || x.id))
        : null;
      riskScatterLoadedForRef.current = '';
      setSnapshotPage(1);
      refreshAllSnapshotPanels({ preferParameterSet: ps || null });
      if (q) {
        navigateWithReturn(`/strategies/${id}/${q.ticker}?run=${q.run_id || q.id}`);
      } else {
        navigateWithReturn(`/strategies/${id}`);
      }
      return;
    }
    if (ctx?.runMode === 'single_symbol' && ctx?.ticker && backtest?.id) {
      refreshAllSnapshotPanels();
      navigateWithReturn(`/strategies/${id}/${ctx.ticker}?run=${backtest.id}`);
      return;
    }
    if (backtest?.id) {
      navigateWithReturn(`/strategies/${id}/backtests/${backtest.id}`);
      refreshAllSnapshotPanels();
      return;
    }
    navigateWithReturn(`/strategies/${id}`);
    refreshAllSnapshotPanels();
  };

  const handleDeleteAllSnapshots = async () => {
    if (!strategy || snapshotSymbols.length === 0) return;
    if (selectedSnapshotParameterSet) {
      const ps = snapshotParameterSets.find((x) => x.signature === selectedSnapshotParameterSet);
      const label = (ps?.label && String(ps.label).trim()) || selectedSnapshotParameterSet;
      const msg = `Delete global test "${label}"?\n\nThis deletes the global test and every snapshot run linked to it (all symbols). Portfolio backtests are not affected. This cannot be undone.`;
      if (!window.confirm(msg)) return;
      setDeletingAllSnapshots(true);
      try {
        await deleteStrategySymbolRunParameterSet(parseInt(id, 10), selectedSnapshotParameterSet);
        setSelectedSnapshotParameterSet('');
        setSnapshotSearch('');
        setSnapshotPage(1);
        riskScatterLoadedForRef.current = '';
        didInitSnapshotsRef.current = false;
        await refreshAllSnapshotPanels();
      } catch (e) {
        console.error(e);
        alert(e.message || 'Failed to delete global test');
      } finally {
        setDeletingAllSnapshots(false);
      }
      return;
    }

    const msg = `Delete every single-symbol snapshot run for "${strategy.name}"?\n\nThis removes all saved per-symbol backtests for this strategy (every symbol, every run). Portfolio backtests are not affected. This cannot be undone.`;
    if (!window.confirm(msg)) return;
    setDeletingAllSnapshots(true);
    try {
      await deleteAllStrategySymbolSnapshots(parseInt(id, 10));
      setSnapshotSearch('');
      setSnapshotPage(1);
      setSelectedSnapshotParameterSet('');
      riskScatterLoadedForRef.current = '';
      didInitSnapshotsRef.current = false;
      await refreshAllSnapshotPanels();
    } catch (e) {
      console.error(e);
      alert(e.message || 'Failed to delete snapshot runs');
    } finally {
      setDeletingAllSnapshots(false);
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
          <p className="text-ink-secondary">Strategy not found</p>
          <button
            onClick={goBack}
            className="mt-4 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover"
          >
            Back to Strategies
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BackButton to="/strategies" label="Back to Strategies" className="mb-6 flex items-center gap-2 text-ink-secondary hover:text-ink" iconClassName="w-4 h-4" />

      <div className="bg-surface rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-ink mb-2">{strategy.name}</h1>
            {strategy.description_short && (
              <p className="text-lg text-ink-secondary mb-4">{strategy.description_short}</p>
            )}
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              strategy.globally_enabled
                ? 'bg-profit-soft text-profit-ink'
                : 'bg-surface-sunken text-ink'
            }`}>
              {strategy.globally_enabled ? 'Globally Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center shrink-0">
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
            <h2 className="text-xl font-semibold text-ink mb-3 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Description
            </h2>
            <div className="prose max-w-none">
              <p className="text-ink-secondary whitespace-pre-line">{strategy.description_long.trim()}</p>
            </div>
          </div>
        )}

        {/* Analytical Tools Used */}
        {strategy.analytic_tools_used && strategy.analytic_tools_used.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-ink mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Required Indicators
            </h2>
            <div className="flex flex-wrap gap-2">
              {strategy.analytic_tools_used.map((tool) => (
                <span
                  key={tool}
                  className="px-4 py-2 bg-accent-soft text-accent-ink rounded-lg font-medium"
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
            <h2 className="text-xl font-semibold text-ink mb-3 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Default Parameters
            </h2>
            <div className="bg-bg rounded-lg p-4">
              <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(strategy.default_parameters).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-sm font-medium text-ink-tertiary capitalize mb-1">
                      {key.replace(/_/g, ' ')}
                    </dt>
                    <dd className="text-lg font-semibold text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}

        {/* Example Code */}
        {strategy.example_code && (
          <div>
            <h2 className="text-xl font-semibold text-ink mb-3 flex items-center gap-2">
              <Code className="w-5 h-5" />
              Example Code
            </h2>
            <div className="bg-surface-sunken rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-ink whitespace-pre-wrap">
                {strategy.example_code.trim()}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Global tests hub */}
      <div className="mb-6 bg-surface rounded-lg shadow-lg p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-ink flex items-center gap-2">
              <List className="w-5 h-5 shrink-0" />
              Global tests
            </h2>
            <p className="text-sm text-ink-secondary mt-1">
              Single-symbol runs first, then portfolio with shared capital and order-variance simulation.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {selectedSnapshotParameterSet && (
              <button
                type="button"
                onClick={() => setDeployModalOpen(true)}
                disabled={snapshotSymbolsLoading}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border border-accent-soft text-accent-ink bg-accent-soft hover:bg-status-running-soft disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                <Rocket className="w-4 h-4" />
                Deploy
              </button>
            )}
            {(snapshotSymbols.length > 0 || selectedSnapshotParameterSet) && (
              <button
                type="button"
                onClick={handleDeleteAllSnapshots}
                disabled={deletingAllSnapshots || snapshotSymbolsLoading}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border border-loss text-loss-ink bg-loss-soft hover:bg-loss-soft disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                <Trash2 className="w-4 h-4" />
                {deletingAllSnapshots ? 'Deleting…' : 'Delete test'}
              </button>
            )}
          </div>
        </div>

        {/* Step 1 — Config */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-tertiary mb-2">Step 1 — Select global test</p>
          <label className="text-sm block">
            <select
              value={selectedSnapshotParameterSet}
              onChange={(e) => {
                const next = e.target.value;
                setSelectedSnapshotParameterSet(next);
                setSnapshotPage(1);
                riskScatterLoadedForRef.current = '';
                loadRiskScatter({ parameterSet: next, force: true });
              }}
              className="w-full px-3 py-3 border border-border-strong rounded-lg bg-surface focus:ring-2 focus:ring-accent focus:border-transparent"
            >
              {snapshotParameterSets.length === 0 && (
                <option value="">No global tests yet — run single-symbol backtest</option>
              )}
              {snapshotParameterSets.map((ps) => (
                <option key={ps.signature} value={ps.signature}>
                  {String(ps.label).trim()}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Step 3 — Portfolio (before symbol grid for visibility) */}
        {selectedSnapshotParameterSet && (
          <div className="mb-6 rounded-lg border border-border bg-bg p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-tertiary mb-2">Step 3 — Portfolio backtest</p>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm text-ink-secondary">
                  Shared bankroll across {snapshotSymbolsCount || 0} symbol(s). Params locked to this global test.
                </p>
                {portfolioLoading ? (
                  <p className="text-sm text-ink-secondary flex items-center gap-2 mt-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    Loading…
                  </p>
                ) : portfolioBacktest ? (
                  <p className="text-sm text-ink mt-2">
                    Status: <span className="font-medium capitalize">{portfolioBacktest.status}</span>
                    {portfolioBacktest.monte_carlo_num_paths != null
                      ? ` · MC paths: ${portfolioBacktest.monte_carlo_num_paths}`
                      : ''}
                  </p>
                ) : (
                  <p className="text-sm text-ink-tertiary mt-2">
                    {snapshotSymbolsCount < 2
                      ? 'Need at least 2 completed single-symbol runs.'
                      : 'Not run yet.'}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                {portfolioBacktest?.id && (
                  <button
                    type="button"
                    onClick={() =>
                      navigateWithReturn(`/strategies/${id}/backtests/${portfolioBacktest.id}`)
                    }
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border border-border-strong text-ink bg-surface hover:bg-surface-sunken min-h-[44px]"
                  >
                    View results
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPortfolioModalOpen(true)}
                  disabled={portfolioRunning || portfolioLoading || snapshotSymbolsCount < 2}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg bg-accent text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {portfolioRunning ? <Loader className="w-4 h-4 animate-spin" /> : null}
                  {portfolioBacktest ? 'Retest portfolio' : 'Run portfolio'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — Singles */}
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-tertiary mb-2">
            Step 2 — Single-symbol runs ({snapshotSymbolsCount || 0})
          </p>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-tertiary w-5 h-5" />
            <input
              type="text"
              value={snapshotSearch}
              onChange={handleSnapshotSearchChange}
              placeholder="Search symbols by ticker..."
              className="w-full pl-10 pr-4 py-3 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
            />
            {snapshotSearch && (
              <button
                type="button"
                onClick={() => {
                  setSnapshotSearch('');
                  setSnapshotPage(1);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-ink-tertiary hover:text-ink-secondary"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {snapshotSymbolsLoading ? (
          <div className="text-center py-12">
            <Loader className="w-8 h-8 animate-spin mx-auto text-accent" />
            <p className="text-ink-secondary mt-4">Loading symbols...</p>
          </div>
        ) : snapshotSymbols.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {snapshotSymbols.map((sym, index) => {
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
                          navigateWithReturn(
                            `/strategies/${id}/${encodeURIComponent(s.ticker)}?run=${s.latest_run_id}`,
                          );
                        } else {
                          navigateWithReturn(`/strategies/${id}/${encodeURIComponent(s.ticker)}`);
                        }
                      }}
                    />
                  </motion.div>
                );
              })}
            </div>

            {snapshotTotalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setSnapshotPage((p) => Math.max(1, p - 1));
                  }}
                  disabled={snapshotPage <= 1}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    snapshotPage > 1
                      ? 'bg-surface-sunken text-ink-secondary hover:bg-surface-sunken'
                      : 'bg-bg text-ink-tertiary cursor-not-allowed'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <span className="text-sm text-ink-secondary">
                  Page {snapshotPage} of {snapshotTotalPages} ({snapshotSymbolsCount || 0} total)
                </span>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setSnapshotPage((p) => Math.min(snapshotTotalPages, p + 1));
                  }}
                  disabled={snapshotPage >= snapshotTotalPages}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    snapshotPage < snapshotTotalPages
                      ? 'bg-surface-sunken text-ink-secondary hover:bg-surface-sunken'
                      : 'bg-bg text-ink-tertiary cursor-not-allowed'
                  }`}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 bg-bg rounded-lg">
            <p className="text-ink-tertiary text-lg">
              {snapshotSymbolsCount === 0 ? 'No single-symbol snapshots yet.' : 'No symbols match your search.'}
            </p>
          </div>
        )}

        {selectedSnapshotParameterSet && (
          <div className="mt-6 border border-border rounded-lg p-4 bg-surface">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-sm font-semibold text-ink">Sharpe vs Max Drawdown (scatter)</h3>
              {riskScatterLoading && (
                <div className="flex items-center gap-2 text-xs text-ink-secondary">
                  <Loader className="w-4 h-4 animate-spin" />
                  Loading…
                </div>
              )}
            </div>

            {riskScatter && Array.isArray(riskScatter.cells) && riskScatter.cells.length > 0 ? (
              <div className="overflow-x-auto">
                <div className="min-w-[900px]">
                  {(() => {
                    const tab = riskScatterTab === 'short' ? 'short' : 'long';
                    const modeLabel = tab === 'short' ? 'SHORT' : 'LONG';
                    const points = riskScatter.cells
                      .map((c) => {
                        const m = tab === 'short' ? c?.short : c?.long;
                        const dd = m?.max_drawdown == null ? null : Number(m.max_drawdown);
                        const sh = m?.sharpe == null ? null : Number(m.sharpe);
                        return {
                          // Keep ticker in a dedicated field; ApexCharts sometimes treats x/y specially.
                          _ticker: c.ticker,
                          x: dd,
                          y: sh,
                        };
                      })
                      .filter((p) => p._ticker && p.x != null && p.y != null && !Number.isNaN(p.x) && !Number.isNaN(p.y));

                    const axisRange = (vals, { padFrac = 0.05, fallbackMin = 0, fallbackMax = 1 } = {}) => {
                      if (!Array.isArray(vals) || vals.length === 0) return { min: fallbackMin, max: fallbackMax };
                      let mn = Infinity;
                      let mx = -Infinity;
                      for (const v of vals) {
                        if (v == null || Number.isNaN(v)) continue;
                        if (v < mn) mn = v;
                        if (v > mx) mx = v;
                      }
                      if (!Number.isFinite(mn) || !Number.isFinite(mx)) return { min: fallbackMin, max: fallbackMax };
                      if (mn === mx) {
                        const bump = mn === 0 ? 1 : Math.abs(mn) * 0.25;
                        return { min: mn - bump, max: mx + bump };
                      }
                      const pad = (mx - mn) * padFrac;
                      return { min: mn - pad, max: mx + pad };
                    };

                    const ddRange = axisRange(points.map((p) => p.x), { fallbackMin: 0, fallbackMax: 10 });
                    const shRange = axisRange(points.map((p) => p.y), { fallbackMin: -1, fallbackMax: 2 });

                    // Color points by 2D buckets (Sharpe row x abs(drawdown) column)
                    // Sharpe buckets:
                    //  S3: > 2.0
                    //  S2: 1.0–2.0
                    //  S1: 0–1.0
                    //  S0: < 0
                    // Drawdown buckets (ABS value, %):
                    //  D1: 0–20
                    //  D2: 20–40
                    //  D3: 40–60
                    //  D4: > 60
                    const bucketColor = ({ sharpe, maxDrawdown }) => {
                      const sh = Number(sharpe);
                      const dd = Math.abs(Number(maxDrawdown));
                      if (Number.isNaN(sh) || Number.isNaN(dd)) return '#9ca3af'; // gray fallback

                      const s =
                        sh > 2 ? 3
                        : sh >= 1 ? 2
                        : sh >= 0 ? 1
                        : 0;
                      const d =
                        dd <= 20 ? 1
                        : dd <= 40 ? 2
                        : dd <= 60 ? 3
                        : 4;

                      // Grid colors (matching your spec)
                      // rows: S3..S0, cols: D1..D4
                      if (s === 3) {
                        if (d === 1) return '#22c55e'; // 🟢🟢 -> green
                        if (d === 2) return '#22c55e'; // 🟢
                        if (d === 3) return '#eab308'; // 🟡
                        return '#f97316'; // 🟠
                      }
                      if (s === 2) {
                        if (d === 1) return '#22c55e'; // 🟢
                        if (d === 2) return '#eab308'; // 🟡
                        if (d === 3) return '#f97316'; // 🟠
                        return '#ef4444'; // 🔴
                      }
                      if (s === 1) {
                        if (d === 1) return '#eab308'; // 🟡
                        if (d === 2) return '#f97316'; // 🟠
                        return '#ef4444'; // 🔴 (D3/D4)
                      }
                      // s === 0
                      if (d === 4) return '#111827'; // ⚫
                      return '#ef4444'; // 🔴
                    };
                    const discreteMarkers = points.map((p, i) => ({
                      seriesIndex: 0,
                      dataPointIndex: i,
                      fillColor: bucketColor({ sharpe: p.y, maxDrawdown: p.x }),
                      strokeColor: bucketColor({ sharpe: p.y, maxDrawdown: p.x }),
                      size: 2,
                    }));

                    return (
                      <>
                        <div className="flex items-center gap-2 mb-3">
                          <button
                            type="button"
                            onClick={() => setRiskScatterTab('long')}
                            className={`px-3 py-1.5 text-sm rounded-md border ${
                              riskScatterTab === 'long'
                                ? 'bg-surface border-border-strong text-ink shadow-sm'
                                : 'bg-transparent border-transparent text-ink-secondary hover:text-ink'
                            }`}
                          >
                            LONG
                          </button>
                          <button
                            type="button"
                            onClick={() => setRiskScatterTab('short')}
                            className={`px-3 py-1.5 text-sm rounded-md border ${
                              riskScatterTab === 'short'
                                ? 'bg-surface border-border-strong text-ink shadow-sm'
                                : 'bg-transparent border-transparent text-ink-secondary hover:text-ink'
                            }`}
                          >
                            SHORT
                          </button>
                          <span className="text-xs text-ink-secondary ml-auto">
                            Showing {points.length} symbol(s)
                          </span>
                        </div>

                  <Chart
                    type="scatter"
                    height={460}
                    series={[
                      {
                        name: modeLabel,
                        data: points,
                      },
                    ]}
                    options={{
                      chart: {
                        type: 'scatter',
                        animations: { enabled: false },
                        toolbar: { show: true },
                        zoom: { enabled: false },
                        events: {
                          dataPointSelection: (_event, chartContext, config) => {
                            try {
                              const pIdx = config?.dataPointIndex;
                              const point = chartContext?.w?.config?.series?.[0]?.data?.[pIdx];
                              const ticker = point?._ticker;
                              if (!ticker) return;
                              navigateWithReturn(`/strategies/${id}/${encodeURIComponent(ticker)}`);
                            } catch (e) {
                              console.error(e);
                            }
                          },
                        },
                      },
                      legend: { show: true, position: 'top' },
                      markers: {
                        size: 2,
                        strokeWidth: 0,
                        fillOpacity: 0.85,
                        discrete: discreteMarkers,
                      },
                      xaxis: {
                        title: { text: 'Max drawdown (%)' },
                        labels: { formatter: (v) => Number(v).toFixed(1) },
                        min: ddRange.min,
                        max: ddRange.max,
                      },
                      yaxis: {
                        title: { text: 'Sharpe ratio' },
                        labels: { formatter: (v) => Number(v).toFixed(2) },
                        min: shRange.min,
                        max: shRange.max,
                      },
                      tooltip: {
                        custom: ({ seriesIndex, dataPointIndex, w }) => {
                          const p = w?.config?.series?.[seriesIndex]?.data?.[dataPointIndex];
                          if (!p) return '';
                          const mode = w?.config?.series?.[seriesIndex]?.name || '';
                          const dd = Number(p.x);
                          const sh = Number(p.y);
                          return `
                            <div style="padding:8px 10px;">
                              <div style="font-weight:600; margin-bottom:4px;">${p._ticker} · ${mode}</div>
                              <div>Max DD: ${Number.isNaN(dd) ? '—' : dd.toFixed(2)}%</div>
                              <div>Sharpe: ${Number.isNaN(sh) ? '—' : sh.toFixed(2)}</div>
                            </div>
                          `;
                        },
                      },
                    }}
                  />
                  <div className="mt-3 overflow-x-auto">
                    <div className="min-w-[560px] text-xs text-ink-secondary">
                      <div className="font-medium mb-2">Color = Sharpe bucket × |Max drawdown| bucket</div>
                      <div className="grid grid-cols-[120px_repeat(4,1fr)] gap-2 items-center">
                        <div />
                        <div className="text-center">0–20%</div>
                        <div className="text-center">20–40%</div>
                        <div className="text-center">40–60%</div>
                        <div className="text-center">&gt; 60%</div>

                        <div className="font-medium">Sharpe &gt; 2</div>
                        <div className="h-5 rounded" style={{ backgroundColor: '#22c55e' }} />
                        <div className="h-5 rounded" style={{ backgroundColor: '#22c55e' }} />
                        <div className="h-5 rounded" style={{ backgroundColor: '#eab308' }} />
                        <div className="h-5 rounded" style={{ backgroundColor: '#f97316' }} />

                        <div className="font-medium">Sharpe 1–2</div>
                        <div className="h-5 rounded" style={{ backgroundColor: '#22c55e' }} />
                        <div className="h-5 rounded" style={{ backgroundColor: '#eab308' }} />
                        <div className="h-5 rounded" style={{ backgroundColor: '#f97316' }} />
                        <div className="h-5 rounded" style={{ backgroundColor: '#ef4444' }} />

                        <div className="font-medium">Sharpe 0–1</div>
                        <div className="h-5 rounded" style={{ backgroundColor: '#eab308' }} />
                        <div className="h-5 rounded" style={{ backgroundColor: '#f97316' }} />
                        <div className="h-5 rounded" style={{ backgroundColor: '#ef4444' }} />
                        <div className="h-5 rounded" style={{ backgroundColor: '#ef4444' }} />

                        <div className="font-medium">Sharpe &lt; 0</div>
                        <div className="h-5 rounded" style={{ backgroundColor: '#ef4444' }} />
                        <div className="h-5 rounded" style={{ backgroundColor: '#ef4444' }} />
                        <div className="h-5 rounded" style={{ backgroundColor: '#ef4444' }} />
                        <div className="h-5 rounded" style={{ backgroundColor: '#111827' }} />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-ink-secondary mt-2">
                    Tip: click a point to open the symbol page.
                  </p>
                      </>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-secondary">
                No statistics yet for this global test (runs may still be running or missing statistics).
              </p>
            )}
          </div>
        )}
      </div>

      {showPortfolioTaskProgress && portfolioTaskId && (
        <TaskProgress
          taskId={portfolioTaskId}
          onComplete={() => {
            setShowPortfolioTaskProgress(false);
            setPortfolioTaskId(null);
            loadPortfolioBacktest(selectedSnapshotParameterSet);
          }}
          onClose={() => {
            setShowPortfolioTaskProgress(false);
            setPortfolioTaskId(null);
            loadPortfolioBacktest(selectedSnapshotParameterSet);
          }}
        />
      )}

      <PortfolioRunModal
        open={portfolioModalOpen}
        onClose={() => setPortfolioModalOpen(false)}
        onSubmit={handlePortfolioModalSubmit}
        parameterSetLabel={selectedParameterSetMeta?.label || ''}
        configSummary={portfolioConfigSummary}
        symbolCount={snapshotSymbolsCount}
        isRetest={Boolean(portfolioBacktest)}
        submitting={portfolioRunning}
      />

      <DeployStrategyModal
        open={deployModalOpen}
        onClose={() => setDeployModalOpen(false)}
        strategyId={id ? Number(id) : null}
        strategyName={strategy?.name}
        parameterSet={selectedSnapshotParameterSet}
        parameterSetLabel={
          snapshotParameterSets.find(
            (ps) => ps.signature === selectedSnapshotParameterSet,
          )?.label
        }
        defaultPositionMode={riskScatterTab === 'short' ? 'short' : 'long'}
      />
    </div>
  );
}

