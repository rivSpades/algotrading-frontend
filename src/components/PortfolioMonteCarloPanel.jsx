/**
 * Monte Carlo simulation panel for portfolio backtests linked to a global test.
 */

import { useState, useEffect, useCallback } from 'react';
import Chart from 'react-apexcharts';
import { BarChart3, Loader, Play } from 'lucide-react';
import { getPortfolioMonteCarlo, runPortfolioMonteCarlo } from '../data/backtests';
import TaskProgress from './TaskProgress';
import { getChartTheme } from '../lib/chartTheme';

function fmtMoney(value) {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  const sign = n >= 0 ? '+' : '';
  return `${sign}$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(value) {
  if (value == null || value === '') return '—';
  const n = Number(value) * 100;
  if (Number.isNaN(n)) return '—';
  return `${n.toFixed(1)}%`;
}

export default function PortfolioMonteCarloPanel({ backtestId, backtestStatus, hasParameterSet }) {
  const chartTheme = getChartTheme();
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [numPaths, setNumPaths] = useState(500);
  const [taskId, setTaskId] = useState(null);
  const [showTaskProgress, setShowTaskProgress] = useState(false);

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

  useEffect(() => {
    loadSimulation();
  }, [loadSimulation, backtestStatus]);

  useEffect(() => {
    if (!simulation || !['pending', 'running'].includes(simulation.status)) return undefined;
    const interval = setInterval(loadSimulation, 3000);
    return () => clearInterval(interval);
  }, [simulation?.status, simulation?.id, loadSimulation]);

  if (!hasParameterSet) return null;

  const handleRun = async () => {
    try {
      const data = await runPortfolioMonteCarlo(backtestId, { numPaths });
      const sim = data?.simulation;
      setSimulation(sim);
      if (sim?.task_id) {
        setTaskId(sim.task_id);
        setShowTaskProgress(true);
      }
    } catch (e) {
      alert(e.message || 'Failed to start Monte Carlo');
    }
  };

  const histogram = Array.isArray(simulation?.profit_histogram) ? simulation.profit_histogram : [];
  const isDark = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark';
  const chartOptions = {
    chart: { type: 'bar', toolbar: { show: false }, background: 'transparent' },
    theme: { mode: isDark ? 'dark' : 'light' },
    plotOptions: { bar: { columnWidth: '90%' } },
    xaxis: {
      categories: histogram.map((b) => fmtMoney((Number(b.bin_start) + Number(b.bin_end)) / 2)),
      labels: { rotate: -45, style: { colors: chartTheme.inkTertiary } },
      title: { text: 'Final profit', style: { color: chartTheme.inkSecondary } },
    },
    yaxis: {
      labels: { style: { colors: chartTheme.inkTertiary } },
      title: { text: 'Paths', style: { color: chartTheme.inkSecondary } },
    },
    colors: [chartTheme.accent],
    dataLabels: { enabled: false },
    grid: { borderColor: chartTheme.grid },
  };
  const chartSeries = [{ name: 'Paths', data: histogram.map((b) => b.count) }];

  const canRun = backtestStatus === 'completed' && !['pending', 'running'].includes(simulation?.status);

  return (
    <div className="mb-6 bg-surface rounded-lg shadow-lg p-6 border border-border">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-ink flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Monte Carlo (symbol order)
          </h2>
          <p className="text-sm text-ink-secondary mt-1">
            Random permutations of symbol priority explore how execution order affects shared-capital outcomes.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2 shrink-0">
          <label className="text-sm">
            <span className="text-ink-secondary block mb-1">Paths</span>
            <input
              type="number"
              min={1}
              max={2000}
              value={numPaths}
              onChange={(e) => setNumPaths(Math.min(2000, Math.max(1, Number(e.target.value) || 500)))}
              className="w-24 px-3 py-2 border border-border-strong rounded-lg bg-surface"
            />
          </label>
          <button
            type="button"
            onClick={handleRun}
            disabled={!canRun}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            <Play className="w-4 h-4" />
            Run Monte Carlo
          </button>
        </div>
      </div>

      {loading && !simulation ? (
        <div className="text-center py-8">
          <Loader className="w-8 h-8 animate-spin mx-auto text-accent" />
        </div>
      ) : simulation ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-bg rounded-lg p-4">
              <p className="text-xs text-ink-tertiary uppercase tracking-wide">Mean profit</p>
              <p className="text-lg font-semibold text-ink font-mono tabular-nums mt-1">
                {fmtMoney(simulation.mean_profit)}
              </p>
            </div>
            <div className="bg-bg rounded-lg p-4">
              <p className="text-xs text-ink-tertiary uppercase tracking-wide">P(broke)</p>
              <p className="text-lg font-semibold text-ink font-mono tabular-nums mt-1">
                {fmtPct(simulation.prob_broke)}
              </p>
            </div>
            <div className="bg-bg rounded-lg p-4">
              <p className="text-xs text-ink-tertiary uppercase tracking-wide">Median profit</p>
              <p className="text-lg font-semibold text-ink font-mono tabular-nums mt-1">
                {fmtMoney(simulation.median_profit)}
              </p>
            </div>
            <div className="bg-bg rounded-lg p-4">
              <p className="text-xs text-ink-tertiary uppercase tracking-wide">P5 / P95</p>
              <p className="text-sm font-semibold text-ink font-mono tabular-nums mt-1">
                {fmtMoney(simulation.percentile_5)} / {fmtMoney(simulation.percentile_95)}
              </p>
            </div>
          </div>

          {simulation.status && simulation.status !== 'completed' && (
            <p className="text-sm text-ink-secondary mb-4 flex items-center gap-2">
              <Loader className="w-4 h-4 animate-spin" />
              Status: {simulation.status}
              {simulation.error_message ? ` — ${simulation.error_message}` : ''}
            </p>
          )}

          {histogram.length > 0 && simulation.status === 'completed' && (
            <Chart options={chartOptions} series={chartSeries} type="bar" height={280} />
          )}
        </>
      ) : (
        <p className="text-sm text-ink-secondary">
          No simulation yet. Run Monte Carlo after the portfolio backtest completes.
        </p>
      )}

      {showTaskProgress && taskId && (
        <TaskProgress
          taskId={taskId}
          onComplete={() => {
            setShowTaskProgress(false);
            setTaskId(null);
            loadSimulation();
          }}
          onClose={() => {
            setShowTaskProgress(false);
            setTaskId(null);
          }}
        />
      )}
    </div>
  );
}
