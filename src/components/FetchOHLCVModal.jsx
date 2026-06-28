/**
 * Fetch OHLCV Data Modal Component
 * Modal for fetching OHLCV data in bulk (single symbol, multiple symbols, or by exchange)
 */

import { useState, useEffect } from 'react';
import { X, Download, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { marketDataAPI } from '../data/api';
import { liveTradingAPI } from '../data/liveTrading';
import { resolveSymbol } from '../data/symbols';
import SymbolExchangePicker from './SymbolExchangePicker';

const FETCH_MODES = {
  SINGLE: 'single',
  MULTIPLE: 'multiple',
  EXCHANGE: 'exchange',
  BROKER: 'broker',
};

const DEFAULT_OHLCV_PROVIDERS = [
  { code: 'YAHOO', name: 'Yahoo Finance', requires_credentials: false, configured: true },
  { code: 'ALPACA', name: 'Alpaca', requires_credentials: true, configured: false },
  { code: 'ALPHA_VANTAGE', name: 'Alpha Vantage', requires_credentials: true, configured: false },
];

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
  const [selectedBroker, setSelectedBroker] = useState('');
  const [brokers, setBrokers] = useState([]);
  const [loadingBrokers, setLoadingBrokers] = useState(false);
  const [brokerSearchTerm, setBrokerSearchTerm] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('YAHOO');
  const [providers, setProviders] = useState(DEFAULT_OHLCV_PROVIDERS);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [ambiguousCandidates, setAmbiguousCandidates] = useState([]);
  const [pendingFetchData, setPendingFetchData] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadExchanges();
      loadBrokers();
      loadProviders();
    }
  }, [isOpen]);

  const loadExchanges = async () => {
    setLoading(true);
    try {
      const response = await marketDataAPI.getAvailableExchanges();
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

  const loadBrokers = async () => {
    setLoadingBrokers(true);
    try {
      const response = await liveTradingAPI.brokers.getBrokers();
      if (response.success && response.data) {
        let brokersData = [];
        if (Array.isArray(response.data)) {
          brokersData = response.data;
        } else if (response.data.results && Array.isArray(response.data.results)) {
          brokersData = response.data.results;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          brokersData = response.data.data;
        }
        setBrokers(brokersData);
      }
    } catch (error) {
      console.error('Error loading brokers:', error);
    } finally {
      setLoadingBrokers(false);
    }
  };

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
        } else {
          setProviders(DEFAULT_OHLCV_PROVIDERS);
          setSelectedProvider('YAHOO');
        }
      } else {
        setProviders(DEFAULT_OHLCV_PROVIDERS);
        setSelectedProvider('YAHOO');
      }
    } catch (error) {
      console.error('Error loading providers:', error);
      setProviders(DEFAULT_OHLCV_PROVIDERS);
      setSelectedProvider('YAHOO');
    } finally {
      setLoadingProviders(false);
    }
  };

  const buildFetchPayload = () => {
    const fetchData = {
      provider_code: selectedProvider || 'YAHOO',
      start_date: startDate || null,
      end_date: endDate || null,
    };

    if (fetchMode === FETCH_MODES.SINGLE) {
      if (!singleTicker.trim()) {
        alert('Please enter a ticker symbol');
        return null;
      }
      fetchData.ticker = singleTicker.trim().toUpperCase();
    } else if (fetchMode === FETCH_MODES.MULTIPLE) {
      const tickers = multipleTickers
        .split(',')
        .map((t) => t.trim().toUpperCase())
        .filter((t) => t.length > 0);
      if (tickers.length === 0) {
        alert('Please enter at least one ticker symbol');
        return null;
      }
      fetchData.tickers = tickers;
    } else if (fetchMode === FETCH_MODES.EXCHANGE) {
      if (!selectedExchange) {
        alert('Please select an exchange');
        return null;
      }
      fetchData.exchange_code = selectedExchange;
    } else if (fetchMode === FETCH_MODES.BROKER) {
      if (!selectedBroker) {
        alert('Please select a broker');
        return null;
      }
      fetchData.broker_id = parseInt(selectedBroker, 10);
    }

    return fetchData;
  };

  const resetForm = () => {
    setSingleTicker('');
    setMultipleTickers('');
    setSelectedExchange('');
    setStartDate('');
    setEndDate('');
    setSelectedBroker('');
    setBrokerSearchTerm('');
    setAmbiguousCandidates([]);
    setPendingFetchData(null);
  };

  const submitFetch = (fetchData) => {
    onFetch(fetchData);
    onClose();
    resetForm();
  };

  const resolveAndFetchSingle = async (fetchData) => {
    setResolving(true);
    try {
      const result = await resolveSymbol(fetchData.ticker);
      if (result.status === 'resolved') {
        if (result.symbol?.exchange_code) {
          fetchData.exchange_code = result.symbol.exchange_code;
        }
        submitFetch(fetchData);
        return;
      }
      if (result.status === 'ambiguous') {
        setPendingFetchData(fetchData);
        setAmbiguousCandidates(result.candidates || []);
        return;
      }
      alert(result.message || `Symbol ${fetchData.ticker} not found`);
    } catch (error) {
      alert(`Failed to resolve symbol: ${error.message}`);
    } finally {
      setResolving(false);
    }
  };

  const handleCandidateSelect = async (candidate) => {
    if (!pendingFetchData) return;
    setResolving(true);
    try {
      const result = await resolveSymbol(
        pendingFetchData.ticker,
        candidate.exchange_code,
      );
      if (result.status === 'resolved') {
        const fetchData = {
          ...pendingFetchData,
          exchange_code: candidate.exchange_code,
        };
        setAmbiguousCandidates([]);
        setPendingFetchData(null);
        submitFetch(fetchData);
      } else {
        alert(result.message || 'Could not resolve symbol for selected exchange');
      }
    } catch (error) {
      alert(`Failed to resolve symbol: ${error.message}`);
    } finally {
      setResolving(false);
    }
  };

  const handleFetch = async () => {
    const fetchData = buildFetchPayload();
    if (!fetchData) return;

    if (fetchMode === FETCH_MODES.SINGLE) {
      await resolveAndFetchSingle(fetchData);
      return;
    }

    submitFetch(fetchData);
  };

  const filteredExchanges = exchanges.filter((exchange) => {
    const code = exchange.code || exchange.Code || '';
    const name = exchange.name || exchange.Name || '';
    const searchLower = searchTerm.toLowerCase();
    return code.toLowerCase().includes(searchLower) || name.toLowerCase().includes(searchLower);
  });

  const displayProviders = providers.length > 0 ? providers : DEFAULT_OHLCV_PROVIDERS;

  if (!isOpen) return null;

  return (
    <>
      <SymbolExchangePicker
        isOpen={ambiguousCandidates.length > 0}
        ticker={pendingFetchData?.ticker}
        candidates={ambiguousCandidates}
        onSelect={handleCandidateSelect}
        onClose={() => {
          setAmbiguousCandidates([]);
          setPendingFetchData(null);
        }}
      />

      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-surface rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-ink">Fetch OHLCV Data</h2>
              <button
                type="button"
                onClick={onClose}
                className="text-ink-tertiary hover:text-ink-secondary transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-3">
                  Data Provider
                </label>
                {loadingProviders ? (
                  <div className="text-center py-2 text-ink-tertiary">Loading providers...</div>
                ) : (
                  <select
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                    className="w-full px-4 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                  >
                    {displayProviders.map((provider) => (
                      <option key={provider.code} value={provider.code}>
                        {provider.name}
                        {provider.requires_credentials && !provider.configured
                          ? ' (not configured)'
                          : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-3">
                  Fetch Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { mode: FETCH_MODES.SINGLE, label: 'Single Symbol' },
                    { mode: FETCH_MODES.MULTIPLE, label: 'Multiple Symbols' },
                    { mode: FETCH_MODES.EXCHANGE, label: 'By Exchange' },
                    { mode: FETCH_MODES.BROKER, label: 'By Broker' },
                  ].map(({ mode, label }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setFetchMode(mode)}
                      className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                        fetchMode === mode
                          ? 'border-accent bg-accent-soft text-accent-ink'
                          : 'border-border hover:border-border-strong'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {fetchMode === FETCH_MODES.SINGLE && (
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-2">
                    Ticker Symbol
                  </label>
                  <input
                    type="text"
                    value={singleTicker}
                    onChange={(e) => setSingleTicker(e.target.value.toUpperCase())}
                    placeholder="e.g., AAPL"
                    className="w-full px-4 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                  <p className="mt-2 text-sm text-ink-tertiary">
                    Symbol is resolved via EOD. If multiple exchanges match, you will be asked to choose.
                  </p>
                </div>
              )}

              {fetchMode === FETCH_MODES.MULTIPLE && (
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-2">
                    Ticker Symbols (comma-separated)
                  </label>
                  <textarea
                    value={multipleTickers}
                    onChange={(e) => setMultipleTickers(e.target.value.toUpperCase())}
                    placeholder="e.g., AAPL, MSFT, GOOGL"
                    rows={4}
                    className="w-full px-4 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                </div>
              )}

              {fetchMode === FETCH_MODES.EXCHANGE && (
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
                        className="w-full pl-10 pr-4 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                      />
                    </div>
                  </div>
                  {loading ? (
                    <div className="text-center py-4 text-ink-tertiary">Loading exchanges...</div>
                  ) : filteredExchanges.length === 0 ? (
                    <div className="text-center py-4 text-ink-tertiary">No exchanges found.</div>
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
                                ? 'bg-accent-soft border-2 border-accent'
                                : 'bg-bg border-2 border-transparent hover:bg-surface-hover'
                            }`}
                          >
                            <input
                              type="radio"
                              name="exchange"
                              value={exchangeCode}
                              checked={selectedExchange === exchangeCode}
                              onChange={(e) => setSelectedExchange(e.target.value)}
                              className="w-4 h-4 text-accent focus:ring-accent"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-ink">{exchangeName}</div>
                              <div className="text-sm text-ink-tertiary">Code: {exchangeCode}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  <p className="mt-2 text-sm text-ink-tertiary">
                    Symbols are imported from EOD automatically when needed, then OHLCV is fetched.
                  </p>
                </div>
              )}

              {fetchMode === FETCH_MODES.BROKER && (
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-2">
                    Broker
                  </label>
                  <div className="mb-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-tertiary w-5 h-5" />
                      <input
                        type="text"
                        value={brokerSearchTerm}
                        onChange={(e) => setBrokerSearchTerm(e.target.value)}
                        placeholder="Search brokers..."
                        className="w-full pl-10 pr-4 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                      />
                    </div>
                  </div>
                  {loadingBrokers ? (
                    <div className="text-center py-4 text-ink-tertiary">Loading brokers...</div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {brokers
                        .filter((broker) => {
                          const searchLower = brokerSearchTerm.toLowerCase();
                          return (
                            broker.name.toLowerCase().includes(searchLower)
                            || broker.code.toLowerCase().includes(searchLower)
                          );
                        })
                        .map((broker) => (
                          <label
                            key={broker.id}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                              selectedBroker === broker.id.toString()
                                ? 'bg-accent-soft border-2 border-accent'
                                : 'bg-bg border-2 border-transparent hover:bg-surface-hover'
                            }`}
                          >
                            <input
                              type="radio"
                              name="broker"
                              value={broker.id}
                              checked={selectedBroker === broker.id.toString()}
                              onChange={(e) => setSelectedBroker(e.target.value)}
                              className="w-4 h-4 text-accent focus:ring-accent"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-ink">{broker.name}</div>
                              <div className="text-sm text-ink-tertiary">Code: {broker.code}</div>
                            </div>
                          </label>
                        ))}
                    </div>
                  )}
                </div>
              )}

              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-ink-secondary mb-3">
                  Date Range (optional)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-ink-secondary mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      max={endDate || new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-ink-secondary mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate || undefined}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                    />
                  </div>
                </div>
                <p className="mt-2 text-sm text-ink-tertiary">
                  End date defaults to today when left empty.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-ink-secondary bg-surface-sunken rounded-lg hover:bg-surface-sunken transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFetch}
                disabled={resolving}
                className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                <Download className="w-5 h-5" />
                {resolving ? 'Resolving…' : 'Fetch Data'}
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    </>
  );
}
