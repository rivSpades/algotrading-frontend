/**
 * Read-only summary of backtest configuration (backend-sourced).
 */

import { Settings } from 'lucide-react';

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString();
  } catch {
    return String(iso);
  }
}

export default function BacktestParametersPanel({ backtest, title = 'Backtest parameters' }) {
  if (!backtest) return null;

  const sp = backtest.strategy_parameters;
  const hedgeKeys =
    backtest.hedge_config && typeof backtest.hedge_config === 'object'
      ? Object.keys(backtest.hedge_config).filter((k) => backtest.hedge_config[k] !== '' && backtest.hedge_config[k] != null)
      : [];

  return (
    <div className="mb-6 bg-white rounded-lg shadow border border-gray-100 p-4">
      <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
        <Settings className="w-5 h-5 text-gray-600" />
        {title}
      </h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-sm">
        {backtest.name != null && String(backtest.name).trim() !== '' && (
          <>
            <dt className="text-gray-500">Name</dt>
            <dd className="text-gray-900 font-medium sm:col-span-2">{backtest.name}</dd>
          </>
        )}
        <dt className="text-gray-500">Train / test split</dt>
        <dd className="text-gray-900 sm:col-span-2">
          {Math.round((Number(backtest.split_ratio) || 0) * 100)}% /{' '}
          {Math.round((1 - (Number(backtest.split_ratio) || 0)) * 100)}%
        </dd>
        <dt className="text-gray-500">Initial capital</dt>
        <dd className="text-gray-900 sm:col-span-2">
          {backtest.initial_capital != null ? `$${Number(backtest.initial_capital).toLocaleString()}` : '—'}
        </dd>
        <dt className="text-gray-500">Bet size per trade</dt>
        <dd className="text-gray-900 sm:col-span-2">
          {backtest.bet_size_percentage != null ? `${Number(backtest.bet_size_percentage).toFixed(1)}%` : '—'}
        </dd>
        <dt className="text-gray-500">Position modes</dt>
        <dd className="text-gray-900 sm:col-span-2">
          {Array.isArray(backtest.position_modes) && backtest.position_modes.length
            ? backtest.position_modes.map((m) => String(m).toUpperCase()).join(', ')
            : '—'}
        </dd>
        {backtest.broker != null && backtest.broker !== '' && (
          <>
            <dt className="text-gray-500">Broker (filter)</dt>
            <dd className="text-gray-900 sm:col-span-2">{String(backtest.broker)}</dd>
          </>
        )}
        <dt className="text-gray-500">Data window (stored)</dt>
        <dd className="text-gray-900 sm:col-span-2">
          {fmtDate(backtest.start_date)} → {fmtDate(backtest.end_date)}
        </dd>
        <dt className="text-gray-500">Hybrid VIX hedge</dt>
        <dd className="text-gray-900 sm:col-span-2">{backtest.hedge_enabled ? 'On' : 'Off'}</dd>
        {backtest.hedge_enabled && (
          <>
            <dt className="text-gray-500">Strategy-only baseline</dt>
            <dd className="text-gray-900 sm:col-span-2">
              {backtest.run_strategy_only_baseline ? 'Yes' : 'No'}
            </dd>
          </>
        )}
        {backtest.hedge_enabled && hedgeKeys.length > 0 && (
          <>
            <dt className="text-gray-500">Hedge config</dt>
            <dd className="text-gray-900 sm:col-span-2 font-mono text-xs break-all">
              {hedgeKeys.slice(0, 12).map((k) => `${k}=${JSON.stringify(backtest.hedge_config[k])}`).join(' · ')}
              {hedgeKeys.length > 12 ? '…' : ''}
            </dd>
          </>
        )}
      </dl>
      {sp && typeof sp === 'object' && Object.keys(sp).length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Strategy parameters</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1 text-sm">
            {Object.entries(sp).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-gray-500 capitalize">{k.replace(/_/g, ' ')}</dt>
                <dd className="text-gray-900 sm:col-span-2">{String(v)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
