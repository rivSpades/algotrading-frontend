/**
 * Deployment Detail Page (v2)
 *
 * Data loads per tab: deployment header + KPI statistics fetch on load; tab panels
 * (trading history, holdings, symbols, logging) fetch their own data when selected.
 */

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import BackButton from '../components/BackButton';
import { useNavigateBack } from '../lib/navigation';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader,
  Play,
  RefreshCw,
  Square,
  TrendingUp,
  Trash2,
} from 'lucide-react';

import {
  HedgeQtySplitBodyCells,
  HedgeQtySplitHeaderCells,
  HedgeTradeInvestedHeaderCells,
  HedgeTradeInvestedBodyCells,
  HedgeTradePnlHeaderCells,
  HedgeTradePnlBodyCells,
  exitRowHybridRoiFromInvested,
  exitRowHybridTotalPnlUsd,
} from '../components/BacktestHedgeTradeTableCols';
import {
  activateStrategyDeployment,
  deleteStrategyDeployment,
  disableDeploymentSymbol,
  enableDeploymentSymbol,
  getDeploymentStatistics,
  getStrategyDeployment,
  listDeploymentEvents,
  listDeploymentSymbols,
  listLiveTrades,
  manualCloseLiveTrade,
  promoteStrategyDeployment,
  updateDeploymentPositions,
  waitForLiveTradeCloseReconcile,
  stopStrategyDeployment,
} from '../data/strategyDeployments';
import { buildChronologicalTradeTableRows } from '../utils/chronologicalTradeTableRows';

const STATUS_BADGE = {
  pending: 'bg-surface-sunken text-ink-secondary',
  active: 'bg-profit-soft text-profit-ink',
  evaluating: 'bg-status-running-soft text-accent-ink',
  passed: 'bg-status-success-soft text-emerald-700',
  failed: 'bg-loss-soft text-loss-ink',
  paused: 'bg-status-pending-soft text-status-pending',
  stopped: 'bg-surface-sunken text-ink-secondary',
};

const EVENTS_PAGE_SIZE = 50;
const TRADES_PAGE_SIZE = 25;
const SYMBOLS_PAGE_SIZE = 50;

const DEPLOYMENT_TABS = [
  { key: 'trading-history', label: 'Trading history' },
  { key: 'holdings', label: 'Holdings' },
  { key: 'symbols', label: 'Symbols' },
  { key: 'logging', label: 'Logging' },
];

