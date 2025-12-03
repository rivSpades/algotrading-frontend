/**
 * Home Page Component
 * Displays symbol search and list
 */

import { useLoaderData, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Search, Download, ChevronLeft, ChevronRight, Trash2, BarChart3 } from 'lucide-react';
import SymbolCard from '../components/SymbolCard';
import FetchSymbolsModal from '../components/FetchSymbolsModal';
import FetchOHLCVModal from '../components/FetchOHLCVModal';
import DeleteOHLCVModal from '../components/DeleteOHLCVModal';
import TaskProgress from '../components/TaskProgress';
import { marketDataAPI } from '../data/api';
import { fetchOHLCVData } from '../data/symbols';
import { motion } from 'framer-motion';

export default function Home() {
  const { symbols, search: initialSearch, count, next, previous, currentPage } = useLoaderData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(initialSearch || '');
  const navigate = useNavigate();
  const [showFetchModal, setShowFetchModal] = useState(false);
  const [showFetchOHLCVModal, setShowFetchOHLCVModal] = useState(false);
  const [showDeleteOHLCVModal, setShowDeleteOHLCVModal] = useState(false);
  const [taskId, setTaskId] = useState(null);
  const [showProgress, setShowProgress] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isUserTypingRef = useRef(false);

  // Update search term only when URL params change from external sources (pagination, etc.)
  // Don't interfere while user is typing
  useEffect(() => {
    // Only sync if user is not actively typing
    if (!isUserTypingRef.current) {
      const urlSearch = searchParams.get('search') || '';
      if (urlSearch !== searchTerm) {
        setSearchTerm(urlSearch);
      }
    }
  }, [searchParams.toString()]); // Only depend on searchParams string

  const handleSearch = (e) => {
    e.preventDefault();
    const trimmedSearch = searchTerm.trim();
    if (trimmedSearch) {
      setSearchParams({ search: trimmedSearch, page: '1' });
    } else {
      setSearchParams({ page: '1' });
    }
  };

  const handleFetchSymbols = async (exchangeCodes, fetchAll) => {
    try {
      const response = await marketDataAPI.fetchSymbols(exchangeCodes, fetchAll);
      if (response.success) {
        setTaskId(response.data.task_id);
        setShowProgress(true);
      }
    } catch (error) {
      alert(`Failed to start symbol fetch: ${error.message}`);
    }
  };

  const handleFetchOHLCV = async (fetchData) => {
    try {
      const result = await fetchOHLCVData(fetchData);
      setTaskId(result.taskId);
      setShowProgress(true);
    } catch (error) {
      alert(`Failed to start OHLCV data fetch: ${error.message}`);
    }
  };

  const handleDeleteOHLCV = async (deleteData) => {
    try {
      const response = await marketDataAPI.deleteOHLCVData(deleteData);
      if (response.success) {
        setTaskId(response.data.task_id);
        setShowProgress(true);
      } else {
        alert(`Failed to start OHLCV data deletion: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Failed to start OHLCV data deletion: ${error.message}`);
    }
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

  const handleDeleteAll = async () => {
    if (!window.confirm(
      `Are you absolutely sure you want to delete ALL symbols?\n\n` +
      `This will permanently delete:\n` +
      `- All ${count || 0} symbols\n` +
      `- All related OHLCV data\n\n` +
      `This action cannot be undone!`
    )) {
      return;
    }

    // Double confirmation
    if (!window.confirm('This is your last chance. Are you REALLY sure?')) {
      return;
    }

    setDeleting(true);
    try {
      const response = await marketDataAPI.deleteAllSymbols();
      if (response.success) {
        alert(`Successfully deleted ${response.data.deleted_symbols || response.data.symbol_count || 0} symbols and all related data.`);
        // Reload the page to show empty state
        window.location.reload();
      } else {
        alert(`Failed to delete all symbols: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Failed to delete all symbols: ${error.message}`);
    } finally {
      setDeleting(false);
      setShowDeleteAllConfirm(false);
    }
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

      {/* Fetch Symbols Modal */}
      <FetchSymbolsModal
        isOpen={showFetchModal}
        onClose={() => setShowFetchModal(false)}
        onFetch={handleFetchSymbols}
      />

      {/* Fetch OHLCV Data Modal */}
      <FetchOHLCVModal
        isOpen={showFetchOHLCVModal}
        onClose={() => setShowFetchOHLCVModal(false)}
        onFetch={handleFetchOHLCV}
      />

      {/* Delete OHLCV Data Modal */}
      <DeleteOHLCVModal
        isOpen={showDeleteOHLCVModal}
        onClose={() => setShowDeleteOHLCVModal(false)}
        onDelete={handleDeleteOHLCV}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Market Data</h1>
          <p className="text-gray-600">Search and manage trading symbols</p>
        </div>

        {/* Action Buttons */}
        <div className="mb-6 flex gap-3 items-center justify-between flex-wrap">
          <div className="flex gap-3">
            <button
              onClick={() => setShowFetchModal(true)}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Fetch Symbols
            </button>
            <button
              onClick={() => setShowFetchOHLCVModal(true)}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
            >
              <BarChart3 className="w-5 h-5" />
              Fetch OHLCV Data
            </button>
            <button
              onClick={() => setShowDeleteOHLCVModal(true)}
              className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium flex items-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              Delete OHLCV Data
            </button>
          </div>
          {count > 0 && (
            <button
              onClick={handleDeleteAll}
              disabled={deleting}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-5 h-5" />
              {deleting ? 'Deleting...' : 'Delete All Symbols'}
            </button>
          )}
        </div>


        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
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
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              Search
            </button>
          </div>
        </form>

        {/* Results Count and Pagination Info */}
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {count !== undefined ? (
              <>
                Found {count} symbol{count !== 1 ? 's' : ''}
                {symbols.length > 0 && count > 0 && (
                  <span className="text-gray-500">
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
                    const newParams = { page };
                    if (search) newParams.search = search;
                    setSearchParams(newParams);
                  }
                }}
                disabled={!previous}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <span className="text-sm text-gray-600 px-2">
                Page {currentPage}
              </span>
              <button
                onClick={() => {
                  if (next) {
                    const url = new URL(next);
                    const page = url.searchParams.get('page') || '1';
                    const search = url.searchParams.get('search') || '';
                    const newParams = { page };
                    if (search) newParams.search = search;
                    setSearchParams(newParams);
                  }
                }}
                disabled={!next}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
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
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg">No symbols found</p>
            <p className="text-gray-400 text-sm mt-2">
              Try a different search term or add a new symbol
            </p>
          </div>
        )}
      </div>
    </>
  );
}

