/**
 * Tasks page — on-demand work + full Celery Beat (django-celery-beat) schedule overview
 */

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Play,
  Pause,
  Trash2,
  Pencil,
  RefreshCw,
  Search,
  Zap,
} from 'lucide-react';
import FetchOHLCVModal from '../components/FetchOHLCVModal';
import ScheduleTaskModal from '../components/ScheduleTaskModal';
import TaskProgress from '../components/TaskProgress';
import EditPeriodicTaskModal from '../components/EditPeriodicTaskModal';
import { marketDataAPI } from '../data/api';
import { fetchOHLCVData } from '../data/symbols';
import { motion } from 'framer-motion';

function normalizeScheduledList(responseData) {
  if (Array.isArray(responseData)) return responseData;
  if (responseData && Array.isArray(responseData.results)) return responseData.results;
  return [];
}

function formatScheduleSummary(task) {
  if (task.interval) {
    return `Interval: every ${task.interval.every} ${task.interval.period}`;
  }
  if (task.crontab) {
    const c = task.crontab;
    return `Cron UTC: m=${c.minute} h=${c.hour} dow=${c.day_of_week} dom=${c.day_of_month} moy=${c.month_of_year} | ${c.timezone || 'UTC'}`;
  }
  if (task.schedule_type === 'solar') return 'Solar schedule (edit in admin)';
  if (task.schedule_type === 'clocked') return 'Clocked one-shot (edit in admin)';
  return '—';
}

function previewJson(obj) {
  if (obj == null) return '—';
  try {
    const s = typeof obj === 'string' ? obj : JSON.stringify(obj);
    return s.length > 100 ? `${s.slice(0, 100)}…` : s;
  } catch {
    return '—';
  }
}

