import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { Layout } from './components/Layout';
import { DiscoverPage } from './pages/DiscoverPage';
import { CollectionsPage } from './pages/CollectionsPage';
import { GeneratePage } from './pages/GeneratePage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  const init = useAppStore((s) => s.init);
  const ready = useAppStore((s) => s.ready);
  const settings = useAppStore((s) => s.settings);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else if (settings.theme === 'light') {
      root.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    }
  }, [settings?.theme]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="text-center space-y-3">
          <p className="font-display text-2xl text-ink tracking-tight">FLAYVOR</p>
          <p className="text-ink-muted text-sm">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/discover" replace />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route path="/generate" element={<GeneratePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
