/**
 * Router Configuration
 * Uses React Router DOM v6+ with loaders and actions
 */

import { createBrowserRouter } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import SymbolDetail from './pages/SymbolDetail';
import Tasks from './pages/Tasks';
import ActiveTasks from './pages/ActiveTasks';
import Strategies from './pages/Strategies';
import StrategyDetail from './pages/StrategyDetail';
import StrategySymbolDetail from './pages/StrategySymbolDetail';
import StrategyBacktestSymbols from './pages/StrategyBacktestSymbols';
import StrategyBacktestDetail from './pages/StrategyBacktestDetail';
import StrategyBacktestSymbolDetail from './pages/StrategyBacktestSymbolDetail';
import Backtests from './pages/Backtests';
import BacktestDetail from './pages/BacktestDetail';
import Brokers from './pages/Brokers';
import BrokerForm from './pages/BrokerForm';
import BrokerDetail from './pages/BrokerDetail';
import BrokerSymbols from './pages/BrokerSymbols';
import LiveTradingDeployments from './pages/LiveTradingDeployments';
import DeploymentForm from './pages/DeploymentForm';
import DeploymentDetail from './pages/DeploymentDetail';
import ErrorPage from './pages/ErrorPage';
import { getSymbols } from './data/symbols';
import { getSymbolDetails, getSymbolOHLCV } from './data/symbols';

/**
 * Market Data (Home) page loader
 */
Home.loader = async ({ request }) => {
  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const exchange = url.searchParams.get('exchange') || null;
  const status = url.searchParams.get('status') || null;
  const data = await getSymbols(search, page, exchange, status);
  return { 
    symbols: data.results || [], 
    search,
    exchange,
    status,
    count: data.count || 0,
    next: data.next,
    previous: data.previous,
    currentPage: page
  };
};

/**
 * Symbol detail page loader
 * Loads OHLCV data with optional date range (default: last 5 years for performance)
 */
SymbolDetail.loader = async ({ params, request }) => {
  const { ticker } = params;
  const url = new URL(request.url);
  const range = url.searchParams.get('range') || '5Y'; // Default to 5Y for performance
  
  // Calculate start date based on range
  let startDate = null;
  let pageSize = 10000; // Default page size
  
  if (range === '5Y') {
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    startDate = fiveYearsAgo.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    // For 5Y, we can use a smaller page size since we know it's limited
    pageSize = 2000; // 5 years ≈ 1250 trading days, 2000 is safe
  }
  // If range is 'ALL', startDate remains null to fetch all data (up to 10000 records)
  
  const [symbol, ohlcv] = await Promise.all([
    getSymbolDetails(ticker),
    getSymbolOHLCV(ticker, 'daily', startDate, null, 1, pageSize),
  ]);
  return { 
    symbol, 
    ohlcv: ohlcv.results || [], 
    ohlcvCount: ohlcv.count || 0,
    indicators: ohlcv.indicators || {}, // Indicator metadata from API
    statistics: ohlcv.statistics || {}, // Statistics (volatility, etc.)
    range // Pass range to component
  };
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'market-data',
        element: <Home />,
        loader: Home.loader,
      },
      {
        path: 'symbols/:ticker',
        element: <SymbolDetail />,
        loader: SymbolDetail.loader,
      },
      {
        path: 'tasks',
        element: <Tasks />,
      },
      {
        path: 'active-tasks',
        element: <ActiveTasks />,
      },
      {
        path: 'strategies',
        element: <Strategies />,
      },
      {
        path: 'strategies/:id',
        element: <StrategyDetail />,
      },
      {
        path: 'strategies/:id/:ticker',
        element: <StrategySymbolDetail />,
      },
      {
        path: 'strategies/:id/backtests/:backtestId',
        element: <StrategyBacktestDetail />,
      },
      {
        path: 'strategies/:id/backtests/:backtestId/:ticker',
        element: <StrategyBacktestSymbolDetail />,
      },
      {
        path: 'backtests',
        element: <Backtests />,
      },
      {
        path: 'backtests/:id',
        element: <BacktestDetail />,
      },
      {
        path: 'brokers',
        element: <Brokers />,
      },
      {
        path: 'brokers/new',
        element: <BrokerForm />,
      },
      {
        path: 'brokers/:id/edit',
        element: <BrokerForm />,
      },
      {
        path: 'brokers/:id/symbols',
        element: <BrokerSymbols />,
      },
      {
        path: 'brokers/:id',
        element: <BrokerDetail />,
      },
      {
        path: 'deployments',
        element: <LiveTradingDeployments />,
      },
      {
        path: 'deployments/new',
        element: <DeploymentForm />,
      },
      {
        path: 'deployments/new/:backtestId',
        element: <DeploymentForm />,
      },
      {
        path: 'deployments/:id',
        element: <DeploymentDetail />,
      },
    ],
  },
]);

export default router;

