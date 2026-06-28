import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { secondaryNavItems, APP_NAME, APP_TAGLINE } from '../../constants/navigation';

export default function NavDrawer({ open, onClose }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="More navigation">
      <button type="button" className="absolute inset-0 bg-ink/40" onClick={onClose} aria-label="Close menu" />
      <aside
        ref={panelRef}
        tabIndex={-1}
        className="absolute left-0 top-0 bottom-0 w-[min(100%,280px)] bg-surface border-r border-border flex flex-col shadow-lg outline-none"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <div className="font-semibold text-ink">{APP_NAME}</div>
            <div className="text-xs text-ink-tertiary">{APP_TAGLINE}</div>
          </div>
          <button type="button" onClick={onClose} className="btn btn--ghost min-h-[44px] min-w-[44px] p-2" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {secondaryNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-3 rounded-lg min-h-[44px] transition-colors ${
                        isActive
                          ? 'bg-accent-soft text-accent-ink font-medium'
                          : 'text-ink-secondary hover:bg-surface-hover hover:text-ink'
                      }`
                    }
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <div>
                      <div>{item.name}</div>
                      <div className="text-xs text-ink-tertiary">{item.description}</div>
                    </div>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </div>
  );
}
