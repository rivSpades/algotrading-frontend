/**
 * Centralized API Service
 * Handles all API communication with the Django backend
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

/**
 * API Response wrapper class
 */
export class APIResponse {
  constructor(success, data, error = null) {
    this.success = success;
    this.data = data;
    this.error = error;
  }

  static success(data) {
    return new APIResponse(true, data);
  }

  static error(error) {
    return new APIResponse(false, null, error);
  }
}

/**
 * Get authentication headers
 */
const getAuthHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  // Add token if available (for future auth)
  const token = localStorage.getItem('auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

/**
 * Handle API response
 */
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

/**
 * Base API request function
 */
const apiRequest = async (endpoint, options = {}) => {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
    };

    const response = await fetch(url, config);
    const data = await handleResponse(response);
    return APIResponse.success(data);
  } catch (error) {
    console.error('API Error:', error);
    return APIResponse.error(error.message || 'An unexpected error occurred');
  }
};

/**
 * Market Data API
 */
export const marketDataAPI = {
  /**
   * Get all symbols with optional search and pagination
   */
  async getSymbols(search = '', page = 1) {
    let endpoint = '/symbols/';
    const params = new URLSearchParams();
    if (search) {
      params.append('search', search);
    }
    if (page > 1) {
      params.append('page', page);
    }
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }
    return apiRequest(endpoint);
  },

  /**
   * Get symbol by ticker
   */
  async getSymbol(ticker) {
    return apiRequest(`/symbols/${encodeURIComponent(ticker)}/`);
  },

  /**
   * Create a new symbol
   */
  async createSymbol(symbolData) {
    return apiRequest('/symbols/', {
      method: 'POST',
      body: JSON.stringify(symbolData),
    });
  },

  /**
   * Update symbol
   */
  async updateSymbol(ticker, symbolData) {
    return apiRequest(`/symbols/${encodeURIComponent(ticker)}/`, {
      method: 'PATCH',
      body: JSON.stringify(symbolData),
    });
  },

  /**
   * Delete symbol
   */
  async deleteSymbol(ticker) {
    return apiRequest(`/symbols/${encodeURIComponent(ticker)}/`, {
      method: 'DELETE',
    });
  },

  /**
   * Delete all symbols and related data
   */
  async deleteAllSymbols() {
    return apiRequest('/symbols/delete_all/', {
      method: 'DELETE',
    });
  },

  /**
   * Get OHLCV data for a symbol with pagination
   */
  async getOHLCVData(ticker, timeframe = 'daily', startDate = null, endDate = null, page = 1, pageSize = 50) {
    let endpoint = `/symbols/${encodeURIComponent(ticker)}/ohlcv/?timeframe=${timeframe}&page=${page}&page_size=${pageSize}`;
    if (startDate) endpoint += `&start_date=${startDate}`;
    if (endDate) endpoint += `&end_date=${endDate}`;
    return apiRequest(endpoint);
  },

  /**
   * Fetch OHLCV data (single symbol, multiple symbols, or by exchange)
   */
  async fetchOHLCVData(data) {
    return apiRequest('/symbols/fetch-ohlcv/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update OHLCV data for a symbol
   */
  async updateSymbolOHLCV(ticker, data = {}) {
    return apiRequest(`/symbols/${encodeURIComponent(ticker)}/update-data/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Refetch all OHLCV data for a symbol (replaces existing)
   */
  async refetchSymbolOHLCV(ticker, data = {}) {
    return apiRequest(`/symbols/${encodeURIComponent(ticker)}/refetch-data/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete OHLCV data (single symbol, multiple symbols, or by exchange)
   */
  async deleteOHLCVData(data) {
    return apiRequest('/symbols/delete-ohlcv/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get exchanges
   */
  async getExchanges() {
    return apiRequest('/exchanges/');
  },

  /**
   * Get providers
   */
  async getProviders() {
    return apiRequest('/providers/');
  },

  /**
   * Get available exchanges from EOD API
   */
  async getAvailableExchanges() {
    return apiRequest('/symbols/available_exchanges/');
  },

  /**
   * Fetch symbols from exchanges
   */
  async fetchSymbols(exchangeCodes = [], fetchAll = false) {
    return apiRequest('/symbols/fetch_symbols/', {
      method: 'POST',
      body: JSON.stringify({
        exchange_codes: exchangeCodes,
        fetch_all: fetchAll,
      }),
    });
  },

  /**
   * Get scheduled tasks
   */
  async getScheduledTasks() {
    return apiRequest('/scheduled-tasks/');
  },

  /**
   * Get scheduled task by ID
   */
  async getScheduledTask(taskId) {
    return apiRequest(`/scheduled-tasks/${taskId}/`);
  },

  /**
   * Create scheduled task
   */
  async createScheduledTask(taskData) {
    return apiRequest('/scheduled-tasks/create-fetch-symbols-task/', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  },

  /**
   * Update scheduled task
   */
  async updateScheduledTask(taskId, taskData) {
    return apiRequest(`/scheduled-tasks/${taskId}/`, {
      method: 'PATCH',
      body: JSON.stringify(taskData),
    });
  },

  /**
   * Delete scheduled task
   */
  async deleteScheduledTask(taskId) {
    return apiRequest(`/scheduled-tasks/${taskId}/`, {
      method: 'DELETE',
    });
  },

  /**
   * Enable scheduled task
   */
  async enableScheduledTask(taskId) {
    return apiRequest(`/scheduled-tasks/${taskId}/enable/`, {
      method: 'POST',
    });
  },

  /**
   * Disable scheduled task
   */
  async disableScheduledTask(taskId) {
    return apiRequest(`/scheduled-tasks/${taskId}/disable/`, {
      method: 'POST',
    });
  },

  /**
   * Get active/running tasks
   */
  async getActiveTasks() {
    return apiRequest('/tasks/active/');
  },

  /**
   * Stop/revoke a running task
   */
  async stopTask(taskId) {
    return apiRequest(`/tasks/${taskId}/stop/`, {
      method: 'POST',
    });
  },

  /**
   * Get task execution history
   */
  async getTaskHistory(limit = 50) {
    return apiRequest(`/tasks/history/?limit=${limit}`);
  },

  /**
   * Get status of a specific task
   */
  async getTaskStatus(taskId) {
    return apiRequest(`/tasks/${taskId}/status/`);
  },
};

