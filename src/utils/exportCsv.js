/**
 * CSV / JSON download helpers for table exports (Excel, Python, etc.)
 */

export function escapeCsvField(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * @param {string} filename
 * @param {(string|number|null|undefined)[][]} rows - First row = headers
 */
export function downloadCsv(filename, rows) {
  if (!rows?.length) return;
  const content = rows.map((row) => row.map(escapeCsvField).join(',')).join('\r\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * OHLCV bars from API (may include extra keys from indicators)
 */
export function exportOhlcvBarsToCsv(ohlcvRows, filename) {
  if (!ohlcvRows?.length) return;

  const keySet = new Set();
  ohlcvRows.forEach((row) => {
    Object.keys(row || {}).forEach((k) => keySet.add(k));
  });

  const priority = ['timestamp', 'timeframe', 'open', 'high', 'low', 'close', 'volume'];
  const rest = [...keySet].filter((k) => !priority.includes(k)).sort();
  const headers = [...priority.filter((k) => keySet.has(k)), ...rest];

  const rows = [headers];
  for (const bar of ohlcvRows) {
    rows.push(headers.map((h) => {
      const v = bar[h];
      if (v !== null && typeof v === 'object') return JSON.stringify(v);
      return v;
    }));
  }

  downloadCsv(filename, rows);
}
