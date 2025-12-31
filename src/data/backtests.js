/**
 * Data layer for Backtest Engine API
 */

import { apiRequest } from './api';

export const backtestsAPI = {
  /**
   * Get all backtests (with pagination and optional strategy filter)
   */
  async getBacktests(page = 1, strategyId = null) {
    let url = `/backtests/?page=${page}`;
    if (strategyId) {
      url += `&strategy=${strategyId}`;
    }
    return apiRequest(url);
  },

  /**
   * Delete a backtest
   */
  async deleteBacktest(backtestId) {
    return apiRequest(`/backtests/${backtestId}/`, {
      method: 'DELETE',
    });
  },

  /**
   * Get a specific backtest by ID
   */
  async getBacktest(id) {
    return apiRequest(`/backtests/${id}/`);
  },

  /**
   * Create a new backtest
   */
  async createBacktest(backtestData) {
    return apiRequest('/backtests/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backtestData),
    });
  },

  /**
   * Get trades for a backtest (with pagination and filtering)
   * @param {number} backtestId - Backtest ID
   * @param {number} page - Page number (default: 1)
   * @param {number} pageSize - Page size (default: 20)
   * @param {string} symbol - Optional: Filter by symbol ticker
   * @param {string} mode - Optional: Filter by mode ('all', 'long', 'short')
   */
  async getBacktestTrades(backtestId, page = 1, pageSize = 20, symbol = null, mode = 'all') {
    let url = `/backtests/${backtestId}/trades/?page=${page}&page_size=${pageSize}`;
    if (symbol) {
      url += `&symbol=${encodeURIComponent(symbol)}`;
    }
    // Always pass mode parameter to ensure correct filtering by position_mode
    // This ensures each mode (ALL/LONG/SHORT) has its own independent bankroll
    if (mode) {
      url += `&mode=${encodeURIComponent(mode)}`;
    }
    return apiRequest(url);
  },

  /**
   * Get all trades for a backtest (without pagination)
   * @param {number} backtestId - Backtest ID
   * @param {string} symbol - Optional: Filter by symbol ticker
   * @param {string} mode - Optional: Filter by mode ('all', 'long', 'short')
   */
  async getAllBacktestTrades(backtestId, symbol = null, mode = null) {
    let url = `/backtests/${backtestId}/trades/?no_pagination=true`;
    if (symbol) {
      url += `&symbol=${encodeURIComponent(symbol)}`;
    }
    // Pass mode parameter to ensure correct independent_bet_amount injection for individual symbol views
    if (mode) {
      url += `&mode=${encodeURIComponent(mode)}`;
    }
    return apiRequest(url);
  },

  /**
   * Get statistics for a backtest
   */
  async getBacktestStatistics(backtestId) {
    return apiRequest(`/backtests/${backtestId}/statistics/`);
  },

  /**
   * Get optimized statistics for a backtest (organized by mode: ALL/LONG/SHORT)
   */
  async getBacktestStatisticsOptimized(backtestId) {
    return apiRequest(`/backtests/${backtestId}/statistics/optimized/`);
  },

  /**
   * Get paginated list of symbols for a backtest (with search support)
   */
  async getBacktestSymbols(backtestId, page = 1, pageSize = 20, search = '') {
    let url = `/backtests/${backtestId}/symbol-list/?page=${page}&page_size=${pageSize}`;
    // Trim search term and only add if not empty
    const trimmedSearch = search ? search.trim() : '';
    if (trimmedSearch) {
      url += `&search=${encodeURIComponent(trimmedSearch)}`;
    }
    return apiRequest(url);
  },

  /**
   * Get statistics for a specific symbol in a backtest
   */
  async getBacktestSymbolStatistics(backtestId, symbolTicker) {
    return apiRequest(`/backtests/${backtestId}/symbol/${symbolTicker}/`);
  },
};

/**
 * Get all backtests (with pagination and optional strategy filter)
 */
export async function getBacktests(page = 1, strategyId = null) {
  try {
    const response = await backtestsAPI.getBacktests(page, strategyId);
    if (response.success && response.data) {
      // Return paginated response (with count, next, previous, results)
      return response.data;
    }
    return { results: [], count: 0, next: null, previous: null };
  } catch (error) {
    console.error('Error fetching backtests:', error);
    throw error;
  }
}

/**
 * Delete a backtest
 */
