/**
 * Data layer for Strategies API
 */

import { apiRequest } from './api';

export const strategiesAPI = {
  /**
   * Get all strategy definitions
   */
  async getStrategies() {
    return apiRequest('/strategies/');
  },

  /**
   * Get a specific strategy by ID
   */
  async getStrategy(id) {
    return apiRequest(`/strategies/${id}/`);
  },

  /**
   * Get all strategy assignments
   */
  async getAssignments(symbolTicker = null) {
    let endpoint = '/assignments/';
    if (symbolTicker) {
      endpoint = `/assignments/symbol/${symbolTicker}/`;
    }
    return apiRequest(endpoint);
  },

  /**
   * Create a new strategy assignment
   */
  async createAssignment(assignmentData) {
    return apiRequest('/assignments/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assignmentData),
    });
  },

  /**
   * Update a strategy assignment
   */
  async updateAssignment(id, assignmentData) {
    return apiRequest(`/assignments/${id}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assignmentData),
    });
  },

  /**
   * Delete a strategy assignment
   */
  async deleteAssignment(id) {
    return apiRequest(`/assignments/${id}/`, {
      method: 'DELETE',
    });
  },

  /** Stored single-symbol runs for a strategy + ticker */
  async getStrategySymbolSnapshot(strategyId, ticker) {
    return apiRequest(`/strategies/${strategyId}/symbol-runs/${encodeURIComponent(ticker)}/`);
  },

  /** Queue a single-symbol run */
  async runStrategySymbolBacktest(strategyId, ticker, body) {
    return apiRequest(`/strategies/${strategyId}/symbol-runs/${encodeURIComponent(ticker)}/run/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  /** Re-queue an existing single-symbol run (same DB row; clears trades/stats then runs). */
  async recalculateStrategySymbolRun(strategyId, ticker, runId) {
    return apiRequest(
      `/strategies/${strategyId}/symbol-runs/${encodeURIComponent(ticker)}/recalculate/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_id: runId }),
      },
    );
  },

  /** Queue multiple single-symbol runs (bulk) */
  async runStrategySymbolBacktestBulk(strategyId, body) {
    return apiRequest(`/strategies/${strategyId}/symbol-runs/run-bulk/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  /** Tickers that have stored single-symbol runs for this strategy */
  async getStrategySnapshotSymbols(strategyId) {
    return apiRequest(`/strategies/${strategyId}/symbol-runs-summary/`);
  },

  /** Delete all single-symbol runs for this strategy (all symbols). */
  async deleteAllStrategySymbolSnapshots(strategyId) {
    return apiRequest(`/strategies/${strategyId}/symbol-runs/`, {
      method: 'DELETE',
    });
  },
};

/**
 * Get all strategies
 */
export async function getStrategies() {
  try {
    const response = await strategiesAPI.getStrategies();
    if (response.success && response.data) {
      // Handle both array and object with results property
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data.results && Array.isArray(response.data.results)) {
        return response.data.results;
      }
      return [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching strategies:', error);
    return [];
  }
}

/**
 * Get a specific strategy by ID
 */
export async function getStrategy(id) {
  try {
    const response = await strategiesAPI.getStrategy(id);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error('Strategy not found');
  } catch (error) {
    console.error('Error fetching strategy:', error);
    throw error;
  }
}

/**
 * Get strategy assignments for a symbol
 */
export async function getStrategyAssignments(symbolTicker = null) {
  try {
    const response = await strategiesAPI.getAssignments(symbolTicker);
    if (response.success && response.data) {
      return response.data;
    }
    return [];
  } catch (error) {
    console.error('Error fetching strategy assignments:', error);
    throw error;
  }
}

/**
 * Create a strategy assignment
 */
export async function createStrategyAssignment(assignmentData) {
  try {
    const response = await strategiesAPI.createAssignment(assignmentData);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to create strategy assignment');
  } catch (error) {
    console.error('Error creating strategy assignment:', error);
    throw error;
  }
}

/**
 * Update a strategy assignment
 */
export async function updateStrategyAssignment(id, assignmentData) {
  try {
    const response = await strategiesAPI.updateAssignment(id, assignmentData);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to update strategy assignment');
  } catch (error) {
    console.error('Error updating strategy assignment:', error);
    throw error;
  }
}

/**
 * Delete a strategy assignment
 */
export async function deleteStrategyAssignment(id) {
  try {
    const response = await strategiesAPI.deleteAssignment(id);
    return response;
  } catch (error) {
    console.error('Error deleting strategy assignment:', error);
    throw error;
  }
}

export async function getStrategySymbolSnapshot(strategyId, ticker) {
  const response = await strategiesAPI.getStrategySymbolSnapshot(strategyId, ticker);
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error(response.error || 'Failed to load symbol snapshot');
}

export async function runStrategySymbolBacktest(strategyId, ticker, body) {
  const response = await strategiesAPI.runStrategySymbolBacktest(strategyId, ticker, body);
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error(response.error || 'Failed to run symbol backtest');
}

export async function recalculateStrategySymbolRun(strategyId, ticker, runId) {
  const response = await strategiesAPI.recalculateStrategySymbolRun(strategyId, ticker, runId);
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error(response.error || 'Failed to recalculate symbol run');
}

/**
 * Build POST body for re-running a single-symbol snapshot with the same stored settings
 * (from GET snapshot list item `parameters`), plus fresh date range.
 */
export function buildStrategySymbolRerunPayloadFromSnapshotParameters(p, strategy, ticker) {
  if (!p || typeof p !== 'object') {
    throw new Error('Missing saved run parameters');
  }
  const endDate = new Date().toISOString();
  const startDate = new Date('1900-01-01').toISOString();
  const defaultName = `${strategy.name} — ${ticker}`;
  const strategyParams = {
    ...(strategy.default_parameters && typeof strategy.default_parameters === 'object'
      ? strategy.default_parameters
      : {}),
    ...(p.strategy_parameters && typeof p.strategy_parameters === 'object' ? p.strategy_parameters : {}),
  };
  let positionModes = Array.isArray(p.position_modes)
    ? p.position_modes.filter((m) => m === 'long' || m === 'short')
    : [];
  if (!positionModes.length) positionModes = ['long', 'short'];

  const payload = {
    name: p.name != null && String(p.name).trim() ? String(p.name).trim() : defaultName,
    start_date: startDate,
    end_date: endDate,
    split_ratio: p.split_ratio != null ? Number(p.split_ratio) : 0.7,
    initial_capital: p.initial_capital != null ? parseFloat(String(p.initial_capital)) : 10000,
    bet_size_percentage: p.bet_size_percentage != null ? Number(p.bet_size_percentage) : 100,
    strategy_parameters: strategyParams,
    position_modes: positionModes,
  };
  if (p.broker_id != null && p.broker_id !== '') {
    const n = Number(p.broker_id);
    if (!Number.isNaN(n)) payload.broker_id = n;
  }
  if (p.hedge_enabled) {
    payload.hedge_enabled = true;
    payload.run_strategy_only_baseline = p.run_strategy_only_baseline !== false;
    payload.hedge_config =
      p.hedge_config && typeof p.hedge_config === 'object' ? { ...p.hedge_config } : {};
  }
  return payload;
}

export async function runStrategySymbolBacktestBulk(strategyId, body) {
  const response = await strategiesAPI.runStrategySymbolBacktestBulk(strategyId, body);
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error(response.error || 'Failed to run bulk symbol backtests');
}

export async function getStrategySnapshotSymbols(strategyId) {
  try {
    const response = await strategiesAPI.getStrategySnapshotSymbols(strategyId);
    if (response.success && response.data && Array.isArray(response.data.symbols)) {
      return response.data.symbols;
    }
    return [];
  } catch (e) {
    console.error('Error loading snapshot symbols:', e);
    return [];
  }
}

export async function deleteAllStrategySymbolSnapshots(strategyId) {
  const response = await strategiesAPI.deleteAllStrategySymbolSnapshots(strategyId);
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error(response.error || 'Failed to delete snapshot runs');
}

