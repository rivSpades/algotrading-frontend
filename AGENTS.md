# Algo Trading Frontend — Agent Context

> Single source of truth for AI tools when working in this repo (standalone).
> Detailed overflow docs are in `.ai/context/`.

## Overview

React SPA for the algorithmic trading platform: market data management, strategy
configuration, backtest visualization (equity curves, trade tables, statistics),
broker management, and live-trading deployments. Consumes the Django REST API at
`REACT_APP_API_URL` (default `http://localhost:8000/api`). **No business
calculations** — only presentation of backend-computed data.

## Stack

| Component | Technology |
|-----------|------------|
| Framework | React 19 (Create React App) |
| Routing | React Router DOM 6 |
| Styling | Tailwind CSS 3, CSS custom properties (tokens) |
| Charts | ApexCharts, Chart.js, Recharts |
| Animation | Framer Motion |
| Icons | lucide-react |

## Commands

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `npm start` | Dev server (port 3000) |
| `npm run build` | Production build |
| `npm test` | Jest test runner |

Set `REACT_APP_API_URL` in `.env` to point at the backend API.

## Architecture

- **Pages** in `src/pages/` — thin; loaders in `router.jsx` fetch via data façades
- **Data layer:** `src/data/api.js` (HTTP) → `src/data/{domain}.js` (façades) — UI never calls fetch directly
- **Presentation utils** in `src/lib/` and `src/utils/` — formatting only, no business math
- **Design system** in `src/components/ui/` + tokens in `src/styles/tokens.css`
- **Theme** via `store/ThemeContext.jsx` — light/dark with `[data-theme]`
- **Websockets** via `hooks/useWebSocket.js` for backtest/live progress

## Directory Structure

```
src/
├── data/           # api.js + domain façades (symbols, backtests, strategies, …)
├── pages/          # route screens
├── components/     # domain + layout + ui/
├── lib/            # chart theme, formatters, navigation
├── hooks/          # useWebSocket, etc.
├── store/          # ThemeContext
├── styles/         # tokens.css
└── router.jsx      # createBrowserRouter + loaders
```

## Context Documents

| File | Role |
|------|------|
| `design.md` | **Canonical design system** — tokens, components, themes, accessibility |
| `.ai/context/data-layer.md` | API façades, response shape, domain files |
| `.ai/context/routing.md` | Routes, loaders, main screens |
| `.ai/context/charts-ui.md` | Equity curve, P&L display rules |

## Conventions

- Read **`design.md` in full** before creating or altering UI
- Use CSS tokens (`--bg`, `--surface`, `--ink`, `--positive`, `--negative`) — no raw hex in components
- Green/red **only for P&L** direction; status uses `--status-*` tokens
- Numbers in mono font with tabular digits
- Mobile-first; both light and dark themes required
- Touch targets ≥ 44×44px; visible focus ring
- Import market data from `data/symbols.js`, strategies from `data/strategies.js`, etc.
- P&L: color **and** sign/arrow for accessibility

## Don't

- Perform calculations (metrics, indicators, aggregations) — move to backend
- Call `fetch` / HTTP directly from pages or components — use `data/` façades
- Use green/red for non-P&L UI elements
- Skip `design.md` merge checklist (section 12) before considering a screen done
