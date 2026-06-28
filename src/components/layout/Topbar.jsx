import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../store/ThemeContext';
import { APP_NAME } from '../../constants/navigation';

export default function Topbar({ onMenuClick, breadcrumb, showMenuButton = false }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 h-14 px-4 md:px-6 bg-surface border-b border-border shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {showMenuButton && (
          <button
            type="button"
            onClick={onMenuClick}
            className="btn btn--ghost min-h-[44px] min-w-[44px] p-2 lg:hidden"
            aria-label="Open navigation menu"
          >
            ☰
          </button>
        )}
        <div className="min-w-0">
          <div className="font-semibold text-ink truncate md:hidden">{APP_NAME}</div>
          {breadcrumb && (
            <nav className="hidden md:block text-sm text-ink-secondary truncate" aria-label="Breadcrumb">
              {breadcrumb}
            </nav>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={toggleTheme}
        className="btn btn--ghost min-h-[44px] min-w-[44px] p-2"
        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      >
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
    </header>
  );
}
