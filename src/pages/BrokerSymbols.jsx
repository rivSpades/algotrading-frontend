/**
 * Broker Symbols Management Page
 * Link symbols to a broker and manage long/short capabilities
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, CheckCircle2, XCircle, Search, Loader, RefreshCw } from 'lucide-react';
import BackButton from '../components/BackButton';
import { getBroker, linkSymbolsToBroker, liveTradingAPI } from '../data/liveTrading';
import TaskProgress from '../components/TaskProgress';
import { getSymbols, marketDataAPI } from '../data/api';
import { motion } from 'framer-motion';

export default function BrokerSymbols() {
  const { id } = useParams();
  const [broker, setBroker] = useState(null);
  const [symbols, setSymbols] = useState([]);
  const [associations, setAssociations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [listRefreshing, setListRefreshing] = useState(false);
  const [symbolAsyncTaskId, setSymbolAsyncTaskId] = useState(null);
  const [reverifyBusy, setReverifyBusy] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [linkMode, setLinkMode] = useState('individual'); // 'individual' or 'exchange'
  const [selectedSymbols, setSelectedSymbols] = useState([]);
  const [exchangeCode, setExchangeCode] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const brokerData = await getBroker(id);
      setBroker(brokerData);
      
      const symbolsResponse = await marketDataAPI.getSymbols();
      setSymbols(Array.isArray(symbolsResponse.data) ? symbolsResponse.data : symbolsResponse.data.results || []);
      
      const associationsResponse = await marketDataAPI.apiRequest(`/brokers/${id}/symbols/`);
      if (associationsResponse.success) {
        setAssociations(associationsResponse.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load data: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const refreshLinkedSymbolsList = async () => {
    setListRefreshing(true);
    try {
      const associationsResponse = await marketDataAPI.apiRequest(`/brokers/${id}/symbols/`);
      if (associationsResponse.success) {
        setAssociations(associationsResponse.data || []);
      }
    } catch (error) {
      console.error('Error refreshing linked symbols:', error);
      alert('Failed to refresh list: ' + (error.message || 'Unknown error'));
    } finally {
      setListRefreshing(false);
    }
  };

  const handleReverifyTaskComplete = async (taskData) => {
    setSymbolAsyncTaskId(null);
    setReverifyBusy(false);
    const ok = taskData.status === 'success' || taskData.status === 'completed';
    if (ok) {
      const updated = taskData.updated ?? taskData.total ?? 0;
      const failed = taskData.failed ?? 0;
      alert(
        `Re-verified ${updated} symbol link(s) from the broker.${failed ? ` (${failed} had errors during checks.)` : ''}`,
      );
      await refreshLinkedSymbolsList();
    } else {
      alert(`Re-verify failed: ${taskData.error || 'Unknown error'}`);
    }
  };

  const handleReverifyTaskClose = () => {
    setSymbolAsyncTaskId(null);
    setReverifyBusy(false);
  };

  const handleReverifyFromBroker = async () => {
    if (!broker) return;
    const paperOk = broker.paper_trading_active && broker.has_paper_trading;
    const realOk = broker.real_money_active && broker.has_real_money;
    if (!paperOk && !realOk) {
      alert('Enable paper or real-money trading on this broker before re-verifying.');
      return;
    }
    setReverifyBusy(true);
    try {
      const response = await liveTradingAPI.brokers.reverifyBrokerSymbols(id);
      if (response.success && response.data?.task_id) {
        setSymbolAsyncTaskId(response.data.task_id);
      } else {
        alert('Failed to start re-verify: ' + (response.error || 'Unknown error'));
        setReverifyBusy(false);
      }
    } catch (error) {
      console.error('Error starting re-verify:', error);
      alert('Failed to start re-verify: ' + (error.message || 'Unknown error'));
      setReverifyBusy(false);
    }
  };

  const handleLinkSymbols = async () => {
    setLinking(true);
    try {
      if (linkMode === 'individual') {
        if (selectedSymbols.length === 0) {
          alert('Please select at least one symbol');
          return;
        }
        await linkSymbolsToBroker(id, selectedSymbols, '', true);
      } else {
        if (!exchangeCode.trim()) {
          alert('Please enter an exchange code');
          return;
        }
        await linkSymbolsToBroker(id, [], exchangeCode.trim(), true);
      }
      await loadData();
      setSelectedSymbols([]);
      setExchangeCode('');
      alert('Symbols linked successfully!');
    } catch (error) {
      console.error('Error linking symbols:', error);
      alert('Failed to link symbols: ' + (error.message || 'Unknown error'));
    } finally {
      setLinking(false);
    }
  };

  const filteredSymbols = symbols.filter(symbol => 
    symbol.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
    symbol.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAssociation = (symbolTicker) => {
    return associations.find(a => a.symbol_info?.ticker === symbolTicker);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {symbolAsyncTaskId && (
        <TaskProgress
          taskId={symbolAsyncTaskId}
          onComplete={handleReverifyTaskComplete}
          onClose={handleReverifyTaskClose}
        />
      )}
      <BackButton to={`/brokers/${id}`} label="Back to Broker" className="flex items-center gap-2 text-ink-secondary hover:text-ink mb-6" />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-ink">Manage Symbols for {broker?.name}</h1>
        <p className="text-ink-secondary mt-1">Link symbols and configure trading capabilities</p>
      </div>

      <div className="bg-surface rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-ink mb-4">Link Symbols</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-ink-secondary mb-2">Link Mode</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="individual"
                checked={linkMode === 'individual'}
                onChange={(e) => setLinkMode(e.target.value)}
                className="w-4 h-4 text-accent"
              />
              <span>Individual Symbols</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="exchange"
                checked={linkMode === 'exchange'}
                onChange={(e) => setLinkMode(e.target.value)}
                className="w-4 h-4 text-accent"
              />
              <span>By Exchange</span>
            </label>
          </div>
        </div>

        {linkMode === 'individual' ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-tertiary" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search symbols..."
                className="w-full pl-10 pr-4 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="max-h-60 overflow-y-auto border border-border rounded-lg p-2">
              {filteredSymbols.slice(0, 50).map((symbol) => {
                const isSelected = selectedSymbols.includes(symbol.ticker);
                return (
                  <label key={symbol.ticker} className="flex items-center gap-2 p-2 hover:bg-bg rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSymbols([...selectedSymbols, symbol.ticker]);
                        } else {
                          setSelectedSymbols(selectedSymbols.filter(t => t !== symbol.ticker));
                        }
                      }}
                      className="w-4 h-4 text-accent"
                    />
                    <span className="font-medium">{symbol.ticker}</span>
                    <span className="text-ink-tertiary text-sm">{symbol.name}</span>
                  </label>
                );
              })}
            </div>
            {selectedSymbols.length > 0 && (
              <p className="text-sm text-ink-secondary">{selectedSymbols.length} symbol(s) selected</p>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-2">Exchange Code</label>
            <input
              type="text"
              value={exchangeCode}
              onChange={(e) => setExchangeCode(e.target.value)}
              placeholder="e.g., NASDAQ, NYSE"
              className="w-full px-4 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent"
            />
          </div>
        )}

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLinkSymbols}
          disabled={linking || reverifyBusy || !!symbolAsyncTaskId}
          className="mt-4 flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {linking ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Linking...
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              Link Symbols
            </>
          )}
        </motion.button>
      </div>

      <div className="bg-surface rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-ink">Linked Symbols</h2>
          <button
            type="button"
            onClick={handleReverifyFromBroker}
            disabled={
              reverifyBusy ||
              !!symbolAsyncTaskId ||
              linking ||
              (!(
                (broker?.paper_trading_active && broker?.has_paper_trading) ||
                (broker?.real_money_active && broker?.has_real_money)
              ))
            }
            title="Re-fetch long/short tradability from the broker API for every linked symbol"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-ink-secondary bg-surface border border-border-strong rounded-lg hover:bg-bg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${reverifyBusy || symbolAsyncTaskId || listRefreshing ? 'animate-spin' : ''}`} />
            Re-verify from broker
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-bg">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-ink-tertiary uppercase">Symbol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-ink-tertiary uppercase">Long</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-ink-tertiary uppercase">Short</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-ink-tertiary uppercase">Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {associations.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-ink-tertiary">
                    No symbols linked yet
                  </td>
                </tr>
              ) : (
                associations.map((assoc) => (
                  <tr key={assoc.id} className="hover:bg-bg">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-ink">{assoc.symbol_info?.ticker}</div>
                      <div className="text-sm text-ink-tertiary">{assoc.symbol_info?.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {assoc.long_active ? (
                        <CheckCircle2 className="w-5 h-5 text-profit" />
                      ) : (
                        <XCircle className="w-5 h-5 text-ink-tertiary" />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {assoc.short_active ? (
                        <CheckCircle2 className="w-5 h-5 text-profit" />
                      ) : (
                        <XCircle className="w-5 h-5 text-ink-tertiary" />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-tertiary">
                      {assoc.verified_at ? new Date(assoc.verified_at).toLocaleDateString() : 'Never'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}



