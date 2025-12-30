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
    
    // Handle Django REST Framework validation errors (format: {field: [error1, error2]})
    if (typeof errorData === 'object' && errorData !== null && !errorData.error && !errorData.message) {
      const validationErrors = [];
      for (const [field, errors] of Object.entries(errorData)) {
        if (Array.isArray(errors)) {
          validationErrors.push(`${field}: ${errors.join(', ')}`);
        } else if (typeof errors === 'string') {
          validationErrors.push(errors);
        }
      }
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join('; '));
      }
    }
    
    throw new Error(errorData.error || errorData.message || errorData.detail || `HTTP error! status: ${response.status}`);
  }
  
  // Handle empty responses (e.g., 204 No Content for DELETE requests)
  const contentType = response.headers.get('content-type');
  if (response.status === 204 || !contentType || !contentType.includes('application/json')) {
    // Return empty object for successful empty responses
    return {};
  }
  
  // Try to parse JSON, but handle empty body gracefully
  const text = await response.text();
  if (!text || text.trim() === '') {
    return {};
  }
  
  try {
    return JSON.parse(text);
  } catch (e) {
    // If parsing fails, return empty object
    return {};
  }
};

/**
 * Base API request function
 */
export const apiRequest = async (endpoint, options = {}) => {
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
   * Get all symbols with optional search, pagination, and filters
   */
  async getSymbols(search = '', page = 1, exchange = null, status = null) {
    let endpoint = '/symbols/';
    const params = new URLSearchParams();
    if (search) {
      params.append('search', search);
    }
    if (page > 1) {
      params.append('page', page);
    }
    if (exchange) {
      params.append('exchange', exchange);
    }
    if (status) {
      params.append('status', status);
    }
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }
    return apiRequest(endpoint);
  },

  /**
   * Get random symbols
   * @param {number} count - Number of random symbols to return
   * @param {string} status - Filter by status (default: 'active')
   * @param {string} exchange - Filter by exchange code (optional)
   * @param {number} brokerId - Filter by broker ID (optional)
   */
  async getRandomSymbols(count, status = 'active', exchange = null, brokerId = null) {
    let endpoint = '/symbols/random/';
    const params = new URLSearchParams();
    params.append('count', count);
    if (status) {
      params.append('status', status);
    }
    if (exchange) {
      params.append('exchange', exchange);
    }
    if (brokerId) {
      params.append('broker_id', brokerId);
    }
    endpoint += `?${params.toString()}`;
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
  async getOHLCVData(ticker, timeframe = 'daily', startDate = null, endDate = null, page = 1, pageSize = 50, backtestId = null, strategyId = null) {
    let endpoint = `/symbols/${encodeURIComponent(ticker)}/ohlcv/?timeframe=${timeframe}&page=${page}&page_size=${pageSize}`;
    if (startDate) endpoint += `&start_date=${startDate}`;
    if (endDate) endpoint += `&end_date=${endDate}`;
    if (backtestId) endpoint += `&backtest_id=${backtestId}`;
    if (strategyId) endpoint += `&strategy_id=${strategyId}`;
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

/**
 * Analytical Tools API
 */
export const analyticalToolsAPI = {
  /**
   * Get all available tools
   */
  async getTools(search = '') {
    let endpoint = '/tools/';
    if (search) {
      endpoint += `?search=${encodeURIComponent(search)}`;
    }
    return apiRequest(endpoint);
  },

  /**
   * Get tool by ID
   */
  async getTool(toolId) {
    return apiRequest(`/tools/${toolId}/`);
  },

  /**
   * Get all tool assignments
   */
  async getAssignments(symbolTicker = null) {
    let endpoint = '/assignments/';
    if (symbolTicker) {
      endpoint += `?symbol_ticker=${encodeURIComponent(symbolTicker)}`;
    }
    return apiRequest(endpoint);
  },

  /**
   * Get tool assignments for a specific symbol
   */
  async getSymbolAssignments(symbolTicker) {
    return apiRequest(`/assignments/symbol/${encodeURIComponent(symbolTicker)}/`);
  },

  /**
   * Create a tool assignment
   */
  async createAssignment(assignmentData) {
    return apiRequest('/assignments/', {
      method: 'POST',
      body: JSON.stringify(assignmentData),
    });
  },

  /**
   * Update tool assignment
   */
  async updateAssignment(assignmentId, assignmentData) {
    return apiRequest(`/assignments/${assignmentId}/`, {
      method: 'PATCH',
      body: JSON.stringify(assignmentData),
    });
  },

  /**
   * Delete tool assignment
   */
  async deleteAssignment(assignmentId) {
    return apiRequest(`/assignments/${assignmentId}/`, {
      method: 'DELETE',
    });
  },

  /**
   * Compute indicator for an assignment
   */
  async computeIndicator(assignmentId) {
    return apiRequest(`/assignments/${assignmentId}/compute/`, {
      method: 'POST',
    });
  },

  /**
   * Compute all enabled indicators for a symbol
   */
  async computeAllForSymbol(symbolTicker) {
    return apiRequest(`/assignments/symbol/${encodeURIComponent(symbolTicker)}/compute/`, {
      method: 'POST',
    });
  },

  /**
   * Get indicator values
   */
  async getIndicatorValues(assignmentId = null, symbolTicker = null, toolName = null) {
    let endpoint = '/values/';
    const params = new URLSearchParams();
    if (assignmentId) params.append('assignment_id', assignmentId);
    if (symbolTicker) params.append('symbol_ticker', symbolTicker);
    if (toolName) params.append('tool_name', toolName);
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }
    return apiRequest(endpoint);
  },

  /**
   * Get indicator values for a specific symbol and tool
   */
  async getSymbolToolValues(symbolTicker, toolName) {
    return apiRequest(`/values/symbol/${encodeURIComponent(symbolTicker)}/tool/${encodeURIComponent(toolName)}/`);
  },
};

