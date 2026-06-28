/**
 * Map backend status strings to Badge variants (system status, not P&L).
 */

const STATUS_MAP = {
  pending: 'pending',
  queued: 'pending',
  scheduled: 'pending',
  evaluating: 'running',
  running: 'running',
  active: 'running',
  in_progress: 'running',
  started: 'running',
  processing: 'running',
  completed: 'completed',
  complete: 'completed',
  done: 'completed',
  success: 'completed',
  passed: 'completed',
  failed: 'failed',
  error: 'failed',
  cancelled: 'failed',
  canceled: 'failed',
  stopped: 'failed',
  paused: 'paused',
  inactive: 'paused',
  completed_with_warnings: 'warning',
  warning: 'warning',
};

export function normalizeStatus(status) {
  if (!status) return 'pending';
  const key = String(status).toLowerCase().replace(/\s+/g, '_');
  return STATUS_MAP[key] ?? 'pending';
}

export function statusBadgeClasses(variant) {
  const map = {
    pending: 'bg-status-pending-soft text-status-pending',
    running: 'badge badge--running bg-status-running-soft text-status-running',
    completed: 'bg-status-success-soft text-status-success',
    failed: 'bg-status-failed-soft text-status-failed',
    paused: 'bg-status-paused-soft text-status-paused',
    warning: 'bg-status-warning-soft text-status-warning',
  };
  return map[variant] ?? map.pending;
}

export function statusLabel(status) {
  if (!status) return 'Unknown';
  return String(status)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
