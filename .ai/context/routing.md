# Routing

Router: `src/router.jsx` — `createBrowserRouter` with loaders on key routes.

## Main routes

| Path | Page | Notes |
|------|------|-------|
| `/` | Home | Symbol list, search/filter |
| `/symbols/:id` | SymbolDetail | OHLCV chart, metadata |
| `/strategies` | Strategies | Strategy list |
| `/strategies/:id` | StrategyDetail | Parameters, assignments |
| `/backtests` | Backtests | All backtests |
| `/backtests/:id` | BacktestDetail | Stats, equity, trades |
| `/brokers` | Brokers | Broker management |
| `/deployments` | StrategyDeployments | Live deployments |
| `/deployments/:id` | DeploymentDetail | Paper/real status |
| `/tasks` | Tasks | Celery beat tasks |
| `/live` | LiveDashboard | Live trading overview |

## Loaders

Loaders fetch data before render (e.g. `Home.loader` → `getSymbols`). Keep loaders thin — delegate to `data/` façades.

## Layout

`components/Layout.jsx` wraps authenticated shell: `Sidebar`, `Topbar`, `MobileTabBar`, `NavDrawer`.

## Error handling

`ErrorPage` as route error boundary element.
