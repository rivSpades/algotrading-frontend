import React from 'react';

function parseMetadataNum(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

/** Aligns with `snapshot_orig_strategyleg_quantity` in backend `trade_metadata.py`. */
function snapshotOrigStrategylegQty(md) {
  if (!md || typeof md !== 'object') return null;
  const keys = [
    'main_opening_strategyleg_qty',
    'opening_strategyleg_quantity',
    'requested_quantity',
    'strategyleg_quantity',
  ];
  for (const k of keys) {
    const x = parseMetadataNum(md[k]);
    if (x != null && x > 0) return x;
  }
  const br = md.broker_quantity_reconcile;
  if (!Array.isArray(br)) return null;
  let best = null;
  for (const ent of br) {
    if (!ent || typeof ent !== 'object') continue;
    const v = parseMetadataNum(ent.from_db);
    if (v != null && v > 0) best = best == null ? v : Math.max(best, v);
  }
  return best;
}

function hedgePortionForExitMain(md, trade) {
  const q = parseMetadataNum(trade?.quantity);
  const denom = snapshotOrigStrategylegQty(md);
  if (q == null || denom == null || denom <= 0) return null;
  const p = Math.min(1, q / denom);
  return Number.isFinite(p) ? p : null;
}

function hasLikelyQtyDrift(md) {
  if (!md || typeof md !== 'object') return false;
  const qrf = md.quantity_reconciled_to_fill;
  if (qrf && typeof qrf === 'object') return true;
  return Array.isArray(md.broker_quantity_reconcile) && md.broker_quantity_reconcile.length > 0;
}

/** Prefer `hedge_pnl_pre_portion` × portion; legacy live rows with drift rescale stale full-leg rollup. */
function displayHybridMainExitHedgePnl(md, trade) {
  const portion = hedgePortionForExitMain(md, trade);
  const pre = parseMetadataNum(md.hedge_pnl_pre_portion);
  const stored = parseMetadataNum(md.hedge_pnl);
  if (pre != null && portion != null && Number.isFinite(pre * portion)) {
    return pre * portion;
  }
  const sv = md.hedge_pnl_scale_version;
  const alreadyPortionedBackend = sv === 2 || sv === '2';
  const haveOrigSnapshot = snapshotOrigStrategylegQty(md) != null;
  if (
    !alreadyPortionedBackend &&
    stored != null &&
    portion != null &&
    portion < 0.999 &&
    pre == null &&
    (hasLikelyQtyDrift(md) || haveOrigSnapshot)
  ) {
    return stored * portion;
  }
  return stored;
}

function numLiveTradePnl(trade) {
  if (!trade || trade.pnl === undefined || trade.pnl === null || trade.pnl === '') return null;
  const n = typeof trade.pnl === 'number' ? trade.pnl : Number(trade.pnl);
  return Number.isFinite(n) ? n : null;
}

/** Hybrid main exits: sleeve PnL (metadata or model `pnl`). */
export function exitRowAttributedStrategyPnlUsd(trade) {
  const md = trade?.metadata && typeof trade.metadata === 'object' ? trade.metadata : {};
  if (md.is_hedge_leg) return null;
  const spMeta = parseMetadataNum(md.strategy_pnl);
  if (spMeta != null) return spMeta;
  return numLiveTradePnl(trade);
}

/** Vol hedge component on hybrid mains, or full row PnL on a hedge-leg row when shown separately. */
export function exitRowAttributedHedgePnlUsd(trade) {
  const md = trade?.metadata && typeof trade.metadata === 'object' ? trade.metadata : {};
  if (md.is_hedge_leg) {
    return numLiveTradePnl(trade);
  }
  if (!md.hedge_enabled) return null;
  return displayHybridMainExitHedgePnl(md, trade);
}

/**
 * Combined position PnL for deployment summaries: sleeve + hedge on hybrid mains, else LiveTrade.pnl.
 * @param deploymentHedgeEnabled — deployment has hedge feature on (caller passes `deployment.hedge_enabled`).
 */
export function exitRowHybridTotalPnlUsd(trade, deploymentHedgeEnabled) {
  const md = trade?.metadata && typeof trade.metadata === 'object' ? trade.metadata : {};
  if (md.is_hedge_leg) {
    return numLiveTradePnl(trade);
  }
  if (!deploymentHedgeEnabled || !md.hedge_enabled) {
    return numLiveTradePnl(trade);
  }
  const s = exitRowAttributedStrategyPnlUsd(trade);
  const h = exitRowAttributedHedgePnlUsd(trade);
  if (s == null && h == null) {
    return numLiveTradePnl(trade);
  }
  return (s ?? 0) + (h ?? 0);
}

export function exitRowHybridRoiFromInvested(totalPnl, investedNumerator) {
  if (totalPnl == null || investedNumerator == null || investedNumerator <= 0) return null;
  return (totalPnl / investedNumerator) * 100;
}

/** Matches `investedForHistoryRow` in deployment history (bet_amount fallback, then entry × qty). */
function investedBasisForHybridRow(trade) {
  const betAmount = trade?.metadata?.bet_amount;
  if (betAmount !== undefined && betAmount !== null && betAmount !== '') {
    const n = typeof betAmount === 'number' ? betAmount : parseFloat(betAmount);
    if (Number.isFinite(n)) return n;
  }
  if (trade?.entry_price != null && trade?.quantity != null) {
    const n = Number(trade.entry_price) * Number(trade.quantity);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function HedgeTradeInvestedHeaderCells({ show }) {
  if (!show) return null;
  return (
    <>
      <th className="px-4 py-3 text-left text-xs font-medium text-ink-tertiary uppercase">Strategy Invested</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-ink-tertiary uppercase">Hedge Invested</th>
    </>
  );
}

export function HedgeTradePnlHeaderCells({ show }) {
  if (!show) return null;
  return (
    <>
      <th className="px-4 py-3 text-left text-xs font-medium text-ink-tertiary uppercase">Strategy PnL</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-ink-tertiary uppercase">Hedge PnL</th>
    </>
  );
}

export function HedgeQtySplitHeaderCells({ split }) {
  if (!split) {
    return (
      <th className="px-4 py-3 text-left text-xs font-medium text-ink-tertiary uppercase">Quantity</th>
    );
  }
  return (
    <>
      <th className="px-4 py-3 text-left text-xs font-medium text-ink-tertiary uppercase">Main qty</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-ink-tertiary uppercase">Hedge qty</th>
    </>
  );
}

function formatQtyCells4(raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? n.toFixed(4) : null;
}

/** When `split`, main rows show strategy sleeve + persisted `metadata.hedge_leg_quantity`; hedge rows show hedge-only in the second column. */
export function HedgeQtySplitBodyCells({ split, trade, isHedgeLeg }) {
  const cls = 'px-4 py-3 text-sm text-ink';
  const md = trade.metadata && typeof trade.metadata === 'object' ? trade.metadata : {};

  if (!split) {
    const v = formatQtyCells4(trade.quantity);
    return <td className={cls}>{v != null ? v : 'N/A'}</td>;
  }

  if (isHedgeLeg) {
    const hq = md.hedge_leg_entry_quantity ?? trade.quantity;
    const v = formatQtyCells4(hq);
    return (
      <>
        <td className={`${cls} text-ink-tertiary`}>—</td>
        <td className={cls}>{v != null ? v : 'N/A'}</td>
      </>
    );
  }

  let hedgeRaw = md.hedge_leg_quantity;
  const legs = trade.hedge_legs;
  if ((hedgeRaw == null || hedgeRaw === '') && Array.isArray(legs) && legs.length > 0) {
    hedgeRaw = legs[0].quantity;
  }
  const mainV = formatQtyCells4(trade.quantity);
  const hedgeV = formatQtyCells4(hedgeRaw);
  return (
    <>
      <td className={cls}>{mainV != null ? mainV : 'N/A'}</td>
      <td className={cls}>{hedgeV != null ? hedgeV : '—'}</td>
    </>
  );
}

export function HedgeTradeInvestedBodyCells({ show, trade, formatCurrency }) {
  if (!show) return null;
  const md = trade.metadata && typeof trade.metadata === 'object' ? trade.metadata : {};
  const isHedgeLeg = !!md.is_hedge_leg;
  let bs = parseMetadataNum(md.bet_strategy);
  let bh = parseMetadataNum(md.bet_hedge);
  const ws = parseMetadataNum(md.w_strategy) ?? 0.8;
  const wh = parseMetadataNum(md.w_hedge) ?? 0.2;
  const wsum = ws + wh;
  const hybridMain = !isHedgeLeg && !!md.hedge_enabled && wsum > 0;

  if (hybridMain) {
    if (bs != null && bh == null && ws > 0) {
      bh = (bs * wh) / ws;
    } else if (bh != null && bs == null && wh > 0) {
      bs = (bh * ws) / wh;
    } else if (bs == null && bh == null) {
      const rowTot = investedBasisForHybridRow(trade);
      if (rowTot != null) {
        bs = (rowTot * ws) / wsum;
        bh = (rowTot * wh) / wsum;
      } else {
        const sleeve = parseMetadataNum(md.bet_amount);
        if (sleeve != null) {
          const impliedTot = sleeve * (wsum / ws);
          bs = sleeve;
          bh = impliedTot - bs;
        }
      }
    }
  }

  /** Main rows from older live data may only have `bet_amount` (strategy sleeve notional). */
  if (bs == null && !isHedgeLeg && !hybridMain) {
    bs = parseMetadataNum(md.bet_amount);
  }
  return (
    <>
      <td className="px-4 py-3 text-sm text-ink">{bs != null ? formatCurrency(bs) : '—'}</td>
      <td className="px-4 py-3 text-sm text-ink">{bh != null ? formatCurrency(bh) : '—'}</td>
    </>
  );
}

export function HedgeTradePnlBodyCells({ show, rowType, trade, formatCurrency }) {
  if (!show) return null;
  const md = trade.metadata && typeof trade.metadata === 'object' ? trade.metadata : {};

  if (rowType === 'entry') {
    return (
      <>
        <td className="px-4 py-3 text-sm text-ink">-</td>
        <td className="px-4 py-3 text-sm text-ink">-</td>
      </>
    );
  }

  const isHedge = !!md.is_hedge_leg;
  const sp = !isHedge ? exitRowAttributedStrategyPnlUsd(trade) : null;
  const hp = exitRowAttributedHedgePnlUsd(trade);
  const stratClass = sp != null ? (sp >= 0 ? 'text-profit' : 'text-loss') : 'text-ink';
  const hedgeClass = hp != null ? (hp >= 0 ? 'text-profit' : 'text-loss') : 'text-ink';

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
