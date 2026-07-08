/**
 * Symbol-order variance: your saved portfolio run vs re-simulated order permutations.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import Chart from 'react-apexcharts';
import { Loader, Play, RefreshCw, X, ExternalLink } from 'lucide-react';
import {
  getPortfolioMonteCarlo,
  getPortfolioMonteCarloPaths,
  runPortfolioMonteCarlo,
} from '../data/backtests';
import TaskProgress from './TaskProgress';
import ApexEquityChart, { equityPointsToApexData } from './charts/ApexEquityChart';
import PortfolioPerformanceMetricsGrid from './PortfolioPerformanceMetricsGrid';
import { getChartTheme } from '../lib/chartTheme';
import { capVariantRuns, maxVariantRuns, totalPermutationCount } from '../lib/orderPermutations';

function fmtMoney(value) {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  const sign = n >= 0 ? '+' : '';
  return `${sign}$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(value) {
  if (value == null || value === '') return '—';
  const n = Number(value) * 100;
  if (Number.isNaN(n)) return '—';
  return `${n.toFixed(1)}%`;
}

function orderLabel(order) {
  if (!Array.isArray(order) || order.length === 0) return '—';
  return order.join(' → ');
}

function PathDetailPanel({
  path,
  onClose,
  onOpenResults,
  initialCapital,
  resultsEquityCurve,
  referenceStats,
  positionModeLabel = 'LONG',
}) {
  const chartTheme = getChartTheme();
  if (!path) return null;
  const isRef = path.is_reference;
  const curve = isRef && resultsEquityCurve?.length
    ? resultsEquityCurve
    : (Array.isArray(path.equity_curve) ? path.equity_curve : []);
  const metrics = (path.performance_metrics && Object.keys(path.performance_metrics).length > 0)
    ? path.performance_metrics
    : (isRef ? referenceStats : null);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-6xl max-h-[92vh] overflow-y-auto border border-border">
        <div className="flex items-start justify-between p-6 border-b border-border sticky top-0 bg-surface z-10">
          <div>
            <h3 className="text-xl font-bold text-ink">
              {isRef ? 'Run 0 — Your portfolio' : `Run ${path.path_index}`}
            </h3>
            <p className="text-sm text-ink-secondary mt-1 font-mono">{orderLabel(path.symbol_order)}</p>
            <p className="text-xs text-ink-tertiary mt-1 uppercase">{positionModeLabel} mode</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-bg" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {isRef ? (
            <div className="text-sm text-ink-secondary bg-accent-soft border border-accent-soft rounded-lg p-3">
              Same portfolio run as the <strong>Results</strong> tab. Symbol priority on ties:{' '}
              {orderLabel(path.symbol_order)}.
            </div>
          ) : (
            <div className="text-sm text-ink-secondary bg-bg border border-border rounded-lg p-3">
              Re-simulated with the same strategy and capital, but a different symbol priority order when
              multiple signals occur on the same day. Trade history is not stored per variant.
            </div>
          )}

          <div className="bg-surface rounded-lg border border-border p-6">
            <PortfolioPerformanceMetricsGrid
              stats={metrics}
              title={`Performance Metrics (${positionModeLabel})`}
              subtitle={isRef ? 'Saved portfolio backtest statistics' : 'Statistics for this order variant'}
            />
          </div>

          {curve.length > 0 ? (
            <div className="bg-surface rounded-lg border border-border p-6">
              <h2 className="text-xl font-bold text-ink mb-4">
                Equity Curve ({positionModeLabel})
              </h2>
              <ApexEquityChart
                series={[{
                  name: isRef ? 'Your portfolio' : `Run ${path.path_index}`,
                  data: equityPointsToApexData(curve),
                  color: isRef ? chartTheme.ink : chartTheme.accent,
                  strokeWidth: isRef ? 3 : 2,
                }]}
                height={360}
                initialCapital={initialCapital}
              />
            </div>
          ) : (
            <p className="text-sm text-ink-tertiary">No equity curve stored for this run.</p>
          )}

          {isRef && onOpenResults ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenResults();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white min-h-[44px]"
            >
              <ExternalLink className="w-4 h-4" />
              Open full results (trades &amp; stats)
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function PortfolioVarianceSection({
  backtestId,
  backtestStatus,
  monteCarloNumPaths = 500,
  symbolCount = 0,
  resultsEquityCurve = null,
  referenceStats = null,
  positionModeLabel = 'LONG',
  initialCapital = null,
  hasParameterSet,
  onViewPortfolioResults,
}) {
  const [simulation, setSimulation] = useState(null);
  const [paths, setPaths] = useState([]);
  const [pathsLoading, setPathsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rerunPaths, setRerunPaths] = useState(0);
  const [taskId, setTaskId] = useState(null);
  const [showTaskProgress, setShowTaskProgress] = useState(false);
  const [selectedPath, setSelectedPath] = useState(null);

  const symCount = useMemo(() => {
    if (symbolCount > 0) return symbolCount;
    if (Array.isArray(simulation?.reference_symbol_order)) return simulation.reference_symbol_order.length;
    return 0;
  }, [symbolCount, simulation?.reference_symbol_order]);

  const maxVariants = maxVariantRuns(symCount);
  const totalOrders = totalPermutationCount(symCount);

  const loadSimulation = useCallback(async () => {
    if (!backtestId) return;
    setLoading(true);
    try {
      const data = await getPortfolioMonteCarlo(backtestId);
      setSimulation(data?.simulation || null);
    } catch (e) {
      console.error(e);
      setSimulation(null);
    } finally {
      setLoading(false);
    }
  }, [backtestId]);

  const loadPaths = useCallback(async () => {
    if (!backtestId || !simulation || simulation.status !== 'completed') return;
    setPathsLoading(true);
    try {
      const data = await getPortfolioMonteCarloPaths(backtestId, 1, 200);
      setPaths(data?.results || []);
    } catch (e) {
      console.error(e);
      setPaths([]);
    } finally {
      setPathsLoading(false);
    }
  }, [backtestId, simulation]);

  useEffect(() => {
    setRerunPaths(capVariantRuns(symCount, simulation?.num_paths ?? monteCarloNumPaths ?? maxVariants));
  }, [symCount, simulation?.num_paths, monteCarloNumPaths, maxVariants]);

  useEffect(() => {
    loadSimulation();
  }, [loadSimulation, backtestStatus]);

  useEffect(() => {
    loadPaths();
  }, [loadPaths]);

  useEffect(() => {
    if (!simulation || !['pending', 'running'].includes(simulation.status)) return undefined;
    const interval = setInterval(() => {
      loadSimulation();
    }, 3000);
    return () => clearInterval(interval);
  }, [simulation?.status, simulation?.id, loadSimulation]);

  const referenceProfit = simulation?.reference_profit;
  const variantCount = simulation?.variant_path_count ?? simulation?.num_paths ?? 0;
  const sortedPaths = [...paths].sort((a, b) => a.path_index - b.path_index);
  const chartTheme = getChartTheme();

  const runsChartSeries = useMemo(() => {
    const resultsData = equityPointsToApexData(resultsEquityCurve);
    return sortedPaths
      .map((path) => {
        const isRef = path.is_reference;
        const raw = isRef && resultsData.length
          ? resultsEquityCurve
          : (path.equity_curve || []);
        const data = isRef && resultsData.length ? resultsData : equityPointsToApexData(raw);
        if (!data.length) return null;
        return {
          name: isRef ? 'Run 0 — your portfolio' : `Run ${path.path_index}`,
          data,
          color: isRef ? chartTheme.ink : chartTheme.accent,
          strokeWidth: isRef ? 3 : 1.5,
          opacity: isRef ? 1 : 0.55,
        };
      })
      .filter(Boolean);
  }, [sortedPaths, resultsEquityCurve, chartTheme]);

  if (!hasParameterSet) return null;

  const handleRerun = async () => {
    try {
      const capped = capVariantRuns(symCount, rerunPaths);
      const data = await runPortfolioMonteCarlo(backtestId, { numPaths: capped });
      const sim = data?.simulation;
      setSimulation(sim);
      setPaths([]);
      if (sim?.task_id) {
        setTaskId(sim.task_id);
        setShowTaskProgress(true);
      }
    } catch (e) {
      alert(e.message || 'Failed to start variance simulation');
    }
  };

  const histogram = Array.isArray(simulation?.profit_histogram) ? simulation.profit_histogram : [];
  const isDark = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark';
  const histOptions = {
    chart: { type: 'bar', toolbar: { show: false }, background: 'transparent' },
    theme: { mode: isDark ? 'dark' : 'light' },
    plotOptions: { bar: { columnWidth: '90%' } },
    xaxis: {
      categories: histogram.map((b) => fmtMoney((Number(b.bin_start) + Number(b.bin_end)) / 2)),
      labels: { rotate: -45, style: { colors: getChartTheme().inkTertiary } },
      title: { text: 'Profit (variants only)', style: { color: getChartTheme().inkSecondary } },
    },
    yaxis: {
      labels: { style: { colors: getChartTheme().inkTertiary } },
      title: { text: 'Runs', style: { color: getChartTheme().inkSecondary } },
    },
    colors: [getChartTheme().accent],
    dataLabels: { enabled: false },
    grid: { borderColor: chartTheme.grid },
  };
  const histSeries = [{ name: 'Runs', data: histogram.map((b) => b.count) }];

  const portfolioRunning = backtestStatus === 'pending' || backtestStatus === 'running';
  const mcRunning = simulation && ['pending', 'running'].includes(simulation.status);
  const mcSkipped = Number(monteCarloNumPaths) === 0 && !simulation;
  const mcDone = simulation?.status === 'completed';

  return (
    <div className="space-y-6">
      <div className="bg-bg border border-border rounded-lg p-4 text-sm text-ink-secondary leading-relaxed">
        <p className="font-medium text-ink mb-2">What is this?</p>
        <p>
          Your <strong>Results</strong> tab shows one portfolio run with a fixed symbol priority order
          ({orderLabel(simulation?.reference_symbol_order)}). Here we re-run the same strategy with{' '}
          <strong>different symbol orders</strong> (only the tie-breaking priority when signals clash on the same day).
        </p>
        <p className="mt-2">
          <strong>Run 0</strong> is always your saved portfolio — it must match Results PnL.
          Variants are <strong>unique</strong> symbol orders only (max {maxVariants} for {symCount} symbols = {totalOrders} orders total).
        </p>
      </div>

      {portfolioRunning && (
        <div className="flex items-center gap-2 text-sm text-ink-secondary p-4 bg-bg rounded-lg">
          <Loader className="w-4 h-4 animate-spin" />
          Running portfolio backtest…
        </div>
      )}

      {!portfolioRunning && mcRunning && (
        <div className="flex items-center gap-2 text-sm text-ink-secondary p-4 bg-bg rounded-lg">
          <Loader className="w-4 h-4 animate-spin" />
          Running order variants ({simulation.num_paths} simulations)…
        </div>
      )}

      {mcSkipped && backtestStatus === 'completed' && (
        <div className="p-4 bg-bg rounded-lg border border-border">
          <p className="text-sm text-ink-secondary mb-3">Variance simulation was skipped (0 paths). Run it now:</p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-sm">
              <span className="text-ink-secondary block mb-1">Variant runs</span>
              <input
                type="number"
                min={1}
                max={maxVariants}
                value={rerunPaths}
                onChange={(e) => setRerunPaths(capVariantRuns(symCount, e.target.value))}
                className="w-24 px-3 py-2 border border-border-strong rounded-lg bg-surface"
              />
            </label>
            <button
              type="button"
              onClick={handleRerun}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white min-h-[44px]"
            >
              <Play className="w-4 h-4" />
              Run variants
            </button>
          </div>
        </div>
      )}

      {loading && !simulation && !portfolioRunning ? (
        <div className="text-center py-12">
          <Loader className="w-8 h-8 animate-spin mx-auto text-accent" />
        </div>
      ) : null}

      {mcDone && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface border-2 border-ink rounded-lg p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-tertiary">Run 0 — your portfolio</p>
              <p className="text-2xl font-mono font-semibold text-ink mt-2">{fmtMoney(referenceProfit)}</p>
              <p className="text-xs text-ink-secondary mt-2">{orderLabel(simulation.reference_symbol_order)}</p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-tertiary">
                Mean across {variantCount} order variants
              </p>
              <p className="text-2xl font-mono font-semibold text-ink mt-2">{fmtMoney(simulation.mean_profit)}</p>
              <p className="text-xs text-ink-secondary mt-2">
                Median {fmtMoney(simulation.median_profit)} · P5 {fmtMoney(simulation.percentile_5)} · P95{' '}
                {fmtMoney(simulation.percentile_95)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {[
              { label: 'P(broke) variants', value: fmtPct(simulation.prob_broke) },
              { label: 'P(profitable) variants', value: fmtPct(simulation.prob_profit_positive) },
              { label: 'Best variant', value: fmtMoney(simulation.best_path?.profit) },
              { label: 'Worst variant', value: fmtMoney(simulation.worst_path?.profit) },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-bg rounded-lg p-3 border border-border">
                <p className="text-xs text-ink-tertiary">{kpi.label}</p>
                <p className="font-mono font-semibold text-ink mt-1">{kpi.value}</p>
              </div>
            ))}
          </div>

          {simulation?.mean_performance_metrics &&
            Object.keys(simulation.mean_performance_metrics).length > 0 && (
            <div className="bg-surface rounded-lg border border-border p-6">
              <PortfolioPerformanceMetricsGrid
                stats={simulation.mean_performance_metrics}
                title={`Mean Performance Metrics (${positionModeLabel})`}
                subtitle={`Average across ${variantCount} order variants (Run 0 excluded)`}
              />
            </div>
          )}

          {runsChartSeries.length > 0 && (
            <div className="bg-surface rounded-lg border border-border p-4">
              <h3 className="text-base font-semibold text-ink mb-1">All runs — equity curves</h3>
              <p className="text-xs text-ink-secondary mb-4">
                {sortedPaths.length} lines — Run 0 matches Results tab.
              </p>
              <ApexEquityChart
                series={runsChartSeries}
                height={440}
                initialCapital={initialCapital}
              />
            </div>
          )}

          <div className="bg-surface rounded-lg border border-border overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-base font-semibold text-ink">Runs</h3>
              <p className="text-xs text-ink-secondary mt-1">Click a row for equity curve and details.</p>
            </div>
            {pathsLoading ? (
              <div className="p-8 text-center text-ink-secondary">
                <Loader className="w-6 h-6 animate-spin mx-auto" />
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-bg sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs text-ink-tertiary uppercase">Run</th>
                      <th className="px-4 py-2 text-left text-xs text-ink-tertiary uppercase">Symbol order</th>
                      <th className="px-4 py-2 text-right text-xs text-ink-tertiary uppercase">Profit</th>
                      <th className="px-4 py-2 text-right text-xs text-ink-tertiary uppercase" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sortedPaths.map((path) => (
                      <tr
                        key={path.id ?? path.path_index}
                        className={`hover:bg-bg cursor-pointer ${path.is_reference ? 'bg-accent-soft/30' : ''}`}
                        onClick={() => setSelectedPath(path)}
                      >
                        <td className="px-4 py-2 font-medium text-ink">
                          {path.is_reference ? '0 (your run)' : path.path_index}
                        </td>
                        <td className="px-4 py-2 text-ink-secondary font-mono text-xs truncate max-w-[240px]">
                          {orderLabel(path.symbol_order)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums">{fmtMoney(path.profit)}</td>
                        <td className="px-4 py-2 text-right text-accent text-xs">Detail</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {histogram.length > 0 && (
            <div className="bg-surface rounded-lg border border-border p-4">
              <h3 className="text-base font-semibold text-ink mb-3">Variant profit distribution</h3>
              <Chart options={histOptions} series={histSeries} type="bar" height={260} />
            </div>
          )}

          <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-border">
            <label className="text-sm">
              <span className="text-ink-secondary block mb-1">Re-run variant count</span>
              <input
                type="number"
                min={1}
                max={maxVariants}
                value={rerunPaths}
                onChange={(e) => setRerunPaths(capVariantRuns(symCount, e.target.value))}
                className="w-24 px-3 py-2 border border-border-strong rounded-lg bg-surface"
              />
            </label>
            <button
              type="button"
              onClick={handleRerun}
              disabled={mcRunning}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border-strong text-ink min-h-[44px] disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              Re-run variants
            </button>
          </div>
        </>
      )}

      {selectedPath ? (
        <PathDetailPanel
          path={selectedPath}
          onClose={() => setSelectedPath(null)}
          onOpenResults={onViewPortfolioResults}
          initialCapital={initialCapital}
          resultsEquityCurve={resultsEquityCurve}
          referenceStats={referenceStats}
          positionModeLabel={positionModeLabel}
        />
      ) : null}

      {showTaskProgress && taskId && (
        <TaskProgress
          taskId={taskId}
          onComplete={() => {
            setShowTaskProgress(false);
            setTaskId(null);
            loadSimulation();
            loadPaths();
          }}
          onClose={() => {
            setShowTaskProgress(false);
            setTaskId(null);
            loadSimulation();
            loadPaths();
          }}
        />
      )}
    </div>
  );
}
