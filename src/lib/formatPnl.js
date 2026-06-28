/**
 * Format P&L for display — presentation only, no business calculations.
 */

const MINUS = '\u2212';

export function formatPnlValue(value, { currency = '$', decimals = 2, showSign = true } = {}) {
  if (value == null || value === '' || Number.isNaN(Number(value))) {
    return { text: '—', variant: 'neutral', arrow: null };
  }

  const num = Number(value);
  const abs = Math.abs(num).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (num > 0) {
    return {
      text: `${showSign ? '+' : ''}${currency}${abs}`,
      variant: 'profit',
      arrow: '▲',
    };
  }
  if (num < 0) {
    return {
      text: `${MINUS}${currency}${abs}`,
      variant: 'loss',
      arrow: '▼',
    };
  }
  return { text: `${currency}0${decimals ? `.${'0'.repeat(decimals)}` : ''}`, variant: 'neutral', arrow: null };
}

export function pnlClassName(variant) {
  if (variant === 'profit') return 'text-profit';
  if (variant === 'loss') return 'text-loss';
  return 'text-ink';
}

export function formatPercent(value, { showSign = true, decimals = 2 } = {}) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const num = Number(value);
  const abs = Math.abs(num).toFixed(decimals);
  if (num > 0) return `${showSign ? '+' : ''}${abs}%`;
  if (num < 0) return `${MINUS}${abs}%`;
  return `${abs}%`;
}
