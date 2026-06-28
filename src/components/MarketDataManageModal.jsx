/**
 * Market Data Manage Modal
 * Bulk update OHLCV and delete symbols / OHLCV data by scope.
 */

import { useState, useEffect } from 'react';
import { X, Settings, RefreshCw, Trash2, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { marketDataAPI } from '../data/api';
import { getBrokers } from '../data/liveTrading';

const TABS = {
  UPDATE: 'update',
  DELETE: 'delete',
};

const SCOPES = {
  ALL: 'all',
  EXCHANGE: 'exchange',
  BROKER: 'broker',
  SINGLE: 'single',
  MULTIPLE: 'multiple',
};

const DELETE_TARGETS = {
  SYMBOLS: 'symbols',
  OHLCV: 'ohlcv',
};

export default function MarketDataManageModal({ isOpen, onClose, onTaskStarted, symbolCount = 0 }) {
  const [activeTab, setActiveTab] = useState(TABS.UPDATE);
  const [scope, setScope] = useState(SCOPES.ALL);
  const [deleteTarget, setDeleteTarget] = useState(DELETE_TARGETS.SYMBOLS);
  const [singleTicker, setSingleTicker] = useState('');
  const [multipleTickers, setMultipleTickers] = useState('');
  const [selectedExchange, setSelectedExchange] = useState('');
  const [selectedBrokerId, setSelectedBrokerId] = useState('');
  const [exchanges, setExchanges] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [exchangeSearch, setExchangeSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(TABS.UPDATE);
    setScope(SCOPES.ALL);
    setDeleteTarget(DELETE_TARGETS.SYMBOLS);
    setSingleTicker('');
    setMultipleTickers('');
    setSelectedExchange('');
    setSelectedBrokerId('');
    setExchangeSearch('');
    loadMeta();
  }, [isOpen]);

  const loadMeta = async () => {
    setLoading(true);
    try {
      const [exRes, brokerList] = await Promise.all([
        marketDataAPI.getExchanges(),
        getBrokers(),
      ]);
      if (exRes.success && exRes.data) {
        const data = Array.isArray(exRes.data) ? exRes.data : (exRes.data.results || []);
        setExchanges(data);
      }
      setBrokers(Array.isArray(brokerList) ? brokerList : []);
    } catch (error) {
      console.error('Error loading manage modal data:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildScopePayload = () => {
    if (scope === SCOPES.ALL) {
      return { delete_all: true };
    }
    if (scope === SCOPES.SINGLE) {
      if (!singleTicker.trim()) {
        alert('Please enter a ticker symbol');
        return null;
      }
      return { ticker: singleTicker.trim().toUpperCase() };
    }
    if (scope === SCOPES.MULTIPLE) {
      const tickers = multipleTickers
        .split(',')
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean);
      if (tickers.length === 0) {
        alert('Please enter at least one ticker');
        return null;
      }
      return { tickers };
    }
    if (scope === SCOPES.EXCHANGE) {
      if (!selectedExchange) {
        alert('Please select an exchange');
        return null;
      }
      return { exchange_code: selectedExchange };
    }
    if (scope === SCOPES.BROKER) {
      if (!selectedBrokerId) {
        alert('Please select a broker');
        return null;
      }
      return { broker_id: parseInt(selectedBrokerId, 10) };
    }
    return null;
  };

  const confirmDelete = (targetLabel) => {
    if (scope === SCOPES.ALL) {
      if (!window.confirm(
        `⚠️ Delete ${targetLabel} for ALL symbols?\n\nThis cannot be undone.`,
      )) return false;
      if (!window.confirm('Last confirmation — proceed with delete all?')) return false;
      return true;
    }
    return window.confirm(`Delete ${targetLabel} for the selected scope?\n\nThis cannot be undone.`);
  };

  const handleUpdate = async () => {
    const payload = {};
    if (scope === SCOPES.EXCHANGE) {
      if (!selectedExchange) {
        alert('Please select an exchange');
        return;
      }
      payload.exchange_code = selectedExchange;
    } else if (scope === SCOPES.BROKER) {
      if (!selectedBrokerId) {
        alert('Please select a broker');
        return;
      }
      payload.broker_id = parseInt(selectedBrokerId, 10);
    } else if (scope !== SCOPES.ALL) {
      alert('Update supports All symbols, By exchange, or By broker');
      return;
    }

    if (!window.confirm(
      scope === SCOPES.ALL
        ? `Update OHLCV for all ${symbolCount || ''} symbols with missing data up to today?`
        : 'Update OHLCV for symbols in the selected scope with missing data up to today?',
    )) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await marketDataAPI.updateAllSymbolsData(payload);
      if (response.success) {
        onTaskStarted(response.data.task_id);
        onClose();
      } else {
        alert(response.error || 'Failed to start update');
      }
    } catch (error) {
      alert(error.message || 'Failed to start update');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const payload = buildScopePayload();
    if (!payload) return;

    const targetLabel = deleteTarget === DELETE_TARGETS.SYMBOLS
      ? 'symbols (and all OHLCV data)'
      : 'OHLCV data only';

    if (!confirmDelete(targetLabel)) return;

    setSubmitting(true);
    try {
      const response = deleteTarget === DELETE_TARGETS.SYMBOLS
        ? await marketDataAPI.deleteSymbolsBulk(payload)
        : await marketDataAPI.deleteOHLCVData(payload);

      if (response.success) {
        onTaskStarted(response.data.task_id);
        onClose();
      } else {
        alert(response.error || 'Failed to start deletion');
      }
    } catch (error) {
      alert(error.message || 'Failed to start deletion');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredExchanges = exchanges.filter((exchange) => {
    const code = (exchange.code || exchange.Code || '').toLowerCase();
    const name = (exchange.name || exchange.Name || '').toLowerCase();
    const q = exchangeSearch.toLowerCase();
    return code.includes(q) || name.includes(q);
  });

  const scopeOptions = activeTab === TABS.UPDATE
    ? [SCOPES.ALL, SCOPES.EXCHANGE, SCOPES.BROKER]
    : Object.values(SCOPES);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-surface rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        >
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-2">
              <Settings className="w-6 h-6 text-accent" />
              <h2 className="text-2xl font-bold text-ink">Manage Market Data</h2>
            </div>
            <button type="button" onClick={onClose} className="text-ink-tertiary hover:text-ink-secondary">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex border-b border-border px-6">
            <button
              type="button"
              onClick={() => { setActiveTab(TABS.UPDATE); setScope(SCOPES.ALL); }}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px ${
                activeTab === TABS.UPDATE
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-secondary hover:text-ink'
              }`}
            >
              Update Data
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(TABS.DELETE)}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px ${
                activeTab === TABS.DELETE
                  ? 'border-loss text-loss'
                  : 'border-transparent text-ink-secondary hover:text-ink'
              }`}
            >
              Delete
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTab === TABS.UPDATE && (
              <div className="bg-status-running-soft border border-accent/20 rounded-lg p-4">
                <p className="text-sm text-ink-secondary">
                  Fetches missing daily OHLCV bars up to today for each symbol using its configured provider.
                  Symbols without data or provider are skipped.
                </p>
              </div>
            )}

            {activeTab === TABS.DELETE && (
              <>
                <div className="bg-loss-soft border border-loss rounded-lg p-4">
                  <p className="text-sm text-loss-ink font-medium">
                    Destructive actions — cannot be undone.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-2">Delete target</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(DELETE_TARGETS.SYMBOLS)}
                      className={`px-4 py-3 rounded-lg border-2 text-sm ${
                        deleteTarget === DELETE_TARGETS.SYMBOLS
                          ? 'border-loss bg-loss-soft text-loss-ink'
                          : 'border-border hover:border-border-strong'
                      }`}
                    >
                      Delete symbols
                      <span className="block text-xs mt-1 opacity-80">Removes symbol + OHLCV</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(DELETE_TARGETS.OHLCV)}
                      className={`px-4 py-3 rounded-lg border-2 text-sm ${
                        deleteTarget === DELETE_TARGETS.OHLCV
                          ? 'border-orange-500 bg-orange-50 text-orange-900'
                          : 'border-border hover:border-border-strong'
                      }`}
                    >
                      Delete OHLCV only
                      <span className="block text-xs mt-1 opacity-80">Keeps symbol, clears bars</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-2">Scope</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {scopeOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setScope(option)}
                    className={`px-3 py-2 rounded-lg border text-sm capitalize ${
                      scope === option
                        ? 'border-accent bg-status-running-soft text-accent-ink'
                        : 'border-border hover:border-border-strong'
                    }`}
                  >
                    {option === SCOPES.ALL ? 'All' : option.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {scope === SCOPES.SINGLE && (
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-2">Ticker</label>
                <input
                  type="text"
                  value={singleTicker}
                  onChange={(e) => setSingleTicker(e.target.value.toUpperCase())}
                  placeholder="e.g. AAPL"
                  className="w-full px-4 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent"
                />
              </div>
            )}

            {scope === SCOPES.MULTIPLE && (
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-2">Tickers (comma-separated)</label>
                <textarea
                  value={multipleTickers}
                  onChange={(e) => setMultipleTickers(e.target.value.toUpperCase())}
                  placeholder="AAPL, MSFT, TSLA"
                  rows={3}
                  className="w-full px-4 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent"
                />
              </div>
            )}

            {scope === SCOPES.EXCHANGE && (
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-2">Exchange</label>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
                  <input
                    type="text"
                    value={exchangeSearch}
                    onChange={(e) => setExchangeSearch(e.target.value)}
                    placeholder="Search exchanges…"
                    className="w-full pl-9 pr-4 py-2 border border-border-strong rounded-lg"
                  />
                </div>
                {loading ? (
                  <p className="text-sm text-ink-tertiary">Loading…</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {filteredExchanges.map((exchange) => {
                      const code = exchange.code || exchange.Code;
                      return (
                        <label
                          key={code}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${
                            selectedExchange === code ? 'bg-status-running-soft border border-accent' : 'bg-bg border border-transparent'
                          }`}
                        >
                          <input
                            type="radio"
                            name="manage-exchange"
                            value={code}
                            checked={selectedExchange === code}
                            onChange={() => setSelectedExchange(code)}
                          />
                          <span className="text-sm">{exchange.name || code} ({code})</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {scope === SCOPES.BROKER && (
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-2">Broker</label>
                {loading ? (
                  <p className="text-sm text-ink-tertiary">Loading…</p>
                ) : brokers.length === 0 ? (
                  <p className="text-sm text-ink-tertiary">No brokers configured.</p>
                ) : (
                  <select
                    value={selectedBrokerId}
                    onChange={(e) => setSelectedBrokerId(e.target.value)}
                    className="w-full px-4 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent"
                  >
                    <option value="">Select broker…</option>
                    {brokers.map((broker) => (
                      <option key={broker.id} value={broker.id}>
                        {broker.name} ({broker.code})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {scope === SCOPES.ALL && activeTab === TABS.DELETE && deleteTarget === DELETE_TARGETS.SYMBOLS && (
              <p className="text-sm text-loss-ink">
                This will permanently delete all {symbolCount} symbol(s) and their OHLCV data.
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-ink-secondary bg-surface-sunken rounded-lg hover:bg-surface-sunken"
            >
              Cancel
            </button>
            {activeTab === TABS.UPDATE ? (
              <button
                type="button"
                onClick={handleUpdate}
                disabled={submitting}
                className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${submitting ? 'animate-spin' : ''}`} />
                {submitting ? 'Starting…' : 'Update All Data'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="px-6 py-2 bg-loss text-white rounded-lg hover:bg-loss disabled:opacity-50 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {submitting ? 'Starting…' : 'Delete'}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
