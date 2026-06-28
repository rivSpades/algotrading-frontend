import {
  LayoutDashboard,
  BarChart3,
  Calendar,
  Play,
  TrendingUp,
  Key,
  Rocket,
  Shield,
  FileText,
  FlaskConical,
  MoreHorizontal,
} from 'lucide-react';

export const primaryNavItems = [
  { name: 'Live', path: '/', icon: LayoutDashboard, mobileLabel: 'Live' },
  { name: 'Market Data', path: '/market-data', icon: BarChart3, mobileLabel: 'Mercado' },
  { name: 'Strategies', path: '/strategies', icon: TrendingUp, mobileLabel: 'Estratégias' },
  { name: 'Backtests', path: '/backtests', icon: FlaskConical, mobileLabel: 'Backtests' },
];

export const secondaryNavItems = [
  { name: 'Task Scheduler', path: '/tasks', icon: Calendar, description: 'Schedule and manage tasks' },
  { name: 'Active Tasks', path: '/active-tasks', icon: Play, description: 'Running tasks and history' },
  { name: 'Hedge lab', path: '/hedge-config', icon: Shield, description: 'VIX hybrid hedge preview' },
  { name: 'Brokers', path: '/brokers', icon: Key, description: 'Broker management' },
  { name: 'Deployments', path: '/deployments', icon: Rocket, description: 'Manage deployments' },
  { name: 'Platform log', path: '/logs', icon: FileText, description: 'Audit log (all events)' },
];

export const allNavItems = [
  primaryNavItems[0],
  primaryNavItems[1],
  ...secondaryNavItems.filter((i) => i.path === '/tasks' || i.path === '/active-tasks'),
  primaryNavItems[2],
  ...secondaryNavItems.filter((i) => !['/tasks', '/active-tasks'].includes(i.path)),
];

export const mobileTabItems = [
  ...primaryNavItems.slice(1),
  primaryNavItems[0],
  { name: 'Mais', path: null, icon: MoreHorizontal, mobileLabel: 'Mais', opensDrawer: true },
];

export const APP_NAME = 'Trading Platform';
export const APP_TAGLINE = 'Algorithmic Trading';
