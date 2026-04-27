/**
 * Deployment Detail Page (v2)
 *
 * Data loads per tab: core deployment (header) is lightweight; overview / logging /
 * symbols each fetch their own endpoints when the tab is selected.
 */

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Loader,
  Play,
  RefreshCw,
  Square,
  TrendingUp,
  Trash2,
} from 'lucide-react';

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

const STATUS_BADGE = {
  pending: 'bg-gray-200 text-gray-700',
  active: 'bg-green-100 text-green-700',
  evaluating: 'bg-blue-100 text-blue-700',
  passed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  paused: 'bg-yellow-100 text-yellow-700',
  stopped: 'bg-gray-300 text-gray-700',
};

const EVENTS_PAGE_SIZE = 50;
const TRADES_PAGE_SIZE = 25;
const SYMBOLS_PAGE_SIZE = 50;

export default function DeploymentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [deployment, setDeployment] = useState(null);
  const [headerLoading, setHeaderLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [trades, setTrades] = useState({ results: [], count: 0, next: null, previous: null });
  const [tradesPage, setTradesPage] = useState(1);
  const [tradesLoading, setTradesLoading] = useState(false);

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

  const loadOverview = useCallback(async () => {
    setStatsLoading(true);
    setTradesLoading(true);
    setError(null);
    try {
      const [st, tr] = await Promise.all([
        getDeploymentStatistics(id),
        listLiveTrades({
          deploymentId: id,
          page: tradesPage,
          pageSize: TRADES_PAGE_SIZE,
          omitHedgeLegs: true,
        }),
      ]);
      setStats(st);
      setTrades(tr);
    } catch (err) {
      setError(err.message || 'Failed to load overview');
    } finally {
      setStatsLoading(false);
      setTradesLoading(false);
    }
  }, [id, tradesPage]);

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
    if (tab === 'overview') {
      loadOverview();
    }
  }, [tab, loadOverview]);

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

  const openTrades = useMemo(
    () => (trades?.results || []).filter((t) => t.status === 'open'),
    [trades],
  );

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
      if (tab === 'overview') {
        await loadOverview();
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
      navigate('/deployments');
    } catch (err) {
      setError(err.message || 'Delete failed');
    } finally {
      setActionInFlight(false);
    }
  };

  const refreshAll = async () => {
    await loadHeader();
    if (tab === 'overview') await loadOverview();
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
      if (tab === 'overview') await loadOverview();
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
        <button onClick={() => navigate(-1)} className="text-blue-600 mb-4 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <p className="text-red-600">{error || 'Deployment not found.'}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => navigate('/deployments')}
            className="text-sm text-blue-600 mb-2 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> All deployments
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {deployment.name || `${deployment.strategy_name} deployment`}
          </h1>
          <div className="text-sm text-gray-600 mt-1 flex items-center gap-2 flex-wrap">
            <Link to={`/strategies/${deployment.strategy}`} className="text-blue-600 hover:underline">
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
            <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">
              {deployment.parameter_set?.slice(0, 12)}…
            </code>
          </div>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[deployment.status] || 'bg-gray-100 text-gray-700'}`}>
            {deployment.status}
          </span>
          <button
            onClick={refreshAll}
            className="text-xs text-gray-500 flex items-center gap-1 hover:text-gray-700"
            disabled={headerLoading}
          >
            <RefreshCw className={`w-3 h-3 ${headerLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm flex items-start justify-between gap-4">
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

      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-2">
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
            onClick={() => runAction(
              stopStrategyDeployment,
              (result) => {
                const exit = result?.stop_exit;
                if (!exit) return 'Deployment stopped (exit-all submitted).';
                return `Deployment stopped (exit-all: attempted=${exit.attempted}, failed=${exit.failed}).`;
              },
            )}
            disabled={actionInFlight}
            color="bg-gray-700 hover:bg-gray-800"
          />
        )}
        {deployment.deployment_type === 'paper' && (
          <ActionButton
            label="Promote to Real Money"
            icon={<TrendingUp className="w-4 h-4" />}
            onClick={handlePromote}
            disabled={actionInFlight}
            color="bg-blue-600 hover:bg-blue-700"
          />
        )}
        <ActionButton
          label="Delete"
          icon={<Trash2 className="w-4 h-4" />}
          onClick={handleDelete}
          disabled={actionInFlight || openTrades.length > 0}
          color="bg-red-600 hover:bg-red-700 disabled:bg-red-300"
        />
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {['overview', 'symbols', 'logging'].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (key === 'logging' && key !== tab) {
                  setLogPage(1);
                }
                if (key === 'overview' && key !== tab) {
                  setTradesPage(1);
                }
                if (key === 'symbols' && key !== tab) {
                  setSymbolsPage(1);
                }
                setTab(key);
              }}
              className={`pb-3 text-sm font-medium border-b-2 ${
                tab === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {key === 'logging' ? 'Logging' : key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          {(statsLoading && !stats) && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
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
              <Card label="Closed trades" value={stats?.closed_trades ?? 0} />
              <Card label="Win rate" value={stats?.win_rate != null ? `${(stats.win_rate * 100).toFixed(1)}%` : '—'} />
              <Card label="Total PnL" value={`$${Number(stats?.total_pnl || 0).toLocaleString()}`} />
            <Card label="Last signal" value={stats?.last_signal_at || '—'} />
            <Card
              label="Hybrid VIX hedge"
              value={deployment.hedge_enabled ? 'On (VIXY sleeve on entry)' : 'Off'}
            />
          </div>
          )}

          <TradesTable
            trades={trades.results}
            totalCount={trades.count}
            page={tradesPage}
            loading={tradesLoading}
            onPageChange={setTradesPage}
            hasNext={!!trades.next}
            hasPrevious={!!trades.previous}
            onManualClose={handleManualCloseTrade}
            closingTradeId={closingTradeId}
          />

          {deployment.parent_deployment && (
            <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm text-blue-800">
              Real-money sibling of paper deployment{' '}
              <Link to={`/deployments/${deployment.parent_deployment}`} className="underline font-medium">
                #{deployment.parent_deployment}
              </Link>
              .
            </div>
          )}
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
    <div className="bg-white rounded-lg shadow p-4">
      <div className="text-xs uppercase text-gray-500 mb-1">{label}</div>
      <div className="text-xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function fmt(value) {
  if (value == null) return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return num.toFixed(2);
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
        <label className="text-xs uppercase text-gray-500" htmlFor="ev-filter">
          Filter event type
        </label>
        <input
          id="ev-filter"
          value={eventTypeFilter}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder="e.g. signal_evaluated"
          className="px-3 py-1 border border-gray-300 rounded text-sm"
        />
        {loading && <Loader className="w-4 h-4 animate-spin text-gray-400" />}
        <span className="text-xs text-gray-500 ml-auto">
          {totalCount > 0 ? `Showing ${start}–${end} of ${totalCount}` : '0 events'}
        </span>
      </div>
      <div className="bg-white rounded-lg shadow divide-y divide-gray-100">
        {events.length === 0 && !loading ? (
          <p className="text-center text-gray-500 py-8">No events yet.</p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="px-4 py-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    event.level === 'error' ? 'bg-red-100 text-red-700' :
                    event.level === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {event.event_type}
                  </span>
                  {event.deployment_symbol_ticker && (
                    <span className="text-xs text-gray-500">[{event.deployment_symbol_ticker}]</span>
                  )}
                  <span className="text-xs text-gray-400">
                    {event.actor_type}{event.actor_id ? `:${event.actor_id}` : ''}
                  </span>
                </div>
                <span className="text-xs text-gray-500">{new Date(event.created_at).toLocaleString()}</span>
              </div>
              {event.message && (
                <div className="mt-1 text-gray-700">{event.message}</div>
              )}
              {event.error && (
                <pre className="mt-1 text-xs text-red-700 whitespace-pre-wrap">{event.error}</pre>
              )}
            </div>
          ))
        )}
      </div>
      <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
        <button
          type="button"
          disabled={!hasPrevious}
          onClick={() => onPageChange(page - 1)}
          className="px-3 py-1 border rounded border-gray-300 disabled:opacity-40"
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button
          type="button"
          disabled={!hasNext}
          onClick={() => onPageChange(page + 1)}
          className="px-3 py-1 border rounded border-gray-300 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function TradesTable({ trades, totalCount, page, loading, onPageChange, hasNext, hasPrevious, onManualClose, closingTradeId = null }) {
  if (loading && trades.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 text-gray-500 py-12">
        <Loader className="w-5 h-5 animate-spin" /> Loading trades…
      </div>
    );
  }
  if (trades.length === 0 && !loading) {
    return (
      <p className="text-center text-gray-500 py-12">
        No live trades for this page.
      </p>
    );
  }
  return (
    <div>
      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Loader className="w-4 h-4 animate-spin" /> Refreshing…
        </div>
      )}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left">Ticker</th>
              <th className="px-4 py-2 text-left">Mode</th>
              <th className="px-4 py-2 text-right">Entry</th>
              <th className="px-4 py-2 text-right">Exit</th>
              <th className="px-4 py-2 text-right">PnL</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Entry Time</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-sm">
            {trades.map((trade) => (
              <Fragment key={trade.id}>
                <tr className="bg-white">
                  <td className="px-4 py-2 font-medium">
                    {trade.symbol_info?.ticker || trade.symbol}
                    {trade.metadata?.hedge_enabled && (
                      <span className="ml-2 text-xs font-normal text-violet-600">(hedged entry)</span>
                    )}
                    {closingTradeId === trade.id && (
                      <span className="ml-2 text-xs font-medium text-blue-600">Closing with broker…</span>
                    )}
                  </td>
                  <td className="px-4 py-2 uppercase text-xs">{trade.position_mode}</td>
                  <td className="px-4 py-2 text-right">{fmt(trade.entry_price)}</td>
                  <td className="px-4 py-2 text-right">{fmt(trade.exit_price)}</td>
                  <td className="px-4 py-2 text-right">{fmt(trade.pnl)}</td>
                  <td className="px-4 py-2 text-xs">
                    <span
                      className={
                        trade.status === 'open'
                          ? 'text-amber-800 font-medium'
                          : 'text-gray-700'
                      }
                    >
                      {trade.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-600">{trade.entry_timestamp}</td>
                  <td className="px-4 py-2 text-right">
                    {trade.status === 'open' ? (
                      <div className="flex flex-col gap-1 items-end">
                        <button
                          type="button"
                          onClick={() => onManualClose?.(trade, { force: false })}
                          disabled={closingTradeId != null}
                          className="px-2 py-1 text-xs border rounded border-gray-300 hover:bg-gray-50 disabled:opacity-50"
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
                          App only
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
                {(trade.hedge_legs || []).map((h) => (
                  <tr
                    key={h.id}
                    className="bg-violet-50/60 text-xs border-t-0"
                  >
                    <td className="px-4 py-1.5 pl-8 text-violet-900 border-l-4 border-violet-300">
                      <span className="text-violet-500 mr-1.5" aria-hidden>
                        ↳
                      </span>
                      Hedge · {h.symbol_info?.ticker || h.symbol}
                    </td>
                    <td className="px-4 py-1.5 uppercase text-violet-800">{h.position_mode}</td>
                    <td className="px-4 py-1.5 text-right text-violet-900">{fmt(h.entry_price)}</td>
                    <td className="px-4 py-1.5 text-right text-violet-900">{fmt(h.exit_price)}</td>
                    <td className="px-4 py-1.5 text-right text-violet-900">{fmt(h.pnl)}</td>
                    <td className="px-4 py-1.5 text-violet-800">
                      {h.status === 'open' ? 'open' : 'closed'}
                    </td>
                    <td className="px-4 py-1.5 text-violet-800">{h.entry_timestamp}</td>
                    <td className="px-4 py-1.5 text-right text-violet-600">—</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center mt-2 text-sm text-gray-600">
        <span>
          {totalCount} total · page {page}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!hasPrevious}
            onClick={() => onPageChange(page - 1)}
            className="px-3 py-1 border rounded border-gray-300 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={!hasNext}
            onClick={() => onPageChange(page + 1)}
            className="px-3 py-1 border rounded border-gray-300 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function SymbolsTable({ rows, totalCount, page, loading, onPageChange, hasNext, hasPrevious, onToggle, busyId }) {
  if (rows.length === 0 && !loading) {
    return <p className="text-center text-gray-500 py-12">No symbols enrolled in this deployment.</p>;
  }
  return (
    <div>
      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Loader className="w-4 h-4 animate-spin" /> Loading symbols…
        </div>
      )}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
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
          <tbody className="divide-y divide-gray-200">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-2 font-medium">{row.ticker || row.symbol_info?.ticker}</td>
                <td className="px-4 py-2 text-gray-600">{row.symbol_info?.exchange_name || row.symbol_info?.exchange || '—'}</td>
                <td className="px-4 py-2 text-right">{row.priority}</td>
                <td className="px-4 py-2">{row.tier ?? '—'}</td>
                <td className="px-4 py-2 text-xs text-gray-600">
                  {row.color_long} / {row.color_short} / {row.color_overall}
                </td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${row.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
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
                      className="text-xs text-blue-600 hover:underline"
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
      <div className="flex justify-between items-center mt-2 text-sm text-gray-600">
        <span>{totalCount} symbol(s) · page {page}</span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!hasPrevious}
            onClick={() => onPageChange(page - 1)}
            className="px-3 py-1 border rounded border-gray-300 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={!hasNext}
            onClick={() => onPageChange(page + 1)}
            className="px-3 py-1 border rounded border-gray-300 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
