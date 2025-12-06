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

