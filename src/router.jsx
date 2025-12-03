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
  const data = await getSymbols(search, page);
  return { 
    symbols: data.results || [], 
    search,
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
  const [symbol, ohlcv] = await Promise.all([
    getSymbolDetails(ticker),
    getSymbolOHLCV(ticker, 'daily', null, null, 1, 1000), // Load up to 1000 records for chart
  ]);
  return { symbol, ohlcv: ohlcv.results || [], ohlcvCount: ohlcv.count || 0 };
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
    ],
  },
]);

export default router;

