/**
 * Fetch OHLCV Data Modal Component
 * Modal for fetching OHLCV data in bulk (single symbol, multiple symbols, or by exchange)
 */

import { useState, useEffect } from 'react';
import { X, Download, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { marketDataAPI } from '../data/api';

const FETCH_MODES = {
  SINGLE: 'single',
  MULTIPLE: 'multiple',
  EXCHANGE: 'exchange',
};

export default function FetchOHLCVModal({ isOpen, onClose, onFetch }) {
  const [fetchMode, setFetchMode] = useState(FETCH_MODES.SINGLE);
  const [singleTicker, setSingleTicker] = useState('');
  const [multipleTickers, setMultipleTickers] = useState('');
  const [selectedExchange, setSelectedExchange] = useState('');
  const [exchanges, setExchanges] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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

  const handleFetch = async () => {
    let fetchData = {
      provider_code: 'YAHOO',
      start_date: startDate || null,
      end_date: endDate || null,
    };

    if (fetchMode === FETCH_MODES.SINGLE) {
      if (!singleTicker.trim()) {
        alert('Please enter a ticker symbol');
        return;
      }
      fetchData.ticker = singleTicker.trim().toUpperCase();
    } else if (fetchMode === FETCH_MODES.MULTIPLE) {
      const tickers = multipleTickers
        .split(',')
        .map(t => t.trim().toUpperCase())
        .filter(t => t.length > 0);
      if (tickers.length === 0) {
        alert('Please enter at least one ticker symbol');
        return;
      }
      fetchData.tickers = tickers;
    } else if (fetchMode === FETCH_MODES.EXCHANGE) {
      if (!selectedExchange) {
        alert('Please select an exchange');
        return;
      }
      fetchData.exchange_code = selectedExchange;
    }

    onFetch(fetchData);
    onClose();
    // Reset form
    setSingleTicker('');
    setMultipleTickers('');
    setSelectedExchange('');
    setStartDate('');
    setEndDate('');
  };

  const filteredExchanges = exchanges.filter(exchange => {
    // Handle both API response formats (Code/Name from EOD API or code/name from DB)
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
          className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900">Fetch OHLCV Data</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Fetch Mode Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Fetch Mode
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setFetchMode(FETCH_MODES.SINGLE)}
                  className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                    fetchMode === FETCH_MODES.SINGLE
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  Single Symbol
                </button>
                <button
                  onClick={() => setFetchMode(FETCH_MODES.MULTIPLE)}
                  className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                    fetchMode === FETCH_MODES.MULTIPLE
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  Multiple Symbols
                </button>
                <button
                  onClick={() => setFetchMode(FETCH_MODES.EXCHANGE)}
                  className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                    fetchMode === FETCH_MODES.EXCHANGE
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  By Exchange
                </button>
              </div>
            </div>

            {/* Single Symbol Input */}
            {fetchMode === FETCH_MODES.SINGLE && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ticker Symbol
                </label>
                <input
                  type="text"
                  value={singleTicker}
                  onChange={(e) => setSingleTicker(e.target.value.toUpperCase())}
                  placeholder="e.g., AAPL"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Multiple Symbols Input */}
            {fetchMode === FETCH_MODES.MULTIPLE && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ticker Symbols (comma-separated)
                </label>
                <textarea
                  value={multipleTickers}
                  onChange={(e) => setMultipleTickers(e.target.value.toUpperCase())}
                  placeholder="e.g., AAPL, MSFT, GOOGL"
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Enter ticker symbols separated by commas
                </p>
              </div>
            )}

            {/* Exchange Selection */}
            {fetchMode === FETCH_MODES.EXCHANGE && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exchange
                </label>
                <div className="mb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search exchanges..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
                {loading ? (
                  <div className="text-center py-4 text-gray-500">Loading exchanges...</div>
                ) : filteredExchanges.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No exchanges found. Please fetch symbols first to populate exchanges.
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {filteredExchanges.map((exchange) => {
                      // Handle both API response formats (Code/Name from EOD API or code/name from DB)
                      const exchangeCode = exchange.code || exchange.Code;
                      const exchangeName = exchange.name || exchange.Name;
                      return (
                        <label
                          key={exchangeCode}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedExchange === exchangeCode
                              ? 'bg-primary-50 border-2 border-primary-500'
                              : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                          }`}
                        >
                          <input
                            type="radio"
                            name="exchange"
                            value={exchangeCode}
                            checked={selectedExchange === exchangeCode}
                            onChange={(e) => setSelectedExchange(e.target.value)}
                            className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{exchangeName}</div>
                            <div className="text-sm text-gray-500">Code: {exchangeCode}</div>
                            {exchange.country && (
                              <div className="text-xs text-gray-400">{exchange.country}</div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Date Range */}
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Date Range (optional)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={endDate || new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || undefined}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Leave empty to fetch all available data
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleFetch}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              <Download className="w-5 h-5" />
              Fetch Data
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

