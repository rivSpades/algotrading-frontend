/**
 * Hybrid VIX hedge parameters — mirror algo defaults (backtest_engine/services/hybrid_vix_hedge.py).
 * Used before GET /backtests/hedge-lab-settings/ returns.
 */

export const HEDGE_DEFAULTS = {
  z_threshold: 1.5,
  vix_floor: 25,
  smooth_win: 3,
  panic_spy_weight: 0.6,
  panic_vixy_weight: 0.4,
  normal_spy_weight: 0.8,
  normal_spread_weight: 0.2,
  rolling_vix_window: 20,
  rolling_beta_window: 60,
  min_warmup_days: 60,
};

/** Integer-valued keys for input parsing */
export const HEDGE_INT_KEYS = new Set([
  'smooth_win',
  'rolling_vix_window',
  'rolling_beta_window',
  'min_warmup_days',
]);

/**
 * @param {Record<string, number>} effective
 */
export function parseHedgeField(key, raw, effective) {
  const fallback = effective[key] ?? HEDGE_DEFAULTS[key];
  if (HEDGE_INT_KEYS.has(key)) {
    const n = parseInt(String(raw), 10);
    return Number.isFinite(n) ? n : fallback;
  }
  const n = parseFloat(String(raw));
  return Number.isFinite(n) ? n : fallback;
}

export const HEDGE_FIELD_DEFS = [
  { key: 'z_threshold', label: 'Z-score threshold (panic, with VIX floor)', step: '0.1' },
  { key: 'vix_floor', label: 'VIX spot floor (panic)', step: '0.5' },
  { key: 'smooth_win', label: 'Z smoothing window (days)', step: '1' },
  { key: 'panic_spy_weight', label: 'Panic regime: SPY weight', step: '0.05' },
  { key: 'panic_vixy_weight', label: 'Panic regime: VIXY weight', step: '0.05' },
  { key: 'normal_spy_weight', label: 'Normal regime: SPY weight', step: '0.05' },
  { key: 'normal_spread_weight', label: 'Normal regime: VIXM/VIXY spread weight', step: '0.05' },
  { key: 'rolling_vix_window', label: 'Rolling VIX mean/std window (days)', step: '1' },
  { key: 'rolling_beta_window', label: 'Rolling β window (days)', step: '1' },
  { key: 'min_warmup_days', label: 'Warmup bars before full simulation', step: '1' },
];
