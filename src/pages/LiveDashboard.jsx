/**
 * Live Trading Dashboard (v2)
 *
 * Aggregates all StrategyDeployments into a single command-center view:
 *  - Top KPI strip (active deployments, open trades, today's signals,
 *    today's PnL, error count).
 *  - Per-strategy deployment cards grouped by strategy.
 *  - Right column: live signals feed and recent audit events.
 *  - Bottom: open and recently-closed trades.
 *
 * Loads once on open; use Refresh to reload (no automatic polling).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Loader,
  RefreshCw,
  Rocket,
  Signal,
  TrendingDown,
  TrendingUp,
  XCircle,
} from 'lucide-react';

import { getHedgePanicSnapshot } from '../data/backtests';
import {
  listAllDeploymentEvents,
  listLiveTrades,
  listStrategyDeployments,
} from '../data/strategyDeployments';

const STATUS_BADGE = {
  pending: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-700',
  evaluating: 'bg-blue-100 text-blue-700',
  passed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  paused: 'bg-yellow-100 text-yellow-700',
  stopped: 'bg-gray-200 text-gray-700',
};

const SIGNAL_EVENT_TYPES = ['signal_evaluated', 'order_placed', 'order_filled', 'order_failed', 'trade_opened', 'trade_closed'];

function startOfTodayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function fmtNumber(value, opts = {}) {
  if (value == null || value === '') return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return num.toLocaleString(undefined, opts);
}

function fmtCurrency(value) {
  if (value == null || value === '') return '$0';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtRelative(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.round(diff / 86_400_000)}d ago`;
  return d.toLocaleString();
}

export default function LiveDashboard() {
  const [deployments, setDeployments] = useState([]);
  const [openTrades, setOpenTrades] = useState({ results: [], count: 0 });
  const [closedTrades, setClosedTrades] = useState({ results: [], count: 0 });
  const [signals, setSignals] = useState({ results: [], count: 0 });
  const [recentEvents, setRecentEvents] = useState({ results: [], count: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [hedgePanic, setHedgePanic] = useState(null);

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    const since = startOfTodayIso();
    try {
      const [depPage, openPage, closedPage, signalPage, eventPage] = await Promise.all([
        listStrategyDeployments({}),
        listLiveTrades({ status: 'open', pageSize: 200 }),
        listLiveTrades({ status: 'closed', pageSize: 200 }),
        listAllDeploymentEvents({ since, pageSize: 50 }),
        listAllDeploymentEvents({ pageSize: 30 }),
      ]);
      setDeployments(depPage.results || []);
      setOpenTrades(openPage);
      setClosedTrades(closedPage);
      setSignals({
        ...signalPage,
        results: (signalPage.results || []).filter((e) =>
          SIGNAL_EVENT_TYPES.includes(e.event_type),
        ),
      });
      setRecentEvents(eventPage);
      setLastUpdated(new Date());
      const firstHedged = (depPage.results || []).find((d) => d.hedge_enabled);
      const panicSnapshot = await getHedgePanicSnapshot(
        firstHedged
          ? { deploymentId: firstHedged.id, chartTailDays: 120 }
          : { chartTailDays: 120 },
      );
      setHedgePanic(panicSnapshot);
    } catch (err) {
      setError(err?.message || 'Failed to load live dashboard');
      setHedgePanic(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const aggregates = useMemo(() => {
    const todayIso = startOfTodayIso();
    const todayMs = new Date(todayIso).getTime();
    const activeDeployments = deployments.filter((d) =>
      ['active', 'evaluating', 'passed'].includes(d.status),
    );
    const realCount = deployments.filter((d) => d.deployment_type === 'real_money').length;
    const paperCount = deployments.filter((d) => d.deployment_type === 'paper').length;
    const closedToday = (closedTrades.results || []).filter((t) =>
      t.exit_timestamp && new Date(t.exit_timestamp).getTime() >= todayMs,
    );
    const totalPnlToday = closedToday.reduce(
      (sum, t) => sum + Number(t.pnl || 0), 0,
    );
    const totalOpenPnlPct = (openTrades.results || []).reduce(
      (sum, t) => sum + Number(t.pnl_percentage || 0), 0,
    );
    const errorCount = (recentEvents.results || []).filter(
      (e) => e.level === 'error',
    ).length;
    const signalsToday = signals.results.filter(
      (e) => e.event_type === 'signal_evaluated',
    ).length;
    return {
      total: deployments.length,
      active: activeDeployments.length,
      paper: paperCount,
      real: realCount,
      openTrades: openTrades.count,
      closedToday: closedToday.length,
      totalPnlToday,
      totalOpenPnlPct,
      errorCount,
      signalsToday,
    };
  }, [deployments, openTrades, closedTrades, signals, recentEvents]);

  const firstHedgedDeployment = useMemo(
    () => deployments.find((d) => d.hedge_enabled),
    [deployments],
  );

  const deploymentsByStrategy = useMemo(() => {
    const byStrat = new Map();
    for (const d of deployments) {
      const key = d.strategy_name || `Strategy ${d.strategy}`;
      if (!byStrat.has(key)) {
        byStrat.set(key, { strategy_name: key, strategy_id: d.strategy, deployments: [] });
      }
      byStrat.get(key).deployments.push(d);
    }
    return Array.from(byStrat.values()).sort((a, b) =>
      a.strategy_name.localeCompare(b.strategy_name),
    );
  }, [deployments]);

  if (loading && deployments.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Rocket className="w-8 h-8 text-blue-600" /> Live Trading Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Real-time view of every active strategy deployment.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={fetchAll}
            disabled={refreshing}
            className="flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              Updated {fmtRelative(lastUpdated.toISOString())}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      <HedgePanicPanel
        data={hedgePanic}
        sourceDeployment={firstHedgedDeployment}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <Kpi
          label="Active deployments"
          value={`${aggregates.active}/${aggregates.total}`}
          icon={<Activity className="w-4 h-4" />}
          tone="blue"
        />
        <Kpi
          label="Paper / Real"
          value={`${aggregates.paper} / ${aggregates.real}`}
          icon={<Rocket className="w-4 h-4" />}
          tone="indigo"
        />
        <Kpi
          label="Open trades"
          value={fmtNumber(aggregates.openTrades)}
          icon={<TrendingUp className="w-4 h-4" />}
          tone="emerald"
          sub={
            aggregates.totalOpenPnlPct
              ? `${aggregates.totalOpenPnlPct >= 0 ? '+' : ''}${aggregates.totalOpenPnlPct.toFixed(2)}% unrealised`
              : null
          }
        />
        <Kpi
          label="Closed today"
          value={fmtNumber(aggregates.closedToday)}
          icon={<CheckCircle2 className="w-4 h-4" />}
          tone="gray"
        />
        <Kpi
          label="PnL today"
          value={fmtCurrency(aggregates.totalPnlToday)}
          icon={
            aggregates.totalPnlToday >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )
          }
          tone={aggregates.totalPnlToday >= 0 ? 'emerald' : 'red'}
        />
        <Kpi
          label="Errors (recent)"
          value={fmtNumber(aggregates.errorCount)}
          icon={<XCircle className="w-4 h-4" />}
          tone={aggregates.errorCount > 0 ? 'red' : 'gray'}
          sub={`${aggregates.signalsToday} signals today`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">
              Deployments by strategy
            </h2>
            <Link to="/deployments" className="text-sm text-blue-600 hover:underline">
              All deployments →
            </Link>
          </div>
          {deploymentsByStrategy.length === 0 ? (
            <EmptyState
              title="No deployments yet"
              hint={
                <>
                  Open a strategy detail page and click <em>Deploy</em> on one of
                  the global parameter sets.
                </>
              }
            />
          ) : (
            <div className="space-y-4">
              {deploymentsByStrategy.map((group) => (
                <StrategyGroupCard key={group.strategy_name} group={group} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <FeedPanel
            title="Live signals (today)"
            icon={<Signal className="w-4 h-4 text-blue-500" />}
            events={signals.results}
            emptyHint="No signals fired yet today."
          />
          <FeedPanel
            title="Recent events"
            icon={<Activity className="w-4 h-4 text-gray-500" />}
            events={recentEvents.results}
            emptyHint="Audit log is empty."
            compact
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TradesTable
          title={`Open trades (${openTrades.count})`}
          trades={openTrades.results}
          showPnl
          emptyHint="No open positions."
        />
        <TradesTable
          title={`Recently closed (${closedTrades.count})`}
          trades={(closedTrades.results || []).slice(0, 10)}
          showPnl
          emptyHint="No closed trades yet."
        />
      </div>
    </div>
  );
}

const HEDGE_CHART_SYNC = 'hedge-panic-snap';

function normalizeHedgeChartPoints(raw) {
  if (!raw?.length) return [];
  return raw
    .map((p) => ({
      d: String(p.d || ''),
      z: Number(p.z),
      vixP: Number(p.vixP),
      panic: Boolean(p.panic),
      hysteresisBlock: Boolean(p.hysteresis_block),
      waitingReset: Boolean(p.waiting_reset),
    }))
    .map((p) => ({ ...p, panic1: p.panic ? 1 : 0 }))
    .filter((p) => p.d && Number.isFinite(p.z) && Number.isFinite(p.vixP));
}

function fmtNeed(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1) return a.toFixed(2);
  if (a >= 0.1) return a.toFixed(3);
  return a.toFixed(4);
}

/** Simple 0–100% progress toward a ceiling (e.g. z cap or VIX floor from zero). */
function stressMeterWidth(current, cap) {
  if (!(cap > 0)) return 0;
  return Math.min(100, Math.max(0, (Number(current) / cap) * 100));
}

