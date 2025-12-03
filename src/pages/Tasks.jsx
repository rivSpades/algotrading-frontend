/**
 * Tasks Page Component
 * Schedule and manage background tasks
 */

import { useState, useEffect } from 'react';
import { Calendar, Clock, Repeat, Download, X, Play, Pause, Trash2 } from 'lucide-react';
import FetchSymbolsModal from '../components/FetchSymbolsModal';
import ScheduleTaskModal from '../components/ScheduleTaskModal';
import TaskProgress from '../components/TaskProgress';
import { marketDataAPI } from '../data/api';
import { motion } from 'framer-motion';

export default function Tasks() {
  const [showFetchModal, setShowFetchModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [taskId, setTaskId] = useState(null);
  const [showProgress, setShowProgress] = useState(false);
  const [scheduledTasks, setScheduledTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scheduleTaskConfig, setScheduleTaskConfig] = useState(null);

  const handleFetchSymbols = async (exchangeCodes, fetchAll) => {
    try {
      const response = await marketDataAPI.fetchSymbols(exchangeCodes, fetchAll);
      if (response.success) {
        setTaskId(response.data.task_id);
        setShowProgress(true);
      }
    } catch (error) {
      alert(`Failed to start symbol fetch: ${error.message}`);
    }
  };

  const handleTaskComplete = (data) => {
    setShowProgress(false);
    setTaskId(null);
    // Optionally add to scheduled tasks history
    if (data.status === 'completed') {
      // Could refresh task list here
    }
  };

  const handleTaskClose = () => {
    setShowProgress(false);
    setTaskId(null);
  };

  useEffect(() => {
    loadScheduledTasks();
  }, []);

  const loadScheduledTasks = async () => {
    setLoading(true);
    try {
      const response = await marketDataAPI.getScheduledTasks();
      if (response.success) {
        setScheduledTasks(response.data.results || []);
      }
    } catch (error) {
      console.error('Error loading scheduled tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleTask = async (taskType, config = {}) => {
    if (taskType === 'fetch_symbols') {
      // Open fetch modal first to get exchange selection
      setScheduleTaskConfig({ taskType, ...config });
      setShowFetchModal(true);
    } else {
      setScheduleTaskConfig({ taskType, ...config });
      setShowScheduleModal(true);
    }
  };

  const handleFetchAndSchedule = (exchangeCodes, fetchAll) => {
    setShowFetchModal(false);
    setScheduleTaskConfig(prev => ({
      ...prev,
      exchange_codes: exchangeCodes,
      fetch_all: fetchAll
    }));
    // Small delay to ensure modal closes before opening new one
    setTimeout(() => {
      setShowScheduleModal(true);
    }, 100);
  };

  const handleCreateSchedule = async (scheduleData) => {
    try {
      const response = await marketDataAPI.createScheduledTask(scheduleData);
      if (response.success) {
        await loadScheduledTasks();
        alert('Task scheduled successfully!');
      }
    } catch (error) {
      alert(`Failed to schedule task: ${error.message}`);
    }
  };

  const handleEnableTask = async (taskId) => {
    try {
      const response = await marketDataAPI.enableScheduledTask(taskId);
      if (response.success) {
        await loadScheduledTasks();
      }
    } catch (error) {
      alert(`Failed to enable task: ${error.message}`);
    }
  };

  const handleDisableTask = async (taskId) => {
    try {
      const response = await marketDataAPI.disableScheduledTask(taskId);
      if (response.success) {
        await loadScheduledTasks();
      }
    } catch (error) {
      alert(`Failed to disable task: ${error.message}`);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this scheduled task?')) {
      return;
    }
    try {
      const response = await marketDataAPI.deleteScheduledTask(taskId);
      if (response.success) {
        await loadScheduledTasks();
      }
    } catch (error) {
      alert(`Failed to delete task: ${error.message}`);
    }
  };

  const formatSchedule = (task) => {
    if (task.interval) {
      return `Every ${task.interval.every} ${task.interval.period}`;
    } else if (task.crontab) {
      const c = task.crontab;
      return `${c.minute} ${c.hour} ${c.day_of_week} ${c.day_of_month} ${c.month_of_year}`;
    }
    return 'No schedule';
  };

  return (
    <>
      {/* Task Progress Overlay */}
      {showProgress && taskId && (
        <TaskProgress
          taskId={taskId}
          onComplete={handleTaskComplete}
          onClose={handleTaskClose}
        />
      )}

      {/* Fetch Symbols Modal */}
      <FetchSymbolsModal
        isOpen={showFetchModal}
        onClose={() => {
          setShowFetchModal(false);
          if (scheduleTaskConfig) {
            // If we were scheduling, open schedule modal
            setShowScheduleModal(true);
          }
        }}
        onFetch={scheduleTaskConfig ? handleFetchAndSchedule : handleFetchSymbols}
      />

      {/* Schedule Task Modal */}
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Task Scheduler</h1>
          <p className="text-gray-600">Schedule and manage background tasks</p>
        </div>

        {/* Available Tasks */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Tasks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Fetch Symbols Task */}
            <motion.div
              whileHover={{ y: -4 }}
              className="bg-white rounded-lg shadow-md p-6 border border-gray-200"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-primary-100 rounded-lg">
                  <Download className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Fetch Symbols</h3>
                  <p className="text-sm text-gray-500">Import symbols from EOD API</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Fetch trading symbols from one or more exchanges using the EOD Historical Data API.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFetchModal(true)}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                >
                  Run Now
                </button>
                <button
                  onClick={() => handleScheduleTask('fetch_symbols', {})}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Schedule
                </button>
              </div>
            </motion.div>

            {/* Placeholder for future tasks */}
            <motion.div
              whileHover={{ y: -4 }}
              className="bg-white rounded-lg shadow-md p-6 border border-gray-200 opacity-50"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gray-100 rounded-lg">
                  <Clock className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Update Symbol Data</h3>
                  <p className="text-sm text-gray-500">Coming soon</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scheduled Tasks */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Scheduled Tasks</h2>
          {loading ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">Loading scheduled tasks...</p>
            </div>
          ) : scheduledTasks.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No scheduled tasks</p>
              <p className="text-sm text-gray-400 mt-2">
                Schedule tasks to run automatically at specified intervals
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {scheduledTasks.map((task) => (
                <div key={task.id} className="bg-white rounded-lg shadow p-6 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{task.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          task.enabled 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {task.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">{task.task}</p>
                      {task.description && (
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Repeat className="w-4 h-4" />
                          {formatSchedule(task)}
                        </span>
                        {task.last_run_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Last run: {new Date(task.last_run_at).toLocaleString()}
                          </span>
                        )}
                        {task.total_run_count !== undefined && (
                          <span className="text-gray-500">
                            Runs: {task.total_run_count}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {task.enabled ? (
                        <button
                          onClick={() => handleDisableTask(task.id)}
                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Disable"
                        >
                          <Pause className="w-5 h-5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEnableTask(task.id)}
                          className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Enable"
                        >
                          <Play className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

