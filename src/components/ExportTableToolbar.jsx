/**
 * Compact export actions for data tables (CSV + JSON)
 */

import { Download, FileJson, Loader } from 'lucide-react';

export default function ExportTableToolbar({
  onExportCsv,
  onExportJson,
  csvLabel = 'Export CSV',
  jsonLabel = 'Export JSON',
  disabled = false,
  loading = false,
  className = '',
}) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={onExportCsv}
        disabled={disabled || loading}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {csvLabel}
      </button>
      {onExportJson && (
        <button
          type="button"
          onClick={onExportJson}
          disabled={disabled || loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileJson className="w-4 h-4" />
          {jsonLabel}
        </button>
      )}
    </div>
  );
}
