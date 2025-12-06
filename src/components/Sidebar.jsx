/**
 * Sidebar Component
 * Navigation sidebar for the application
 */

import { NavLink } from 'react-router-dom';
import { BarChart3, Calendar, Play, TrendingUp } from 'lucide-react';

export default function Sidebar() {
  const navItems = [
    {
      name: 'Market Data',
      path: '/',
      icon: BarChart3,
      description: 'Symbols and market data'
    },
    {
      name: 'Task Scheduler',
      path: '/tasks',
      icon: Calendar,
      description: 'Schedule and manage tasks'
    },
    {
      name: 'Active Tasks',
      path: '/active-tasks',
      icon: Play,
      description: 'Running tasks and history'
    },
    {
      name: 'Strategies',
      path: '/strategies',
      icon: TrendingUp,
      description: 'Trading strategies'
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      {/* Logo/Header */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">Trading Platform</h1>
        <p className="text-sm text-gray-500 mt-1">Algorithmic Trading</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Trading Platform v1.0
        </p>
      </div>
    </aside>
  );
}

