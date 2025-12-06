/**
 * Router Configuration
 * Uses React Router DOM v6+ with loaders and actions
 */

import { createBrowserRouter } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import SymbolDetail from './pages/SymbolDetail';
import Tasks from './pages/Tasks';
import ActiveTasks from './pages/ActiveTasks';
import Strategies from './pages/Strategies';
import StrategyDetail from './pages/StrategyDetail';
import StrategySymbolDetail from './pages/StrategySymbolDetail';
import StrategyBacktestSymbols from './pages/StrategyBacktestSymbols';
import StrategyBacktestSymbolDetail from './pages/StrategyBacktestSymbolDetail';
import Backtests from './pages/Backtests';
import BacktestDetail from './pages/BacktestDetail';
import ErrorPage from './pages/ErrorPage';
import { getSymbols } from './data/symbols';
import { getSymbolDetails, getSymbolOHLCV } from './data/symbols';

/**
 * Home page loader
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
 * Loads all OHLCV data (no pagination limit for chart)
 */
SymbolDetail.loader = async ({ params }) => {
  const { ticker } = params;
  // Load enough data for chart (1000 records) - includes indicators computed on-the-fly
  // Table will use this for first page, reducing API calls
  const [symbol, ohlcv] = await Promise.all([
    getSymbolDetails(ticker),
    getSymbolOHLCV(ticker, 'daily', null, null, 1, 1000),
  ]);
  return { 
    symbol, 
    ohlcv: ohlcv.results || [], 
    ohlcvCount: ohlcv.count || 0,
    indicators: ohlcv.indicators || {}, // Indicator metadata from API
    statistics: ohlcv.statistics || {} // Statistics (volatility, etc.)
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
        element: <StrategyBacktestSymbols />,
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
    ],
  },
]);

export default router;

