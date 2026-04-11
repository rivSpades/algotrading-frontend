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
 * @param {{ hedgeEnabled?: boolean }} [options] - When hedgeEnabled, adds bet_strategy, bet_hedge, strategy_pnl, hedge_pnl columns
 */
export function exportTradesToCsvFile(trades, filename, options = {}) {
  if (!trades?.length) return;

  const { hedgeEnabled = false } = options;
  const chronological = buildChronologicalTradeTableRows(trades);
  const baseHeaders = [
    'event_date',
    'row_type',
    'ticker',
    'position_label',
    'bet_amount',
    'independent_bet_amount',
  ];
  const hedgeMidHeaders = hedgeEnabled
    ? ['bet_strategy', 'bet_hedge']
    : [];
  const tailHeaders = [
    'quantity',
    'entry_timestamp',
    'exit_timestamp',
  ];
  const hedgePnlHeaders = hedgeEnabled ? ['strategy_pnl', 'hedge_pnl'] : [];
  const endHeaders = [
    'pnl',
    'pnl_percentage',
    'max_drawdown',
    'trade_id',
    'trade_type',
    'position_mode',
  ];
  const headers = [...baseHeaders, ...hedgeMidHeaders, ...tailHeaders, ...hedgePnlHeaders, ...endHeaders];

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

    const baseRow = [
      eventDate ?? '',
      rowType,
      ticker,
      positionLabel,
      md.bet_amount ?? '',
      md.independent_bet_amount ?? '',
    ];
    const hedgeMidRow = hedgeEnabled
      ? [md.bet_strategy ?? '', md.bet_hedge ?? '']
      : [];
    const tailRow = [
      trade.quantity ?? '',
      trade.entry_timestamp ?? '',
      trade.exit_timestamp ?? '',
    ];
    const hedgePnlRow = hedgeEnabled
      ? [
          rowType === 'exit' ? md.strategy_pnl ?? '' : '',
          rowType === 'exit' ? md.hedge_pnl ?? '' : '',
        ]
      : [];
    const endRow = [
      rowType === 'exit' ? trade.pnl ?? '' : '',
      rowType === 'exit' ? trade.pnl_percentage ?? '' : '',
      rowType === 'exit' ? trade.max_drawdown ?? '' : '',
      trade.id ?? '',
      trade.trade_type ?? '',
      md.position_mode ?? '',
    ];

    rows.push([...baseRow, ...hedgeMidRow, ...tailRow, ...hedgePnlRow, ...endRow]);
  }

  downloadCsv(filename, rows);
}
