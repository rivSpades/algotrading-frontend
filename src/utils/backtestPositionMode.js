/**
 * Backtest.position_modes from API: list of 'long' and/or 'short' that were simulated.
 */

function normalizeModesArray(modes) {
  if (!Array.isArray(modes) || modes.length === 0) {
    return ['long', 'short'];
  }
  const out = [];
  if (modes.includes('long')) out.push('long');
  if (modes.includes('short')) out.push('short');
  return out.length ? out : ['long', 'short'];
}

export function positionModesAvailable(backtest) {
  return normalizeModesArray(backtest?.position_modes);
}

export function positionModeRunLabel(backtest) {
  const m = positionModesAvailable(backtest);
  if (m.length === 2) return 'Long and short';
  if (m[0] === 'long') return 'Long only';
  return 'Short only';
}