export default function Tasks() {
  const [showFetchOHLCVModal, setShowFetchOHLCVModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [taskId, setTaskId] = useState(null);
  const [showProgress, setShowProgress] = useState(false);
  const [scheduledTasks, setScheduledTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scheduleTaskConfig, setScheduleTaskConfig] = useState(null);
  const [search, setSearch] = useState('');
  const [editTask, setEditTask] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const handleFetchOHLCV = async (fetchData) => {
    try {
      const result = await fetchOHLCVData(fetchData);
      setTaskId(result.taskId);
      setShowProgress(true);
    } catch (error) {
      alert(`Failed to start OHLCV data fetch: ${error.message}`);
    }
  };

  const handleTaskComplete = () => {
    setShowProgress(false);
    setTaskId(null);
  };

  const handleTaskClose = () => {
    setShowProgress(false);
    setTaskId(null);
  };

  const loadScheduledTasks = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await marketDataAPI.getScheduledTasks();
      if (response.success) {
        setScheduledTasks(normalizeScheduledList(response.data));
      } else {
        setScheduledTasks([]);
        setLoadError(response.error || 'Failed to load scheduled tasks');
        console.error('getScheduledTasks failed', response.error);
      }
    } catch (error) {
      setScheduledTasks([]);
      setLoadError(error.message || String(error));
      console.error('Error loading scheduled tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunNow = async (taskId) => {
    try {
      const response = await marketDataAPI.runScheduledTaskNow(taskId);
      if (response.success) {
        setTaskId(response.data.task_id);
        setShowProgress(true);
      } else {
        alert(response.error || 'Failed to run task');
      }
    } catch (error) {
      alert(`Failed to run task: ${error.message}`);
    }
  };

  useEffect(() => {
    loadScheduledTasks();
  }, []);

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return scheduledTasks;
    return scheduledTasks.filter((t) => {
      const blob = [t.name, t.task, t.description, t.schedule_type]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [scheduledTasks, search]);

  const handleCreateSchedule = async (scheduleData) => {
    try {
      const response = await marketDataAPI.createScheduledTask(scheduleData);
      if (response.success) {
        await loadScheduledTasks();
        alert('Task scheduled successfully!');
      } else {
        alert(response.error || 'Failed');
      }
    } catch (error) {
      alert(`Failed to schedule task: ${error.message}`);
    }
  };

  const handleEnableTask = async (id) => {
    try {
      const response = await marketDataAPI.enableScheduledTask(id);
      if (response.success) {
        await loadScheduledTasks();
      } else {
        alert(response.error || 'Failed');
      }
    } catch (error) {
      alert(`Failed to enable task: ${error.message}`);
    }
  };

  const handleDisableTask = async (id) => {
    try {
      const response = await marketDataAPI.disableScheduledTask(id);
      if (response.success) {
        await loadScheduledTasks();
      } else {
        alert(response.error || 'Failed');
      }
    } catch (error) {
      alert(`Failed to disable task: ${error.message}`);
    }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('Are you sure you want to delete this scheduled task?')) {
      return;
    }
    try {
      const response = await marketDataAPI.deleteScheduledTask(id);
      if (response.success) {
        await loadScheduledTasks();
      } else {
        alert(response.error || 'Failed');
      }
    } catch (error) {
      alert(`Failed to delete task: ${error.message}`);
    }
  };

  const openEdit = async (t) => {
    try {
      const res = await marketDataAPI.getScheduledTask(t.id);
      if (res.success) {
        setEditTask(res.data);
      } else {
        setEditTask(t);
      }
    } catch {
      setEditTask(t);
    }
    setShowEditModal(true);
  };

  return (
    <>
      {showProgress && taskId && (
        <TaskProgress
          taskId={taskId}
          onComplete={handleTaskComplete}
          onClose={handleTaskClose}
        />
      )}

      <FetchOHLCVModal
        isOpen={showFetchOHLCVModal}
        onClose={() => setShowFetchOHLCVModal(false)}
        onFetch={handleFetchOHLCV}
      />

      <ScheduleTaskModal
        isOpen={showScheduleModal}
        onClose={() => {
          setShowScheduleModal(false);
          setScheduleTaskConfig(null);
        }}
        onSchedule={handleCreateSchedule}
        taskType={scheduleTaskConfig?.taskType}
        taskConfig={scheduleTaskConfig}
      />

      <EditPeriodicTaskModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditTask(null);
        }}
        task={editTask}
        onSaved={loadScheduledTasks}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-ink mb-1">Task Scheduler</h1>
            <p className="text-ink-secondary text-sm">
              Ad-hoc work below. <strong>Beat schedules</strong> shows every <code className="text-xs bg-surface-sunken px-1 rounded">django_celery_beat</code> periodic task
              (market open, weekend recalcs, symbol fetch, etc.); edit in place or in Django admin for solar/clocked.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadScheduledTasks()}
            className="inline-flex items-center gap-2 self-start px-3 py-2 text-sm border border-border-strong rounded-lg hover:bg-bg"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh list
          </button>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-ink mb-4">On-demand (run / schedule fetch)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <motion.div
              whileHover={{ y: -2 }}
              className="bg-surface rounded-lg shadow-md p-6 border border-border"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-accent-soft rounded-lg">
                  <BarChart3 className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-ink">Fetch OHLCV data</h3>
                  <p className="text-sm text-ink-tertiary">Symbols + historical bars</p>
                </div>
              </div>
              <p className="text-sm text-ink-secondary mb-4">
                Resolves symbols via EOD when needed, then fetches OHLCV from the selected provider.
              </p>
              <button
                type="button"
                onClick={() => setShowFetchOHLCVModal(true)}
                className="w-full px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm font-medium"
              >
                Run now
              </button>
            </motion.div>
          </div>
        </div>

        {loadError && (
          <div className="mb-4 p-3 rounded-lg bg-loss-soft border border-loss text-sm text-loss-ink">
            <strong>Could not load Beat schedules.</strong> {loadError} Check the API response in the network tab
            (e.g. 500) and the Django log.
          </div>
        )}

        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-xl font-semibold text-ink">
              Celery Beat — all periodic tasks ({filteredTasks.length}
              {search.trim() ? ` of ${scheduledTasks.length}` : ''})
            </h2>
            <div className="relative max-w-md w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
              <input
                type="search"
                placeholder="Filter by name, task, description…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-border-strong rounded-lg"
              />
            </div>
          </div>

          {loading ? (
            <div className="bg-surface rounded-lg shadow p-8 text-center text-ink-tertiary">Loading…</div>
          ) : scheduledTasks.length === 0 ? (
            <div className="bg-surface rounded-lg shadow p-8 text-center text-ink-tertiary">
              No periodic tasks. Run migrations and{' '}
              <code className="text-xs">bootstrap_market_schedules</code> if you expect market-open / weekend jobs.
            </div>
          ) : (
            <div className="bg-surface rounded-lg shadow border border-border overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-bg text-xs uppercase text-ink-tertiary border-b border-border">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Task</th>
                    <th className="px-3 py-2 font-medium min-w-[240px]">Description</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium min-w-[200px]">Schedule</th>
                    <th className="px-3 py-2 font-medium min-w-[120px]">Kwargs (preview)</th>
                    <th className="px-3 py-2 font-medium">Runs</th>
                    <th className="px-3 py-2 font-medium w-32">Last run</th>
                    <th className="px-3 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-bg/80">
                      <td className="px-3 py-2 font-medium text-ink align-top max-w-[180px]">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-xs font-normal mr-1 ${
                            task.enabled ? 'bg-profit-soft text-profit-ink' : 'bg-surface-sunken text-ink-secondary'
                          }`}
                        >
                          {task.enabled ? 'on' : 'off'}
                        </span>
                        {task.name}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-ink-secondary align-top break-all max-w-xs">{task.task}</td>
                      <td className="px-3 py-2 text-ink-secondary align-top text-xs whitespace-pre-wrap max-w-[320px]">
                        {task.description || '—'}
                      </td>
                      <td className="px-3 py-2 text-ink-secondary align-top whitespace-nowrap">
                        {task.schedule_type || '—'}
                      </td>
                      <td className="px-3 py-2 text-ink-secondary align-top text-xs">
                        {formatScheduleSummary(task)}
                      </td>
                      <td className="px-3 py-2 text-ink-tertiary align-top text-xs font-mono">{previewJson(task.kwargs)}</td>
                      <td className="px-3 py-2 text-ink-secondary align-top whitespace-nowrap">
                        {task.total_run_count != null ? task.total_run_count : '—'}
                      </td>
                      <td className="px-3 py-2 text-ink-secondary align-top text-xs whitespace-nowrap">
                        {task.last_run_at
                          ? new Date(task.last_run_at).toLocaleString()
                          : '—'}
                      </td>
                      <td className="px-3 py-2 align-top text-right">
                        <div className="inline-flex items-center justify-end gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleRunNow(task.id)}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded"
                            title="Run now"
                          >
                            <Zap className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(task)}
                            className="p-1.5 text-accent hover:bg-accent-soft rounded"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {task.enabled ? (
                            <button
                              type="button"
                              onClick={() => handleDisableTask(task.id)}
                              className="p-1.5 text-ink-secondary hover:bg-surface-hover rounded"
                              title="Disable"
                            >
                              <Pause className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleEnableTask(task.id)}
                              className="p-1.5 text-ink-secondary hover:text-profit rounded"
                              title="Enable"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1.5 text-loss hover:bg-loss-soft rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {search.trim() && filteredTasks.length === 0 && (
                <p className="p-4 text-center text-sm text-ink-tertiary">No tasks match the filter.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