function PanicActivationRules({ zTh, vixFl, zMet, vixMet, waitingReset, isPanic, zNow, vixNow }) {
  const gate3Ok = !waitingReset;
  const allOn = isPanic;
  const Row = ({ met, children }) => (
    <li className="flex gap-2 items-start">
      {met ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden />
      ) : (
        <XCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" aria-hidden />
      )}
      <span>{children}</span>
    </li>
  );
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm text-gray-800">
      <p className="font-semibold text-gray-900 text-xs uppercase tracking-wide mb-2">What must be true for panic to be ON</p>
      <p className="text-xs text-gray-600 mb-2">
        All <strong>three</strong> below. (&quot;Panic&quot; = heavy VIXY mix, per your model.)
      </p>
      <ul className="space-y-2 list-none m-0 p-0">
        <Row met={zMet}>
          <span>
            <strong>1.</strong> Smoothed VIX <strong>z</strong> is <strong>above {zTh}</strong> (strict). Now:{' '}
            <code className="text-xs bg-slate-100 px-1 rounded tabular-nums">{zNow}</code>
          </span>
        </Row>
        <Row met={vixMet}>
          <span>
            <strong>2.</strong> <strong>Prior trading day</strong> VIX (not today&apos;s open spot) is <strong>above {vixFl}</strong>
            . Now: <code className="text-xs bg-slate-100 px-1 rounded tabular-nums">{vixNow}</code>
          </span>
        </Row>
        <Row met={gate3Ok}>
          <span>
            <strong>3.</strong> <strong>Reset not blocking.</strong> If z was above the cap while you were still
            in the normal sleeve, the model will only allow panic <em>after</em> smoothed z has gone <strong>below 0</strong>{' '}
            again. {waitingReset ? 'Right now: still waiting for that dip in z.' : 'Not waiting — ok.'}
          </span>
        </Row>
      </ul>
      {allOn && (
        <p className="text-xs text-red-800 font-medium mt-2 pt-2 border-t border-slate-100">All three are satisfied → panic is ON now.</p>
      )}
    </div>
  );
}

