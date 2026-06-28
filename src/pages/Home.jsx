/**
 * Home Page Component
 * Displays symbol search and list
 */

import { useLoaderData, useSearchParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight, BarChart3, Settings, X } from 'lucide-react';
import SymbolCard from '../components/SymbolCard';
import FetchOHLCVModal from '../components/FetchOHLCVModal';
import MarketDataManageModal from '../components/MarketDataManageModal';
import TaskProgress from '../components/TaskProgress';
import { marketDataAPI } from '../data/api';
import { fetchOHLCVData } from '../data/symbols';
import { motion } from 'framer-motion';

export default function Home() {
  const { symbols, search: initialSearch, exchange: initialExchange, status: initialStatus, count, next, previous, currentPage } = useLoaderData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(initialSearch || '');
  const [selectedExchange, setSelectedExchange] = useState(initialExchange || '');
  const [selectedStatus, setSelectedStatus] = useState(initialStatus || '');
  const [exchanges, setExchanges] = useState([]);
  const [loadingExchanges, setLoadingExchanges] = useState(false);
  const [showFetchOHLCVModal, setShowFetchOHLCVModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [taskId, setTaskId] = useState(null);
  const [showProgress, setShowProgress] = useState(false);
  const isUserTypingRef = useRef(false);

  // Load exchanges on mount
  useEffect(() => {
    const loadExchanges = async () => {
      setLoadingExchanges(true);
      try {
        const response = await marketDataAPI.getExchanges();
        if (response.success && response.data) {
          const exchangesData = Array.isArray(response.data) ? response.data : (response.data.results || []);
          setExchanges(exchangesData);
        }
      } catch (error) {
        console.error('Error loading exchanges:', error);
      } finally {
        setLoadingExchanges(false);
      }
    };
    loadExchanges();
  }, []);

  // Update search term only when URL params change from external sources (pagination, etc.)
  // Don't interfere while user is typing
  useEffect(() => {
    // Only sync if user is not actively typing
    if (!isUserTypingRef.current) {
      const urlSearch = searchParams.get('search') || '';
      const urlExchange = searchParams.get('exchange') || '';
      const urlStatus = searchParams.get('status') || '';
      if (urlSearch !== searchTerm) {
        setSearchTerm(urlSearch);
      }
      if (urlExchange !== selectedExchange) {
        setSelectedExchange(urlExchange);
      }
      if (urlStatus !== selectedStatus) {
        setSelectedStatus(urlStatus);
      }
    }
  }, [searchParams.toString()]); // Only depend on searchParams string

  const applyFilters = () => {
    const params = {};
    const trimmedSearch = searchTerm.trim();
    if (trimmedSearch) {
      params.search = trimmedSearch;
    }
    if (selectedExchange) {
      params.exchange = selectedExchange;
    }
    if (selectedStatus) {
      params.status = selectedStatus;
    }
    params.page = '1';
    setSearchParams(params);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    applyFilters();
  };

  const handleExchangeChange = (e) => {
    setSelectedExchange(e.target.value);
    // Apply filters immediately
    const params = {};
    const trimmedSearch = searchTerm.trim();
    if (trimmedSearch) {
      params.search = trimmedSearch;
    }
    if (e.target.value) {
      params.exchange = e.target.value;
    }
    if (selectedStatus) {
      params.status = selectedStatus;
    }
    params.page = '1';
    setSearchParams(params);
  };

  const handleStatusChange = (e) => {
    setSelectedStatus(e.target.value);
    // Apply filters immediately
    const params = {};
    const trimmedSearch = searchTerm.trim();
    if (trimmedSearch) {
      params.search = trimmedSearch;
    }
    if (selectedExchange) {
      params.exchange = selectedExchange;
    }
    if (e.target.value) {
      params.status = e.target.value;
    }
    params.page = '1';
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedExchange('');
    setSelectedStatus('');
    setSearchParams({ page: '1' });
  };

  const hasActiveFilters = selectedExchange || selectedStatus || searchTerm.trim();

  const handleFetchOHLCV = async (fetchData) => {
    try {
      const result = await fetchOHLCVData(fetchData);
      setTaskId(result.taskId);
      setShowProgress(true);
    } catch (error) {
      alert(`Failed to start OHLCV data fetch: ${error.message}`);
    }
  };

  const handleTaskStarted = (newTaskId) => {
    setTaskId(newTaskId);
    setShowProgress(true);
  };

  const handleTaskComplete = (data) => {
    setShowProgress(false);
    setTaskId(null);
    if (data.status === 'completed') {
      window.location.reload();
    }
  };

  const handleTaskClose = () => {
    setShowProgress(false);
    setTaskId(null);
  };

  return (
    <>
      {/* Task Progress Overlay */}
      {showProgress && taskId && (
        <TaskProgress
          taskId={taskId}
          onComplete={handleTaskComplete}
          onClose={handleTaskClose}
        />
      )}

      {/* Fetch OHLCV Data Modal */}
      <FetchOHLCVModal
        isOpen={showFetchOHLCVModal}
        onClose={() => setShowFetchOHLCVModal(false)}
        onFetch={handleFetchOHLCV}
      />

      <MarketDataManageModal
        isOpen={showManageModal}
        onClose={() => setShowManageModal(false)}
        onTaskStarted={handleTaskStarted}
        symbolCount={count}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-ink mb-2">Market Data</h1>
          <p className="text-ink-secondary">Search and manage trading symbols</p>
        </div>

        <div className="mb-6 flex gap-3 items-center flex-wrap">
          <button
            type="button"
            onClick={() => setShowFetchOHLCVModal(true)}
            className="px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors font-medium flex items-center gap-2"
          >
            <BarChart3 className="w-5 h-5" />
            Fetch OHLCV Data
          </button>
          <button
            type="button"
            onClick={() => setShowManageModal(true)}
            className="px-6 py-3 bg-surface border border-border-strong text-ink rounded-lg hover:bg-surface-sunken transition-colors font-medium flex items-center gap-2"
          >
            <Settings className="w-5 h-5" />
            Manage
          </button>
        </div>


        {/* Filters and Search Bar */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="mb-4">
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-tertiary w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    isUserTypingRef.current = true;
                    setSearchTerm(e.target.value);
                  }}
                  onBlur={() => {
                    // Reset flag after user finishes typing
                    setTimeout(() => {
                      isUserTypingRef.current = false;
                    }, 100);
                  }}
                  placeholder="Search symbols by ticker..."
                  className="w-full pl-10 pr-4 py-3 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
              <div className="flex gap-3">
                <select
                  value={selectedExchange}
                  onChange={handleExchangeChange}
                  className="px-4 py-3 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent bg-surface min-w-[150px]"
                >
                  <option value="">All Exchanges</option>
                  {loadingExchanges ? (
                    <option disabled>Loading...</option>
                  ) : (
                    exchanges.map((exchange) => (
                      <option key={exchange.code} value={exchange.code}>
                        {exchange.name || exchange.code}
                      </option>
                    ))
                  )}
                </select>
                <select
                  value={selectedStatus}
                  onChange={handleStatusChange}
                  className="px-4 py-3 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent bg-surface min-w-[120px]"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="px-4 py-3 border border-border-strong rounded-lg hover:bg-bg transition-colors flex items-center gap-2 text-ink-secondary"
                    title="Clear all filters"
                  >
                    <X className="w-5 h-5" />
                    Clear
                  </button>
                )}
              </div>
            </div>
          </form>
          {hasActiveFilters && (
            <div className="flex items-center gap-2 text-sm text-ink-secondary">
              <span>Active filters:</span>
              {selectedExchange && (
                <span className="px-2 py-1 bg-status-running-soft text-accent-ink rounded">
                  Exchange: {exchanges.find(e => e.code === selectedExchange)?.name || selectedExchange}
                </span>
              )}
              {selectedStatus && (
                <span className="px-2 py-1 bg-status-running-soft text-accent-ink rounded">
                  Status: {selectedStatus}
                </span>
              )}
              {searchTerm.trim() && (
                <span className="px-2 py-1 bg-status-running-soft text-accent-ink rounded">
                  Search: {searchTerm.trim()}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Results Count and Pagination Info */}
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-ink-secondary">
            {count !== undefined ? (
              <>
                Found {count} symbol{count !== 1 ? 's' : ''}
                {symbols.length > 0 && count > 0 && (
                  <span className="text-ink-tertiary">
                    {' '}(Showing {((currentPage - 1) * 20) + 1}-{Math.min(currentPage * 20, count)})
                  </span>
                )}
              </>
            ) : (
              <>Found {symbols.length} symbol{symbols.length !== 1 ? 's' : ''}</>
            )}
          </div>
          {(next || previous) && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (previous) {
                    const url = new URL(previous);
                    const page = url.searchParams.get('page') || '1';
                    const search = url.searchParams.get('search') || '';
                    const exchange = url.searchParams.get('exchange') || '';
                    const status = url.searchParams.get('status') || '';
                    const newParams = { page };
                    if (search) newParams.search = search;
                    if (exchange) newParams.exchange = exchange;
                    if (status) newParams.status = status;
                    setSearchParams(newParams);
                  }
                }}
                disabled={!previous}
                className="px-3 py-2 border border-border-strong rounded-lg hover:bg-bg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <span className="text-sm text-ink-secondary px-2">
                Page {currentPage}
              </span>
              <button
                onClick={() => {
                  if (next) {
                    const url = new URL(next);
                    const page = url.searchParams.get('page') || '1';
                    const search = url.searchParams.get('search') || '';
                    const exchange = url.searchParams.get('exchange') || '';
                    const status = url.searchParams.get('status') || '';
                    const newParams = { page };
                    if (search) newParams.search = search;
                    if (exchange) newParams.exchange = exchange;
                    if (status) newParams.status = status;
                    setSearchParams(newParams);
                  }
                }}
                disabled={!next}
                className="px-3 py-2 border border-border-strong rounded-lg hover:bg-bg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Symbols Grid */}
        {symbols.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {symbols.map((symbol, index) => (
              <motion.div
                key={symbol.ticker}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <SymbolCard symbol={symbol} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-surface rounded-lg shadow">
            <p className="text-ink-tertiary text-lg">No symbols found</p>
            <p className="text-ink-tertiary text-sm mt-2">
              Try a different search term or add a new symbol
            </p>
          </div>
        )}
      </div>
    </>
  );
}

