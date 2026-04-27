/**
 * Data layer for the v2 Strategy Deployment API.
 *
 * Endpoints map to live_trading.views.StrategyDeploymentViewSet.
 */

import { apiRequest } from './api';

const BASE = '/strategy-deployments/';
const EVENTS_BASE = '/deployment-events/';

function unwrap(response, fallback = null) {
  if (!response) return fallback;
  if (response.success) return response.data;
  throw new Error(response.error || 'Request failed');
}

function unwrapList(response) {
  if (!response || !response.success) {
    throw new Error(response?.error || 'Request failed');
  }
  const data = response.data;
  if (Array.isArray(data)) {
    return { results: data, count: data.length, next: null, previous: null };
  }
  return {
    results: data.results || [],
    count: data.count || (data.results || []).length,
    next: data.next || null,
    previous: data.previous || null,
  };
}

export const strategyDeploymentsAPI = {
  async list({ page = 1, strategyId = null, deploymentType = null, status = null, brokerId = null, parameterSet = null } = {}) {
    const params = new URLSearchParams();
    if (page > 1) params.append('page', page);
    if (strategyId) params.append('strategy', strategyId);
    if (deploymentType) params.append('deployment_type', deploymentType);
    if (status) params.append('status', status);
    if (brokerId) params.append('broker', brokerId);
    if (parameterSet) params.append('parameter_set', parameterSet);
    const qs = params.toString();
    return apiRequest(`${BASE}${qs ? `?${qs}` : ''}`);
  },

  async retrieve(id) {
    return apiRequest(`${BASE}${id}/`);
  },

  async create(payload) {
    return apiRequest(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async previewSymbols({ parameterSet, positionMode = 'long', defaultOnly = true }) {
    return apiRequest(`${BASE}preview-symbols/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parameter_set: parameterSet,
        position_mode: positionMode,
        default_only: defaultOnly,
      }),
    });
  },

  async hedgeInheritPreview({ strategy, parameterSet }) {
    const params = new URLSearchParams();
    params.set('strategy', strategy);
    params.set('parameter_set', parameterSet);
    return apiRequest(`${BASE}hedge-inherit-preview/?${params.toString()}`);
  },

  async activate(id) {
    return apiRequest(`${BASE}${id}/activate/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
  },

  async pause(id) {
    return apiRequest(`${BASE}${id}/pause/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
  },

  async stop(id) {
    return apiRequest(`${BASE}${id}/stop/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
  },

  async promoteToRealMoney(id, payload = {}) {
    return apiRequest(`${BASE}${id}/promote-to-real-money/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async evaluate(id, { transitionStatus = true } = {}) {
    return apiRequest(`${BASE}${id}/evaluate/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transition_status: transitionStatus }),
    });
  },

  async evaluationPreview(id) {
    return apiRequest(`${BASE}${id}/evaluation-preview/`);
  },

  async fireNow(id, { placeOrders = false } = {}) {
    return apiRequest(`${BASE}${id}/fire-now/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ place_orders: placeOrders }),
    });
  },

  async fireSymbolNow(id, deploymentSymbolId, { placeOrders = false } = {}) {
    return apiRequest(`${BASE}${id}/symbols/${deploymentSymbolId}/fire-now/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ place_orders: placeOrders }),
    });
  },

  async updatePositions(id) {
    return apiRequest(`${BASE}${id}/update-positions/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
  },

  async recalcSnapshots(id, { reconcile = true, enqueue = true } = {}) {
    return apiRequest(`${BASE}${id}/recalc-snapshots/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reconcile, enqueue }),
    });
  },

  async listSymbols(id, { page = 1, pageSize = null } = {}) {
    const params = new URLSearchParams();
    if (page > 1) params.append('page', page);
    if (pageSize) params.append('page_size', pageSize);
    const qs = params.toString();
    return apiRequest(`${BASE}${id}/symbols/${qs ? `?${qs}` : ''}`);
  },

  async disableSymbol(id, deploymentSymbolId) {
    return apiRequest(`${BASE}${id}/symbols/${deploymentSymbolId}/disable/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
  },

  async enableSymbol(id, deploymentSymbolId) {
    return apiRequest(`${BASE}${id}/symbols/${deploymentSymbolId}/enable/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
  },

  async events(
    id,
    {
      page = 1,
      pageSize = null,
      eventType = null,
      actorType = null,
      level = null,
      since = null,
    } = {},
  ) {
    const params = new URLSearchParams();
    if (page > 1) params.append('page', page);
    if (pageSize) params.append('page_size', pageSize);
    if (eventType) params.append('event_type', eventType);
    if (actorType) params.append('actor_type', actorType);
    if (level) params.append('level', level);
    if (since) params.append('since', since);
    const qs = params.toString();
    return apiRequest(`${BASE}${id}/events/${qs ? `?${qs}` : ''}`);
  },

  async signals(id, { page = 1, since = null } = {}) {
    const params = new URLSearchParams();
    if (page > 1) params.append('page', page);
    if (since) params.append('since', since);
    const qs = params.toString();
    return apiRequest(`${BASE}${id}/signals/${qs ? `?${qs}` : ''}`);
  },

  async statistics(id) {
    return apiRequest(`${BASE}${id}/statistics/`);
  },

  async destroy(id) {
    return apiRequest(`${BASE}${id}/`, { method: 'DELETE' });
  },
};

