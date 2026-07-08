/**
 * Portfolio performance metrics grid — same cards as Results tab.
 */

import { BarChart3, TrendingDown, TrendingUp } from 'lucide-react';
import StatisticsCard from './StatisticsCard';

export function formatPortfolioCurrency(value) {
  if (value === null || value === undefined || value === '') return 'N/A';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(numValue)) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numValue);
}

export function formatPortfolioPercentage(value) {
  if (value === null || value === undefined || value === '') return 'N/A';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(numValue)) return 'N/A';
  return `${numValue}%`;
}

function metricValue(stats, key) {
  const value = stats?.[key];
  if (value === null || value === undefined || value === '') return 'N/A';

  switch (key) {
    case 'total_trades':
      return value;
    case 'win_rate':
    case 'cagr':
    case 'max_drawdown':
      return formatPortfolioPercentage(value);
    case 'total_pnl':
    case 'average_pnl':
    case 'average_winner':
    case 'average_loser':
      return formatPortfolioCurrency(value);
    case 'profit_factor':
      return value;
    case 'sharpe_ratio':
      return typeof value === 'number' ? value.toFixed(2) : parseFloat(value).toFixed(2);
    default:
      return String(value);
  }
}

export default function PortfolioPerformanceMetricsGrid({
  stats,
  title = 'Portfolio Performance Metrics',
  subtitle = null,
}) {
  if (!stats || Object.keys(stats).length === 0) {
    return (
      <div className="text-sm text-ink-tertiary py-4">
        No performance metrics available for this run.
      </div>
    );
  }

  const pnl = Number(stats.total_pnl);
  const pnlIcon = !Number.isNaN(pnl) && pnl < 0 ? TrendingDown : TrendingUp;

  const cards = [
    { key: 'total_trades', title: 'Total Trades', icon: BarChart3, description: 'Total number of trades executed' },
    { key: 'win_rate', title: 'Win Rate', icon: TrendingUp, description: 'Percentage of winning trades' },
    { key: 'total_pnl', title: 'Total PnL', icon: pnlIcon, description: 'Total profit/loss' },
    { key: 'profit_factor', title: 'Profit Factor', icon: TrendingUp, description: 'Ratio of gross profit to gross loss' },
    { key: 'sharpe_ratio', title: 'Sharpe Ratio', icon: TrendingUp, description: 'Risk-adjusted return measure' },
    { key: 'cagr', title: 'CAGR', icon: TrendingUp, description: 'Compound Annual Growth Rate' },
    { key: 'max_drawdown', title: 'Max Drawdown', icon: TrendingDown, description: 'Maximum peak-to-trough decline' },
    { key: 'average_pnl', title: 'Average PnL', icon: TrendingUp, description: 'Average profit/loss per trade' },
    { key: 'average_winner', title: 'Average Winner', icon: TrendingUp, description: 'Average profit from winning trades' },
    { key: 'average_loser', title: 'Average Loser', icon: TrendingDown, description: 'Average loss from losing trades' },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-ink mb-1">{title}</h2>
      {subtitle ? <p className="text-sm text-ink-secondary mb-4">{subtitle}</p> : <div className="mb-4" />}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <StatisticsCard
            key={card.key}
            title={card.title}
            value={metricValue(stats, card.key)}
            unit=""
            description={card.description}
            icon={card.icon}
          />
        ))}
      </div>
    </div>
  );
}
