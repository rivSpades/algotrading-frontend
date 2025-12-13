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
          className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900">Schedule Task</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Task Name */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Name
              </label>
              <input
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="e.g., Daily Symbol Fetch"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Schedule Type */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Schedule Type
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => setScheduleType('interval')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                    scheduleType === 'interval'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Clock className="w-5 h-5 mx-auto mb-1" />
                  Interval
                </button>
                <button
                  onClick={() => setScheduleType('crontab')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                    scheduleType === 'crontab'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Every
                  </label>
                  <div className="flex gap-4">
                    <input
                      type="number"
                      min="1"
                      value={intervalEvery}
                      onChange={(e) => setIntervalEvery(parseInt(e.target.value) || 1)}
                      className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                    <select
                      value={intervalPeriod}
                      onChange={(e) => setIntervalPeriod(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minute (0-59)
                    </label>
                    <input
                      type="text"
                      value={cronMinute}
                      onChange={(e) => setCronMinute(e.target.value)}
                      placeholder="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hour (0-23)
                    </label>
                    <input
                      type="text"
                      value={cronHour}
                      onChange={(e) => setCronHour(e.target.value)}
                      placeholder="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Day of Week (0-6, * = all)
                    </label>
                    <input
                      type="text"
                      value={cronDayOfWeek}
                      onChange={(e) => setCronDayOfWeek(e.target.value)}
                      placeholder="*"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Day of Month (1-31, * = all)
                    </label>
                    <input
                      type="text"
                      value={cronDayOfMonth}
                      onChange={(e) => setCronDayOfMonth(e.target.value)}
                      placeholder="*"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Month of Year (1-12, * = all)
                    </label>
                    <input
                      type="text"
                      value={cronMonthOfYear}
                      onChange={(e) => setCronMonthOfYear(e.target.value)}
                      placeholder="*"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Use * for all values, numbers for specific values, or ranges like 0-5
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSchedule}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Schedule Task
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}








