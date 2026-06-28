/**
 * Date Range Modal Component
 * Allows user to select start/end dates and data provider for OHLCV fetch
 */

import { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { marketDataAPI } from '../data/api';

const DEFAULT_PROVIDERS = [
  { code: 'YAHOO', name: 'Yahoo Finance', configured: true },
  { code: 'ALPACA', name: 'Alpaca', configured: true },
  { code: 'ALPHA_VANTAGE', name: 'Alpha Vantage', configured: false },
];

export default function DateRangeModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Select Date Range',
  showProvider = false,
  providerHint = 'fetch',
}) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('YAHOO');
  const [providers, setProviders] = useState(DEFAULT_PROVIDERS);
  const [loadingProviders, setLoadingProviders] = useState(false);

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
        if (providersData.length > 0) {
          setProviders(providersData);
          const yahooProvider = providersData.find((p) => p.code === 'YAHOO');
          setSelectedProvider(yahooProvider ? 'YAHOO' : providersData[0].code);
        }
      }
    } catch (error) {
      console.error('Error loading providers:', error);
    } finally {
      setLoadingProviders(false);
    }
  };

  useEffect(() => {
    if (isOpen && showProvider) {
      loadProviders();
    }
  }, [isOpen, showProvider]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirm = () => {
    const params = {};

    if (!startDate && !endDate) {
      params.period = '1y';
    } else {
      params.start_date = startDate || null;
      params.end_date = endDate || null;
    }

    if (showProvider && selectedProvider) {
      params.provider_code = selectedProvider;
    }

    onConfirm(params);
    handleClose();
  };

  const handleClose = () => {
    setStartDate('');
    setEndDate('');
    setSelectedProvider('YAHOO');
    onClose();
  };

  if (!isOpen) return null;

  const providerHelp =
    providerHint === 'refetch'
      ? 'This will overwrite the existing provider and refetch all data in the range.'
      : 'Select which provider to use for this fetch.';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-surface rounded-lg shadow-xl max-w-md w-full mx-4"
        >
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent" />
              <h2 className="text-xl font-semibold text-ink">{title}</h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="text-ink-tertiary hover:text-ink-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {showProvider && (
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-2">
                  Data Provider
                </label>
                {loadingProviders ? (
                  <div className="text-center py-2 text-ink-tertiary text-sm">Loading providers...</div>
                ) : (
                  <select
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                    className="w-full px-4 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                  >
                    {providers.map((provider) => (
                      <option key={provider.code} value={provider.code}>
                        {provider.name}
                        {provider.requires_credentials && !provider.configured
                          ? ' (not configured)'
                          : ''}
                      </option>
                    ))}
                  </select>
                )}
                <p className="mt-1 text-xs text-ink-tertiary">{providerHelp}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-2">
                Start Date (optional)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate || today}
                className="w-full px-4 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder={defaultStartDate}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-2">
                End Date (optional)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
                max={today}
                className="w-full px-4 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder={today}
              />
            </div>

            <div className="text-sm text-ink-tertiary">
              <p>• Leave both empty to fetch last 1 year</p>
              <p>• End date defaults to today when empty</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-ink-secondary bg-surface-sunken rounded-lg hover:bg-surface-sunken transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
            >
              Confirm
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
