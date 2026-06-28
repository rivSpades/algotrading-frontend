import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { mobileTabItems } from '../../constants/navigation';

export default function MobileTabBar({ onMoreClick }) {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 flex md:hidden bg-surface border-t border-border"
      style={{ height: 'var(--shell-tabbar-height)' }}
      aria-label="Primary navigation"
    >
      {mobileTabItems.map((item) => {
        const Icon = item.icon;
        if (item.opensDrawer) {
          return (
            <button
              key="more"
              type="button"
              onClick={onMoreClick}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 text-xs min-h-[44px] text-ink-secondary"
            >
              <Icon className="w-5 h-5" />
              <span>{item.mobileLabel}</span>
            </button>
          );
        }
        const isActive =
          item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 text-xs min-h-[44px]',
              isActive ? 'text-accent font-semibold' : 'text-ink-secondary',
            )}
          >
            <Icon className="w-5 h-5" />
            <span>{item.mobileLabel}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
