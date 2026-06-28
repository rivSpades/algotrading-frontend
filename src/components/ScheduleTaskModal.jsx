/**
 * Schedule Task Modal Component
 * Modal for scheduling tasks with interval or crontab
 */

import { useState } from 'react';
import { X, Calendar, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ScheduleTaskModal({ isOpen, onClose, onSchedule, taskType, taskConfig }) {
  const [scheduleType, setScheduleType] = useState('interval'); // 'interval' or 'crontab'
  const [taskName, setTaskName] = useState('');
  
  // Interval schedule
  const [intervalEvery, setIntervalEvery] = useState(1);
  const [intervalPeriod, setIntervalPeriod] = useState('days'); // 'seconds', 'minutes', 'hours', 'days'
  
  // Crontab schedule
  const [cronMinute, setCronMinute] = useState('0');
  const [cronHour, setCronHour] = useState('0');
  const [cronDayOfWeek, setCronDayOfWeek] = useState('*');
  const [cronDayOfMonth, setCronDayOfMonth] = useState('*');
  const [cronMonthOfYear, setCronMonthOfYear] = useState('*');

  const handleSchedule = () => {
    if (!taskName.trim()) {
      alert('Please enter a task name');
      return;
    }

    const schedule = scheduleType === 'interval' 
      ? {
          every: intervalEvery,
          period: intervalPeriod
        }
      : {
          minute: cronMinute,
          hour: cronHour,
          day_of_week: cronDayOfWeek,
          day_of_month: cronDayOfMonth,
          month_of_year: cronMonthOfYear,
          timezone: 'UTC'
        };

    onSchedule({
      name: taskName,
      schedule_type: scheduleType,
      schedule: schedule,
      ...taskConfig
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-surface rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-bold text-ink">Schedule Task</h2>
            <button
              onClick={onClose}
              className="text-ink-tertiary hover:text-ink-secondary transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Task Name */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-ink-secondary mb-2">
                Task Name
              </label>
              <input
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="e.g., Daily Symbol Fetch"
                className="w-full px-4 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>

            {/* Schedule Type */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-ink-secondary mb-2">
                Schedule Type
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => setScheduleType('interval')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                    scheduleType === 'interval'
                      ? 'border-accent bg-accent-soft text-accent-ink'
                      : 'border-border-strong bg-surface text-ink-secondary hover:bg-bg'
                  }`}
                >
                  <Clock className="w-5 h-5 mx-auto mb-1" />
                  Interval
                </button>
                <button
                  onClick={() => setScheduleType('crontab')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                    scheduleType === 'crontab'
                      ? 'border-accent bg-accent-soft text-accent-ink'
                      : 'border-border-strong bg-surface text-ink-secondary hover:bg-bg'
                  }`}
                >
                  <Calendar className="w-5 h-5 mx-auto mb-1" />
                  Cron Expression
                </button>
              </div>
            </div>

            {/* Interval Schedule */}
            {scheduleType === 'interval' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-2">
                    Every
                  </label>
                  <div className="flex gap-4">
                    <input
                      type="number"
                      min="1"
                      value={intervalEvery}
                      onChange={(e) => setIntervalEvery(parseInt(e.target.value) || 1)}
                      className="w-24 px-4 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent"
                    />
                    <select
                      value={intervalPeriod}
                      onChange={(e) => setIntervalPeriod(e.target.value)}
                      className="flex-1 px-4 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent"
                    >
                      <option value="seconds">Seconds</option>
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Crontab Schedule */}
            {scheduleType === 'crontab' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-secondary mb-2">
                      Minute (0-59)
                    </label>
                    <input
                      type="text"
                      value={cronMinute}
                      onChange={(e) => setCronMinute(e.target.value)}
                      placeholder="0"
                      className="w-full px-4 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-secondary mb-2">
                      Hour (0-23)
                    </label>
                    <input
                      type="text"
                      value={cronHour}
                      onChange={(e) => setCronHour(e.target.value)}
                      placeholder="0"
                      className="w-full px-4 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-secondary mb-2">
                      Day of Week (0-6, * = all)
                    </label>
                    <input
                      type="text"
                      value={cronDayOfWeek}
                      onChange={(e) => setCronDayOfWeek(e.target.value)}
                      placeholder="*"
                      className="w-full px-4 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-secondary mb-2">
                      Day of Month (1-31, * = all)
                    </label>
                    <input
                      type="text"
                      value={cronDayOfMonth}
                      onChange={(e) => setCronDayOfMonth(e.target.value)}
                      placeholder="*"
                      className="w-full px-4 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-ink-secondary mb-2">
                      Month of Year (1-12, * = all)
                    </label>
                    <input
                      type="text"
                      value={cronMonthOfYear}
                      onChange={(e) => setCronMonthOfYear(e.target.value)}
                      placeholder="*"
                      className="w-full px-4 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>
                <p className="text-xs text-ink-tertiary">
                  Use * for all values, numbers for specific values, or ranges like 0-5
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-ink-secondary bg-surface-sunken rounded-lg hover:bg-surface-sunken transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSchedule}
              className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
            >
              Schedule Task
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}















