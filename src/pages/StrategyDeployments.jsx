/**
 * Strategy Deployments page (v2)
 *
 * Lists all `StrategyDeployment` rows with filtering by strategy / type / status.
 * Replaces the legacy `LiveTradingDeployments` page.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Filter, Loader, TrendingUp } from 'lucide-react';

import { listStrategyDeployments } from '../data/strategyDeployments';

const STATUS_COLORS = {
  pending: 'bg-surface-sunken text-ink-secondary',
  active: 'bg-profit-soft text-profit-ink',
  evaluating: 'bg-status-running-soft text-accent-ink',
  passed: 'bg-status-success-soft text-emerald-700',
  failed: 'bg-loss-soft text-loss-ink',
  paused: 'bg-status-pending-soft text-status-pending',
  stopped: 'bg-surface-sunken text-ink-secondary',
};

export default function StrategyDeployments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState({ results: [], count: 0 });
  const [loading, setLoading] = useState(true);

  const filters = useMemo(() => ({
    deploymentType: searchParams.get('type') || '',
    status: searchParams.get('status') || '',
    strategyId: searchParams.get('strategy') || '',
  }), [searchParams]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listStrategyDeployments({
      deploymentType: filters.deploymentType || null,
      status: filters.status || null,
      strategyId: filters.strategyId || null,
    })
      .then((page) => {
        if (!cancelled) setData(page);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [filters.deploymentType, filters.status, filters.strategyId]);

  const updateFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-ink">Strategy Deployments</h1>
          <p className="text-ink-secondary mt-1">
            Live and paper deployments anchored to single-symbol backtest parameter sets.
          </p>
        </div>
        <Link
          to="/strategies"
          className="text-sm bg-accent text-white px-4 py-2 rounded-lg hover:bg-accent-hover"
        >
          Deploy from a strategy
        </Link>
      </div>

      <div className="bg-surface rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <Filter className="w-5 h-5 text-ink-tertiary" />
          <select
            value={filters.deploymentType}
            onChange={(e) => updateFilter('type', e.target.value)}
            className="px-3 py-2 border border-border-strong rounded-md text-sm"
          >
            <option value="">All Types</option>
            <option value="paper">Paper Trading</option>
            <option value="real_money">Real Money</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="px-3 py-2 border border-border-strong rounded-md text-sm"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="evaluating">Evaluating</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="paused">Paused</option>
            <option value="stopped">Stopped</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : data.results.length === 0 ? (
        <div className="text-center py-12 bg-bg rounded-lg">
          <TrendingUp className="w-12 h-12 text-ink-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-ink mb-2">No deployments yet</h3>
          <p className="text-ink-secondary">
            Open a strategy detail page and click <em>Deploy</em> on one of the global parameter sets.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {data.results.map((deployment) => (
            <motion.div
              key={deployment.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <Link to={`/deployments/${deployment.id}`} className="block p-6">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-ink">
                      {deployment.name || `${deployment.strategy_name} deployment`}
                    </h3>
                    <p className="text-xs text-ink-tertiary mt-1">
                      {deployment.broker_name} • {deployment.position_mode.toUpperCase()} • {deployment.parameter_set_label || deployment.parameter_set?.slice(0, 10)}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[deployment.status] || 'bg-surface-sunken text-ink-secondary'}`}>
                    {deployment.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-sm mt-4">
                  <Stat label="Type" value={deployment.deployment_type === 'paper' ? 'Paper' : 'Real'} />
                  <Stat label="Symbols" value={`${deployment.active_symbol_count}/${deployment.symbol_count}`} />
                  <Stat label="Capital" value={`$${Number(deployment.initial_capital).toLocaleString()}`} />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-xs uppercase text-ink-tertiary">{label}</div>
      <div className="font-medium text-ink">{value}</div>
    </div>
  );
}
