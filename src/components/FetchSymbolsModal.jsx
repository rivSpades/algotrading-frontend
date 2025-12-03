/**
 * Fetch Symbols Modal Component
 * Modal for selecting exchanges and fetching symbols
 */

import { useState, useEffect } from 'react';
import { X, Download, Check, CheckSquare, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { marketDataAPI } from '../data/api';

export default function FetchSymbolsModal({ isOpen, onClose, onFetch }) {
  const [exchanges, setExchanges] = useState([]);
  const [selectedExchanges, setSelectedExchanges] = useState([]);
  const [fetchAll, setFetchAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadExchanges();
    }
  }, [isOpen]);

  const loadExchanges = async () => {
    setLoading(true);
    setExchanges([]); // Clear previous exchanges
    try {
      console.log('Fetching exchanges from API...');
      const response = await marketDataAPI.getAvailableExchanges();
      console.log('API Response:', response);
      
      if (response.success && response.data) {
        // Handle different response structures
        let exchangesData = [];
        if (Array.isArray(response.data)) {
          exchangesData = response.data;
        } else if (response.data.results && Array.isArray(response.data.results)) {
          exchangesData = response.data.results;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          exchangesData = response.data.data;
        }
        
        console.log('Loaded exchanges:', exchangesData.length, 'First 3:', exchangesData.slice(0, 3));
        
        if (exchangesData.length === 0) {
          console.warn('No exchanges returned from API');
          alert('No exchanges found. Please check the API connection.');
        } else {
          setExchanges(exchangesData);
        }
      } else {
        const errorMsg = response.error || response.data?.error || 'Unknown error';
        console.error('Failed to load exchanges:', errorMsg);
        alert(`Failed to load exchanges: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Error loading exchanges:', error);
      alert(`Error loading exchanges: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleExchange = (exchangeCode) => {
    if (selectedExchanges.includes(exchangeCode)) {
      setSelectedExchanges(selectedExchanges.filter(code => code !== exchangeCode));
    } else {
      setSelectedExchanges([...selectedExchanges, exchangeCode]);
    }
    setFetchAll(false);
  };

  const toggleSelectAll = () => {
    if (fetchAll) {
      setFetchAll(false);
      setSelectedExchanges([]);
    } else {
      setFetchAll(true);
      setSelectedExchanges([]);
    }
  };

  const handleFetch = async () => {
    if (fetchAll || selectedExchanges.length > 0) {
      onFetch(selectedExchanges, fetchAll);
      onClose();
    }
  };

  const filteredExchanges = exchanges.filter(exchange =>
    exchange.Code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exchange.Name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <h2 className="text-2xl font-bold text-gray-900">Fetch Symbols</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Select All Option */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fetchAll}
                  onChange={toggleSelectAll}
                  className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="font-semibold text-gray-900">Fetch from all exchanges</span>
              </label>
            </div>

            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search exchanges..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={fetchAll}
              />
            </div>

            {/* Exchange List */}
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading exchanges...</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredExchanges.map((exchange) => {
                  const isSelected = selectedExchanges.includes(exchange.Code);
                  return (
                    <label
                      key={exchange.Code}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-primary-50 border-2 border-primary-500'
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleExchange(exchange.Code)}
                        disabled={fetchAll}
                        className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{exchange.Name}</div>
                        <div className="text-sm text-gray-500">Code: {exchange.Code}</div>
                        {exchange.Country && (
                          <div className="text-xs text-gray-400">{exchange.Country}</div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
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
              disabled={!fetchAll && selectedExchanges.length === 0}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              <Download className="w-5 h-5" />
              Fetch Symbols
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

