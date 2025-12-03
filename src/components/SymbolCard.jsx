/**
 * Symbol Card Component
 * Displays symbol information in a card format
 */

import { useNavigate } from 'react-router-dom';
import { Calendar, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SymbolCard({ symbol }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/symbols/${symbol.ticker}`);
  };

  const statusColor = symbol.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={handleClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">{symbol.ticker}</h3>
          <p className="text-sm text-gray-600">
            {symbol.exchange_name || symbol.exchange}
          </p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
          {symbol.status}
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <span className="font-medium">Exchange:</span>
          <span>{symbol.exchange}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">Type:</span>
          <span className="capitalize">{symbol.type}</span>
        </div>
        {symbol.name && symbol.name !== symbol.ticker && (
          <div className="text-xs text-gray-500 truncate" title={symbol.name}>
            {symbol.name}
          </div>
        )}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <span className="text-xs">
            Updated: {new Date(symbol.last_updated).toLocaleDateString()}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

