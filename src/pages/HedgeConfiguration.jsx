/**
 * Hedge configuration lab: edit & save default hedge parameters, preview hybrid VIX simulation.
 */

import { useState, useEffect, useCallback } from 'react';
import Chart from 'react-apexcharts';
import { Shield, Play, Loader, Save } from 'lucide-react';
import { previewHedgeSimulation, getHedgeLabSettings, saveHedgeLabSettings } from '../data/backtests';
import {
  HEDGE_DEFAULTS,
  HEDGE_FIELD_DEFS,
  parseHedgeField,
} from '../data/hedgeConfig';

function cloneDefaults() {
  return { ...HEDGE_DEFAULTS };
}

export default function HedgeConfiguration() {
  const today = new Date().toISOString().slice(0, 10);
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  const defaultStart = fiveYearsAgo.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(today);
  const [initialCapital, setInitialCapital] = useState(10000);
  const [hedgeParams, setHedgeParams] = useState(cloneDefaults);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    setSaveMessage(null);
    try {
      const data = await getHedgeLabSettings();
      if (data?.effective_config && typeof data.effective_config === 'object') {
        setHedgeParams({ ...HEDGE_DEFAULTS, ...data.effective_config });
      }
    } catch {
      setHedgeParams(cloneDefaults());
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateHedgeField = (key, raw) => {
    setHedgeParams((prev) => ({
      ...prev,
      [key]: parseHedgeField(key, raw, prev),
    }));
  };

  const buildHedgeConfigPayload = () => {
    const out = {};
    for (const { key } of HEDGE_FIELD_DEFS) {
      if (hedgeParams[key] !== undefined) {
        out[key] = hedgeParams[key];
      }
    }
    return out;
  };

  const handleSaveDefaults = async () => {
    setSaveMessage(null);
    setSaveLoading(true);
    try {
      const data = await saveHedgeLabSettings(buildHedgeConfigPayload());
      if (data?.effective_config && typeof data.effective_config === 'object') {
        setHedgeParams({ ...HEDGE_DEFAULTS, ...data.effective_config });
      }
      setSaveMessage('Saved. New backtests with hedge enabled will use these values (unless you override per run).');
    } catch (e) {
      setSaveMessage(e.message || 'Save failed');
    } finally {
      setSaveLoading(false);
    }
  };

  const runPreview = async () => {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const start = new Date(`${startDate}T00:00:00.000Z`).toISOString();
      const end = new Date(`${endDate}T23:59:59.999Z`).toISOString();
      const data = await previewHedgeSimulation({
        start_date: start,
        end_date: end,
        initial_capital: initialCapital,
        hedge_config: buildHedgeConfigPayload(),
        use_yahoo_only: true,
      });
      setResult(data);
      if (data.error && (!data.equity_curve || data.equity_curve.length === 0)) {
        setError(data.error);
      }
    } catch (e) {
      setError(e.message || 'Preview failed');
    } finally {
      setLoading(false);
    }
  };

  const hybridSeries =
    result?.equity_curve?.map((p) => ({
      x: new Date(p.timestamp).getTime(),
      y: parseFloat(p.equity),
    })) || [];

  const spySeries =
    result?.spy_equity_curve?.map((p) => ({
      x: new Date(p.timestamp).getTime(),
      y: parseFloat(p.equity),
    })) || [];

  const hasChart = hybridSeries.length > 1 && spySeries.length > 1;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-2">
        <Shield className="w-8 h-8 text-primary-600" />
        <h1 className="text-3xl font-bold text-gray-900">Hybrid VIX hedge</h1>
      </div>
      <p className="text-gray-600 mb-8 max-w-3xl">
        Configure and save default hedge parameters. Those defaults apply to new backtests when you enable &quot;Run
        hybrid VIX hedge comparison&quot; (you can still change values per backtest in the modal). Each{' '}
        <strong>Run preview</strong> fetches SPY, VIXM, VIXY, and ^VIX <strong>only from Yahoo Finance</strong> (no
        database reads), so you always get a fresh series for the lab. Full backtests with hedge use the same
        parameters to <strong>split each trade</strong> between your strategy and the VIX sleeve (overlay data from DB +
        Yahoo backfill like other benchmarks).
      </p>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Saved defaults</h2>
        <p className="text-sm text-gray-600 mb-4">
          Adjust thresholds and weights, then save. Hysteresis reset uses smoothed Z &lt; 0 (fixed in the engine).
        </p>
        {settingsLoading ? (
          <p className="text-sm text-gray-500">Loading saved settings…</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {HEDGE_FIELD_DEFS.map(({ key, label, step }) => (
                <div key={key}>
                  <label className="block text-sm text-gray-700 mb-1">{label}</label>
                  <input
                    type="number"
                    step={step}
                    value={hedgeParams[key] ?? ''}
                    onChange={(e) => updateHedgeField(key, e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSaveDefaults}
                disabled={saveLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
              >
                {saveLoading ? <Loader className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Save defaults
              </button>
              {saveMessage && (
                <span className={`text-sm ${saveMessage.includes('fail') ? 'text-red-600' : 'text-green-700'}`}>
                  {saveMessage}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Preview window</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">End date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Initial capital ($)</label>
            <input
              type="number"
              min="1"
              step="100"
              value={initialCapital}
              onChange={(e) => setInitialCapital(parseFloat(e.target.value) || 10000)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={runPreview}
          disabled={loading || settingsLoading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
          Run preview
        </button>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>

      {result && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Metrics</h2>
          {result.data_source && (
            <p className="text-xs text-gray-500 mb-3">
              Data source: {result.data_source === 'yahoo_finance' ? 'Yahoo Finance (live fetch)' : result.data_source}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-violet-700 mb-2">Hybrid VIX hedge</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>Total return: {result.metrics?.total_return_pct ?? '—'}%</li>
                <li>Sharpe (approx.): {result.metrics?.sharpe_ratio ?? '—'}</li>
                <li>Max drawdown: {result.metrics?.max_drawdown_pct ?? '—'}%</li>
                <li>Panic days (bars): {result.panic_days_count ?? 0}</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2">SPY buy-and-hold</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>Total return: {result.spy_metrics?.total_return_pct ?? '—'}%</li>
                <li>Sharpe (approx.): {result.spy_metrics?.sharpe_ratio ?? '—'}</li>
                <li>Max drawdown: {result.spy_metrics?.max_drawdown_pct ?? '—'}%</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {hasChart && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Equity curves</h2>
          <Chart
            options={{
              chart: { type: 'line', toolbar: { show: true } },
              xaxis: { type: 'datetime', title: { text: 'Date' } },
              yaxis: { title: { text: 'Equity ($)' } },
              colors: ['#A855F7', '#6B7280'],
              stroke: { width: [2, 2], curve: 'straight' },
              legend: { position: 'top' },
              tooltip: { x: { format: 'dd MMM yyyy' } },
            }}
            series={[
              { name: 'Hybrid VIX hedge', data: hybridSeries },
              { name: 'SPY buy-and-hold', data: spySeries },
            ]}
            type="line"
            height={400}
          />
        </div>
      )}
    </div>
  );
}
