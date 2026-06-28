/**
 * Symbol Exchange Picker
 * Shown when EOD search returns multiple symbol/exchange matches.
 */

import { X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SymbolExchangePicker({
  isOpen,
  ticker,
  candidates,
  onSelect,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-surface rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h3 className="text-lg font-semibold text-ink">Select exchange</h3>
            <p className="text-sm text-ink-secondary mt-1">
              Multiple matches for <strong>{ticker}</strong>. Choose the correct listing.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-tertiary hover:text-ink-secondary"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {candidates.map((candidate) => (
            <button
              key={`${candidate.ticker}-${candidate.exchange_code}`}
              type="button"
              onClick={() => onSelect(candidate)}
              className="w-full text-left p-3 rounded-lg border border-border hover:border-accent hover:bg-accent-soft transition-colors"
            >
              <div className="font-medium text-ink">{candidate.ticker}</div>
              <div className="text-sm text-ink-secondary">{candidate.name}</div>
              <div className="text-xs text-ink-tertiary mt-1">
                Exchange: {candidate.exchange_code}
                {candidate.type ? ` · ${candidate.type}` : ''}
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
