/**
 * Symbol Card Component
 * Displays symbol information in a card format
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { withReturnState } from '../lib/navigation';

export default function SymbolCard({ symbol, onClick, footer = null }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = () => {
    if (onClick) {
      onClick(symbol);
    } else {
      navigate(`/symbols/${symbol.ticker}`, { state: withReturnState(location) });
    }
  };

  const statusColor = symbol.status === 'active' ? 'bg-profit-soft text-profit-ink' : 'bg-surface-sunken text-ink';

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-surface rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={handleClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-ink mb-1">{symbol.ticker}</h3>
          <p className="text-sm text-ink-secondary">
            {symbol.exchange_name || symbol.exchange}
          </p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
          {symbol.status}
        </span>
      </div>

      <div className="space-y-2 text-sm text-ink-secondary">
        <div className="flex items-center gap-2">
          <span className="font-medium">Exchange:</span>
          <span>{symbol.exchange}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">Type:</span>
          <span className="capitalize">{symbol.type}</span>
        </div>
        {symbol.name && symbol.name !== symbol.ticker && (
          <div className="text-xs text-ink-tertiary truncate" title={symbol.name}>
            {symbol.name}
          </div>
        )}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <span className="text-xs">
            Updated:{' '}
            {symbol.last_updated
              ? new Date(symbol.last_updated).toLocaleDateString()
              : '—'}
          </span>
        </div>
        {footer ? <div className="mt-3 pt-3 border-t border-border text-xs text-ink-secondary">{footer}</div> : null}
      </div>
    </motion.div>
  );
}