export const deploymentEventsAPI = {
  async list(
    {
      page = 1,
      deployment = null,
      eventType = null,
      actorType = null,
      level = null,
      since = null,
      pageSize = null,
      search = null,
      ordering = null,
    } = {},
  ) {
    const params = new URLSearchParams();
    if (page > 1) params.append('page', page);
    if (deployment) params.append('deployment', deployment);
    if (eventType) params.append('event_type', eventType);
    if (actorType) params.append('actor_type', actorType);
    if (level) params.append('level', level);
    if (since) params.append('since', since);
    if (pageSize) params.append('page_size', pageSize);
    if (search) params.append('search', search);
    if (ordering) params.append('ordering', ordering);
    const qs = params.toString();
    return apiRequest(`${EVENTS_BASE}${qs ? `?${qs}` : ''}`);
  },
};

export const liveTradesAPI = {
  async list(
    {
      page = 1,
      pageSize = null,
      deploymentId = null,
      symbolTicker = null,
      status = null,
      deploymentType = null,
    } = {},
  ) {
    const params = new URLSearchParams();
    if (page > 1) params.append('page', page);
    if (pageSize) params.append('page_size', pageSize);
    if (deploymentId) params.append('deployment', deploymentId);
    if (symbolTicker) params.append('symbol', symbolTicker);
    if (status) params.append('status', status);
    if (deploymentType) params.append('deployment_type', deploymentType);
    const qs = params.toString();
    return apiRequest(`/live-trades/${qs ? `?${qs}` : ''}`);
  },
  async retrieve(id) {
    return apiRequest(`/live-trades/${id}/`);
  },
};

// ---------------------------------------------------------------------------
// Helper functions (used by router loaders / pages)
// ---------------------------------------------------------------------------

export async function listStrategyDeployments(filters = {}) {
  try {
    const response = await strategyDeploymentsAPI.list(filters);
    return unwrapList(response);
  } catch (err) {
    console.error('Error listing strategy deployments:', err);
    return { results: [], count: 0, next: null, previous: null };
  }
}

export async function getStrategyDeployment(id) {
  return unwrap(await strategyDeploymentsAPI.retrieve(id));
}

export async function createStrategyDeployment(payload) {
  return unwrap(await strategyDeploymentsAPI.create(payload));
}

export async function previewDeploymentSymbols({ parameterSet, positionMode = 'long', defaultOnly = true }) {
  return unwrap(await strategyDeploymentsAPI.previewSymbols({ parameterSet, positionMode, defaultOnly }));
}

