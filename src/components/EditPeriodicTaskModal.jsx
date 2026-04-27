/**
 * Edit django-celery-beat PeriodicTask: task path, args/kwargs JSON, schedule (crontab/interval).
 * Shared crontab rows: editing schedule updates all tasks using that crontab.
 */

import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { marketDataAPI } from '../data/api';

function stringifyArgKw(value, isList) {
  if (value === undefined || value === null) {
    return isList ? '[]' : '{}';
  }
  try {
    if (typeof value === 'string') {
      const p = JSON.parse(value);
      return JSON.stringify(p, null, 2);
    }
    return JSON.stringify(value, null, 2);
  } catch {
    return isList ? '[]' : '{}';
  }
}

export default function EditPeriodicTaskModal({ isOpen, onClose, task, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [taskPath, setTaskPath] = useState('');
  const [description, setDescription] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [argsText, setArgsText] = useState('[]');
  const [kwargsText, setKwargsText] = useState('{}');
  const [queue, setQueue] = useState('');
  const [routingKey, setRoutingKey] = useState('');

  const [cronMinute, setCronMinute] = useState('*');
  const [cronHour, setCronHour] = useState('*');
  const [cronDow, setCronDow] = useState('*');
  const [cronDom, setCronDom] = useState('*');
  const [cronMoy, setCronMoy] = useState('*');
  const [cronTz, setCronTz] = useState('UTC');

  const [intEvery, setIntEvery] = useState(1);
  const [intPeriod, setIntPeriod] = useState('days');

  useEffect(() => {
    if (!isOpen || !task) return;
    setError(null);
    setName(task.name || '');
    setTaskPath(task.task || '');
    setDescription(task.description || '');
    setEnabled(!!task.enabled);
    setArgsText(stringifyArgKw(task.args, true));
    setKwargsText(stringifyArgKw(task.kwargs, false));
    setQueue(task.queue || '');
    setRoutingKey(task.routing_key || '');

    if (task.crontab) {
      setCronMinute(String(task.crontab.minute ?? '*'));
      setCronHour(String(task.crontab.hour ?? '*'));
      setCronDow(String(task.crontab.day_of_week ?? '*'));
      setCronDom(String(task.crontab.day_of_month ?? '*'));
      setCronMoy(String(task.crontab.month_of_year ?? '*'));
      setCronTz(String(task.crontab.timezone || 'UTC'));
    }
    if (task.interval) {
      setIntEvery(task.interval.every ?? 1);
      setIntPeriod(task.interval.period || 'days');
    }
  }, [isOpen, task]);

  if (!isOpen || !task) return null;

  const st = task.schedule_type || 'none';

  const handleSave = async () => {
    setError(null);
    let argsParsed;
    let kwargsParsed;
    try {
      argsParsed = JSON.parse(argsText);
      if (!Array.isArray(argsParsed)) throw new Error('args must be a JSON array');
    } catch (e) {
      setError(`args: ${e.message || 'invalid JSON'}`);
      return;
    }
    try {
      kwargsParsed = JSON.parse(kwargsText);
      if (kwargsParsed === null || typeof kwargsParsed !== 'object' || Array.isArray(kwargsParsed)) {
        throw new Error('kwargs must be a JSON object');
      }
    } catch (e) {
      setError(`kwargs: ${e.message || 'invalid JSON'}`);
      return;
    }

    setSaving(true);
    try {
      const body = {
        name,
        task: taskPath,
        description,
        enabled,
        args: argsParsed,
        kwargs: kwargsParsed,
        queue: queue || null,
        routing_key: routingKey || null,
      };
      const res = await marketDataAPI.updateScheduledTask(task.id, body);
      if (!res.success) {
        throw new Error(res.error || 'Update failed');
      }

      if (st === 'crontab' && task.crontab?.id) {
        const cres = await marketDataAPI.updateCrontabSchedule(task.crontab.id, {
          minute: cronMinute,
          hour: cronHour,
          day_of_week: cronDow,
          day_of_month: cronDom,
          month_of_year: cronMoy,
          timezone: cronTz,
        });
        if (!cres.success) {
          throw new Error(cres.error || 'Failed to update crontab schedule');
        }
      } else if (st === 'interval' && task.interval?.id) {
        const ires = await marketDataAPI.updateIntervalSchedule(task.interval.id, {
          every: Number(intEvery),
          period: intPeriod,
        });
        if (!ires.success) {
          throw new Error(ires.error || 'Failed to update interval schedule');
        }
      }

      onSaved?.();
      onClose();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900">Edit scheduled task</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-3 space-y-3 text-sm">
          {error && (
            <div className="flex items-start gap-2 p-2 rounded bg-red-50 text-red-800 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Name (unique in Beat)</label>
            <input
              className="w-full border border-gray-300 rounded px-2 py-1.5"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Celery task path</label>
            <input
              className="w-full border border-gray-300 rounded px-2 py-1.5 font-mono text-xs"
              value={taskPath}
              onChange={(e) => setTaskPath(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Description</label>
            <textarea
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            <span>Enabled</span>
          </label>

          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Args (JSON array)</label>
            <textarea
              className="w-full border border-gray-300 rounded px-2 py-1.5 font-mono text-xs"
              rows={3}
              value={argsText}
              onChange={(e) => setArgsText(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Kwargs (JSON object)</label>
            <textarea
              className="w-full border border-gray-300 rounded px-2 py-1.5 font-mono text-xs"
              rows={4}
              value={kwargsText}
              onChange={(e) => setKwargsText(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Queue (optional)</label>
              <input
                className="w-full border border-gray-300 rounded px-2 py-1.5"
                value={queue}
                onChange={(e) => setQueue(e.target.value)}
                placeholder="default"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Routing key (optional)</label>
              <input
                className="w-full border border-gray-300 rounded px-2 py-1.5"
                value={routingKey}
                onChange={(e) => setRoutingKey(e.target.value)}
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-3 mt-1">
            <h3 className="text-sm font-medium text-gray-800 mb-2">Schedule</h3>
            {st === 'solar' || st === 'clocked' ? (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
                This task uses a <strong>{st}</strong> schedule. Edit it in Django admin or the database; crontab/interval
                fields do not apply.
              </p>
            ) : st === 'crontab' && task.crontab ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">
                  Crontab id <code className="bg-gray-100 px-1 rounded">{task.crontab.id}</code>. Other tasks sharing this
                  row will get the same times.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    ['Minute', cronMinute, setCronMinute],
                    ['Hour', cronHour, setCronHour],
                    ['Day of week', cronDow, setCronDow],
                    ['Day of month', cronDom, setCronDom],
                    ['Month of year', cronMoy, setCronMoy],
                    ['Timezone', cronTz, setCronTz],
                  ].map(([label, val, setVal]) => (
                    <div key={label}>
                      <label className="block text-xs text-gray-500 mb-0.5">{label}</label>
                      <input
                        className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono"
                        value={val}
                        onChange={(e) => setVal(e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : st === 'interval' && task.interval ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">
                  Interval id <code className="bg-gray-100 px-1 rounded">{task.interval.id}</code>
                </p>
                <div className="flex gap-2 items-end">
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">Every</label>
                    <input
                      type="number"
                      min={1}
                      className="w-24 border border-gray-300 rounded px-2 py-1"
                      value={intEvery}
                      onChange={(e) => setIntEvery(parseInt(e.target.value, 10) || 1)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-0.5">Period</label>
                    <select
                      className="w-full border border-gray-300 rounded px-2 py-1"
                      value={intPeriod}
                      onChange={(e) => setIntPeriod(e.target.value)}
                    >
                      <option value="days">days</option>
                      <option value="hours">hours</option>
                      <option value="minutes">minutes</option>
                      <option value="seconds">seconds</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500">No crontab or interval on this task.</p>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 px-4 py-3 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