export default function DeploymentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { goBack } = useNavigateBack('/deployments');

  const [deployment, setDeployment] = useState(null);
  const [headerLoading, setHeaderLoading] = useState(true);
  const [tab, setTab] = useState('trading-history');

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [trades, setTrades] = useState({ results: [], count: 0, next: null, previous: null });
  const [tradesPage, setTradesPage] = useState(1);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [holdings, setHoldings] = useState({ results: [], count: 0, next: null, previous: null });
  const [holdingsPage, setHoldingsPage] = useState(1);
  const [holdingsLoading, setHoldingsLoading] = useState(false);
  const [tradeListStatus, setTradeListStatus] = useState('');
  const [entryAfterFilter, setEntryAfterFilter] = useState('');
  const [entryBeforeFilter, setEntryBeforeFilter] = useState('');

  const [logs, setLogs] = useState({ results: [], count: 0, next: null, previous: null });
  const [logPage, setLogPage] = useState(1);
  const [logEventTypeFilter, setLogEventTypeFilter] = useState('');
  const [logsLoading, setLogsLoading] = useState(false);

  const [symbols, setSymbols] = useState({ results: [], count: 0, next: null, previous: null });
  const [symbolsPage, setSymbolsPage] = useState(1);
  const [symbolsLoading, setSymbolsLoading] = useState(false);
  const [symbolActionId, setSymbolActionId] = useState(null);

  const [actionInFlight, setActionInFlight] = useState(false);
  const [closingTradeId, setClosingTradeId] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const loadHeader = useCallback(async () => {
    setHeaderLoading(true);
    setError(null);
    try {
      const dep = await getStrategyDeployment(id);
      setDeployment(dep);
    } catch (err) {
      setError(err.message || 'Failed to load deployment');
      setDeployment(null);
    } finally {
      setHeaderLoading(false);
    }
  }, [id]);

  const loadStatsOnly = useCallback(async () => {
    setStatsLoading(true);
    setError(null);
    try {
      const st = await getDeploymentStatistics(id);
      setStats(st);
    } catch (err) {
      setError(err.message || 'Failed to load statistics');
    } finally {
      setStatsLoading(false);
    }
  }, [id]);

  const loadTradingHistory = useCallback(async () => {
    setTradesLoading(true);
    setError(null);
    try {
      const tr = await listLiveTrades({
        deploymentId: id,
        page: tradesPage,
        pageSize: TRADES_PAGE_SIZE,
        omitHedgeLegs: true,
        status: tradeListStatus || undefined,
        entryAfter: entryAfterFilter || undefined,
        entryBefore: entryBeforeFilter || undefined,
      });
      setTrades(tr);
    } catch (err) {
      setError(err.message || 'Failed to load trading history');
    } finally {
      setTradesLoading(false);
    }
  }, [id, tradesPage, tradeListStatus, entryAfterFilter, entryBeforeFilter]);

  const loadHoldings = useCallback(async () => {
    setHoldingsLoading(true);
    setError(null);
    try {
      const h = await listLiveTrades({
        deploymentId: id,
        page: holdingsPage,
        pageSize: TRADES_PAGE_SIZE,
        openOnly: true,
        omitHedgeLegs: true,
      });
      setHoldings(h);
    } catch (err) {
      setError(err.message || 'Failed to load holdings');
    } finally {
      setHoldingsLoading(false);
    }
  }, [id, holdingsPage]);

  const loadLogging = useCallback(async () => {
    setLogsLoading(true);
    setError(null);
    try {
      const ev = await listDeploymentEvents(id, {
        page: logPage,
        pageSize: EVENTS_PAGE_SIZE,
        eventType: logEventTypeFilter || null,
      });
      setLogs(ev);
    } catch (err) {
      setError(err.message || 'Failed to load event log');
    } finally {
      setLogsLoading(false);
    }
  }, [id, logPage, logEventTypeFilter]);

  const loadSymbols = useCallback(async () => {
    setSymbolsLoading(true);
    setError(null);
    try {
      const sy = await listDeploymentSymbols(id, { page: symbolsPage, pageSize: SYMBOLS_PAGE_SIZE });
      setSymbols(sy);
    } catch (err) {
      setError(err.message || 'Failed to load symbols');
    } finally {
      setSymbolsLoading(false);
    }
  }, [id, symbolsPage]);

  useEffect(() => {
    loadHeader();
  }, [loadHeader]);

  useEffect(() => {
    loadStatsOnly();
  }, [loadStatsOnly]);

  useEffect(() => {
    if (tab === 'trading-history') {
      loadTradingHistory();
    }
  }, [tab, loadTradingHistory, tradesPage]);

  useEffect(() => {
    if (tab === 'holdings') {
      loadHoldings();
    }
  }, [tab, loadHoldings, holdingsPage]);

  useEffect(() => {
    if (tab === 'logging') {
      loadLogging();
    }
  }, [tab, loadLogging]);

  useEffect(() => {
    if (tab === 'symbols') {
      loadSymbols();
    }
  }, [tab, loadSymbols]);

  /** Block deployment delete until we know KPIs; relies on backend `open_trades` (main-style count). */
  const openPositionsBlockDelete = stats == null ? true : (Number(stats?.open_trades ?? 0) > 0);

  const runAction = async (fn, successMessage = null) => {
    setActionInFlight(true);
    setError(null);
    setNotice(null);
    try {
      const result = await fn(id);
      if (successMessage) {
        setNotice(typeof successMessage === 'function' ? successMessage(result) : successMessage);
      }
      await loadHeader();
      await loadStatsOnly();
      if (tab === 'trading-history') {
        await loadTradingHistory();
      } else if (tab === 'holdings') {
        await loadHoldings();
      } else if (tab === 'logging') {
        await loadLogging();
      } else if (tab === 'symbols') {
        await loadSymbols();
      }
      return result;
    } catch (err) {
      setError(err.message || 'Action failed');
    } finally {
      setActionInFlight(false);
    }
  };

  const handlePromote = async () => {
    if (!window.confirm('Promote this paper deployment to a real-money sibling? You will need to manually activate the new deployment.')) return;
    setActionInFlight(true);
    setError(null);
    setNotice(null);
    try {
      const result = await promoteStrategyDeployment(id, {});
      setNotice(`Real-money deployment created (#${result.real_deployment_id}).`);
      await loadHeader();
      if (result.real_deployment_id) {
        navigate(`/deployments/${result.real_deployment_id}`);
      }
    } catch (err) {
      setError(err.message || 'Promote failed');
    } finally {
      setActionInFlight(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this deployment? This cannot be undone.')) return;
    setActionInFlight(true);
    setError(null);
    setNotice(null);
    try {
      await deleteStrategyDeployment(id);
      goBack();
    } catch (err) {
      setError(err.message || 'Delete failed');
    } finally {
      setActionInFlight(false);
    }
  };

  const refreshAll = async () => {
    await loadHeader();
    await loadStatsOnly();
    if (tab === 'trading-history') await loadTradingHistory();
    if (tab === 'holdings') await loadHoldings();
    if (tab === 'logging') await loadLogging();
    if (tab === 'symbols') await loadSymbols();
  };

  const handleManualCloseTrade = async (trade, { force = false } = {}) => {
    if (!trade?.id) return;
    const ticker = trade.symbol_info?.ticker || trade.symbol || 'trade';
    const body = force
      ? `Mark ${ticker} #${trade.id} closed in the app only (no broker order)? Use when the position is already flat at the broker.`
      : `Manually close ${ticker} trade #${trade.id} at the broker?`;
    if (!window.confirm(body)) return;
    setActionInFlight(true);
    setClosingTradeId(trade.id);
    setError(null);
    setNotice(null);
    try {
      const result = await manualCloseLiveTrade(trade.id, { force });
      let reconcileNote = '';
      if (!force && result?.reconcile_task_id) {
        const poll = await waitForLiveTradeCloseReconcile(result.reconcile_task_id);
        if (poll?.result?.status === 'timeout') {
          reconcileNote = ' (sync timed out; use Refresh if the row still shows open).';
        } else if (poll?.result?.status === 'error' || poll?.result?.error) {
          reconcileNote = ' (background sync had an error; use Refresh or App only if needed).';
        }
      } else if (!force) {
        try {
          await updateDeploymentPositions(id);
        } catch (syncErr) {
          console.warn('Position sync after manual close failed:', syncErr);
        }
      }
      if (result?.reason === 'manual_exit_db_reset') {
        setNotice('Closed in the app; ledger reset (no broker order).');
      } else {
        const st = result?.status || 'unknown';
        const reason = result?.reason ? ` (${result.reason})` : '';
        setNotice(`Manual close: ${st}${reason}.${reconcileNote}`);
      }
      await loadHeader();
      await loadStatsOnly();
      if (tab === 'trading-history') await loadTradingHistory();
      if (tab === 'holdings') await loadHoldings();
    } catch (err) {
      setError(err.message || 'Manual close failed');
    } finally {
      setClosingTradeId(null);
      setActionInFlight(false);
    }
  };

  const onToggleSymbol = async (deploymentSymbol) => {
    setSymbolActionId(deploymentSymbol.id);
    setError(null);
    try {
      if (deploymentSymbol.status === 'active') {
        await disableDeploymentSymbol(id, deploymentSymbol.id);
      } else {
        await enableDeploymentSymbol(id, deploymentSymbol.id);
      }
      await loadSymbols();
      await loadHeader();
    } catch (err) {
      setError(err.message || 'Could not update symbol');
    } finally {
      setSymbolActionId(null);
    }
  };

  if (headerLoading && !deployment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!deployment) {
    return (
      <div className="container mx-auto py-12 px-4">
        <BackButton to="/deployments" label="Back" className="text-accent mb-4 flex items-center gap-1" iconClassName="w-4 h-4" />
        <p className="text-loss">{error || 'Deployment not found.'}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8" aria-live="polite">
      <div className="flex items-center justify-between mb-6">
        <div>
          <BackButton to="/deployments" label="All deployments" className="text-sm text-accent mb-2 flex items-center gap-1" iconClassName="w-4 h-4" />
          <h1 className="text-3xl font-bold text-ink">
            {deployment.name || `${deployment.strategy_name} deployment`}
          </h1>
          <div className="text-sm text-ink-secondary mt-1 flex items-center gap-2 flex-wrap">
            <Link to={`/strategies/${deployment.strategy}`} className="text-accent hover:underline">
              {deployment.strategy_name}
            </Link>
            <span>•</span>
            <span>{deployment.broker_name}</span>
            <span>•</span>
            <span>{deployment.position_mode.toUpperCase()}</span>
            <span>•</span>
            <span>
              {deployment.deployment_type === 'paper' ? 'Paper Trading' : 'Real Money'}
            </span>
            <span>•</span>
            <code className="bg-surface-sunken px-2 py-0.5 rounded text-xs">
              {deployment.parameter_set?.slice(0, 12)}…
            </code>
          </div>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[deployment.status] || 'bg-surface-sunken text-ink-secondary'}`}>
            {deployment.status}
          </span>
          <button
            onClick={refreshAll}
            className="text-xs text-ink-tertiary flex items-center gap-1 hover:text-ink-secondary"
            disabled={headerLoading}
          >
            <RefreshCw className={`w-3 h-3 ${headerLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-loss-soft border border-loss rounded text-loss-ink text-sm flex items-start justify-between gap-4">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-xs underline">dismiss</button>
        </div>
      )}
      {notice && (
        <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-700 text-sm flex items-start justify-between gap-4">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-xs underline">dismiss</button>
        </div>
      )}

      <div className="bg-surface rounded-lg shadow p-4 mb-6 flex flex-wrap gap-2">
        {(deployment.status === 'pending' || deployment.status === 'paused') && (
          <ActionButton
            label="Activate"
            icon={<Play className="w-4 h-4" />}
            onClick={() => runAction(activateStrategyDeployment, 'Deployment activated.')}
            disabled={actionInFlight}
            color="bg-green-600 hover:bg-green-700"
          />
        )}
        {deployment.status !== 'stopped' && (
          <ActionButton
            label="Stop"
            icon={<Square className="w-4 h-4" />}
            onClick={() => {
              if (
                !window.confirm(
                  'Stop this deployment? Live evaluation will halt and the system will attempt to close open positions at the broker.',
                )
              ) {
                return;
              }
              runAction(
                stopStrategyDeployment,
                (result) => {
                  const exit = result?.stop_exit;
                  if (!exit) return 'Deployment stopped (exit-all submitted).';
                  return `Deployment stopped (exit-all: attempted=${exit.attempted}, failed=${exit.failed}).`;
                },
              );
            }}
            disabled={actionInFlight}
            color="bg-ink-secondary hover:bg-ink"
          />
        )}
        {deployment.deployment_type === 'paper' && (
          <ActionButton
            label="Promote to Real Money"
            icon={<TrendingUp className="w-4 h-4" />}
            onClick={handlePromote}
            disabled={actionInFlight}
            color="bg-accent hover:bg-accent-hover"
          />
        )}
        <ActionButton
          label="Delete"
          icon={<Trash2 className="w-4 h-4" />}
          onClick={handleDelete}
          disabled={actionInFlight || openPositionsBlockDelete}
          color="bg-loss hover:bg-loss disabled:bg-red-300"
        />
      </div>

      <section className="space-y-4 mb-6" aria-label="Deployment statistics">
        {(statsLoading && !stats) && (
          <div className="flex items-center gap-2 text-sm text-ink-tertiary">
            <Loader className="w-4 h-4 animate-spin" /> Loading statistics…
          </div>
        )}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card label="Initial capital" value={`$${Number(deployment.initial_capital).toLocaleString()}`} />
            <Card label="Bet size" value={`${deployment.bet_size_percentage}%`} />
            <Card
              label="Symbols (active / total)"
              value={`${stats?.active_symbol_count ?? deployment.active_symbol_count ?? 0} / ${stats?.symbol_count ?? deployment.symbol_count ?? 0}`}
            />
            <Card label="Open trades" value={stats?.open_trades ?? 0} />
            <Card label="Closed trades" value={`${stats?.closed_trades_main ?? stats?.closed_trades ?? 0} main / ${stats?.closed_trades ?? 0} all`} />
            <Card label="Win rate" value={stats?.win_rate != null ? `${(stats.win_rate * 100).toFixed(1)}%` : '—'} />
            <Card label="Total PnL (main)" value={`$${money(stats?.total_pnl_main ?? stats?.total_pnl)}`} />
            <Card label="Total PnL (+ hedges)" value={`$${money(stats?.total_pnl_all ?? stats?.total_pnl)}`} />
            <Card
              label="Total current invested (open exposure)"
              value={moneyOrDash(stats?.total_current_invested_exposure ?? stats?.total_invested_open)}
            />
            <Card label="Current bankroll (cash)" value={moneyOrDash(stats?.account_cash)} />
            <Card label="Total invested in hedging (open)" value={moneyOrDash(stats?.total_invested_hedge_open)} />
            <Card label="Total invested in main assets (open)" value={moneyOrDash(stats?.total_invested_main_open)} />
            <Card label="Last signal" value={stats?.last_signal_at || '—'} />
            <Card
              label="Hybrid VIX hedge"
              value={deployment.hedge_enabled ? 'On (VIXY sleeve on entry)' : 'Off'}
            />
          </div>
        )}
        <p className="text-sm text-ink-secondary">
          Use <strong className="font-medium text-ink">Trading history</strong> for the full chronological ledger
          (entries and exits). Use <strong className="font-medium text-ink">Holdings</strong> for open positions
          (main + hedge legs) and closes.
        </p>
        {deployment.parent_deployment && (
          <div className="bg-accent-soft border border-accent-soft rounded-lg p-4 text-sm text-accent-ink">
            Real-money sibling of paper deployment{' '}
            <Link to={`/deployments/${deployment.parent_deployment}`} className="underline font-medium">
              #{deployment.parent_deployment}
            </Link>
            .
          </div>
        )}
      </section>

      <div className="border-b border-border mb-6">
        <nav className="flex gap-6 flex-wrap" aria-label="Deployment sections">
          {DEPLOYMENT_TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (key === 'logging' && key !== tab) {
                  setLogPage(1);
                }
                if (key === 'trading-history' && key !== tab) {
                  setTradesPage(1);
                }
                if (key === 'holdings' && key !== tab) {
                  setHoldingsPage(1);
                }
                if (key === 'symbols' && key !== tab) {
                  setSymbolsPage(1);
                }
                setTab(key);
              }}
              className={`pb-3 text-sm font-medium border-b-2 ${
                tab === key
                  ? 'border-blue-600 text-accent'
                  : 'border-transparent text-ink-tertiary hover:text-ink-secondary'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'trading-history' && (
        <div className="space-y-4">
          <div className="bg-surface rounded-lg shadow p-4 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs uppercase text-ink-tertiary mb-1">Status</label>
              <select
                value={tradeListStatus}
                onChange={(e) => {
                  setTradesPage(1);
                  setTradeListStatus(e.target.value);
                }}
                className="border rounded px-2 py-1.5 text-sm"
              >
                <option value="">All</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase text-ink-tertiary mb-1">Entry from</label>
              <input
                type="date"
                value={entryAfterFilter}
                onChange={(e) => {
                  setTradesPage(1);
                  setEntryAfterFilter(e.target.value);
                }}
                className="border rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs uppercase text-ink-tertiary mb-1">Entry to</label>
              <input
                type="date"
                value={entryBeforeFilter}
                onChange={(e) => {
                  setTradesPage(1);
                  setEntryBeforeFilter(e.target.value);
                }}
                className="border rounded px-2 py-1.5 text-sm"
              />
            </div>
          </div>

          <div className="bg-surface rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-ink mb-2">Trading history</h2>
            <p className="text-sm text-ink-tertiary mb-4">
              This ledger lists <strong className="font-medium text-ink">strategy sleeve rows only</strong> (vol hedge legs are
              rolled into Strategy / Hedge PnL and qty on each hybrid exit). Same columns pattern as strategy backtests. Page 1 lists
              the <strong className="font-medium text-ink">latest</strong> trades from the API; rows are{' '}
              <strong className="font-medium text-ink">newest activity first</strong>. Close opens on{' '}
              <strong className="font-medium text-ink">Holdings</strong> (shows main + hedge there).
            </p>
            <p className="text-xs text-ink-tertiary mb-4">
              Data source: <code className="bg-surface-sunken px-1 rounded">GET /api/live-trades/?deployment=…</code> — same
              <code className="bg-surface-sunken px-1 rounded mx-1">LiveTrade</code> rows as Django admin (&quot;Deployment&quot;
              filters should match this page&apos;s totals when filters align).
            </p>
            <TradesTable
              trades={trades.results}
              totalCount={trades.count}
              page={tradesPage}
              loading={tradesLoading}
              onPageChange={setTradesPage}
              hasNext={!!trades.next}
              hasPrevious={!!trades.previous}
              hedgeEnabled={!!deployment.hedge_enabled}
              tableOuterClassName="rounded-lg border border-border"
            />
          </div>
        </div>
      )}

      {tab === 'holdings' && (
        <div className="bg-surface rounded-lg shadow-lg p-6 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-ink">Holdings</h2>
            <p className="text-sm text-ink-tertiary mt-1">
              Open positions only. Hedge legs are grouped under each main sleeve so you can close main and hedge trades in one glance.
            </p>
          </div>
          <HoldingsTable
            rows={holdings.results}
            totalCount={holdings.count}
            page={holdingsPage}
            loading={holdingsLoading}
            onPageChange={setHoldingsPage}
            hasNext={!!holdings.next}
            hasPrevious={!!holdings.previous}
            onManualClose={handleManualCloseTrade}
            closingTradeId={closingTradeId}
            hedgeConfigured={!!deployment.hedge_enabled}
          />
        </div>
      )}

      {tab === 'symbols' && (
        <SymbolsTable
          rows={symbols.results}
          totalCount={symbols.count}
          page={symbolsPage}
          loading={symbolsLoading}
          onPageChange={setSymbolsPage}
          hasNext={!!symbols.next}
          hasPrevious={!!symbols.previous}
          onToggle={onToggleSymbol}
          busyId={symbolActionId}
        />
      )}

      {tab === 'logging' && (
        <EventsFeed
          events={logs.results}
          totalCount={logs.count}
          page={logPage}
          pageSize={EVENTS_PAGE_SIZE}
          eventTypeFilter={logEventTypeFilter}
          onFilterChange={(v) => {
            setLogEventTypeFilter(v);
            setLogPage(1);
          }}
          loading={logsLoading}
          onPageChange={setLogPage}
          hasNext={!!logs.next}
          hasPrevious={!!logs.previous}
        />
      )}
    </div>
  );
}

function ActionButton({ label, icon, onClick, disabled, color }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-4 py-2 text-white rounded ${color} disabled:opacity-50`}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </button>
  );
}

