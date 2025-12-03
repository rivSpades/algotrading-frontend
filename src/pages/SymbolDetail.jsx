/**
 * Symbol Detail Page Component
 * Displays symbol information, OHLCV data, and charts
 */

import { useLoaderData, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, RefreshCw, Trash2, Download, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import CandlestickChart from '../components/CandlestickChart';
import DataTable from '../components/DataTable';
import TaskProgress from '../components/TaskProgress';
import DateRangeModal from '../components/DateRangeModal';
import { updateSymbolOHLCV, refetchSymbolOHLCV, fetchOHLCVData, deleteSymbol } from '../data/symbols';

export default function SymbolDetail() {
  const { symbol, ohlcv, ohlcvCount } = useLoaderData();
  const navigate = useNavigate();
  const { ticker } = useParams();
  const [timeframe, setTimeframe] = useState('daily');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [taskId, setTaskId] = useState(null);
  const [showProgress, setShowProgress] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateModalMode, setDateModalMode] = useState(null); // 'fetch' or 'refetch'
  
  // Check if symbol has OHLCV data
  const hasOHLCVData = ohlcv && Array.isArray(ohlcv) && ohlcv.length > 0;

  if (!symbol) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg">Symbol not found</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const result = await updateSymbolOHLCV(ticker);
      setTaskId(result.taskId);
      setShowProgress(true);
    } catch (error) {
      alert(`Failed to update OHLCV data: ${error.message}`);
      setIsUpdating(false);
    }
  };

  const handleFetchClick = () => {
    setDateModalMode('fetch');
    setShowDateModal(true);
  };

  const handleRefetchClick = () => {
    setDateModalMode('refetch');
    setShowDateModal(true);
  };

  const handleDateModalConfirm = async (dateParams) => {
    if (dateModalMode === 'fetch') {
      setIsFetching(true);
      try {
        const result = await fetchOHLCVData({
          ticker: ticker,
          ...dateParams
        });
        setTaskId(result.taskId);
        setShowProgress(true);
      } catch (error) {
        alert(`Failed to fetch OHLCV data: ${error.message}`);
        setIsFetching(false);
      }
    } else if (dateModalMode === 'refetch') {
      if (!window.confirm(`Are you sure you want to refetch OHLCV data for ${ticker}? This will replace existing data in the selected range.`)) {
        setIsRefetching(false);
        return;
      }
      setIsRefetching(true);
      try {
        const result = await refetchSymbolOHLCV(ticker, dateParams);
        setTaskId(result.taskId);
        setShowProgress(true);
      } catch (error) {
        alert(`Failed to refetch OHLCV data: ${error.message}`);
        setIsRefetching(false);
      }
    }
  };

  const handleTaskComplete = (data) => {
    setIsUpdating(false);
    setIsFetching(false);
    setIsRefetching(false);
    setShowProgress(false);
    setTaskId(null);
    // Optionally refresh the page data or show success message
    if (data.status === 'completed') {
      // Reload the page to get updated data
      window.location.reload();
    }
  };

  const handleTaskClose = () => {
    setShowProgress(false);
    setTaskId(null);
    setIsUpdating(false);
    setIsFetching(false);
    setIsRefetching(false);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${ticker}? This action cannot be undone.`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteSymbol(ticker);
      navigate('/');
    } catch (error) {
      alert(`Failed to delete symbol: ${error.message}`);
      setIsDeleting(false);
    }
  };

  const statusColor = symbol.status === 'active' ? 'green' : 'gray';
  const statusBg = symbol.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';

  return (
    <>
      {/* Date Range Modal */}
      <DateRangeModal
        isOpen={showDateModal}
        onClose={() => {
          setShowDateModal(false);
          setDateModalMode(null);
        }}
        onConfirm={handleDateModalConfirm}
        title={dateModalMode === 'fetch' ? 'Fetch OHLCV Data' : 'Refetch OHLCV Data'}
      />

      {/* Task Progress Overlay */}
      {showProgress && taskId && (
        <TaskProgress
          taskId={taskId}
          onComplete={handleTaskComplete}
          onClose={handleTaskClose}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Symbols
        </button>

        {/* Symbol Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{symbol.ticker}</h1>
              {symbol.name && symbol.name !== symbol.ticker && (
                <p className="text-lg text-gray-600 mb-2">{symbol.name}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>Exchange: {symbol.exchange?.code || (typeof symbol.exchange === 'string' ? symbol.exchange : 'N/A')}</span>
                {symbol.exchange?.name && symbol.exchange.name !== symbol.exchange?.code && (
                  <>
                    <span>•</span>
                    <span>{symbol.exchange.name}</span>
                  </>
                )}
                <span>•</span>
                <span>Type: {symbol.type}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusBg}`}>
                {symbol.status}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>Last updated: {new Date(symbol.last_updated).toLocaleString()}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            {/* Show Fetch Data only if symbol has no OHLCV data */}
            {!hasOHLCVData && (
              <button
                onClick={handleFetchClick}
                disabled={isFetching || isUpdating || isRefetching}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                <Download className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                {isFetching ? 'Fetching...' : 'Fetch Data'}
              </button>
            )}
            
            {/* Show Update Data and Refetch All only if symbol has OHLCV data */}
            {hasOHLCVData && (
              <>
                <button
                  onClick={handleUpdate}
                  disabled={isUpdating || isFetching || isRefetching}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
                  {isUpdating ? 'Updating...' : 'Update Data'}
                </button>
                <button
                  onClick={handleRefetchClick}
                  disabled={isRefetching || isFetching || isUpdating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  <RotateCcw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
                  {isRefetching ? 'Refetching...' : 'Refetch All'}
                </button>
              </>
            )}
            
            <button
              onClick={handleDelete}
              disabled={isDeleting || isFetching || isUpdating || isRefetching}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? 'Deleting...' : 'Delete Symbol'}
            </button>
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="flex gap-2">
            {['daily', 'hourly'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timeframe === tf
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tf.charAt(0).toUpperCase() + tf.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="mb-6">
          <CandlestickChart data={ohlcv} ticker={ticker} />
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">OHLCV Data</h2>
          <DataTable initialData={ohlcv} ticker={ticker} totalCount={ohlcvCount} />
        </div>
      </div>
    </>
  );
}

