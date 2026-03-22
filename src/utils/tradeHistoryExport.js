import { buildChronologicalTradeTableRows } from './chronologicalTradeTableRows';
import { downloadCsv } from './exportCsv';

function tickerFromTrade(trade) {
  return (
    trade?.symbol_info?.ticker ||
    trade?.symbol?.ticker ||
    trade?.symbol_ticker ||
    ''
  );
}

/**
 * Export backtest trades as CSV (chronological entry/exit rows, same order as UI tables).
 * @param {object[]} trades - Trade objects from API
 * @param {string} filename - e.g. backtest-42-all-trades.csv
 */
export function exportTradesToCsvFile(trades, filename) {
  if (!trades?.length) return;

  const chronological = buildChronologicalTradeTableRows(trades);
  const headers = [
    'event_date',
    'row_type',
    'ticker',
    'position_label',
    'bet_amount',
    'independent_bet_amount',
    'quantity',
    'entry_timestamp',
    'exit_timestamp',
    'pnl',
    'pnl_percentage',
    'max_drawdown',
    'trade_id',
    'trade_type',
    'position_mode',
  ];

  const rows = [headers];

  for (const { rowType, trade } of chronological) {
    const md = trade.metadata && typeof trade.metadata === 'object' ? trade.metadata : {};
    const ticker = tickerFromTrade(trade);
    const eventDate = rowType === 'entry' ? trade.entry_timestamp : trade.exit_timestamp;
    const positionLabel =
      rowType === 'entry'
        ? trade.trade_type === 'buy'
          ? 'Long'
          : 'Short'
        : 'Exit';

    rows.push([
      eventDate ?? '',
      rowType,
      ticker,
      positionLabel,
      md.bet_amount ?? '',
      md.independent_bet_amount ?? '',
      trade.quantity ?? '',
      trade.entry_timestamp ?? '',
      trade.exit_timestamp ?? '',
      rowType === 'exit' ? trade.pnl ?? '' : '',
      rowType === 'exit' ? trade.pnl_percentage ?? '' : '',
      rowType === 'exit' ? trade.max_drawdown ?? '' : '',
      trade.id ?? '',
      trade.trade_type ?? '',
      md.position_mode ?? '',
    ]);
  }

  downloadCsv(filename, rows);
}
