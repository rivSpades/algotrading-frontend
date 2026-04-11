import React from 'react';

function parseMetadataNum(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export function HedgeTradeInvestedHeaderCells({ show }) {
  if (!show) return null;
  return (
    <>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Strategy Invested</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hedge Invested</th>
    </>
  );
}

export function HedgeTradePnlHeaderCells({ show }) {
  if (!show) return null;
  return (
    <>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Strategy PnL</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hedge PnL</th>
    </>
  );
}

export function HedgeTradeInvestedBodyCells({ show, trade, formatCurrency }) {
  if (!show) return null;
  const md = trade.metadata && typeof trade.metadata === 'object' ? trade.metadata : {};
  const bs = parseMetadataNum(md.bet_strategy);
  const bh = parseMetadataNum(md.bet_hedge);
  return (
    <>
      <td className="px-4 py-3 text-sm text-gray-900">{bs != null ? formatCurrency(bs) : '—'}</td>
      <td className="px-4 py-3 text-sm text-gray-900">{bh != null ? formatCurrency(bh) : '—'}</td>
    </>
  );
}

export function HedgeTradePnlBodyCells({ show, rowType, trade, formatCurrency }) {
  if (!show) return null;
  const md = trade.metadata && typeof trade.metadata === 'object' ? trade.metadata : {};

  if (rowType === 'entry') {
    return (
      <>
        <td className="px-4 py-3 text-sm text-gray-900">-</td>
        <td className="px-4 py-3 text-sm text-gray-900">-</td>
      </>
    );
  }

  const sp = parseMetadataNum(md.strategy_pnl);
  const hp = parseMetadataNum(md.hedge_pnl);
  const stratClass = sp != null ? (sp >= 0 ? 'text-green-600' : 'text-red-600') : 'text-gray-900';
  const hedgeClass = hp != null ? (hp >= 0 ? 'text-green-600' : 'text-red-600') : 'text-gray-900';

  return (
    <>
      <td className={`px-4 py-3 text-sm font-medium ${stratClass}`}>
        {sp != null ? formatCurrency(sp) : '—'}
      </td>
      <td className={`px-4 py-3 text-sm font-medium ${hedgeClass}`}>
        {hp != null ? formatCurrency(hp) : '—'}
      </td>
    </>
  );
}
