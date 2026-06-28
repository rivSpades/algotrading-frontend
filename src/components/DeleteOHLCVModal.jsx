/**
 * Delete OHLCV Data Modal Component
 * Modal for deleting OHLCV data (single symbol, multiple symbols, or by exchange)
 */

import { useState, useEffect } from 'react';
import { X, Trash2, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { marketDataAPI } from '../data/api';

const DELETE_MODES = {
  SINGLE: 'single',
  MULTIPLE: 'multiple',
  EXCHANGE: 'exchange',
  ALL: 'all',
};

export default function DeleteOHLCVModal({ isOpen, onClose, onDelete }) {
  const [deleteMode, setDeleteMode] = useState(DELETE_MODES.SINGLE);
  const [singleTicker, setSingleTicker] = useState('');
  const [multipleTickers, setMultipleTickers] = useState('');
  const [selectedExchange, setSelectedExchange] = useState('');
  const [exchanges, setExchanges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadExchanges();
    }
  }, [isOpen]);

  const loadExchanges = async () => {
    setLoading(true);
    try {
      const response = await marketDataAPI.getExchanges();
      if (response.success && response.data) {
        let exchangesData = [];
        if (Array.isArray(response.data)) {
          exchangesData = response.data;
        } else if (response.data.results && Array.isArray(response.data.results)) {
          exchangesData = response.data.results;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          exchangesData = response.data.data;
        }
        setExchanges(exchangesData);
      }
    } catch (error) {
      console.error('Error loading exchanges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    let deleteData = {};

    if (deleteMode === DELETE_MODES.ALL) {
      deleteData.delete_all = true;
    } else if (deleteMode === DELETE_MODES.SINGLE) {
      if (!singleTicker.trim()) {
        alert('Please enter a ticker symbol');
        return;
      }
      deleteData.ticker = singleTicker.trim().toUpperCase();
    } else if (deleteMode === DELETE_MODES.MULTIPLE) {
      const tickers = multipleTickers
        .split(',')
        .map(t => t.trim().toUpperCase())
        .filter(t => t.length > 0);
      if (tickers.length === 0) {
        alert('Please enter at least one ticker symbol');
        return;
      }
      deleteData.tickers = tickers;
    } else if (deleteMode === DELETE_MODES.EXCHANGE) {
      if (!selectedExchange) {
        alert('Please select an exchange');
        return;
      }
      deleteData.exchange_code = selectedExchange;
    }

    // Confirm deletion with special warning for delete all
    let confirmMessage;
    if (deleteMode === DELETE_MODES.ALL) {
      confirmMessage = '⚠️ WARNING: Are you absolutely sure you want to delete ALL OHLCV data for ALL symbols?\n\nThis will permanently delete:\n- All OHLCV data for all symbols\n- Disable all symbols\n\nThis action CANNOT be undone!';
      
      // Double confirmation for delete all
      if (!window.confirm(confirmMessage)) {
        return;
      }
      if (!window.confirm('This is your LAST chance. Are you REALLY sure you want to delete ALL OHLCV data?')) {
        return;
      }
    } else {
      confirmMessage = deleteMode === DELETE_MODES.SINGLE
        ? `Are you sure you want to delete all OHLCV data for ${deleteData.ticker}?`
        : deleteMode === DELETE_MODES.MULTIPLE
        ? `Are you sure you want to delete OHLCV data for ${deleteData.tickers.length} symbol(s)?`
        : `Are you sure you want to delete OHLCV data for all symbols in exchange ${selectedExchange}?`;

      if (!window.confirm(confirmMessage + '\n\nThis action cannot be undone!')) {
        return;
      }
    }

    onDelete(deleteData);
    onClose();
    // Reset form
    setSingleTicker('');
    setMultipleTickers('');
    setSelectedExchange('');
  };

  const filteredExchanges = exchanges.filter(exchange => {
    const code = exchange.code || exchange.Code || '';
    const name = exchange.name || exchange.Name || '';
    const searchLower = searchTerm.toLowerCase();
    return code.toLowerCase().includes(searchLower) || name.toLowerCase().includes(searchLower);
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-surface rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-bold text-ink">Delete OHLCV Data</h2>
            <button
              onClick={onClose}
              className="text-ink-tertiary hover:text-ink-secondary transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Warning */}
            <div className="bg-loss-soft border border-loss rounded-lg p-4">
              <p className="text-sm text-loss-ink font-medium">
                ⚠️ Warning: This will permanently delete OHLCV data. This action cannot be undone.
              </p>
            </div>

            {/* Delete Mode Selection */}
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-3">
                Delete Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDeleteMode(DELETE_MODES.SINGLE)}
                  className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                    deleteMode === DELETE_MODES.SINGLE
                      ? 'border-red-500 bg-loss-soft text-loss-ink'
                      : 'border-border hover:border-border-strong'
                  }`}
                >
                  Single Symbol
                </button>
                <button
                  onClick={() => setDeleteMode(DELETE_MODES.MULTIPLE)}
                  className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                    deleteMode === DELETE_MODES.MULTIPLE
                      ? 'border-red-500 bg-loss-soft text-loss-ink'
                      : 'border-border hover:border-border-strong'
                  }`}
                >
                  Multiple Symbols
                </button>
                <button
                  onClick={() => setDeleteMode(DELETE_MODES.EXCHANGE)}
                  className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                    deleteMode === DELETE_MODES.EXCHANGE
                      ? 'border-red-500 bg-loss-soft text-loss-ink'
                      : 'border-border hover:border-border-strong'
                  }`}
                >
                  By Exchange
                </button>
                <button
                  onClick={() => setDeleteMode(DELETE_MODES.ALL)}
                  className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                    deleteMode === DELETE_MODES.ALL
                      ? 'border-red-600 bg-loss-soft text-loss-ink font-semibold'
                      : 'border-red-300 hover:border-red-400 bg-loss-soft'
                  }`}
                >
                  Delete All
                </button>
              </div>
            </div>

            {/* Single Symbol Input */}
            {deleteMode === DELETE_MODES.SINGLE && (
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-2">
                  Ticker Symbol
                </label>
                <input
                  type="text"
                  value={singleTicker}
                  onChange={(e) => setSingleTicker(e.target.value.toUpperCase())}
                  placeholder="e.g., AAPL"
                  className="w-full px-4 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Multiple Symbols Input */}
            {deleteMode === DELETE_MODES.MULTIPLE && (
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-2">
                  Ticker Symbols (comma-separated)
                </label>
                <textarea
                  value={multipleTickers}
                  onChange={(e) => setMultipleTickers(e.target.value.toUpperCase())}
                  placeholder="e.g., AAPL, MSFT, GOOGL"
                  rows={4}
                  className="w-full px-4 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <p className="mt-2 text-sm text-ink-tertiary">
                  Enter ticker symbols separated by commas
                </p>
              </div>
            )}

            {/* Delete All Warning */}
            {deleteMode === DELETE_MODES.ALL && (
              <div className="bg-loss-soft border-2 border-red-400 rounded-lg p-4">
                <p className="text-loss-ink font-semibold mb-2">
                  ⚠️ CRITICAL WARNING
                </p>
                <p className="text-sm text-loss-ink">
                  This will delete <strong>ALL OHLCV data</strong> for <strong>ALL symbols</strong> in the database.
                  This action will also disable all symbols.
                </p>
                <p className="text-sm text-loss-ink mt-2 font-medium">
                  This action cannot be undone!
                </p>
              </div>
            )}

            {/* Exchange Selection */}
            {deleteMode === DELETE_MODES.EXCHANGE && (
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-2">
                  Exchange
                </label>
                <div className="mb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-tertiary w-5 h-5" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search exchanges..."
                      className="w-full pl-10 pr-4 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>
                {loading ? (
                  <div className="text-center py-4 text-ink-tertiary">Loading exchanges...</div>
                ) : filteredExchanges.length === 0 ? (
                  <div className="text-center py-4 text-ink-tertiary">
                    No exchanges found. Please fetch symbols first to populate exchanges.
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {filteredExchanges.map((exchange) => {
                      const exchangeCode = exchange.code || exchange.Code;
                      const exchangeName = exchange.name || exchange.Name;
                      return (
                        <label
                          key={exchangeCode}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedExchange === exchangeCode
                              ? 'bg-loss-soft border-2 border-red-500'
                              : 'bg-bg border-2 border-transparent hover:bg-surface-hover'
                          }`}
                        >
                          <input
                            type="radio"
                            name="exchange"
                            value={exchangeCode}
                            checked={selectedExchange === exchangeCode}
                            onChange={(e) => setSelectedExchange(e.target.value)}
                            className="w-4 h-4 text-loss focus:ring-red-500"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-ink">{exchangeName}</div>
                            <div className="text-sm text-ink-tertiary">Code: {exchangeCode}</div>
                            {exchange.country && (
                              <div className="text-xs text-ink-tertiary">{exchange.country}</div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-ink-secondary bg-surface-sunken rounded-lg hover:bg-surface-sunken transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-6 py-2 bg-loss text-white rounded-lg hover:bg-loss disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              Delete Data
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}














