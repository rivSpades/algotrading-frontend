/**
 * Active Tasks Page Component
 * Displays currently executing tasks and task history
 * Uses WebSockets for real-time progress updates
 */

import { useState, useEffect, useRef } from 'react';
import { Play, Square, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { marketDataAPI } from '../data/api';
import { motion } from 'framer-motion';

export default function ActiveTasks() {
  const [activeTasks, setActiveTasks] = useState([]);
  const [taskHistory, setTaskHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const wsConnectionsRef = useRef({});

  useEffect(() => {
    loadActiveTasks();
    loadTaskHistory();

    // Poll active tasks periodically to get updates
    const interval = setInterval(() => {
      loadActiveTasks();
    }, 30000); // Poll every 5 seconds

    return () => {
      clearInterval(interval);
      // Close all WebSocket connections on unmount
      Object.values(wsConnectionsRef.current).forEach(disconnect => {
        if (disconnect) disconnect();
      });
    };
  }, []);

  const loadActiveTasks = async () => {
    try {
      const response = await marketDataAPI.getActiveTasks();
      if (response.success) {
        const newTasks = response.data.results || [];
        
        // Use functional update to avoid stale closure issues
        setActiveTasks(prevTasks => {
          const prevTaskIds = new Set(prevTasks.map(t => t.task_id));
          const newTaskIds = new Set(newTasks.map(t => t.task_id));
          
          // Remove tasks that are no longer active
          const remaining = prevTasks.filter(t => newTaskIds.has(t.task_id));
          
          // Add only truly new tasks (not already in state)
          const toAdd = newTasks.filter(t => !prevTaskIds.has(t.task_id));
          
          // Update existing tasks with latest data from API
          // Always use the latest data from API during polling
          const updated = remaining.map(existing => {
            const apiTask = newTasks.find(t => t.task_id === existing.task_id);
            if (apiTask) {
              // Use API data for progress, message, and status
              return {
                ...apiTask,
                progress: apiTask.progress !== undefined ? apiTask.progress : existing.progress,
                message: apiTask.message || existing.message,
                status: apiTask.status || existing.status
              };
            }
            return existing;
          });
          
          // Return merged list, ensuring no duplicates
          const merged = [...updated, ...toAdd];
          // Remove any duplicates by task_id (shouldn't happen, but safety check)
          const unique = Array.from(new Map(merged.map(t => [t.task_id, t])).values());
          return unique;
        });
        
      }
    } catch (error) {
      console.error('Error loading active tasks:', error);
    } finally {
      setLoading(false);
    }
  };


  const loadTaskHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await marketDataAPI.getTaskHistory(50);
      if (response.success) {
        setTaskHistory(response.data.results || []);
      }
    } catch (error) {
      console.error('Error loading task history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleStopTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to stop this task?')) {
      return;
    }
    try {
      const response = await marketDataAPI.stopTask(taskId);
      if (response.success) {
        // Remove from active tasks
        setActiveTasks(prevTasks => prevTasks.filter(t => t.task_id !== taskId));
        // Clean up WebSocket connection
        if (wsConnectionsRef.current[taskId]) {
          wsConnectionsRef.current[taskId]();
          delete wsConnectionsRef.current[taskId];
        }
        alert('Task stopped successfully');
        loadTaskHistory();
      } else {
        alert(`Failed to stop task: ${response.error}`);
      }
    } catch (error) {
      alert(`Failed to stop task: ${error.message}`);
    }
  };

  const formatTaskName = (name) => {
    if (!name || name === 'Unknown') return 'Unknown Task';
    // Extract readable name from task path
    const parts = name.split('.');
    return parts[parts.length - 1].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Active Tasks</h1>
          <p className="text-gray-600">Monitor and manage currently executing tasks</p>
        </div>
        <button
          onClick={() => {
            loadActiveTasks();
            loadTaskHistory();
          }}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh (Manual)
        </button>
      </div>

      {/* Active Tasks Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Play className="w-5 h-5 text-green-600" />
          Currently Running ({activeTasks.length})
        </h2>
        {loading && activeTasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">Loading active tasks...</p>
          </div>
        ) : activeTasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Play className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No active tasks</p>
            <p className="text-sm text-gray-400 mt-2">
              Tasks that are currently running will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeTasks.map((task) => (
              <ActiveTaskCard
                key={task.task_id}
                task={task}
                onStop={handleStopTask}
                formatTaskName={formatTaskName}
                formatTimestamp={formatTimestamp}
                onTaskComplete={(taskId) => {
                  setActiveTasks(prevTasks => prevTasks.filter(t => t.task_id !== taskId));
                  loadTaskHistory();
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Task History Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-600" />
          Task History
        </h2>
        {historyLoading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">Loading task history...</p>
          </div>
        ) : taskHistory.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No task history</p>
            <p className="text-sm text-gray-400 mt-2">
              Completed and failed tasks will appear here
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Message
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task ID
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {taskHistory.map((task) => (
                    <tr key={task.task_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatTaskName(task.name)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {task.success ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3" />
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <XCircle className="w-3 h-3" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 max-w-md truncate">
                          {task.message || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {formatTimestamp(task.timestamp)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs text-gray-500 font-mono">
                          {task.task_id.substring(0, 8)}...
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Active Task Card Component
 * Displays individual active task with polling updates
 */
function ActiveTaskCard({ task, onStop, formatTaskName, formatTimestamp, onTaskComplete }) {
  // Update local state when task prop changes (from polling)
  useEffect(() => {
    // Check if task completed or failed and notify parent
    if ((task.status === 'completed' || task.status === 'failed') && onTaskComplete) {
      setTimeout(() => {
        onTaskComplete(task.task_id);
      }, 2000);
    }
  }, [task.status, task.task_id, onTaskComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow p-6 border border-gray-200"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-gray-900">
              {formatTaskName(task.name)}
            </h3>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {task.status === 'RUNNING' ? 'Running' : task.status || 'Running'}
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-2">Task ID: {task.task_id}</p>
          {task.message && (
            <p className="text-sm text-gray-600 mb-2">{task.message}</p>
          )}
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${task.progress || 0}%` }}
                />
              </div>
              <span className="text-xs font-medium">{task.progress || 0}%</span>
            </div>
            {task.time_start && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Started: {formatTimestamp(task.time_start)}
              </span>
            )}
            {task.worker && (
              <span className="text-gray-500">Worker: {task.worker}</span>
            )}
          </div>
        </div>
        <button
          onClick={() => onStop(task.task_id)}
          className="ml-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
        >
          <Square className="w-4 h-4" />
          Stop
        </button>
      </div>
    </motion.div>
  );
}
