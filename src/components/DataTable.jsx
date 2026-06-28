/**
 * Data Table Component — OHLCV with backend pagination and change_percent from API.
 */

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getSymbolOHLCV } from '../data/symbols';
import { formatPercent } from '../lib/formatPnl';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from './ui/Table';
import EmptyState from './ui/EmptyState';

const ITEMS_PER_PAGE = 20;

export default function DataTable({ initialData = [], ticker, totalCount = 0 }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(totalCount || initialData.length);

  useEffect(() => {
    if (ticker) {
      if (currentPage === 1 && initialData.length > 0) {
        setData(initialData.slice(0, ITEMS_PER_PAGE));
        setCount(totalCount || initialData.length);
        setLoading(false);
      } else {
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
          .finally(() => setLoading(false));
      }
    } else if (initialData.length > 0) {
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      setData(initialData.slice(startIndex, startIndex + ITEMS_PER_PAGE));
      setCount(initialData.length);
    }
  }, [currentPage, ticker, initialData, totalCount]);

  const totalPages = Math.ceil(count / ITEMS_PER_PAGE);

  if (data.length === 0 && !loading) {
    return <EmptyState title="No OHLCV data" description="Fetch market data for this symbol to populate the table." />;
  }

  return (
    <div>
      {loading && <div className="text-center py-4 text-ink-tertiary">Loading...</div>}
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Timestamp</TableHeaderCell>
            <TableHeaderCell numeric>Open</TableHeaderCell>
            <TableHeaderCell numeric priority={2}>High</TableHeaderCell>
            <TableHeaderCell numeric priority={2}>Low</TableHeaderCell>
            <TableHeaderCell numeric>Close</TableHeaderCell>
            <TableHeaderCell numeric priority={3}>Volume</TableHeaderCell>
            <TableHeaderCell numeric>Change %</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((item, index) => {
            const change = item.change_percent;
            const changeNum = change != null ? Number(change) : null;
            const changeClass =
              changeNum == null
                ? 'text-ink-tertiary'
                : changeNum >= 0
                  ? 'text-profit'
                  : 'text-loss';

            return (
              <TableRow key={`${item.timestamp}-${index}`}>
                <TableCell>{new Date(item.timestamp).toLocaleString()}</TableCell>
                <TableCell numeric className="font-mono">${parseFloat(item.open).toFixed(2)}</TableCell>
                <TableCell numeric priority={2} className="font-mono">${parseFloat(item.high).toFixed(2)}</TableCell>
                <TableCell numeric priority={2} className="font-mono">${parseFloat(item.low).toFixed(2)}</TableCell>
                <TableCell numeric className="font-mono">${parseFloat(item.close).toFixed(2)}</TableCell>
                <TableCell numeric priority={3}>
                  {item.volume != null ? Number(item.volume).toLocaleString() : '—'}
                </TableCell>
                <TableCell numeric className={changeClass}>
                  {changeNum != null ? (
                    <>
                      {formatPercent(changeNum)}
                      {changeNum > 0 && ' ▲'}
                      {changeNum < 0 && ' ▼'}
                    </>
                  ) : (
                    '—'
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-ink-secondary">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
            {Math.min(currentPage * ITEMS_PER_PAGE, count)} of {count}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="btn btn--secondary min-h-[44px] min-w-[44px] p-2 disabled:opacity-50"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-ink-secondary">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || loading}
              className="btn btn--secondary min-h-[44px] min-w-[44px] p-2 disabled:opacity-50"
              aria-label="Next page"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