export async function deleteBacktest(backtestId) {
  try {
    const response = await backtestsAPI.deleteBacktest(backtestId);
    if (response.success) {
      return true;
    }
    throw new Error(response.error || 'Failed to delete backtest');
  } catch (error) {
    console.error('Error deleting backtest:', error);
    throw error;
  }
}

/**
 * Get a specific backtest
 */
export async function getBacktest(id) {
  try {
    const response = await backtestsAPI.getBacktest(id);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error('Backtest not found');
  } catch (error) {
    console.error('Error fetching backtest:', error);
    throw error;
  }
}

/**
 * Create a new backtest
 */
export async function createBacktest(backtestData) {
  try {
    const response = await backtestsAPI.createBacktest(backtestData);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to create backtest');
  } catch (error) {
    console.error('Error creating backtest:', error);
    throw error;
  }
}

/**
 * Get trades for a backtest (with pagination and filtering)
 * @param {number} backtestId - Backtest ID
 * @param {number} page - Page number (default: 1)
 * @param {number} pageSize - Page size (default: 20)
 * @param {string} symbol - Optional: Filter by symbol ticker
 * @param {string} mode - Optional: Filter by mode ('all', 'long', 'short')
 */
export async function getBacktestTrades(backtestId, page = 1, pageSize = 20, symbol = null, mode = 'all') {
  try {
    const response = await backtestsAPI.getBacktestTrades(backtestId, page, pageSize, symbol, mode);
    if (response.success && response.data) {
      // Return paginated response (with count, next, previous, results)
      return response.data;
    }
    return { results: [], count: 0, next: null, previous: null };
  } catch (error) {
    console.error('Error fetching backtest trades:', error);
    throw error;
  }
}

/**
 * Get all trades for a backtest (without pagination)
 * @param {number} backtestId - Backtest ID
 * @param {string} symbol - Optional: Filter by symbol ticker
 * @param {string} mode - Optional: Filter by mode ('all', 'long', 'short')
 */
export async function getAllBacktestTrades(backtestId, symbol = null, mode = null) {
  try {
    const response = await backtestsAPI.getAllBacktestTrades(backtestId, symbol, mode);
    if (response.success && response.data) {
      // Return array of trades directly
      return Array.isArray(response.data) ? response.data : [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching all backtest trades:', error);
    throw error;
  }
}

/**
 * Get statistics for a backtest
 */
export async function getBacktestStatistics(backtestId) {
  try {
    const response = await backtestsAPI.getBacktestStatistics(backtestId);
    console.log('getBacktestStatistics response:', response);
    if (response.success && response.data) {
      // Handle both array and paginated responses
      return Array.isArray(response.data) ? response.data : (response.data.results || response.data);
    }
    return [];
  } catch (error) {
    console.error('Error fetching backtest statistics:', error);
    throw error;
  }
}

/**
 * Get optimized statistics for a backtest (organized by mode: ALL/LONG/SHORT)
 */
export async function getBacktestStatisticsOptimized(backtestId) {
  try {
    const response = await backtestsAPI.getBacktestStatisticsOptimized(backtestId);
    if (response.success && response.data) {
      return response.data;
    }
    return { portfolio: null, symbols: [] };
  } catch (error) {
    console.error('Error fetching optimized backtest statistics:', error);
    throw error;
  }
}

/**
 * Get paginated list of symbols for a backtest (with search support)
 */
export async function getBacktestSymbols(backtestId, page = 1, pageSize = 20, search = '') {
  try {
    const trimmedSearch = search ? search.trim() : '';
    const response = await backtestsAPI.getBacktestSymbols(backtestId, page, pageSize, trimmedSearch);
    
    if (!response) {
      return { results: [], count: 0, next: null, previous: null };
    }
    
    if (response.success && response.data) {
      // DRF paginated response format: { results: [], count: X, next: url, previous: url }
      if (response.data.results && Array.isArray(response.data.results)) {
        return response.data;
      }
      // If it's an array, wrap it
      if (Array.isArray(response.data)) {
        // Check if array contains tickers (strings) or symbol objects
        if (response.data.length > 0 && typeof response.data[0] === 'string') {
          // Convert tickers to minimal symbol objects
          return { 
            results: response.data.map(ticker => ({ ticker, exchange: '', status: 'active' })), 
            count: response.data.length, 
            next: null, 
            previous: null 
          };
        }
        return { results: response.data, count: response.data.length, next: null, previous: null };
      }
      // Fallback
      return response.data;
    }
    
    return { results: [], count: 0, next: null, previous: null };
  } catch (error) {
    return { results: [], count: 0, next: null, previous: null };
  }
}

