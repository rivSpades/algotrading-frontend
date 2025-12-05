/**
 * Data Table Component
 * Displays OHLCV data in a table format with backend pagination
 */

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getSymbolOHLCV } from '../data/symbols';

const ITEMS_PER_PAGE = 20;

export default function DataTable({ initialData = [], ticker, totalCount = 0 }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(totalCount || initialData.length);

  useEffect(() => {
    if (ticker) {
      // For first page, use initial data if available (from loader - single API call)
      if (currentPage === 1 && initialData.length > 0) {
        const paginated = initialData.slice(0, ITEMS_PER_PAGE);
        setData(paginated);
        setCount(totalCount || initialData.length);
        setLoading(false);
      } else {
        // For other pages, make API call
        setLoading(true);
        getSymbolOHLCV(ticker, 'daily', null, null, currentPage, ITEMS_PER_PAGE)
          .then((result) => {
            setData(result.results || []);
            setCount(result.count || 0);
          })
          .catch((error) => {
            console.error('Error loading OHLCV data:', error);
            setData([]);
            setCount(0);
          })
          .finally(() => {
            setLoading(false);
          });
      }
    } else if (initialData.length > 0) {
      // If no ticker, paginate initial data locally
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const paginated = initialData.slice(startIndex, endIndex);
      setData(paginated);
      setCount(initialData.length);
    }
  }, [currentPage, ticker, initialData, totalCount]);

  const tableData = data.map((item) => ({
    timestamp: new Date(item.timestamp).toLocaleString(),
    open: parseFloat(item.open).toFixed(2),
    high: parseFloat(item.high).toFixed(2),
    low: parseFloat(item.low).toFixed(2),
    close: parseFloat(item.close).toFixed(2),
    volume: item.volume ? parseFloat(item.volume).toLocaleString() : '-',
    change: ((parseFloat(item.close) - parseFloat(item.open)) / parseFloat(item.open) * 100).toFixed(2),
  }));

  const totalPages = Math.ceil(count / ITEMS_PER_PAGE);

  if (tableData.length === 0 && !loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        No data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {loading && (
        <div className="text-center py-4 text-gray-500">
          Loading...
        </div>
      )}
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Timestamp
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Open
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              High
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Low
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Close
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Volume
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Change %
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {tableData.map((row, index) => {
            const changeValue = parseFloat(row.change);
            const changeColor = changeValue >= 0 ? 'text-green-600' : 'text-red-600';
            
            return (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row.timestamp}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${row.open}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${row.high}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${row.low}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${row.close}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {row.volume}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${changeColor}`}>
                  {changeValue >= 0 ? '+' : ''}{row.change}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, count)} of {count} entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || loading}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
