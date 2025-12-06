/**
 * Symbols Data Layer
 * Page-specific data functions for symbol management
 */

import { marketDataAPI } from './api';

/**
 * Get symbols list with search, pagination, and filters
 */
export async function getSymbols(search = '', page = 1, exchange = null, status = null) {
  try {
    const response = await marketDataAPI.getSymbols(search, page, exchange, status);
    if (response.success) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to fetch symbols');
  } catch (error) {
    console.error('Error fetching symbols:', error);
    return { results: [], count: 0, next: null, previous: null };
  }
}

/**
 * Get symbol details by ticker
 */
export async function getSymbolDetails(ticker) {
  try {
    const response = await marketDataAPI.getSymbol(ticker);
    if (response.success) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to fetch symbol details');
  } catch (error) {
    console.error('Error fetching symbol details:', error);
    return null;
  }
}

/**
 * Get OHLCV data for symbol with pagination
 */
export async function getSymbolOHLCV(ticker, timeframe = 'daily', startDate = null, endDate = null, page = 1, pageSize = 50) {
  try {
    const response = await marketDataAPI.getOHLCVData(ticker, timeframe, startDate, endDate, page, pageSize);
    if (response.success) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to fetch OHLCV data');
  } catch (error) {
    console.error('Error fetching OHLCV data:', error);
    return { results: [], count: 0, page: 1, page_size: pageSize, next: null, previous: null };
  }
}

/**
 * Fetch OHLCV data (single, multiple, or by exchange)
 */
export async function fetchOHLCVData(data) {
  try {
    const response = await marketDataAPI.fetchOHLCVData(data);
    if (response.success) {
      return {
        taskId: response.data.task_id,
        message: response.data.message,
      };
    }
    throw new Error(response.error || 'Failed to fetch OHLCV data');
  } catch (error) {
    console.error('Error triggering OHLCV data fetch:', error);
    throw error;
  }
}

/**
 * Update OHLCV data for a symbol
 */
export async function updateSymbolOHLCV(ticker, data = {}) {
  try {
    const response = await marketDataAPI.updateSymbolOHLCV(ticker, data);
    if (response.success) {
      return {
        taskId: response.data.task_id,
        symbol: response.data.symbol,
        message: response.data.message,
      };
    }
    throw new Error(response.error || 'Failed to update OHLCV data');
  } catch (error) {
    console.error('Error updating OHLCV data:', error);
    throw error;
  }
}

/**
 * Refetch all OHLCV data for a symbol
 */
export async function refetchSymbolOHLCV(ticker, data = {}) {
  try {
    const response = await marketDataAPI.refetchSymbolOHLCV(ticker, data);
    if (response.success) {
      return {
        taskId: response.data.task_id,
        symbol: response.data.symbol,
        message: response.data.message,
      };
    }
    throw new Error(response.error || 'Failed to refetch OHLCV data');
  } catch (error) {
    console.error('Error refetching OHLCV data:', error);
    throw error;
  }
}

/**
 * Trigger symbol data update
 * Returns task_id for WebSocket monitoring
 */
export async function updateSymbolData(ticker) {
  try {
    const response = await marketDataAPI.updateSymbolData(ticker);
    if (response.success) {
      return {
        taskId: response.data.task_id,
        symbol: response.data.symbol,
        message: response.data.message,
      };
    }
    throw new Error(response.error || 'Failed to trigger symbol update');
  } catch (error) {
    console.error('Error triggering symbol update:', error);
    throw error;
  }
}

/**
 * Delete symbol
 */
export async function deleteSymbol(ticker) {
  try {
    const response = await marketDataAPI.deleteSymbol(ticker);
    if (response.success) {
      return true;
    }
    throw new Error(response.error || 'Failed to delete symbol');
  } catch (error) {
    console.error('Error deleting symbol:', error);
    throw error;
  }
}

