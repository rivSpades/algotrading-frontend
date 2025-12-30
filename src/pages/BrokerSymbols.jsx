/**
 * Broker Symbols Management Page
 * Link symbols to a broker and manage long/short capabilities
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, CheckCircle2, XCircle, Search, Loader } from 'lucide-react';
import { getBroker, linkSymbolsToBroker } from '../data/liveTrading';
import { getSymbols, marketDataAPI } from '../data/api';
import { motion } from 'framer-motion';

export default function BrokerSymbols() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [broker, setBroker] = useState(null);
  const [symbols, setSymbols] = useState([]);
  const [associations, setAssociations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
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
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => navigate('/brokers')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Brokers
      </motion.button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Manage Symbols for {broker?.name}</h1>
        <p className="text-gray-600 mt-1">Link symbols and configure trading capabilities</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Link Symbols</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Link Mode</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="individual"
                checked={linkMode === 'individual'}
                onChange={(e) => setLinkMode(e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              <span>Individual Symbols</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="exchange"
                checked={linkMode === 'exchange'}
                onChange={(e) => setLinkMode(e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              <span>By Exchange</span>
            </label>
          </div>
        </div>

        {linkMode === 'individual' ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search symbols..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2">
              {filteredSymbols.slice(0, 50).map((symbol) => {
                const isSelected = selectedSymbols.includes(symbol.ticker);
                return (
                  <label key={symbol.ticker} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
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
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="font-medium">{symbol.ticker}</span>
                    <span className="text-gray-500 text-sm">{symbol.name}</span>
                  </label>
                );
              })}
            </div>
            {selectedSymbols.length > 0 && (
              <p className="text-sm text-gray-600">{selectedSymbols.length} symbol(s) selected</p>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Exchange Code</label>
            <input
              type="text"
              value={exchangeCode}
              onChange={(e) => setExchangeCode(e.target.value)}
              placeholder="e.g., NASDAQ, NYSE"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLinkSymbols}
          disabled={linking}
          className="mt-4 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
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

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Linked Symbols</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Long</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Short</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {associations.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                    No symbols linked yet
                  </td>
                </tr>
              ) : (
                associations.map((assoc) => (
                  <tr key={assoc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{assoc.symbol_info?.ticker}</div>
                      <div className="text-sm text-gray-500">{assoc.symbol_info?.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {assoc.long_active ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {assoc.short_active ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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