export async function getHedgeInheritPreview(strategyId, parameterSetSignature) {
  return unwrap(
    await strategyDeploymentsAPI.hedgeInheritPreview({
      strategy: strategyId,
      parameterSet: parameterSetSignature,
    }),
  );
}

export async function activateStrategyDeployment(id) {
  return unwrap(await strategyDeploymentsAPI.activate(id));
}

export async function pauseStrategyDeployment(id) {
  return unwrap(await strategyDeploymentsAPI.pause(id));
}

export async function stopStrategyDeployment(id) {
  return unwrap(await strategyDeploymentsAPI.stop(id));
}

export async function promoteStrategyDeployment(id, payload = {}) {
  return unwrap(await strategyDeploymentsAPI.promoteToRealMoney(id, payload));
}

export async function evaluateStrategyDeployment(id, opts = {}) {
  return unwrap(await strategyDeploymentsAPI.evaluate(id, opts));
}

export async function previewStrategyDeploymentEvaluation(id) {
  return unwrap(await strategyDeploymentsAPI.evaluationPreview(id));
}

export async function fireDeploymentNow(id, opts = {}) {
  return unwrap(await strategyDeploymentsAPI.fireNow(id, opts));
}

export async function fireDeploymentSymbolNow(id, deploymentSymbolId, opts = {}) {
  return unwrap(await strategyDeploymentsAPI.fireSymbolNow(id, deploymentSymbolId, opts));
}

export async function updateDeploymentPositions(id) {
  return unwrap(await strategyDeploymentsAPI.updatePositions(id));
}

export async function recalcDeploymentSnapshots(id, opts = {}) {
  return unwrap(await strategyDeploymentsAPI.recalcSnapshots(id, opts));
}

export async function listLiveTrades(filters = {}) {
  try {
    const response = await liveTradesAPI.list(filters);
    return unwrapList(response);
  } catch (err) {
    console.error('Error listing live trades:', err);
    return { results: [], count: 0, next: null, previous: null };
  }
}

export async function listAllDeploymentEvents(filters = {}) {
  try {
    const response = await deploymentEventsAPI.list(filters);
    return unwrapList(response);
  } catch (err) {
    console.error('Error listing deployment events:', err);
    return { results: [], count: 0, next: null, previous: null };
  }
}

export async function listDeploymentSymbols(id, { page = 1, pageSize = 50 } = {}) {
  try {
    const response = await strategyDeploymentsAPI.listSymbols(id, { page, pageSize });
    return unwrapList(response);
  } catch (err) {
    console.error('Error listing deployment symbols:', err);
    return { results: [], count: 0, next: null, previous: null };
  }
}

export async function listDeploymentEvents(
  id,
  { page = 1, pageSize = 50, eventType = null, actorType = null, level = null, since = null } = {},
) {
  try {
    const response = await strategyDeploymentsAPI.events(id, {
      page,
      pageSize,
      eventType,
      actorType,
      level,
      since,
    });
    return unwrapList(response);
  } catch (err) {
    console.error('Error listing deployment events:', err);
    return { results: [], count: 0, next: null, previous: null };
  }
}

export async function listDeploymentSignals(id, filters = {}) {
  try {
    const response = await strategyDeploymentsAPI.signals(id, filters);
    return unwrapList(response);
  } catch (err) {
    console.error('Error listing deployment signals:', err);
    return { results: [], count: 0, next: null, previous: null };
  }
}

export async function getDeploymentStatistics(id) {
  return unwrap(await strategyDeploymentsAPI.statistics(id));
}

export async function disableDeploymentSymbol(id, deploymentSymbolId) {
  return unwrap(await strategyDeploymentsAPI.disableSymbol(id, deploymentSymbolId));
}

export async function enableDeploymentSymbol(id, deploymentSymbolId) {
  return unwrap(await strategyDeploymentsAPI.enableSymbol(id, deploymentSymbolId));
}

export async function deleteStrategyDeployment(id) {
  return unwrap(await strategyDeploymentsAPI.destroy(id));
}
