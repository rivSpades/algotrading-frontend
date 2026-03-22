/**
 * Expand trades into entry/exit table rows and sort by event time.
 * Trades are often stored ordered by entry_timestamp only; rendering each trade as
 * [entry row, exit row] in that order can show exits after another trade's entry
 * (e.g. Jan 15 exit before Jan 5 entry). Sorting flattened rows by date fixes that.
 */
export function buildChronologicalTradeTableRows(trades) {
  if (!trades || !trades.length) return [];
  const rows = [];
  for (const trade of trades) {
    const eid = trade.id;
    if (trade.entry_timestamp) {
      rows.push({
        key: `${eid}-entry`,
        sortTs: new Date(trade.entry_timestamp).getTime(),
        rowType: 'entry',
        trade,
      });
    }
    if (trade.exit_timestamp) {
      rows.push({
        key: `${eid}-exit`,
        sortTs: new Date(trade.exit_timestamp).getTime(),
        rowType: 'exit',
        trade,
      });
    }
  }
  rows.sort((a, b) => {
    if (a.sortTs !== b.sortTs) return a.sortTs - b.sortTs;
    const idA = a.trade.id ?? 0;
    const idB = b.trade.id ?? 0;
    if (idA !== idB) return idA - idB;
    return a.rowType === 'entry' ? -1 : 1;
  });
  return rows;
}
