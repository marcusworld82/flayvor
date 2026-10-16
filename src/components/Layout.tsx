import { NavLink, Outlet } from 'react-router-dom';
import { Compass, FolderOpen, Sparkles, Settings } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';

const nav = [
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/collections', label: 'Collections', icon: FolderOpen },
  { to: '/generate', label: 'Generate', icon: Sparkles },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Layout() {
  const collections = useAppStore((s) => s.collections);
  const activeId = useAppStore((s) => s.activeCollectionId);
  const active = collections.find((c) => c.id === activeId);

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      {/* Desktop top bar */}
      <header className="hidden md:flex items-center justify-between px-6 py-3 border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <NavLink to="/discover" className="font-display text-xl tracking-tight text-ink">
            FLAYVOR
          </NavLink>
          <nav className="flex items-center gap-1">
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-plum/10 text-plum'
                      : 'text-ink-muted hover:text-ink hover:bg-black/5 dark:hover:bg-white/5'
                  )
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {active ? (
            <span className="text-sm text-ink-muted">
              Collection:{' '}
              <span className="font-medium text-ink">{active.name}</span>
            </span>
          ) : (
            <span className="text-sm text-ink-muted">No collection selected</span>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-surface/95 backdrop-blur-sm">
        <div className="flex items-center justify-around py-2 safe-area-pb">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1.5 text-[11px] font-medium',
                  isActive ? 'text-plum' : 'text-ink-muted'
                )
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
