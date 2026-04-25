/**
 * Modal to run a new stored single-symbol snapshot (configure options here).
 * Recalculate / same-settings update is handled outside this modal (no config step).
 */

import { useState, useLayoutEffect } from 'react';
import { X } from 'lucide-react';
import { runStrategySymbolBacktest } from '../data/strategies';
import { getHedgeLabSettings } from '../data/backtests';
import { HEDGE_DEFAULTS, HEDGE_FIELD_DEFS } from '../data/hedgeConfig';

export default function StrategySymbolBacktestRunModal({ open, onClose, strategy, ticker, onStarted }) {
  const [splitRatio, setSplitRatio] = useState(0.7);
  const [initialCapital, setInitialCapital] = useState(10000.0);
  const [betSizePercentage, setBetSizePercentage] = useState(100.0);
  const [runPositionLong, setRunPositionLong] = useState(true);
  const [runPositionShort, setRunPositionShort] = useState(true);
  const [hedgeEnabled, setHedgeEnabled] = useState(false);
  const [runStrategyOnlyBaseline, setRunStrategyOnlyBaseline] = useState(true);
  const [hedgeParams, setHedgeParams] = useState(() => ({ ...HEDGE_DEFAULTS }));
  const [strategyParameters, setStrategyParameters] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [runName, setRunName] = useState('');

  useLayoutEffect(() => {
    if (!open || !strategy) return;

    setRunName(`${strategy.name} — ${ticker}`);
    setStrategyParameters({ ...(strategy.default_parameters || {}) });
    setHedgeEnabled(false);
    setRunStrategyOnlyBaseline(true);
    setSplitRatio(0.7);
    setInitialCapital(10000.0);
    setBetSizePercentage(100.0);
    setRunPositionLong(true);
    setRunPositionShort(true);
    setHedgeParams({ ...HEDGE_DEFAULTS });
    getHedgeLabSettings()
      .then((hedgeLab) => {
        if (hedgeLab?.effective_config && typeof hedgeLab.effective_config === 'object') {
          setHedgeParams({ ...HEDGE_DEFAULTS, ...hedgeLab.effective_config });
        } else {
          setHedgeParams({ ...HEDGE_DEFAULTS });
        }
      })
      .catch(() => setHedgeParams({ ...HEDGE_DEFAULTS }));
  }, [open, strategy, ticker]);

  if (!open || !strategy) return null;

  const updateParameter = (key, value) => {
    setStrategyParameters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!runPositionLong && !runPositionShort) {
      alert('Select at least one position mode: Long and/or Short.');
      return;
    }
    setSubmitting(true);
    try {
      const endDate = new Date().toISOString();
      const startDate = new Date('1900-01-01').toISOString();
      const defaultName = `${strategy.name} — ${ticker}`;
      const payload = {
        name: (runName && String(runName).trim()) || defaultName,
        start_date: startDate,
        end_date: endDate,
        split_ratio: splitRatio,
        initial_capital: initialCapital,
        bet_size_percentage: betSizePercentage,
        strategy_parameters: strategyParameters,
        position_modes: [...(runPositionLong ? ['long'] : []), ...(runPositionShort ? ['short'] : [])],
      };
      if (hedgeEnabled) {
        payload.hedge_enabled = true;
        payload.run_strategy_only_baseline = !!runStrategyOnlyBaseline;
        const hc = {};
        for (const { key } of HEDGE_FIELD_DEFS) {
          if (hedgeParams[key] !== undefined) {
            hc[key] = hedgeParams[key];
          }
        }
        payload.hedge_config = hc;
      }
      const backtest = await runStrategySymbolBacktest(strategy.id, ticker, payload);
      onStarted?.({ taskId: backtest.task_id, backtestId: backtest.id, runName: payload.name });
      onClose();
    } catch (e) {
      console.error(e);
      alert(e.message || 'Failed to start symbol backtest');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">New run — {ticker}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            Adds a new saved run for this strategy and ticker. To re-run the run you are viewing with the same saved
            settings, use the <strong>Recalculate</strong> button on the results page (no configuration step).
          </p>
          <label className="block text-sm">
            <span className="text-gray-600">Run name</span>
            <input
              type="text"
              value={runName}
              onChange={(e) => setRunName(e.target.value)}
              placeholder={`${strategy.name} — ${ticker}`}
              className="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"
            />
            <span className="text-xs text-gray-500 mt-1 block">
              Shown in the &quot;Run to view&quot; list so you can tell runs apart.
            </span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="text-gray-600">Split ratio</span>
              <input
                type="number"
                step="0.05"
                min={0}
                max={1}
                value={splitRatio}
                onChange={(e) => setSplitRatio(parseFloat(e.target.value))}
                className="mt-1 w-full border rounded px-2 py-1"
              />
            </label>
            <label className="text-sm">
              <span className="text-gray-600">Initial capital</span>
              <input
                type="number"
                min={0}
                value={initialCapital}
                onChange={(e) => setInitialCapital(parseFloat(e.target.value))}
                className="mt-1 w-full border rounded px-2 py-1"
              />
            </label>
            <label className="text-sm col-span-2">
              <span className="text-gray-600">Bet size %</span>
              <input
                type="number"
                min={0.1}
                max={100}
                value={betSizePercentage}
                onChange={(e) => setBetSizePercentage(parseFloat(e.target.value))}
                className="mt-1 w-full border rounded px-2 py-1"
              />
            </label>
          </div>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={runPositionLong}
                onChange={(e) => setRunPositionLong(e.target.checked)}
              />
              Long
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={runPositionShort}
                onChange={(e) => setRunPositionShort(e.target.checked)}
              />
              Short
            </label>
          </div>
          {strategy.default_parameters && Object.keys(strategy.default_parameters).length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-800 mb-2">Strategy parameters</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(strategy.default_parameters).map((key) => (
                  <label key={key} className="text-sm">
                    <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                    <input
                      type="text"
                      value={strategyParameters[key] ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        const num = Number(v);
                        updateParameter(key, v === '' || Number.isNaN(num) ? v : num);
                      }}
                      className="mt-1 w-full border rounded px-2 py-1"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hedgeEnabled}
              onChange={(e) => setHedgeEnabled(e.target.checked)}
            />
            Enable hybrid VIX hedge (same as global backtest)
          </label>
          {hedgeEnabled && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={runStrategyOnlyBaseline}
                onChange={(e) => setRunStrategyOnlyBaseline(e.target.checked)}
              />
              Run strategy-only baseline for comparison
            </label>
          )}
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {submitting ? 'Starting…' : 'Run'}
          </button>
        </div>
      </div>
    </div>
  );
}