/** Red dot on z / VIX history only when panic regime was ON that session (syncs with bottom bar). */
function panicRegimeDot(props) {
  const { cx, cy, payload } = props;
  if (!payload?.panic) return null;
  return <circle cx={cx} cy={cy} r={5} fill="#b91c1c" stroke="#fff" strokeWidth={1.5} />;
}

function HedgeStressMeters({ z, zTh, vix, vixFl, zMet, vixMet, zNeed, vixNeed }) {
  const zW = zMet ? 100 : stressMeterWidth(z, zTh);
  const vW = vixMet ? 100 : stressMeterWidth(vix, vixFl);
  return (
    <div className="mt-3 space-y-3">
      <div>
        <div className="flex justify-between items-baseline text-xs text-gray-600 mb-1">
          <span>Distance to <strong>z</strong> cap ({zTh})</span>
          {zMet ? (
            <span className="text-emerald-700 font-semibold">At or past cap</span>
          ) : (
            <span>
              {fmtNeed(z)} now · need <strong>+{fmtNeed(zNeed)}</strong> z
            </span>
          )}
        </div>
        <div
          className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden"
          title={zMet ? 'Z cap reached' : `About ${zW.toFixed(0)}% of the way from 0 to the cap (rough guide)`}
        >
          <div
            className={`h-full rounded-full ${zMet ? 'bg-emerald-500' : 'bg-blue-500'}`}
            style={{ width: `${zW}%` }}
          />
        </div>
      </div>
      <div>
        <div className="flex justify-between items-baseline text-xs text-gray-600 mb-1">
          <span>Distance to <strong>prior-day VIX</strong> floor ({vixFl})</span>
          {vixMet ? (
            <span className="text-emerald-700 font-semibold">At or past floor</span>
          ) : (
            <span>
              {fmtNeed(vix)} now · need <strong>+{fmtNeed(vixNeed)}</strong> VIX
            </span>
          )}
        </div>
        <div
          className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden"
          title={vixMet ? 'VIX floor reached' : `About ${vW.toFixed(0)}% of the way from 0 to the floor (rough guide)`}
        >
          <div
            className={`h-full rounded-full ${vixMet ? 'bg-emerald-500' : 'bg-violet-500'}`}
            style={{ width: `${vW}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function HedgePanicPanel({ data, sourceDeployment }) {
  if (data == null) {
    return null;
  }
  if (data.error) {
    return (
      <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
        <div className="font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Vol hedge snapshot unavailable
        </div>
        <p className="mt-1 text-amber-800">{data.error}</p>
      </div>
    );
  }
  if (data.regime === 'warmup') {
    return (
      <div className="mb-6 bg-white border border-gray-200 rounded-lg shadow p-4 text-sm text-gray-700">
        <div className="font-semibold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Vol hedge (not ready)
        </div>
        <p className="mt-1">
          Need {data.min_warmup_days} trading days of history; only {data.bars_loaded} in the current frame.
        </p>
      </div>
    );
  }
  const regime = data.regime || 'normal';
  const regClass =
    regime === 'panic'
      ? 'bg-red-100 text-red-800 border-red-200'
      : regime === 'hysteresis'
        ? 'bg-amber-100 text-amber-900 border-amber-200'
        : 'bg-emerald-100 text-emerald-800 border-emerald-200';
  const sourceLabel = sourceDeployment
    ? `Config from deployment “${sourceDeployment.name || `id ${sourceDeployment.id}`}”.`
    : 'Hedge lab defaults (no deployment with hedge enabled).';

  const zNeed = data.z_points_still_below_threshold;
  const vixNeed = data.vix_points_still_needed_above_floor;
  const chart = data.chart;
  const points = chart?.points || [];
  const zTh = chart?.z_threshold ?? data.z_threshold;
  const vixFl = chart?.vix_floor ?? data.vix_floor;

  const safePoints = normalizeHedgeChartPoints(points);
  const zVals = safePoints.map((p) => p.z);
  const vixPVals = safePoints.map((p) => p.vixP);
  const zMax = zVals.length ? Math.max(zTh + 0.05, ...zVals) * 1.12 : zTh + 1;
  const zMin = zVals.length ? Math.min(0, ...zVals, zTh * 0.3) * 1.1 : 0;
  const vixMax = vixPVals.length ? Math.max(vixFl + 0.2, ...vixPVals) * 1.12 : vixFl + 5;
  const vixMin = vixPVals.length ? Math.min(0, ...vixPVals, vixFl * 0.5) * 1.1 : 0;

  const isPanicHedge = Boolean(data.is_panic);
  const inStandby = Boolean(data.panic_blocked_by_hysteresis);

  const heroBorder = isPanicHedge
    ? 'border-red-300 bg-red-50'
    : inStandby
      ? 'border-amber-300 bg-amber-50/90'
      : 'border-slate-200 bg-slate-50';
  const heroTitle = isPanicHedge
    ? 'Status: ON'
    : inStandby
      ? 'Status: OFF (①+② ok, ③ still blocking)'
      : 'Status: OFF';

  return (
    <div className="mb-6 bg-white border border-gray-200 rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Panic hedge
          </h2>
          <p className="text-xs text-gray-500 mt-1">{sourceLabel}</p>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs">
          <span className={`px-2.5 py-1 rounded-md border font-semibold ${regClass}`}>
            {(regime || '').toUpperCase()}
          </span>
          {data.as_of && <span className="text-gray-500">Last session {data.as_of}</span>}
          {data.data_source && <span className="text-gray-400">{data.data_source}</span>}
        </div>
      </div>

      <div className="px-4 pt-3 pb-0 max-w-3xl">
        <PanicActivationRules
          zTh={zTh}
          vixFl={vixFl}
          zMet={Boolean(data.z_stress_satisfied)}
          vixMet={Boolean(data.vix_level_satisfied)}
          waitingReset={Boolean(data.waiting_reset)}
          isPanic={isPanicHedge}
          zNow={data.smoothed_vix_z}
          vixNow={data.vix_for_rule_prior_day}
        />
      </div>

      <div className="px-4 pt-3 pb-0">
        <div className={`rounded-lg border-2 p-4 ${heroBorder}`}>
          <div className="flex flex-wrap items-center gap-2 gap-y-1">
            {isPanicHedge ? (
              <CheckCircle2 className="w-6 h-6 text-red-600 shrink-0" />
            ) : inStandby ? (
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
            ) : (
              <XCircle className="w-6 h-6 text-slate-500 shrink-0" />
            )}
            <h3 className="text-lg font-bold text-gray-900 tracking-tight">{heroTitle}</h3>
          </div>
          <HedgeStressMeters
            z={data.smoothed_vix_z}
            zTh={zTh}
            vix={data.vix_for_rule_prior_day}
            vixFl={vixFl}
            zMet={Boolean(data.z_stress_satisfied)}
            vixMet={Boolean(data.vix_level_satisfied)}
            zNeed={zNeed}
            vixNeed={vixNeed}
          />
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 bg-gray-50/80 text-sm">
        <div className="rounded-md bg-white border border-gray-100 p-3 shadow-sm">
          <div className="text-xs text-gray-500 mb-0.5">① Smoothed z vs cap {zTh}</div>
          <p className="text-lg font-semibold text-gray-900 tabular-nums">
            {data.smoothed_vix_z} <span className="text-sm font-normal text-gray-500">/ {zTh}</span>
          </p>
          <p className="text-gray-600 text-xs mt-0.5">
            {data.z_stress_satisfied ? 'Met.' : `+${zNeed} to cap`}
          </p>
        </div>
        <div className="rounded-md bg-white border border-gray-100 p-3 shadow-sm">
          <div className="text-xs text-gray-500 mb-0.5">② Prior-day VIX vs floor {vixFl}</div>
          <p className="text-lg font-semibold text-gray-900 tabular-nums">
            {data.vix_for_rule_prior_day}{' '}
            <span className="text-sm font-normal text-gray-500">/ {vixFl}</span>
          </p>
          <p className="text-gray-600 text-xs mt-0.5">
            {data.vix_level_satisfied ? 'Met.' : `+${vixNeed} to floor`}
            {data.vix_spot_on_as_of != null && (
              <span className="text-gray-400"> · spot {data.vix_spot_on_as_of}</span>
            )}
          </p>
        </div>
        <div className="rounded-md bg-white border border-gray-100 p-3 shadow-sm">
          <div className="text-xs text-gray-500 mb-0.5">Book split today</div>
          <p className="text-lg font-semibold text-gray-900 tabular-nums">
            {(100 * (data.w_strategy || 0)).toFixed(0)}% / {(100 * (data.w_hedge || 0)).toFixed(0)}% hedge
          </p>
        </div>
      </div>

      {safePoints.length > 0 && (
        <div className="p-4 pt-2">
          <p className="text-xs text-gray-500 mb-2">
            History ({safePoints.length} sessions). <strong className="text-red-800">Red dots</strong> on the lines = panic
            regime on that day (same as red bars below). Pink/yellow = above caps.
          </p>

          <p className="text-xs font-medium text-rose-800 mb-1">Smoothed z &amp; cap</p>
          <div className="h-[120px] w-full mb-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={safePoints}
                margin={{ top: 4, right: 8, left: 4, bottom: 0 }}
                syncId={HEDGE_CHART_SYNC}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                <XAxis dataKey="d" hide height={0} tick={false} />
                <YAxis
                  width={36}
                  domain={[zMin, zMax]}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => (typeof v === 'number' ? v.toFixed(2) : v)}
                />
                <Tooltip
                  formatter={(v) => [typeof v === 'number' ? v.toFixed(3) : v, 'z']}
                  labelFormatter={(l) => l}
                />
                <ReferenceArea
                  y1={zTh}
                  y2={zMax}
                  fill="#f9a8c8"
                  fillOpacity={0.5}
                  strokeOpacity={0}
                />
                <ReferenceLine
                  y={zTh}
                  stroke="#b91c1c"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                />
                <Line
                  type="monotone"
                  dataKey="z"
                  name="z"
                  stroke="#1d4ed8"
                  strokeWidth={2}
                  dot={panicRegimeDot}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p className="text-xs font-medium text-amber-900 mb-1 mt-3">Prior-day VIX &amp; floor</p>
          <div className="h-[120px] w-full mb-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={safePoints}
                margin={{ top: 4, right: 8, left: 4, bottom: 0 }}
                syncId={HEDGE_CHART_SYNC}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                <XAxis dataKey="d" hide height={0} tick={false} />
                <YAxis
                  width={36}
                  domain={[vixMin, vixMax]}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => (typeof v === 'number' ? v.toFixed(1) : v)}
                />
                <Tooltip
                  formatter={(v) => [typeof v === 'number' ? v.toFixed(3) : v, 'VIX (prior)']}
                  labelFormatter={(l) => l}
                />
                <ReferenceArea
                  y1={vixFl}
                  y2={vixMax}
                  fill="#fde68a"
                  fillOpacity={0.55}
                  strokeOpacity={0}
                />
                <ReferenceLine
                  y={vixFl}
                  stroke="#b45309"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                />
                <Line
                  type="monotone"
                  dataKey="vixP"
                  name="vixP"
                  stroke="#6d28d9"
                  strokeWidth={2}
                  dot={panicRegimeDot}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p className="text-xs font-medium text-gray-800 mb-1 mt-3">Panic on that day? (one bar = one day)</p>
          <p className="text-xs text-gray-600 mb-2">
            <span className="inline-block w-3 h-2 rounded-sm bg-red-700 mr-1 align-middle" /> on ·
            <span className="inline-block w-3 h-2 rounded-sm bg-amber-500 ml-1 mr-1 align-middle" /> ①+② but not ③ ·
            <span className="inline-block w-3 h-2 rounded-sm bg-gray-300 ml-1 mr-1 align-middle" /> off
          </p>
          <div className="h-[64px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={safePoints}
                margin={{ top: 2, right: 8, left: 4, bottom: 2 }}
                syncId={HEDGE_CHART_SYNC}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-gray-200" />
                <XAxis dataKey="d" tick={{ fontSize: 9 }} minTickGap={28} interval="preserveStartEnd" />
                <YAxis type="number" domain={[0, 1]} hide />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.[0]) return null;
                    const pl = payload[0].payload;
                    let line = 'Not in the panic mix';
                    if (pl.panic) line = 'Panic mix ON (heavy VIXY)';
                    else if (pl.hysteresisBlock) {
                      line = 'Rules passed, normal sleeve (standby until z resets below 0)';
                    }
                    return (
                      <div className="text-xs bg-white border rounded shadow px-2 py-1 max-w-[16rem]">
                        <div className="font-medium">{label}</div>
                        <div className="text-gray-700">{line}</div>
                        {pl.waitingReset && !pl.panic && (
                          <div className="text-gray-500 mt-0.5">Reset rule active (z must go &lt; 0 before next panic)</div>
                        )}
                      </div>
                    );
                  }}
                />
                <Bar dataKey="panic1" maxBarSize={14} isAnimationActive={false}>
                  {safePoints.map((entry, i) => {
                    let fill = '#e5e7eb';
                    if (entry.panic) fill = '#b91c1c';
                    else if (entry.hysteresisBlock) fill = '#f59e0b';
                    return <Cell key={i} fill={fill} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

const TONE_STYLES = {
  blue: 'bg-blue-50 text-blue-700 border-blue-100',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  red: 'bg-red-50 text-red-700 border-red-100',
  gray: 'bg-gray-50 text-gray-700 border-gray-200',
};

function Kpi({ label, value, icon, tone = 'gray', sub }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border p-4 ${TONE_STYLES[tone] || TONE_STYLES.gray}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide opacity-70">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs mt-1 opacity-70">{sub}</div>}
    </motion.div>
  );
}

function StrategyGroupCard({ group }) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <Link
          to={`/strategies/${group.strategy_id}`}
          className="text-sm font-semibold text-gray-900 hover:text-blue-600 inline-flex items-center gap-1"
        >
          {group.strategy_name}
          <ArrowUpRight className="w-3 h-3" />
        </Link>
        <span className="text-xs text-gray-500">
          {group.deployments.length} deployment{group.deployments.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="divide-y">
        {group.deployments.map((d) => (
          <Link
            key={d.id}
            to={`/deployments/${d.id}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {d.name || `${d.strategy_name} deployment`}
              </div>
              <div className="text-xs text-gray-500">
                {d.broker_name} • {(d.position_mode || '').toUpperCase()} •{' '}
                {d.deployment_type === 'paper' ? 'Paper' : 'Real money'}
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-600 shrink-0">
              <span>{d.active_symbol_count}/{d.symbol_count} sym</span>
              <span>${Number(d.initial_capital).toLocaleString()}</span>
              <span className={`px-2 py-1 rounded-full ${STATUS_BADGE[d.status] || 'bg-gray-100'}`}>
                {d.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function FeedPanel({ title, icon, events, emptyHint, compact = false }) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-3 border-b flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <span className="text-xs text-gray-400 ml-auto">{events.length}</span>
      </div>
      <div className={`divide-y ${compact ? 'max-h-72' : 'max-h-96'} overflow-y-auto`}>
        {events.length === 0 ? (
          <div className="text-center text-xs text-gray-500 py-8">{emptyHint}</div>
        ) : (
          events.map((e) => (
            <FeedEvent key={e.id} event={e} compact={compact} />
          ))
        )}
      </div>
    </div>
  );
}

function FeedEvent({ event, compact }) {
  const levelClass =
    event.level === 'error'
      ? 'bg-red-100 text-red-700'
      : event.level === 'warning'
        ? 'bg-yellow-100 text-yellow-700'
        : 'bg-blue-50 text-blue-700';
  return (
    <div className={`px-4 py-2 ${compact ? 'text-xs' : 'text-sm'}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${levelClass}`}>
          {event.event_type}
        </span>
        {event.deployment_symbol_ticker && (
          <span className="text-xs text-gray-500">
            [{event.deployment_symbol_ticker}]
          </span>
        )}
        {event.deployment && (
          <Link
            to={`/deployments/${event.deployment}`}
            className="text-xs text-blue-600 hover:underline"
          >
            #{event.deployment}
          </Link>
        )}
        <span className="text-xs text-gray-400 ml-auto">
          {fmtRelative(event.created_at)}
        </span>
      </div>
      {event.message && !compact && (
        <div className="mt-1 text-gray-700 text-xs">{event.message}</div>
      )}
    </div>
  );
}

function TradesTable({ title, trades, emptyHint, showPnl }) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      {trades.length === 0 ? (
        <div className="text-center text-xs text-gray-500 py-8">{emptyHint}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">Ticker</th>
                <th className="px-3 py-2 text-left">Mode</th>
                <th className="px-3 py-2 text-right">Entry</th>
                <th className="px-3 py-2 text-right">Exit</th>
                {showPnl && <th className="px-3 py-2 text-right">PnL</th>}
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {trades.map((t) => (
                <tr key={t.id}>
                  <td className="px-3 py-2 font-medium">
                    {t.symbol_info?.ticker || t.symbol}
                  </td>
                  <td className="px-3 py-2 uppercase">{t.position_mode}</td>
                  <td className="px-3 py-2 text-right">{fmtNumber(t.entry_price, { maximumFractionDigits: 4 })}</td>
                  <td className="px-3 py-2 text-right">{fmtNumber(t.exit_price, { maximumFractionDigits: 4 })}</td>
                  {showPnl && (
                    <td
                      className={`px-3 py-2 text-right font-medium ${
                        Number(t.pnl) > 0
                          ? 'text-emerald-600'
                          : Number(t.pnl) < 0
                            ? 'text-red-600'
                            : 'text-gray-700'
                      }`}
                    >
                      {t.pnl != null ? fmtCurrency(t.pnl) : '—'}
                    </td>
                  )}
                  <td className="px-3 py-2">{t.status}</td>
                  <td className="px-3 py-2 text-gray-500">
                    {fmtRelative(t.exit_timestamp || t.entry_timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, hint }) {
  return (
    <div className="text-center py-12 bg-white rounded-lg shadow">
      <Rocket className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{hint}</p>
    </div>
  );
}
