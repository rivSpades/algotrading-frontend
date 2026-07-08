# Data layer

## Pattern

```
Page / Component
  ↓ import
data/{domain}.js     ← stable API for UI (getSymbols, runBacktest, …)
  ↓
data/api.js          ← apiFetch, auth headers, error normalization
  ↓
Django REST API      ← REACT_APP_API_URL (default http://localhost:8000/api)
```

## Rules

- UI **never** imports `api.js` methods directly from pages — use domain façades
- Façades return predictable shapes: `{ success, data?, error? }` or loader-friendly objects
- Presentation formatting lives in `lib/` (`formatPnl.js`, `chartTheme.js`) — not business math

## Domain files

| File | Domain |
|------|--------|
| `data/symbols.js` | Symbols, OHLCV fetch, exchanges |
| `data/strategies.js` | Strategy CRUD, assignments |
| `data/backtests.js` | Backtest runs, statistics |
| `data/liveTrading.js` | Deployments, live trades |
| `data/strategyDeployments.js` | Deployment workflow |
| `data/tools.js` | Analytical tools |
| `data/hedgeConfig.js` | Hedge configuration |

## API base URL

```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
```

## Auth (future)

`api.js` reads `localStorage.auth_token` for Bearer header when present.