function Card({ label, value }) {
  return (
    <div className="bg-surface rounded-lg shadow p-4">
      <div className="text-xs uppercase text-ink-tertiary mb-1">{label}</div>
      <div className="text-xl font-semibold text-ink">{value}</div>
    </div>
  );
}

function fmt(value) {
  if (value == null) return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return num.toFixed(2);
}

function money(v) {
  if (v == null || v === '') return '0';
  const n = typeof v === 'string' ? parseFloat(v.replace(/,/g, ''), 10) : Number(v);
  if (Number.isNaN(n)) return '0';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function moneyOrDash(v) {
  if (v == null || v === '') return '—';
  return `$${money(v)}`;
}

function fmtDate(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleDateString();
  } catch {
    return '—';
  }
}

function formatCurrency(value) {
  if (value == null || value === '') return 'N/A';
  const n = Number(value);
  if (Number.isNaN(n)) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatPercentage(value) {
  if (value == null || value === '') return 'N/A';
  const n = Number(value);
  if (Number.isNaN(n)) return 'N/A';
  return `${n.toFixed(2)}%`;
}

/** Live trades have no DB `max_drawdown`; allow optional metadata (usually absent). */
function liveTradeMaxDrawdown(trade) {
  const md = trade?.metadata;
  if (!md || typeof md !== 'object') return null;
  const v = md.max_drawdown;
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function EventsFeed({
  events,
  totalCount,
  page,
  pageSize,
  eventTypeFilter,
  onFilterChange,
  loading,
  onPageChange,
  hasNext,
  hasPrevious,
}) {
  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = totalCount === 0 ? 0 : Math.min(page * pageSize, totalCount);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <label className="text-xs uppercase text-ink-tertiary" htmlFor="ev-filter">
          Filter event type
        </label>
        <input
          id="ev-filter"
          value={eventTypeFilter}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder="e.g. signal_evaluated"
          className="px-3 py-1 border border-border-strong rounded text-sm"
        />
        {loading && <Loader className="w-4 h-4 animate-spin text-ink-tertiary" />}
        <span className="text-xs text-ink-tertiary ml-auto">
          {totalCount > 0 ? `Showing ${start}–${end} of ${totalCount}` : '0 events'}
        </span>
      </div>
      <div className="bg-surface rounded-lg shadow divide-y divide-border">
        {events.length === 0 && !loading ? (
          <p className="text-center text-ink-tertiary py-8">No events yet.</p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="px-4 py-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    event.level === 'error' ? 'bg-loss-soft text-loss-ink' :
                    event.level === 'warning' ? 'bg-status-pending-soft text-status-pending' :
                    'bg-surface-sunken text-ink-secondary'
                  }`}>
                    {event.event_type}
                  </span>
                  {event.deployment_symbol_ticker && (
                    <span className="text-xs text-ink-tertiary">[{event.deployment_symbol_ticker}]</span>
                  )}
                  <span className="text-xs text-ink-tertiary">
                    {event.actor_type}{event.actor_id ? `:${event.actor_id}` : ''}
                  </span>
                </div>
                <span className="text-xs text-ink-tertiary">{new Date(event.created_at).toLocaleString()}</span>
              </div>
              {event.message && (
                <div className="mt-1 text-ink-secondary">{event.message}</div>
              )}
              {event.error && (
                <pre className="mt-1 text-xs text-loss-ink whitespace-pre-wrap">{event.error}</pre>
              )}
            </div>
          ))
        )}
      </div>
      <div className="flex justify-between items-center mt-4 text-sm text-ink-secondary">
        <button
          type="button"
          disabled={!hasPrevious}
          onClick={() => onPageChange(page - 1)}
          className="px-3 py-1 border rounded border-border-strong disabled:opacity-40"
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button
          type="button"
          disabled={!hasNext}
          onClick={() => onPageChange(page + 1)}
          className="px-3 py-1 border rounded border-border-strong disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function LiveTradeCloseButtons({ trade, onManualClose, closingTradeId }) {
  if (trade.status !== 'open') {
    return <span className="text-xs text-ink-tertiary">—</span>;
  }
  return (
    <div className="flex flex-col gap-1 items-end">
      <button
        type="button"
        onClick={() => onManualClose?.(trade, { force: false })}
        disabled={closingTradeId != null}
        className="px-2 py-1 text-xs border rounded border-border-strong hover:bg-bg disabled:opacity-50"
      >
        Close
      </button>
      <button
        type="button"
        title="No Alpaca order — marks closed in app (e.g. position already flat)"
        onClick={() => onManualClose?.(trade, { force: true })}
        disabled={closingTradeId != null}
        className="px-2 py-1 text-xs text-amber-800 border border-amber-300 rounded hover:bg-amber-50 disabled:opacity-50"
      >
        Force close
      </button>
      {closingTradeId === trade.id && (
        <span className="text-xs text-accent">Closing with broker…</span>
      )}
    </div>
  );
}

function formatHistoryRowDate(ts) {
  if (!ts) return 'N/A';
  try {
    return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return 'N/A';
  }
}

function investedForHistoryRow(trade) {
  const betAmount = trade?.metadata?.bet_amount;
  if (betAmount !== undefined && betAmount !== null && betAmount !== '') {
    const n = parseFloat(betAmount);
    if (!Number.isNaN(n)) return n;
  }
  if (trade.entry_price != null && trade.quantity != null) {
    const n = Number(trade.entry_price) * Number(trade.quantity);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

function HoldingsTable({
  rows,
  totalCount,
  page,
  loading,
  onPageChange,
  hasNext,
  hasPrevious,
  onManualClose,
  closingTradeId = null,
  hedgeConfigured = false,
}) {
  if (loading && (!rows || rows.length === 0)) {
    return (
      <div className="flex items-center justify-center gap-2 text-ink-tertiary py-12">
        <Loader className="w-5 h-5 animate-spin" /> Loading open positions…
      </div>
    );
  }
  if ((!rows || rows.length === 0) && !loading) {
    return (
      <p className="text-center text-ink-tertiary py-10">
        No open positions on this deployment. Closed legs stay in Trading history.
      </p>
    );
  }

  return (
    <div>
      {loading && (
        <div className="flex items-center gap-2 text-sm text-ink-tertiary mb-2">
          <Loader className="w-4 h-4 animate-spin" /> Refreshing…
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-bg">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-ink-tertiary uppercase">Leg</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-ink-tertiary uppercase">Ticker</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-ink-tertiary uppercase">Side</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-ink-tertiary uppercase">Notional</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-ink-tertiary uppercase">Qty</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-ink-tertiary uppercase">Entry</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-ink-tertiary uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-surface divide-y divide-border">
            {(rows || []).map((main) => {
              const hedgeLegs = Array.isArray(main.hedge_legs) ? main.hedge_legs : [];
              const legs = [
                { trade: main, kind: 'main' },
                ...hedgeLegs.map((hl) => ({ trade: hl, kind: 'hedge' })),
              ];

              return (
                <Fragment key={main.id}>
                  {legs.map(({ trade, kind }) => {
                    const isHedge = kind === 'hedge';
                    const tt = trade.trade_type === 'buy' ? 'Long' : 'Short';
                    const ticker = trade?.symbol_info?.ticker || trade?.symbol || 'N/A';
                    const inv = investedForHistoryRow(trade);
                    return (
                      <tr
                        key={trade.id}
                        className={
                          isHedge
                            ? 'bg-violet-50/60 border-l-4 border-violet-400 hover:bg-violet-50'
                            : 'bg-slate-50/90 border-l-4 border-slate-400 hover:bg-slate-50'
                        }
                      >
                        <td className={`px-4 py-3 text-ink ${isHedge ? 'pl-8' : ''}`}>
                          {isHedge ? (
                            <span className="inline-flex items-center gap-1 text-violet-800">
                              <span className="text-violet-600">↳</span>
                              <span className="text-xs font-semibold uppercase tracking-wide text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">
                                Hedge
                              </span>
                              <span className="text-xs text-ink-tertiary">linked to #{main.id}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              <span className="text-xs font-semibold uppercase tracking-wide text-slate-700 bg-surface border border-slate-200 px-2 py-0.5 rounded-full">
                                Main
                              </span>
                              {hedgeLegs.length > 0 ? (
                                <span className="text-xs text-violet-600">{hedgeLegs.length} hedge leg{hedgeLegs.length !== 1 ? 's' : ''}</span>
                              ) : hedgeConfigured ? (
                                <span className="text-xs text-ink-tertiary">No hedge sleeve</span>
                              ) : null}
                            </span>
                          )}
                        </td>
                        <td className={`px-4 py-3 font-medium text-ink ${isHedge ? 'text-violet-900' : ''}`}>
                          {ticker}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              tt === 'Long' ? 'bg-profit-soft text-profit-ink' : 'bg-status-running-soft text-accent-ink'
                            }`}
                          >
                            {tt}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-ink">{inv != null ? formatCurrency(inv) : '—'}</td>
                        <td className="px-4 py-3 font-mono text-ink">
                          {trade.quantity != null && trade.quantity !== '' ? Number(trade.quantity).toFixed(4) : '—'}
                        </td>
                        <td className="px-4 py-3 text-ink-secondary">{fmtDate(trade.entry_timestamp)}</td>
                        <td className="px-4 py-3 text-right">
                          <LiveTradeCloseButtons trade={trade} onManualClose={onManualClose} closingTradeId={closingTradeId} />
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center mt-4 text-sm text-ink-secondary flex-wrap gap-2">
        <span>
          {totalCount} open main position(s) · page {page}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!hasPrevious}
            onClick={() => onPageChange(page - 1)}
            className="px-3 py-2 border border-border-strong rounded-lg hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <button
            type="button"
            disabled={!hasNext}
            onClick={() => onPageChange(page + 1)}
            className="px-3 py-2 border border-border-strong rounded-lg hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function TradesTable({
  trades,
  totalCount,
  page,
  loading,
  onPageChange,
  hasNext,
  hasPrevious,
  hedgeEnabled = false,
  tableOuterClassName = 'bg-surface rounded-lg shadow-lg',
}) {
  const chronologicalRows = useMemo(
    () => buildChronologicalTradeTableRows(trades || [], { newestFirst: true }),
    [trades],
  );

  if (loading && (!trades || trades.length === 0)) {
    return (
      <div className="flex items-center justify-center gap-2 text-ink-tertiary py-12">
        <Loader className="w-5 h-5 animate-spin" /> Loading trades…
      </div>
    );
  }
  if ((!trades || trades.length === 0) && !loading) {
    return (
      <p className="text-center text-ink-tertiary py-12">
        No trades for this page. Adjust filters or change page.
      </p>
    );
  }
  return (
    <div>
      {loading && (
        <div className="flex items-center gap-2 text-sm text-ink-tertiary mb-2">
          <Loader className="w-4 h-4 animate-spin" /> Refreshing…
        </div>
      )}
      <div className={`overflow-x-auto ${tableOuterClassName}`}>
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-bg">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-ink-tertiary uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-ink-tertiary uppercase">Ticker</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-ink-tertiary uppercase">Position</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-ink-tertiary uppercase">Total Invested</th>
              <HedgeTradeInvestedHeaderCells show={hedgeEnabled} />
              <HedgeQtySplitHeaderCells split={hedgeEnabled} />
              <th className="px-4 py-3 text-left text-xs font-medium text-ink-tertiary uppercase">Entry Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-ink-tertiary uppercase">Exit Date</th>
              <HedgeTradePnlHeaderCells show={hedgeEnabled} />
              <th className="px-4 py-3 text-left text-xs font-medium text-ink-tertiary uppercase">
                {hedgeEnabled ? 'Total PnL' : 'PnL'}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-ink-tertiary uppercase">ROI %</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-ink-tertiary uppercase">Max Drawdown</th>
            </tr>
          </thead>
          <tbody className="bg-surface divide-y divide-border text-sm">
            {chronologicalRows.map(({ key, rowType, trade }) => {
              const ticker = trade?.symbol_info?.ticker || trade?.symbol || 'N/A';
              const isHedge = !!trade?.metadata?.is_hedge_leg;
              const positionType = trade.trade_type === 'buy' ? 'Long' : 'Short';

              if (rowType === 'entry') {
                return (
                  <tr key={key} className={isHedge ? 'bg-violet-50/40 hover:bg-bg' : 'hover:bg-bg'}>
                    <td className="px-4 py-3 text-sm text-ink">{formatHistoryRowDate(trade.entry_timestamp)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-ink">
                      {isHedge && <span className="text-violet-600 mr-1">↳</span>}
                      {ticker}
                      {trade.metadata?.hedge_enabled && !isHedge && (
                        <span className="ml-2 text-xs font-normal text-violet-600">(hedged entry)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          positionType === 'Long'
                            ? 'bg-profit-soft text-profit-ink'
                            : 'bg-status-running-soft text-accent-ink'
                        }`}
                      >
                        {positionType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink">
                      {(() => {
                        const inv = investedForHistoryRow(trade);
                        return inv != null ? formatCurrency(inv) : 'N/A';
                      })()}
                    </td>
                    <HedgeTradeInvestedBodyCells show={hedgeEnabled} trade={trade} formatCurrency={formatCurrency} />
                    <HedgeQtySplitBodyCells split={hedgeEnabled} trade={trade} isHedgeLeg={isHedge} />
                    <td className="px-4 py-3 text-sm text-ink">{formatHistoryRowDate(trade.entry_timestamp)}</td>
                    <td className="px-4 py-3 text-sm text-ink">-</td>
                    <HedgeTradePnlBodyCells
                      show={hedgeEnabled}
                      rowType="entry"
                      trade={trade}
                      formatCurrency={formatCurrency}
                    />
                    <td className="px-4 py-3 text-sm text-ink">-</td>
                    <td className="px-4 py-3 text-sm text-ink">-</td>
                    <td className="px-4 py-3 text-sm text-ink">-</td>
                  </tr>
                );
              }

              const exitCombinedPnl = exitRowHybridTotalPnlUsd(trade, hedgeEnabled);
              const exitRoiBasis = investedForHistoryRow(trade);
              const exitCombinedRoiPct = exitRowHybridRoiFromInvested(exitCombinedPnl, exitRoiBasis);
              const exitWinnerBg =
                exitCombinedPnl != null
                  ? exitCombinedPnl > 0
                    ? 'bg-profit-soft'
                    : 'bg-loss-soft/80'
                  : trade.is_winner
                    ? 'bg-profit-soft'
                    : 'bg-loss-soft/80';
              const dd = liveTradeMaxDrawdown(trade);
              return (
                <tr key={key} className={`hover:bg-bg ${isHedge ? 'bg-violet-50/60' : exitWinnerBg}`}>
                  <td className="px-4 py-3 text-sm text-ink">{formatHistoryRowDate(trade.exit_timestamp)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-ink">
                    {isHedge && <span className="text-violet-600 mr-1">↳</span>}
                    {ticker}
                  </td>
                  <td className="px-4 py-3 text-sm text-ink">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        positionType === 'Long' ? 'bg-loss-soft text-loss-ink' : 'bg-status-warning-soft text-status-warning'
                      }`}
                    >
                      Exit
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-ink">
                    {(() => {
                      const inv = investedForHistoryRow(trade);
                      return inv != null ? formatCurrency(inv) : 'N/A';
                    })()}
                  </td>
                    <HedgeTradeInvestedBodyCells show={hedgeEnabled} trade={trade} formatCurrency={formatCurrency} />
                    <HedgeQtySplitBodyCells split={hedgeEnabled} trade={trade} isHedgeLeg={isHedge} />
                    <td className="px-4 py-3 text-sm text-ink">{formatHistoryRowDate(trade.entry_timestamp)}</td>
                  <td className="px-4 py-3 text-sm text-ink">{formatHistoryRowDate(trade.exit_timestamp)}</td>
                  <HedgeTradePnlBodyCells
                    show={hedgeEnabled}
                    rowType="exit"
                    trade={trade}
                    formatCurrency={formatCurrency}
                  />
                  <td
                    className={`px-4 py-3 text-sm font-medium ${
                      exitCombinedPnl == null
                        ? 'text-ink'
                        : exitCombinedPnl >= 0
                          ? 'text-profit'
                          : 'text-loss'
                    }`}
                  >
                    {exitCombinedPnl != null ? formatCurrency(exitCombinedPnl) : 'N/A'}
                  </td>
                  <td
                    className={`px-4 py-3 text-sm font-medium ${
                      exitCombinedRoiPct == null
                        ? 'text-ink'
                        : exitCombinedRoiPct >= 0
                          ? 'text-profit'
                          : 'text-loss'
                    }`}
                  >
                    {exitCombinedRoiPct != null
                      ? formatPercentage(exitCombinedRoiPct)
                      : trade.pnl_percentage != null && trade.pnl_percentage !== ''
                        ? formatPercentage(trade.pnl_percentage)
                        : 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm text-ink">
                    {dd != null ? formatPercentage(dd) : 'N/A'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center mt-4 text-sm text-ink-secondary flex-wrap gap-2">
        <span>
          {totalCount} position(s) · page {page} ({chronologicalRows.length} history row
          {chronologicalRows.length !== 1 ? 's' : ''} on this page)
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!hasPrevious}
            onClick={() => onPageChange(page - 1)}
            className="px-3 py-2 border border-border-strong rounded-lg hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <button
            type="button"
            disabled={!hasNext}
            onClick={() => onPageChange(page + 1)}
            className="px-3 py-2 border border-border-strong rounded-lg hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SymbolsTable({ rows, totalCount, page, loading, onPageChange, hasNext, hasPrevious, onToggle, busyId }) {
  if (rows.length === 0 && !loading) {
    return <p className="text-center text-ink-tertiary py-12">No symbols enrolled in this deployment.</p>;
  }
  return (
    <div>
      {loading && (
        <div className="flex items-center gap-2 text-sm text-ink-tertiary mb-2">
          <Loader className="w-4 h-4 animate-spin" /> Loading symbols…
        </div>
      )}
      <div className="overflow-x-auto bg-surface rounded-lg shadow">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-bg text-xs uppercase text-ink-tertiary">
            <tr>
              <th className="px-4 py-2 text-left">Ticker</th>
              <th className="px-4 py-2 text-left">Exchange</th>
              <th className="px-4 py-2 text-right">Priority</th>
              <th className="px-4 py-2 text-left">Tier</th>
              <th className="px-4 py-2 text-left">Colors (L / S / overall)</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-2 font-medium">{row.ticker || row.symbol_info?.ticker}</td>
                <td className="px-4 py-2 text-ink-secondary">{row.symbol_info?.exchange_name || row.symbol_info?.exchange || '—'}</td>
                <td className="px-4 py-2 text-right">{row.priority}</td>
                <td className="px-4 py-2">{row.tier ?? '—'}</td>
                <td className="px-4 py-2 text-xs text-ink-secondary">
                  {row.color_long} / {row.color_short} / {row.color_overall}
                </td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${row.status === 'active' ? 'bg-profit-soft text-profit-ink' : 'bg-surface-sunken text-ink-secondary'}`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  {row.status === 'active' ? (
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => onToggle(row)}
                      className="text-xs text-amber-700 hover:underline"
                    >
                      {busyId === row.id ? '…' : 'Disable'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => onToggle(row)}
                      className="text-xs text-accent hover:underline"
                    >
                      {busyId === row.id ? '…' : 'Enable'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center mt-2 text-sm text-ink-secondary">
        <span>{totalCount} symbol(s) · page {page}</span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!hasPrevious}
            onClick={() => onPageChange(page - 1)}
            className="px-3 py-1 border rounded border-border-strong disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={!hasNext}
            onClick={() => onPageChange(page + 1)}
            className="px-3 py-1 border rounded border-border-strong disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
