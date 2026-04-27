/**
 * Data layer for live trading dashboard helpers.
 */

import { apiRequest } from './api';

export async function getMarketOpenProgress() {
  const res = await apiRequest('/market-open-progress/');
  if (!res?.success) {
    return { results: [], as_of: null, error: res?.error || 'Request failed' };
  }
  const data = res.data || {};
  return {
    results: data.results || [],
    as_of: data.as_of || null,
    error: null,
  };
}

/**
 * Data layer for the legacy Live Trading API.
 *
 * NOTE: Strategy deployment endpoints moved to `data/strategyDeployments.js`
 * in the Live Trading Engine v2 rewrite. This module now exposes only broker
 * management endpoints + helpers, which the broker pages still rely on.
 */

export const liveTradingAPI = {
  /**
   * Broker Management
   */
  brokers: {
    async getBrokers() {
      return apiRequest('/brokers/');
    },

    async getBroker(id) {
      return apiRequest(`/brokers/${id}/`);
    },

    async createBroker(brokerData) {
      return apiRequest('/brokers/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(brokerData),
      });
    },

    async updateBroker(id, brokerData) {
      return apiRequest(`/brokers/${id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(brokerData),
      });
    },

    async deleteBroker(id) {
      return apiRequest(`/brokers/${id}/`, {
        method: 'DELETE',
      });
    },

    async getBrokerSymbols(id, page = 1, search = '', pageSize = null) {
      const params = new URLSearchParams();
      if (page > 1) {
        params.append('page', page);
      }
      if (search && search.trim()) {
        params.append('search', search.trim());
      }
      if (pageSize != null && pageSize > 0) {
        params.append('page_size', String(pageSize));
      }
      const queryString = params.toString();
      // Ensure trailing slash before query string for DRF detail actions
      const endpoint = `/brokers/${id}/symbols/${queryString ? `?${queryString}` : ''}`;
      return apiRequest(endpoint);
    },

    async linkSymbols(id, linkData) {
      return apiRequest(`/brokers/${id}/link-symbols/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(linkData),
      });
    },

    /** Re-verify long/short capabilities from the broker API for all existing links. */
    async reverifyBrokerSymbols(id) {
      return apiRequest(`/brokers/${id}/reverify-symbols/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
    },

    async testConnection(id, data = {}) {
      return apiRequest(`/brokers/${id}/test-connection/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
    },

    async getAccountBalance(id, deploymentType = 'paper') {
      return apiRequest(`/brokers/${id}/account-balance/?deployment_type=${deploymentType}`);
    },

    async checkSymbol(id, symbol, deploymentType = 'paper') {
      return apiRequest(`/brokers/${id}/check-symbol/?symbol=${symbol}&deployment_type=${deploymentType}`);
    },

    async getPositions(id, deploymentType = 'paper') {
      return apiRequest(`/brokers/${id}/positions/?deployment_type=${deploymentType}`);
    },
  },

  /**
   * Symbol-Broker Associations
   */
  associations: {
    async getAssociations(brokerId = null, symbolTicker = null, longActive = null, shortActive = null) {
      let endpoint = '/symbol-broker-associations/';
      const params = new URLSearchParams();
      if (brokerId) params.append('broker', brokerId);
      if (symbolTicker) params.append('symbol', symbolTicker);
      if (longActive !== null) params.append('long_active', longActive);
      if (shortActive !== null) params.append('short_active', shortActive);
      if (params.toString()) endpoint += `?${params.toString()}`;
      return apiRequest(endpoint);
    },

    async getAssociation(id) {
      return apiRequest(`/symbol-broker-associations/${id}/`);
    },

    async updateAssociation(id, associationData) {
      return apiRequest(`/symbol-broker-associations/${id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(associationData),
      });
    },
  },

};

/**
 * Helper functions for brokers
 */
export async function getBrokers() {
  try {
    const response = await liveTradingAPI.brokers.getBrokers();
    if (response.success) {
      return Array.isArray(response.data) ? response.data : response.data.results || [];
    }
    throw new Error(response.error || 'Failed to fetch brokers');
  } catch (error) {
    console.error('Error fetching brokers:', error);
    return [];
  }
}

export async function getBroker(id) {
  try {
    const response = await liveTradingAPI.brokers.getBroker(id);
    if (response.success) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to fetch broker');
  } catch (error) {
    console.error('Error fetching broker:', error);
    throw error;
  }
}

export async function createBroker(brokerData) {
  try {
    const response = await liveTradingAPI.brokers.createBroker(brokerData);
    if (response.success) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to create broker');
  } catch (error) {
    console.error('Error creating broker:', error);
    throw error;
  }
}

export async function updateBroker(id, brokerData) {
  try {
    const response = await liveTradingAPI.brokers.updateBroker(id, brokerData);
    if (response.success) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to update broker');
  } catch (error) {
    console.error('Error updating broker:', error);
    throw error;
  }
}

export async function deleteBroker(id) {
  try {
    const response = await liveTradingAPI.brokers.deleteBroker(id);
    return response.success;
  } catch (error) {
    console.error('Error deleting broker:', error);
    throw error;
  }
}

export async function linkSymbolsToBroker(brokerId, symbolTickers = [], exchangeCode = '', verifyCapabilities = true) {
  try {
    const response = await liveTradingAPI.brokers.linkSymbols(brokerId, {
      symbol_tickers: symbolTickers,
      exchange_code: exchangeCode,
      verify_capabilities: verifyCapabilities,
    });
    if (response.success) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to link symbols');
  } catch (error) {
    console.error('Error linking symbols:', error);
    throw error;
  }
}

export async function reverifyBrokerLinkedSymbols(brokerId) {
  const response = await liveTradingAPI.brokers.reverifyBrokerSymbols(brokerId);
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error(response.error || 'Failed to start re-verify task');
}

// (Intentionally removed) getAllBrokerLinkedTickers: single-symbol flow now matches portfolio behavior
// (backend expands broker-linked symbols when "Select All Active" is checked).

// Strategy deployments and live trades moved to data/strategyDeployments.js
// in the Live Trading Engine v2 rewrite.
