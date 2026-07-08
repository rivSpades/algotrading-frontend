# Charts and P&L UI

## Design authority

Full spec in **`design.md`** (repo root). Read before any chart or stat UI work.

## Equity curve (signature element)

- Thin precise line on subtle grid
- Drawdown zone shaded
- Train/test split marked with vertical line
- Implementation: `components/charts/EquityCurveChart.jsx`, `lib/chartTheme.js`

## P&L display

- Green/red **only** for profit/loss direction (long/short, up/down)
- Always pair color with sign or arrow (`lib/formatPnl.js`)
- Status badges use `--status-*` tokens, not P&L colors

## Chart libraries

- ApexCharts (`react-apexcharts`) — equity, performers
- Chart.js + financial plugin — candlesticks (`CandlestickChart.jsx`)
- Recharts — auxiliary charts

## Tokens

Charts must use CSS variables (`--grid`, `--ink-tertiary`, `--positive`, `--negative`) via `chartTheme.js` for theme consistency.

## Merge checklist

Follow `design.md` section 12: 360px width, both themes, reduced motion, empty/error states with next step.
