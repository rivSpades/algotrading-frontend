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
   * Get trades for a backtest (with pagination)
   */
  async getBacktestTrades(backtestId, page = 1, pageSize = 20) {
    return apiRequest(`/backtests/${backtestId}/trades/?page=${page}&page_size=${pageSize}`);
  },

  /**
   * Get all trades for a backtest (without pagination)
   */
  async getAllBacktestTrades(backtestId) {
    return apiRequest(`/backtests/${backtestId}/trades/?no_pagination=true`);
  },

  /**
   * Get statistics for a backtest
   */
  async getBacktestStatistics(backtestId) {
    return apiRequest(`/backtests/${backtestId}/statistics/`);
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
 * Get trades for a backtest (with pagination)
 */
export async function getBacktestTrades(backtestId, page = 1, pageSize = 20) {
  try {
    const response = await backtestsAPI.getBacktestTrades(backtestId, page, pageSize);
    console.log('getBacktestTrades response:', response);
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
 */
export async function getAllBacktestTrades(backtestId) {
  try {
    const response = await backtestsAPI.getAllBacktestTrades(backtestId);
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

