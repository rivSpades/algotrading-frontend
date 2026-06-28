import { NavLink } from 'react-router-dom';
import { allNavItems, APP_NAME, APP_TAGLINE } from '../constants/navigation';

export default function Sidebar({ collapsed = false }) {
  return (
    <aside
      className={`hidden md:flex flex-col bg-surface border-r border-border min-h-screen shrink-0 transition-all ${
        collapsed ? 'w-16' : 'w-[var(--shell-sidebar-width)]'
      }`}
    >
      <div className={`border-b border-border ${collapsed ? 'p-3' : 'p-5'}`}>
        {!collapsed && (
          <>
            <h1 className="text-h3 font-semibold text-ink">{APP_NAME}</h1>
            <p className="text-xs text-ink-tertiary mt-1">{APP_TAGLINE}</p>
          </>
        )}
      </div>
      <nav className="flex-1 p-3 overflow-y-auto">
        <ul className="space-y-1">
          {allNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  title={collapsed ? item.name : undefined}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg min-h-[44px] transition-colors ${
                      isActive
                        ? 'bg-accent-soft text-accent-ink font-medium border-l-2 border-accent -ml-px pl-[calc(0.75rem-1px)]'
                        : 'text-ink-secondary hover:bg-surface-hover hover:text-ink'
                    } ${collapsed ? 'justify-center px-2' : ''}`
                  }
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!collapsed && (
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{item.name}</div>
                      {item.description && (
                        <div className="text-xs text-ink-tertiary truncate">{item.description}</div>
                      )}
                    </div>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
      {!collapsed && (
        <div className="p-4 border-t border-border">
          <p className="text-xs text-ink-tertiary text-center">v1.0</p>
        </div>
      )}
    </aside>
  );
}
