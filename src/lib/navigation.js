/**
 * Contextual back navigation — preserves list filters via location.state.from.
 */

import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function locationRef(location) {
  return `${location.pathname}${location.search || ''}`;
}

export function resolveBackPath(location, defaultPath) {
  const from = location.state?.from;
  if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')) {
    return from;
  }
  return defaultPath;
}

export function withReturnState(location, extraState = {}) {
  return {
    ...extraState,
    from: locationRef(location),
  };
}

export function useNavigateBack(defaultPath) {
  const navigate = useNavigate();
  const location = useLocation();
  const backPath = resolveBackPath(location, defaultPath);

  const goBack = useCallback(() => {
    navigate(backPath);
  }, [navigate, backPath]);

  const navigateWithReturn = useCallback(
    (to, options = {}) => {
      navigate(to, {
        ...options,
        state: {
          ...(options.state || {}),
          from: locationRef(location),
        },
      });
    },
    [navigate, location],
  );

  return { goBack, backPath, navigateWithReturn, location };
}
