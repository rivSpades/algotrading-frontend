/**
 * DeployStrategyModal — wizard to deploy a strategy parameter set to paper trading.
 *
 * Step 1: Pick broker, position mode, capital, bet size.
 * Step 2: Preview default green-bucket symbol selection (with overrides toggle).
 * Step 3: Confirm — POST /api/strategy-deployments/.
 *
 * Always creates a `paper` deployment; promotion to real money lives elsewhere.
 */

import { useEffect, useMemo, useState } from 'react';
import { Loader, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { getBrokers, liveTradingAPI } from '../data/liveTrading';
import {
  createStrategyDeployment,
  getHedgeInheritPreview,
  previewDeploymentSymbols,
} from '../data/strategyDeployments';

const COLOR_DOT = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-400',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  black: 'bg-black',
  gray: 'bg-gray-300',
};

const TIER_LABEL = {
  gt50: '> 50',
  gt20: '> 20',
  gt10: '> 10',
  gt0: '> 0',
  none: '0',
};

export default function DeployStrategyModal({
  open,
  onClose,
  strategyId,
  strategyName,
  parameterSet,
  parameterSetLabel,
  defaultPositionMode = 'long',
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [brokers, setBrokers] = useState([]);
  const [brokerId, setBrokerId] = useState('');
  const [positionMode, setPositionMode] = useState(defaultPositionMode);
  const [name, setName] = useState('');
  const [capital, setCapital] = useState('10000');
  const [capitalFromBroker, setCapitalFromBroker] = useState(false);
  const [capitalLoadError, setCapitalLoadError] = useState(null);
  const [betSize, setBetSize] = useState('100');
  const [evalCriteria, setEvalCriteria] = useState('{"min_trades": 10, "min_win_rate": 0.5}');

  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedTickers, setSelectedTickers] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showAllSymbols, setShowAllSymbols] = useState(false);
  const [hedgePreview, setHedgePreview] = useState(null);
  const [hedgeLoading, setHedgeLoading] = useState(false);
  const [hedgeOptIn, setHedgeOptIn] = useState(true);

  // Reset whenever the modal opens.
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setSubmitError(null);
    setShowAllSymbols(false);
    setName(parameterSetLabel ? `${strategyName || ''} • ${parameterSetLabel}` : strategyName || '');
    setPositionMode(defaultPositionMode);
    setCapital('10000');
    setCapitalFromBroker(false);
    setCapitalLoadError(null);
    setHedgePreview(null);
  }, [open, parameterSetLabel, strategyName, defaultPositionMode]);

  // Inherit hybrid VIX hedge the same way single-symbol backtests do (per strategy + parameter set).
  useEffect(() => {
    if (!open || !strategyId || !parameterSet) {
      return;
    }
    setHedgeLoading(true);
    getHedgeInheritPreview(strategyId, parameterSet)
      .then((data) => {
        setHedgePreview(data);
        setHedgeOptIn(!!data?.hedge_enabled);
      })
      .catch(() => {
        setHedgePreview({ hedge_enabled: false, _error: true });
        setHedgeOptIn(false);
      })
      .finally(() => setHedgeLoading(false));
  }, [open, strategyId, parameterSet]);

  // Load brokers on open.
  useEffect(() => {
    if (!open) return;
    getBrokers().then((data) => {
      const list = (data || []).filter((b) => b.has_paper_trading);
      setBrokers(list);
      if (list.length && !brokerId) setBrokerId(String(list[0].id));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // When a broker is selected, set initial capital from the linked paper account (equity, else cash).
  useEffect(() => {
    if (!open || !brokerId) return;
    let cancelled = false;
    setCapitalLoadError(null);
    (async () => {
      const response = await liveTradingAPI.brokers.getAccountBalance(brokerId, 'paper');
      if (cancelled) return;
      if (!response.success) {
        setCapitalFromBroker(false);
        setCapitalLoadError(response.error || 'Could not load paper account');
        return;
      }
      const { equity, balance } = response.data || {};
      const raw = equity != null && String(equity).trim() !== '' ? equity : balance;
      const num = parseFloat(String(raw ?? '0'));
      if (Number.isFinite(num) && num > 0) {
        const rounded = Math.round(num * 100) / 100;
        setCapital(String(rounded));
        setCapitalFromBroker(true);
        setCapitalLoadError(null);
      } else {
        setCapitalFromBroker(false);
        setCapitalLoadError('Paper account returned no positive equity or cash.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, brokerId]);

  // Fetch preview when entering step 2.
  useEffect(() => {
    if (step !== 2 || !parameterSet) return;
    setPreviewLoading(true);
    previewDeploymentSymbols({
      parameterSet,
      positionMode,
      defaultOnly: !showAllSymbols,
    })
      .then((data) => {
        setPreview(data);
        const sel = {};
        (data?.symbols || []).forEach((s) => {
          // pre-select green-only by default
          if (s.color_overall === 'green') sel[s.ticker] = true;
        });
        setSelectedTickers(sel);
      })
      .catch((err) => setSubmitError(err.message || 'Failed to load preview'))
      .finally(() => setPreviewLoading(false));
  }, [step, parameterSet, positionMode, showAllSymbols]);

  const selectedCount = useMemo(
    () => Object.values(selectedTickers).filter(Boolean).length,
    [selectedTickers],
  );

  if (!open) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      let evaluation = {};
      try {
        evaluation = evalCriteria ? JSON.parse(evalCriteria) : {};
      } catch {
        throw new Error('Evaluation criteria must be valid JSON.');
      }
      const overrides = (preview?.symbols || [])
        .filter((s) => selectedTickers[s.ticker])
        .map((s, idx) => ({ ticker: s.ticker, position_mode: positionMode, priority: idx }));

      const useDefault = overrides.length === 0;

      const inheritedHedge = !!hedgePreview?.hedge_enabled;
      const payload = {
        name: name || undefined,
        strategy: strategyId,
        parameter_set: parameterSet,
        broker: Number(brokerId),
        position_mode: positionMode,
        initial_capital: capital,
        bet_size_percentage: Number(betSize),
        evaluation_criteria: evaluation,
        use_default_symbols: useDefault,
        symbol_overrides: useDefault ? [] : overrides,
      };
      if (hedgeOptIn !== inheritedHedge) {
        payload.hedge_enabled = hedgeOptIn;
        if (hedgeOptIn && hedgePreview?.hedge_config && Object.keys(hedgePreview.hedge_config).length) {
          payload.hedge_config = hedgePreview.hedge_config;
        }
      }

      const deployment = await createStrategyDeployment(payload);
      onClose?.();
      navigate(`/deployments/${deployment.id}`);
    } catch (err) {
      setSubmitError(err.message || 'Failed to create deployment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Deploy Strategy</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {strategyName} • parameter set <code className="bg-gray-100 px-1 rounded">{parameterSet?.slice(0, 12)}…</code>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 text-xs">
          <Step active={step === 1} done={step > 1} index={1} label="Setup" />
          <Step active={step === 2} done={step > 2} index={2} label="Symbols" />
          <Step active={step === 3} done={false} index={3} label="Confirm" />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 1 && (
            <SetupStep
              brokers={brokers}
              brokerId={brokerId}
              setBrokerId={setBrokerId}
              positionMode={positionMode}
              setPositionMode={setPositionMode}
              name={name}
              setName={setName}
              capital={capital}
              setCapital={setCapital}
              capitalFromBroker={capitalFromBroker}
              capitalLoadError={capitalLoadError}
              setCapitalFromBroker={setCapitalFromBroker}
              betSize={betSize}
              setBetSize={setBetSize}
              evalCriteria={evalCriteria}
              setEvalCriteria={setEvalCriteria}
              hedgeOptIn={hedgeOptIn}
              setHedgeOptIn={setHedgeOptIn}
              hedgePreview={hedgePreview}
              hedgeLoading={hedgeLoading}
            />
          )}
          {step === 2 && (
            <SymbolsStep
              loading={previewLoading}
              preview={preview}
              selectedTickers={selectedTickers}
              setSelectedTickers={setSelectedTickers}
              showAllSymbols={showAllSymbols}
              setShowAllSymbols={setShowAllSymbols}
            />
          )}
          {step === 3 && (
            <ConfirmStep
              brokers={brokers}
              brokerId={brokerId}
              positionMode={positionMode}
              capital={capital}
              betSize={betSize}
              selectedCount={selectedCount}
              parameterSetLabel={parameterSetLabel}
              hedgeOptIn={hedgeOptIn}
            />
          )}
          {submitError && (
            <div className="mt-4 px-3 py-2 bg-red-50 border border-red-200 text-sm text-red-700 rounded">
              {submitError}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
          <button
            onClick={() => (step === 1 ? onClose() : setStep(step - 1))}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !brokerId}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:bg-blue-300"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !brokerId}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:bg-green-300"
            >
              {submitting && <Loader className="w-4 h-4 animate-spin" />} Create paper deployment
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({ active, done, index, label }) {
  return (
    <div className={`flex items-center gap-1 ${active ? 'text-blue-600 font-medium' : done ? 'text-green-600' : 'text-gray-400'}`}>
      <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${
        active ? 'bg-blue-100' : done ? 'bg-green-100' : 'bg-gray-100'
      }`}>
        {index}
      </span>
      <span>{label}</span>
      {index < 3 && <span className="ml-1 text-gray-300">→</span>}
    </div>
  );
}

function SetupStep(props) {
  const {
    brokers, brokerId, setBrokerId,
    positionMode, setPositionMode,
    name, setName, capital, setCapital,
    capitalFromBroker, capitalLoadError, setCapitalFromBroker,
    betSize, setBetSize, evalCriteria, setEvalCriteria,
    hedgeOptIn, setHedgeOptIn, hedgePreview, hedgeLoading,
  } = props;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
      <Field label="Name (optional)">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-1.5"
        />
      </Field>
      <Field label="Broker (paper credentials required)">
        <select
          value={brokerId}
          onChange={(e) => setBrokerId(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-1.5"
        >
          <option value="">Select…</option>
          {brokers.map((b) => (
            <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
          ))}
        </select>
        {brokers.length === 0 && (
          <p className="text-xs text-amber-600 mt-1">
            No brokers with paper-trading credentials configured.
          </p>
        )}
      </Field>
      <Field label="Position mode">
        <select
          value={positionMode}
          onChange={(e) => setPositionMode(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-1.5"
        >
          <option value="long">Long only</option>
          <option value="short">Short only</option>
          <option value="all">All</option>
        </select>
      </Field>
      <Field label="Initial capital ($)">
        <input
          type="number"
          value={capital}
          onChange={(e) => {
            setCapital(e.target.value);
            setCapitalFromBroker(false);
          }}
          className="w-full border border-gray-300 rounded px-3 py-1.5"
        />
        {capitalFromBroker && (
          <p className="text-xs text-gray-500 mt-1">
            Prefilled from this broker&apos;s <strong>paper</strong> account (total equity, or cash if equity unavailable).
          </p>
        )}
        {capitalLoadError && !capitalFromBroker && (
          <p className="text-xs text-amber-600 mt-1">{capitalLoadError} You can type a value manually.</p>
        )}
      </Field>
      <Field label="Bet size (% of capital per trade)">
        <input
          type="number"
          value={betSize}
          onChange={(e) => setBetSize(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-1.5"
        />
      </Field>
      <Field label="Evaluation criteria (JSON)">
        <textarea
          rows={3}
          value={evalCriteria}
          onChange={(e) => setEvalCriteria(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-1.5 font-mono text-xs"
        />
      </Field>
      <div className="md:col-span-2 border border-slate-200 rounded-lg p-3 bg-slate-50/80">
        <div className="flex items-start gap-2">
          <input
            id="hedge-opt-in"
            type="checkbox"
            checked={hedgeOptIn}
            onChange={(e) => setHedgeOptIn(e.target.checked)}
            disabled={hedgeLoading}
            className="mt-0.5"
          />
          <label htmlFor="hedge-opt-in" className="text-sm text-gray-800">
            <span className="font-medium">Hybrid VIX hedge (live)</span>
            {hedgeLoading && <span className="text-gray-500 ml-2">Loading…</span>}
            <span className="block text-xs text-gray-600 mt-1">
              When enabled, each entry splits notional like your symbol backtests: strategy leg + a{' '}
              <strong>{`VIXY`}</strong> sleeve (weights from the same regime model as the backtest engine).
              {hedgePreview?._error && ' Could not read symbol backtest settings — you can still toggle or leave off.'}
              {!hedgeLoading && !hedgePreview?._error && (
                <span>
                  {' '}
                  Suggested from latest runs for this parameter set:{' '}
                  <strong>{hedgePreview?.hedge_enabled ? 'on' : 'off'}</strong>.
                </span>
              )}
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

function SymbolsStep({ loading, preview, selectedTickers, setSelectedTickers, showAllSymbols, setShowAllSymbols }) {
  const symbols = preview?.symbols || [];
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-600">
          {symbols.length} candidate(s){showAllSymbols ? ' (all snapshot symbols)' : ' (default: green only)'}.
          Toggle entries to refine the selection.
        </p>
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={showAllSymbols}
            onChange={(e) => setShowAllSymbols(e.target.checked)}
          />
          Show non-green
        </label>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader className="w-6 h-6 animate-spin text-blue-500" /></div>
      ) : symbols.length === 0 ? (
        <p className="text-center text-gray-500 py-12">No candidates returned.</p>
      ) : (
        <div className="overflow-y-auto max-h-[40vh] border border-gray-200 rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left"></th>
                <th className="px-3 py-2 text-left">Ticker</th>
                <th className="px-3 py-2 text-left">Color</th>
                <th className="px-3 py-2 text-left">Tier</th>
                <th className="px-3 py-2 text-right">Sharpe (L/S)</th>
                <th className="px-3 py-2 text-right">|DD| (L/S)</th>
                <th className="px-3 py-2 text-right">Trades (L/S)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {symbols.map((s) => (
                <tr key={s.ticker} className={selectedTickers[s.ticker] ? '' : 'opacity-60'}>
                  <td className="px-3 py-1.5">
                    <input
                      type="checkbox"
                      checked={!!selectedTickers[s.ticker]}
                      onChange={(e) => setSelectedTickers((prev) => ({ ...prev, [s.ticker]: e.target.checked }))}
                    />
                  </td>
                  <td className="px-3 py-1.5 font-medium">{s.ticker}</td>
                  <td className="px-3 py-1.5">
                    <span className={`inline-block w-3 h-3 rounded-full mr-1.5 ${COLOR_DOT[s.color_overall] || 'bg-gray-300'}`} />
                    <span className="text-xs text-gray-600">{s.color_overall}</span>
                  </td>
                  <td className="px-3 py-1.5 text-xs">{TIER_LABEL[s.tier] || s.tier}</td>
                  <td className="px-3 py-1.5 text-right text-xs">{fmt(s.sharpe_long)} / {fmt(s.sharpe_short)}</td>
                  <td className="px-3 py-1.5 text-right text-xs">{fmt(s.max_dd_long)} / {fmt(s.max_dd_short)}</td>
                  <td className="px-3 py-1.5 text-right text-xs">{s.total_trades_long ?? '—'} / {s.total_trades_short ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ConfirmStep({
  brokers, brokerId, positionMode, capital, betSize, selectedCount, parameterSetLabel,
  hedgeOptIn,
}) {
  const broker = brokers.find((b) => String(b.id) === String(brokerId));
  return (
    <div className="space-y-3 text-sm text-gray-700">
      <Row label="Broker" value={broker ? `${broker.name} (${broker.code})` : '—'} />
      <Row label="Position mode" value={positionMode.toUpperCase()} />
      <Row label="Initial capital" value={`$${Number(capital).toLocaleString()}`} />
      <Row label="Bet size" value={`${betSize}%`} />
      <Row
        label="VIX hedge (live)"
        value={hedgeOptIn ? 'On — split with VIXY proxy' : 'Off'}
      />
      <Row label="Parameter set" value={parameterSetLabel || '—'} />
      <Row label="Symbols selected" value={selectedCount === 0 ? 'Default green selection' : `${selectedCount} symbol(s)`} />
      <p className="text-xs text-gray-500 mt-2">
        The deployment will be created in <strong>paper trading</strong> mode and will start in <strong>pending</strong> status. Activate it from the deployment detail page when you are ready.
      </p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-gray-500 mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function fmt(value) {
  if (value == null) return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return num.toFixed(2);
}
