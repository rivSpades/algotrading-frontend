/**
 * Modal to run a portfolio backtest locked to a global test (parameter set).
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, BarChart3 } from 'lucide-react';
import { capVariantRuns, maxVariantRuns, totalPermutationCount } from '../lib/orderPermutations';

function fmtMoney(value) {
  if (value == null) return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return `$${n.toLocaleString()}`;
}

export default function PortfolioRunModal({
  open,
  onClose,
  onSubmit,
  parameterSetLabel = '',
  configSummary = null,
  symbolCount = 0,
  isRetest = false,
  submitting = false,
}) {
  const maxVariants = maxVariantRuns(symbolCount);
  const totalOrders = totalPermutationCount(symbolCount);
  const [name, setName] = useState('');
  const [numPaths, setNumPaths] = useState(maxVariants > 0 ? maxVariants : 0);

  useEffect(() => {
    if (open) {
      setNumPaths(maxVariants > 0 ? maxVariants : 0);
    }
  }, [open, maxVariants]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      name: name.trim() || `${parameterSetLabel || 'Global test'} — portfolio`,
      num_monte_carlo_paths: capVariantRuns(symbolCount, numPaths),
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          className="w-full max-w-md bg-surface rounded-xl shadow-xl border border-border p-6"
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                <Lock className="w-5 h-5 text-ink-secondary" />
                {isRetest ? 'Retest portfolio' : 'Run portfolio'}
              </h2>
              <p className="text-sm text-ink-secondary mt-1">
                Params locked to global test
                {parameterSetLabel ? `: ${parameterSetLabel}` : ''}.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-surface-sunken min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {configSummary && (
            <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm bg-bg rounded-lg p-3">
              <dt className="text-ink-tertiary">Capital</dt>
              <dd className="text-ink font-mono tabular-nums">{fmtMoney(configSummary.initial_capital)}</dd>
              <dt className="text-ink-tertiary">Bet size</dt>
              <dd className="text-ink">{configSummary.bet_size_percentage ?? '—'}%</dd>
              <dt className="text-ink-tertiary">Split</dt>
              <dd className="text-ink">
                {configSummary.split_ratio != null
                  ? `${Math.round(Number(configSummary.split_ratio) * 100)}% train`
                  : '—'}
              </dd>
              <dt className="text-ink-tertiary">Modes</dt>
              <dd className="text-ink">
                {Array.isArray(configSummary.position_modes)
                  ? configSummary.position_modes.join(', ')
                  : '—'}
              </dd>
            </dl>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm">
              <span className="text-ink-secondary">Name (optional)</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`${parameterSetLabel || 'Global test'} — portfolio`}
                className="mt-1 w-full px-3 py-2 border border-border-strong rounded-lg bg-surface"
              />
            </label>

            <label className="block text-sm">
              <span className="text-ink-secondary flex items-center gap-1">
                <BarChart3 className="w-4 h-4" />
                Order variants (after portfolio)
              </span>
              <input
                type="number"
                min={0}
                max={maxVariants}
                value={numPaths}
                onChange={(e) => setNumPaths(capVariantRuns(symbolCount, e.target.value))}
                disabled={maxVariants === 0}
                className="mt-1 w-full px-3 py-2 border border-border-strong rounded-lg bg-surface font-mono tabular-nums disabled:opacity-50"
              />
              <span className="text-xs text-ink-tertiary mt-1 block">
                {symbolCount >= 2 ? (
                  <>
                    {symbolCount} symbols → <strong>{totalOrders}</strong> unique priority orders.
                    Run 0 is your portfolio; max <strong>{maxVariants}</strong> additional variants (no duplicates).
                    Use 0 to skip.
                  </>
                ) : (
                  'Need at least 2 symbols for order variance.'
                )}
              </span>
            </label>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg border border-border-strong text-ink min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2 rounded-lg bg-accent text-white font-medium disabled:opacity-50 min-h-[44px]"
              >
                {submitting ? 'Starting…' : isRetest ? 'Retest' : 'Run portfolio'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
