/**
 * Task Progress Component
 * Displays real-time task progress with WebSocket updates and polling fallback
 */

import { useEffect, useState, useRef } from 'react';
import { X, CheckCircle, XCircle, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocket } from '../hooks/useWebSocket';
import { marketDataAPI } from '../data/api';

export default function TaskProgress({ taskId, onComplete, onClose }) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('pending');
  const [message, setMessage] = useState('Initializing task...');
  const [isVisible, setIsVisible] = useState(true);
  const pollingIntervalRef = useRef(null);

  const updateProgress = (data) => {
    if (data.progress !== undefined) {
      setProgress(data.progress);
    }
    if (data.status) {
      setStatus(data.status);
    }
    if (data.message) {
      setMessage(data.message);
    }

    // Check for completed/finished statuses
    const isCompleted = data.status === 'completed' || data.status === 'success';
    const isFailed = data.status === 'failed' || data.status === 'error';
    
    if (isCompleted || isFailed) {
      // Stop polling if task is done
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      if (isCompleted && onComplete) {
        // Use result data if available, otherwise use the data object
        const resultData = data.result || data;
        setTimeout(() => {
          onComplete(resultData);
        }, 1000);
      }
    }
  };

  const handleMessage = (data) => {
    updateProgress(data);
  };

  const handleError = (error) => {
    // Don't set status to error - just log it
    // The task might still be running
    console.error('WebSocket error:', error);
  };

  const { isConnected, connectionError } = useWebSocket(taskId, handleMessage, handleError);

  // Polling fallback when WebSocket is not connected
  useEffect(() => {
    if (!taskId) return;

    // If WebSocket is not connected after 3 seconds, start polling
    const startPollingTimeout = setTimeout(() => {
      if (!isConnected && !pollingIntervalRef.current) {
        console.log('WebSocket not connected, starting polling fallback');
        
        const pollTaskStatus = async () => {
          try {
            const response = await marketDataAPI.getTaskStatus(taskId);
            if (response.success && response.data) {
              const taskData = response.data;
              updateProgress({
                progress: taskData.progress || 0,
                status: taskData.status || 'pending',
                message: taskData.message || 'Processing...',
              });
            }
          } catch (error) {
            console.error('Error polling task status:', error);
          }
        };

        // Poll immediately, then every 2 seconds
        pollTaskStatus();
        pollingIntervalRef.current = setInterval(pollTaskStatus, 2000);
      }
    }, 3000);

    // Also stop polling if WebSocket connects
    if (isConnected && pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    return () => {
      clearTimeout(startPollingTimeout);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [taskId, isConnected]);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) {
      setTimeout(() => onClose(), 300);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Loader className="w-5 h-5 text-primary-600 animate-spin" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
      case 'success':
        return 'bg-green-500';
      case 'failed':
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-primary-600';
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-[320px] max-w-md"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <h3 className="font-semibold text-gray-900">Task Progress</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-2">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600">{message}</span>
            <span className="text-gray-600 font-medium">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <motion.div
              className={`h-full ${getStatusColor()}`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {!isConnected && status !== 'completed' && status !== 'success' && status !== 'failed' && (
          <div className="text-xs text-amber-600 mt-2">
            {connectionError ? 'Using polling fallback' : 'Connecting...'}
          </div>
        )}

        {(status === 'completed' || status === 'success') && (
          <div className="text-sm text-green-600 mt-2 font-medium">
            Task completed successfully!
          </div>
        )}

        {(status === 'failed' || status === 'error') && (
          <div className="text-sm text-red-600 mt-2 font-medium">
            Task failed. Please try again.
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

