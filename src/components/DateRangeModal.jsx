/**
 * Date Range Modal Component
 * Allows user to select start and end dates for fetching OHLCV data
 * Optionally allows provider selection for refetch operations
 */

import { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { marketDataAPI } from '../data/api';

export default function DateRangeModal({ isOpen, onClose, onConfirm, title = 'Select Date Range', showProvider = false }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [providers, setProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(false);

  // Set default dates (1 year ago to today)
  const today = new Date().toISOString().split('T')[0];
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const defaultStartDate = oneYearAgo.toISOString().split('T')[0];

  const loadProviders = async () => {
    setLoadingProviders(true);
    try {
      const response = await marketDataAPI.getProviders();
      if (response.success && response.data) {
        let providersData = [];
        if (Array.isArray(response.data)) {
          providersData = response.data;
        } else if (response.data.results && Array.isArray(response.data.results)) {
          providersData = response.data.results;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          providersData = response.data.data;
        }
        setProviders(providersData);
        // Set default to first provider or YAHOO if available
        if (providersData.length > 0) {
          const yahooProvider = providersData.find(p => p.code === 'YAHOO');
          if (yahooProvider) {
            setSelectedProvider('YAHOO');
          } else {
            setSelectedProvider(providersData[0].code);
          }
        }
      }
    } catch (error) {
      console.error('Error loading providers:', error);
    } finally {
      setLoadingProviders(false);
    }
  };

  // Load providers when modal opens and showProvider is true
  useEffect(() => {
    if (isOpen && showProvider) {
      loadProviders();
    }
  }, [isOpen, showProvider]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirm = () => {
    const params = {};
    
    if (!startDate && !endDate) {
      // If no dates selected, use period instead
      params.period = '1y';
    } else {
      params.start_date = startDate || null;
      params.end_date = endDate || null;
    }
    
    // Add provider if provider selection is shown
    if (showProvider && selectedProvider) {
      params.provider_code = selectedProvider;
    }
    
    onConfirm(params);
    handleClose();
  };

  const handleClose = () => {
    setStartDate('');
    setEndDate('');
    setSelectedProvider('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-600" />
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Provider Selection (only shown if showProvider is true) */}
            {showProvider && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Provider
                </label>
                {loadingProviders ? (
                  <div className="text-center py-2 text-gray-500 text-sm">Loading providers...</div>
                ) : providers.length === 0 ? (
                  <div className="text-center py-2 text-gray-500 text-sm">No providers available</div>
                ) : (
                  <select
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {providers.map((provider) => (
                      <option key={provider.code} value={provider.code}>
                        {provider.name} {provider.code === 'POLYGON' && '(Bulk/Fast)'}
                      </option>
                    ))}
                  </select>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  This will overwrite the existing provider and refetch all data
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date (optional)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate || today}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder={defaultStartDate}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date (optional)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
                max={today}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder={today}
              />
            </div>

            <div className="text-sm text-gray-500">
              <p>• Leave both empty to fetch last 1 year</p>
              <p>• Select dates to fetch specific range</p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Confirm
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}














