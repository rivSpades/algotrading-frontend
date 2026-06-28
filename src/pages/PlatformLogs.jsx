/**
 * Platform-wide audit log (DeploymentEvent) with server pagination and filters.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FileText, Loader, RefreshCw } from 'lucide-react';
import { deploymentEventsAPI } from '../data/strategyDeployments';

const PAGE_SIZES = [25, 50, 100, 200];

const EVENT_TYPES = [
  '',
  'error',
  'info',
  'deploy_created',
  'deploy_activated',
  'deploy_paused',
  'deploy_stopped',
  'signal_evaluated',
  'order_placed',
  'order_filled',
  'order_failed',
  'trade_opened',
  'trade_closed',
  'task_tick',
  'recalc_started',
  'recalc_finished',
  'evaluation_passed',
  'evaluation_failed',
];

const LEVELS = ['', 'info', 'warning', 'error'];
const ACTOR_TYPES = ['', 'user', 'system', 'task', 'broker'];

function readIntParam(sp, key, defaultVal, allowed) {
  const raw = sp.get(key);
  if (raw == null || raw === '') return defaultVal;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return defaultVal;
  if (allowed && !allowed.includes(n)) return defaultVal;
  return n;
}

function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function PlatformLogs() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Math.max(1, readIntParam(searchParams, 'page', 1));
  const pageSize = readIntParam(searchParams, 'page_size', 50, PAGE_SIZES);
  const q = searchParams.get('q') || '';
  const eventType = searchParams.get('event_type') || '';
  const level = searchParams.get('level') || '';
  const actorType = searchParams.get('actor_type') || '';
  const deployment = searchParams.get('deployment') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    results: [],
    count: 0,
    next: null,
    previous: null,
  });

  const queryArgs = useMemo(
    () => ({
      page,
      pageSize,
      search: q.trim() || null,
      eventType: eventType || null,
      level: level || null,
      actorType: actorType || null,
      deployment: deployment.trim() || null,
      ordering: '-created_at',
    }),
    [page, pageSize, q, eventType, level, actorType, deployment],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await deploymentEventsAPI.list(queryArgs);
    if (!res.success) {
      setError(res.error || 'Request failed');
      setData({ results: [], count: 0, next: null, previous: null });
      setLoading(false);
      return;
    }
    const d = res.data;
    if (Array.isArray(d)) {
      setData({ results: d, count: d.length, next: null, previous: null });
    } else {
      setData({
        results: d.results || [],
        count: d.count ?? (d.results || []).length,
        next: d.next || null,
        previous: d.previous || null,
      });
    }
    setLoading(false);
  }, [queryArgs]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil((data.count || 0) / pageSize));
  const canPrev = page > 1;
  const canNext = Boolean(data.next);

  const updateParams = (patch) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === null || v === undefined || v === '') next.delete(k);
      else next.set(k, String(v));
    });
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="p-6 max-w-[120rem] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-7 h-7 text-slate-600" />
          <div>
            <h1 className="text-2xl font-bold text-ink">Platform log</h1>
            <p className="text-sm text-ink-tertiary">
              All deployment and system events, paginated from the server.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-ink-secondary bg-surface border border-border-strong rounded-md hover:bg-bg"
        >
          {loading ? <Loader className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      <form
        key={searchParams.toString()}
        className="mb-4 p-4 bg-surface rounded-lg border border-border shadow-sm flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          updateParams({
            page: 1,
            page_size: fd.get('page_size') || '50',
            q: (fd.get('q') || '').toString().trim() || null,
            event_type: (fd.get('event_type') || '').toString() || null,
            level: (fd.get('level') || '').toString() || null,
            actor_type: (fd.get('actor_type') || '').toString() || null,
            deployment: (fd.get('deployment') || '').toString().trim() || null,
          });
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-ink-tertiary mb-1">Search (message, type, actor id)</label>
            <input
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Search…"
              className="w-full px-2 py-1.5 text-sm border border-border-strong rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-tertiary mb-1">Event type</label>
            <select
              name="event_type"
              defaultValue={eventType}
              className="w-full px-2 py-1.5 text-sm border border-border-strong rounded-md"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t || 'all'} value={t}>
                  {t || 'All types'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-tertiary mb-1">Level</label>
            <select
              name="level"
              defaultValue={level}
              className="w-full px-2 py-1.5 text-sm border border-border-strong rounded-md"
            >
              {LEVELS.map((t) => (
                <option key={t || 'all-l'} value={t}>
                  {t || 'All levels'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-tertiary mb-1">Actor</label>
            <select
              name="actor_type"
              defaultValue={actorType}
              className="w-full px-2 py-1.5 text-sm border border-border-strong rounded-md"
            >
              {ACTOR_TYPES.map((t) => (
                <option key={t || 'all-a'} value={t}>
                  {t || 'All actors'}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-ink-tertiary mb-1">Deployment id</label>
            <input
              name="deployment"
              type="text"
              inputMode="numeric"
              defaultValue={deployment}
              placeholder="Optional"
              className="w-40 px-2 py-1.5 text-sm border border-border-strong rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-tertiary mb-1">Page size</label>
            <select
              name="page_size"
              defaultValue={String(pageSize)}
              className="w-full max-w-[8rem] px-2 py-1.5 text-sm border border-border-strong rounded-md"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-md hover:bg-accent-hover"
          >
            Apply
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-4 p-3 bg-loss-soft border border-loss text-loss-ink text-sm rounded-md">{error}</div>
      )}

      <div className="bg-surface rounded-lg border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-2 border-b bg-bg text-xs text-ink-secondary">
          {data.count} total log entries
          {loading && <Loader className="inline w-3 h-3 ml-2 animate-spin" />}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-bg text-xs uppercase text-ink-tertiary">
              <tr>
                <th className="px-3 py-2 text-left whitespace-nowrap">Time</th>
                <th className="px-3 py-2 text-left">Level</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Deployment</th>
                <th className="px-3 py-2 text-left">Actor</th>
                <th className="px-3 py-2 text-left min-w-[200px]">Message</th>
                <th className="px-3 py-2 text-left">Symbol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!loading && data.results.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-ink-tertiary">
                    No log entries.
                  </td>
                </tr>
              )}
              {data.results.map((row) => (
                <tr key={row.id} className="hover:bg-bg/80">
                  <td className="px-3 py-2 text-xs text-ink-secondary whitespace-nowrap">{fmtTime(row.created_at)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        row.level === 'error'
                          ? 'bg-loss-soft text-loss-ink'
                          : row.level === 'warning'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {row.level}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs font-mono text-ink">{row.event_type}</td>
                  <td className="px-3 py-2 text-xs">
                    {row.deployment ? (
                      <Link
                        to={`/deployments/${row.deployment}`}
                        className="text-accent hover:underline"
                        title={row.deployment_name || row.deployment}
                      >
                        {row.deployment_name || `#${row.deployment}`}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-ink-secondary">
                    {row.actor_type}
                    {row.actor_id ? <span className="text-ink-tertiary"> · {row.actor_id}</span> : null}
                  </td>
                  <td className="px-3 py-2 text-xs text-ink max-w-md">
                    {row.message || '—'}
                    {row.error ? (
                      <pre className="mt-1 text-loss-ink whitespace-pre-wrap break-words text-[11px]">{row.error}</pre>
                    ) : null}
                    {row.context && Object.keys(row.context).length > 0 ? (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-ink-tertiary">Context</summary>
                        <pre className="mt-1 p-2 bg-surface-sunken rounded text-[11px] overflow-x-auto max-h-32">
                          {JSON.stringify(row.context, null, 2)}
                        </pre>
                      </details>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-xs text-ink-secondary whitespace-nowrap">
                    {row.deployment_symbol_ticker || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.count > 0 && (
          <div className="px-4 py-3 border-t flex flex-wrap items-center justify-between gap-2 text-sm text-ink-secondary">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!canPrev || loading}
                onClick={() => updateParams({ page: String(page - 1) })}
                className="px-3 py-1.5 border border-border-strong rounded-md disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={!canNext || loading}
                onClick={() => updateParams({ page: String(page + 1) })}
                className="px-3 py-1.5 border border-border-strong rounded-md disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
