/**
 * Analytical Tools Data Layer
 * Page-specific data functions for tool management
 */

import { analyticalToolsAPI } from './api';

/**
 * Get all available tools
 */
export async function getTools(search = '') {
  try {
    const response = await analyticalToolsAPI.getTools(search);
    if (response.success) {
      return Array.isArray(response.data) ? response.data : response.data.results || [];
    }
    throw new Error(response.error || 'Failed to fetch tools');
  } catch (error) {
    console.error('Error fetching tools:', error);
    return [];
  }
}

/**
 * Get tool by ID
 */
export async function getTool(toolId) {
  try {
    const response = await analyticalToolsAPI.getTool(toolId);
    if (response.success) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to fetch tool');
  } catch (error) {
    console.error('Error fetching tool:', error);
    return null;
  }
}

/**
 * Get tool assignments for a symbol
 */
export async function getSymbolAssignments(symbolTicker) {
  try {
    const response = await analyticalToolsAPI.getSymbolAssignments(symbolTicker);
    if (response.success) {
      return Array.isArray(response.data) ? response.data : [];
    }
    throw new Error(response.error || 'Failed to fetch assignments');
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return [];
  }
}

/**
 * Create a tool assignment
 */
export async function createAssignment(assignmentData) {
  try {
    const response = await analyticalToolsAPI.createAssignment(assignmentData);
    if (response.success) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to create assignment');
  } catch (error) {
    console.error('Error creating assignment:', error);
    throw error;
  }
}

/**
 * Update tool assignment
 */
export async function updateAssignment(assignmentId, assignmentData) {
  try {
    const response = await analyticalToolsAPI.updateAssignment(assignmentId, assignmentData);
    if (response.success) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to update assignment');
  } catch (error) {
    console.error('Error updating assignment:', error);
    throw error;
  }
}

/**
 * Delete tool assignment
 */
export async function deleteAssignment(assignmentId) {
  try {
    const response = await analyticalToolsAPI.deleteAssignment(assignmentId);
    if (response.success) {
      return true;
    }
    throw new Error(response.error || 'Failed to delete assignment');
  } catch (error) {
    console.error('Error deleting assignment:', error);
    throw error;
  }
}

/**
 * Compute indicator for an assignment
 */
export async function computeIndicator(assignmentId) {
  try {
    const response = await analyticalToolsAPI.computeIndicator(assignmentId);
    if (response.success) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to compute indicator');
  } catch (error) {
    console.error('Error computing indicator:', error);
    throw error;
  }
}

/**
 * Compute all enabled indicators for a symbol
 */
export async function computeAllForSymbol(symbolTicker) {
  try {
    const response = await analyticalToolsAPI.computeAllForSymbol(symbolTicker);
    if (response.success) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to compute indicators');
  } catch (error) {
    console.error('Error computing indicators:', error);
    throw error;
  }
}

/**
 * Get indicator values for a symbol and tool
 */
export async function getIndicatorValues(symbolTicker, toolName) {
  try {
    const response = await analyticalToolsAPI.getSymbolToolValues(symbolTicker, toolName);
    if (response.success) {
      return Array.isArray(response.data) ? response.data : [];
    }
    throw new Error(response.error || 'Failed to fetch indicator values');
  } catch (error) {
    console.error('Error fetching indicator values:', error);
    return [];
  }
}







