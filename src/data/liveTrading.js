/**
 * Data layer for Live Trading API
 */

import { apiRequest } from './api';

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

    async getBrokerSymbols(id, page = 1, search = '') {
      const params = new URLSearchParams();
      if (page > 1) {
        params.append('page', page);
      }
      if (search && search.trim()) {
        params.append('search', search.trim());
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

  /**
   * Live Trading Deployments
   */
  deployments: {
    async getDeployments(page = 1, brokerId = null, deploymentType = null, status = null) {
      let endpoint = `/live-trading-deployments/?page=${page}`;
      if (brokerId) endpoint += `&broker=${brokerId}`;
      if (deploymentType) endpoint += `&deployment_type=${deploymentType}`;
      if (status) endpoint += `&status=${status}`;
      return apiRequest(endpoint);
    },

    async getDeployment(id) {
      return apiRequest(`/live-trading-deployments/${id}/`);
    },

    async createDeployment(deploymentData) {
      return apiRequest('/live-trading-deployments/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deploymentData),
      });
    },

    async activateDeployment(id) {
      return apiRequest(`/live-trading-deployments/${id}/activate/`, {
        method: 'POST',
      });
    },

    async promoteToRealMoney(id) {
      return apiRequest(`/live-trading-deployments/${id}/promote-to-real-money/`, {
        method: 'POST',
      });
    },

    async pauseDeployment(id) {
      return apiRequest(`/live-trading-deployments/${id}/pause/`, {
        method: 'POST',
      });
    },

    async stopDeployment(id) {
      return apiRequest(`/live-trading-deployments/${id}/stop/`, {
        method: 'POST',
      });
    },

    async getDeploymentStatistics(id) {
      return apiRequest(`/live-trading-deployments/${id}/statistics/`);
    },

    async checkEvaluation(id) {
      return apiRequest(`/live-trading-deployments/${id}/check-evaluation/`, {
        method: 'POST',
      });
    },
  },

  /**
   * Live Trades
   */
  trades: {
    async getTrades(page = 1, deploymentId = null, symbolTicker = null, status = null, deploymentType = null) {
      let endpoint = `/live-trades/?page=${page}`;
      if (deploymentId) endpoint += `&deployment=${deploymentId}`;
      if (symbolTicker) endpoint += `&symbol=${symbolTicker}`;
      if (status) endpoint += `&status=${status}`;
      if (deploymentType) endpoint += `&deployment_type=${deploymentType}`;
      return apiRequest(endpoint);
    },

    async getTrade(id) {
      return apiRequest(`/live-trades/${id}/`);
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

/**
 * Helper functions for deployments
 */
export async function getDeployments(filters = {}) {
  try {
    const response = await liveTradingAPI.deployments.getDeployments(
      filters.page || 1,
      filters.brokerId,
      filters.deploymentType,
      filters.status
    );
    if (response.success) {
      return {
        results: Array.isArray(response.data) ? response.data : response.data.results || [],
        count: response.data.count || 0,
        next: response.data.next,
        previous: response.data.previous,
      };
    }
    throw new Error(response.error || 'Failed to fetch deployments');
  } catch (error) {
    console.error('Error fetching deployments:', error);
    return { results: [], count: 0, next: null, previous: null };
  }
}

export async function getDeployment(id) {
  try {
    const response = await liveTradingAPI.deployments.getDeployment(id);
    if (response.success) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to fetch deployment');
  } catch (error) {
    console.error('Error fetching deployment:', error);
    throw error;
  }
}

export async function createDeployment(deploymentData) {
  try {
    const response = await liveTradingAPI.deployments.createDeployment(deploymentData);
    if (response.success) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to create deployment');
  } catch (error) {
    console.error('Error creating deployment:', error);
    throw error;
  }
}

export async function activateDeployment(id) {
  try {
    const response = await liveTradingAPI.deployments.activateDeployment(id);
    if (response.success) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to activate deployment');
  } catch (error) {
    console.error('Error activating deployment:', error);
    throw error;
  }
}

export async function pauseDeployment(id) {
  try {
    const response = await liveTradingAPI.deployments.pauseDeployment(id);
    if (response.success) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to pause deployment');
  } catch (error) {
    console.error('Error pausing deployment:', error);
    throw error;
  }
}

export async function stopDeployment(id) {
  try {
    const response = await liveTradingAPI.deployments.stopDeployment(id);
    if (response.success) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to stop deployment');
  } catch (error) {
    console.error('Error stopping deployment:', error);
    throw error;
  }
}

export async function promoteToRealMoney(id) {
  try {
    const response = await liveTradingAPI.deployments.promoteToRealMoney(id);
    if (response.success) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to promote deployment');
  } catch (error) {
    console.error('Error promoting deployment:', error);
    throw error;
  }
}

export async function getDeploymentStatistics(id) {
  try {
    const response = await liveTradingAPI.deployments.getDeploymentStatistics(id);
    if (response.success) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to fetch statistics');
  } catch (error) {
    console.error('Error fetching statistics:', error);
    throw error;
  }
}

export async function checkEvaluation(id) {
  try {
    const response = await liveTradingAPI.deployments.checkEvaluation(id);
    if (response.success) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to check evaluation');
  } catch (error) {
    console.error('Error checking evaluation:', error);
    throw error;
  }
}

/**
 * Helper functions for live trades
 */
export async function getTrades(filters = {}) {
  try {
    const response = await liveTradingAPI.trades.getTrades(
      filters.page || 1,
      filters.deploymentId,
      filters.symbolTicker,
      filters.status,
      filters.deploymentType
    );
    if (response.success) {
      return {
        results: Array.isArray(response.data) ? response.data : response.data.results || [],
        count: response.data.count || 0,
        next: response.data.next,
        previous: response.data.previous,
      };
    }
    throw new Error(response.error || 'Failed to fetch trades');
  } catch (error) {
    console.error('Error fetching trades:', error);
    return { results: [], count: 0, next: null, previous: null };
  }
}

