/**
 * Symbol Detail Page Component
 * Displays symbol information, OHLCV data, and charts
 */

import { useLoaderData, useNavigate, useParams, useRevalidator } from 'react-router-dom';
import { ArrowLeft, Calendar, RefreshCw, Trash2, Download, RotateCcw, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import CandlestickChart from '../components/CandlestickChart';
import DataTable from '../components/DataTable';
import TaskProgress from '../components/TaskProgress';
import DateRangeModal from '../components/DateRangeModal';
import ToolAssignmentManager from '../components/ToolAssignmentManager';
import StatisticsCard from '../components/StatisticsCard';
import { updateSymbolOHLCV, refetchSymbolOHLCV, fetchOHLCVData, deleteSymbol } from '../data/symbols';
import { getSymbolAssignments } from '../data/tools';

export default function SymbolDetail() {
  const { symbol, ohlcv, ohlcvCount, indicators: indicatorsMetadata, statistics } = useLoaderData();
  
  // Debug: Log statistics to see what we're receiving
  useEffect(() => {
    if (statistics) {
      console.log('Statistics received:', statistics);
      console.log('Bollinger phase:', statistics.bollinger_phase);
      console.log('Statistics keys:', Object.keys(statistics));
    }
  }, [statistics]);
  const navigate = useNavigate();
  const { ticker } = useParams();
  const revalidator = useRevalidator();
  const [timeframe, setTimeframe] = useState('daily');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [taskId, setTaskId] = useState(null);
  const [showProgress, setShowProgress] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateModalMode, setDateModalMode] = useState(null); // 'fetch' or 'refetch'
  // Extract indicators from OHLCV data (indicators come embedded in OHLCV response)
  const [indicators, setIndicators] = useState([]);
  
  // Check if symbol has OHLCV data
  const hasOHLCVData = ohlcv && Array.isArray(ohlcv) && ohlcv.length > 0;

  // Extract indicators from OHLCV response
  useEffect(() => {
    const extractIndicators = async () => {
      if (!ticker) return;
      
      if (ohlcv && Array.isArray(ohlcv) && ohlcv.length > 0) {
        // Get assignments to map indicator keys to tool info
        try {
          const assignments = await getSymbolAssignments(ticker);
          const enabledAssignments = assignments.filter(a => a.enabled);
          
          if (enabledAssignments.length === 0) {
            setIndicators([]);
            return;
          }
          
          // Get first result to check for indicator keys
          const firstResult = ohlcv[0];
          
          const indicatorsList = [];
          
          enabledAssignments.forEach(assignment => {
            const toolName = assignment.tool.name;
            const period = assignment.parameters?.period || assignment.tool.default_parameters?.period || '';
            const baseKey = period ? `${toolName}_${period}` : toolName;
            
            // Special handling for Bollinger Bands (multiple series)
            if (toolName === 'BollingerBands') {
              // Check for Bollinger Bands keys
              const upperKey = `${baseKey}_upper`;
              const middleKey = `${baseKey}_middle`;
              const lowerKey = `${baseKey}_lower`;
              const bandwidthKey = `${baseKey}_bandwidth`;
              
              // Check if Bollinger Bands exist in OHLCV data
              if (firstResult[upperKey] === undefined) {
                return;
              }
              
              // Get metadata for display names
              const upperMetadata = indicatorsMetadata?.[upperKey];
              const middleMetadata = indicatorsMetadata?.[middleKey];
              const lowerMetadata = indicatorsMetadata?.[lowerKey];
              const bandwidthMetadata = indicatorsMetadata?.[bandwidthKey];
              
              // Extract values for each band
              const extractValues = (key) => {
                return ohlcv
                  .map(item => ({
                    timestamp: item.timestamp,
                    value: item[key] !== null && item[key] !== undefined ? parseFloat(item[key]) : null
                  }))
                  .filter(item => item.value !== null && !isNaN(item.value));
              };
              
              // Add upper band (main chart)
              indicatorsList.push({
                ...assignment,
                toolName: upperMetadata?.display_name || `${baseKey} Upper`,
                values: extractValues(upperKey),
                subchart: false,
                indicatorKey: upperKey,
                style: {
                  color: upperMetadata?.color || assignment.style?.upper_color || assignment.style?.color || '#EF4444',
                  line_width: upperMetadata?.line_width || assignment.style?.line_width || 2,
                },
              });
              
              // Add middle band (main chart)
              indicatorsList.push({
                ...assignment,
                toolName: middleMetadata?.display_name || `${baseKey} Middle`,
                values: extractValues(middleKey),
                subchart: false,
                indicatorKey: middleKey,
                style: {
                  color: middleMetadata?.color || assignment.style?.middle_color || assignment.style?.color || '#3B82F6',
                  line_width: middleMetadata?.line_width || assignment.style?.line_width || 2,
                },
              });
              
              // Add lower band (main chart)
              indicatorsList.push({
                ...assignment,
                toolName: lowerMetadata?.display_name || `${baseKey} Lower`,
                values: extractValues(lowerKey),
                subchart: false,
                indicatorKey: lowerKey,
                style: {
                  color: lowerMetadata?.color || assignment.style?.lower_color || assignment.style?.color || '#10B981',
                  line_width: lowerMetadata?.line_width || assignment.style?.line_width || 2,
                },
              });
              
              // Add bandwidth (subchart)
              indicatorsList.push({
                ...assignment,
                toolName: bandwidthMetadata?.display_name || `${baseKey} Bandwidth`,
                values: extractValues(bandwidthKey),
                subchart: true, // Bandwidth goes in subchart
                indicatorKey: bandwidthKey,
                style: {
                  color: bandwidthMetadata?.color || assignment.style?.bandwidth_color || assignment.style?.color || '#8B5CF6',
                  line_width: bandwidthMetadata?.line_width || assignment.style?.line_width || 2,
                },
              });
            } else {
              // Regular indicator handling
              const indicatorKey = baseKey;
              
              // Check if this indicator exists in OHLCV data
              if (firstResult[indicatorKey] === undefined) {
                return;
              }
              
              // Get display name from indicators metadata (e.g., "SMA15" instead of "SMA")
              const indicatorMetadata = indicatorsMetadata?.[indicatorKey];
              const displayName = indicatorMetadata?.display_name || toolName;
              
              // Extract values from OHLCV data
              const values = ohlcv
                .map(item => ({
                  timestamp: item.timestamp,
                  value: item[indicatorKey] !== null && item[indicatorKey] !== undefined ? parseFloat(item[indicatorKey]) : null
                }))
                .filter(item => item.value !== null && !isNaN(item.value));
              
              indicatorsList.push({
                ...assignment,
                toolName: displayName, // Use display name (e.g., "SMA15")
                values: values,
                subchart: assignment.subchart || false, // Include subchart flag
                indicatorKey: indicatorKey,
              });
            }
          });
          
          setIndicators(indicatorsList);
        } catch (error) {
          console.error('Error extracting indicators:', error);
          setIndicators([]);
        }
      } else {
        setIndicators([]);
      }
    };
    
    extractIndicators();
  }, [ohlcv, ticker]);

  const handleAssignmentChange = () => {
    // Revalidate loader data to get updated OHLCV with indicators
    revalidator.revalidate();
  };

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
              {symbol.validation_status && (
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  symbol.validation_status === 'valid' 
                    ? 'bg-green-100 text-green-800' 
                    : symbol.validation_status === 'invalid'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {symbol.validation_status === 'valid' ? 'Valid Data' : 
                   symbol.validation_status === 'invalid' ? 'Invalid Data' : 
                   'Pending Validation'}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>Last updated: {new Date(symbol.last_updated).toLocaleString()}</span>
            </div>
          </div>
          {symbol.validation_reason && symbol.validation_status === 'invalid' && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-800 mb-1">Data Validation Failed:</p>
              <p className="text-sm text-red-700">{symbol.validation_reason}</p>
            </div>
          )}

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

        {/* Volatility Section */}
        {hasOHLCVData && statistics && Object.keys(statistics).length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Volatility</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {statistics.volatility !== undefined && (
                <StatisticsCard
                  title="Standard deviation"
                  value={statistics.volatility}
                  unit="%"
                  additionalInfo={
                    statistics.mean_price && statistics.volatility
                      ? `Mean price: $${statistics.mean_price.toFixed(2)} | SD in $: $${(statistics.mean_price * statistics.volatility / 100).toFixed(2)}`
                      : statistics.mean_price
                      ? `Mean price: $${statistics.mean_price.toFixed(2)}`
                      : null
                  }
                  description="Standard deviation of returns - measures price variability"
                  icon={TrendingUp}
                />
              )}
              {statistics.beta !== undefined && (
                <StatisticsCard
                  title="Beta"
                  value={statistics.beta}
                  unit=""
                  description="Beta measures stock volatility relative to market benchmark (S&P 500 for US stocks)"
                  icon={TrendingUp}
                />
              )}
              <StatisticsCard
                title="Bollinger Band Phase"
                value={statistics.bollinger_phase || 'No phase detected'}
                unit=""
                description="Current market phase based on Bollinger Bands analysis"
                icon={TrendingUp}
              />
              {/* More statistics cards can be added here */}
            </div>
          </div>
        )}

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
          <CandlestickChart data={ohlcv} ticker={ticker} indicators={indicators} />
        </div>

        {/* Analytical Tools */}
        <div className="mb-6">
          <ToolAssignmentManager symbolTicker={ticker} onAssignmentChange={handleAssignmentChange} />
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

