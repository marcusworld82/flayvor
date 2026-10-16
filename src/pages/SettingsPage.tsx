import { useAppStore } from '../store/useAppStore';

export function SettingsPage() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  if (!settings) return null;

  const budget = settings.budget;

  return (
    <div className="flex-1 max-w-xl mx-auto w-full px-4 py-6 space-y-8">
      <div>
        <h1 className="font-display text-2xl mb-1">Settings</h1>
        <p className="text-sm text-ink-muted">
          Local demo mode stores data in this browser only (IndexedDB). No accounts yet.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Appearance</h2>
        <div className="card-surface p-4">
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm">Theme</span>
            <select
              value={settings.theme}
              onChange={(e) =>
                updateSettings({ theme: e.target.value as 'light' | 'dark' | 'system' })
              }
              className="rounded-lg border border-border bg-canvas px-3 py-1.5 text-sm"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
          AI cost controls
        </h2>
        <p className="text-xs text-ink-muted">
          The ledger is an estimate based on provider usage and verified pricing for calls made
          through FLAYVOR. It does not include storage, hosting, or other apps.
        </p>
        <div className="card-surface p-4 space-y-4">
          <label className="flex items-center justify-between gap-4">
            <div>
              <span className="text-sm font-medium">Enable AI spending</span>
              <p className="text-xs text-ink-muted">
                Paid requests stay disabled until this is on and limits are set.
              </p>
            </div>
            <input
              type="checkbox"
              checked={budget.aiSpendingEnabled}
              onChange={(e) =>
                updateSettings({
                  budget: { ...budget, aiSpendingEnabled: e.target.checked },
                })
              }
              className="w-5 h-5 rounded accent-plum"
            />
          </label>

          {(
            [
              ['dailyUsdLimit', 'Daily USD limit', 0.5, 50, 0.5],
              ['monthlyUsdLimit', 'Monthly USD limit', 5, 200, 1],
              ['maxCostPerAction', 'Max cost per action', 0.05, 5, 0.05],
              ['dailyAnalysisLimit', 'Daily analysis count', 1, 100, 1],
              ['dailyImageGenLimit', 'Daily image generation limit', 0, 50, 1],
            ] as const
          ).map(([key, label, min, max, step]) => (
            <label key={key} className="flex items-center justify-between gap-4">
              <span className="text-sm">{label}</span>
              <input
                type="number"
                min={min}
                max={max}
                step={step}
                value={budget[key]}
                onChange={(e) =>
                  updateSettings({
                    budget: { ...budget, [key]: Number(e.target.value) },
                  })
                }
                className="w-24 rounded-lg border border-border bg-canvas px-3 py-1.5 text-sm text-right"
              />
            </label>
          ))}

          <div className="rounded-lg bg-canvas px-3 py-2 text-xs text-ink-muted">
            Suggested starting values (not auto-applied): $2/day, $20/month, $0.50/action, 20
            analyses/day. Confirm before enabling live calls.
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Providers</h2>
        <div className="card-surface p-4 space-y-3 text-sm">
          <ProviderRow
            name="Gemini (analysis \u2192 prompts)"
            status="Live when GEMINI_API_KEY + FLAYVOR_AI_SPENDING=1"
          />
          <ProviderRow
            name="Openverse (discover)"
            status="Free \u00b7 works without a key (optional OPENVERSE_API_KEY)"
          />
          <ProviderRow
            name="Pixabay (discover)"
            status="Free key \u00b7 set PIXABAY_API_KEY (pixabay.com/api/docs)"
          />
          <ProviderRow
            name="Unsplash (discover)"
            status="Free Access Key \u00b7 set UNSPLASH_ACCESS_KEY"
          />
          <ProviderRow
            name="GPT Image 2.5 (generation)"
            status="Not wired \u2014 needs verified adapter"
          />
          <ProviderRow
            name="Pinterest"
            status="No free public API for this use \u00b7 not integrated"
          />
        </div>
        <p className="text-xs text-ink-muted">
          Free discovery keys and Gemini are set as Vercel environment variables (Project \u2192
          Settings \u2192 Environment Variables), then redeploy. Openverse search works with zero
          setup. Analysis uses your Google/Gemini key to dissect images and produce reconstructed
          + style-only prompts.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Data</h2>
        <div className="card-surface p-4 text-sm text-ink-muted space-y-2">
          <p>
            <strong className="text-ink">Local demo mode.</strong> Collections, media, swipes,
            prompts, and analyses are stored in IndexedDB in this browser only. Clearing site data
            removes them.
          </p>
          <p>
            Firebase Auth, Firestore, and durable object storage are structured for later enablement.
            Server enforces ownership when those services are configured.
          </p>
        </div>
      </section>
    </div>
  );
}

function ProviderRow({ name, status }: { name: string; status: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-1 border-b border-border last:border-0">
      <span className="font-medium">{name}</span>
      <span className="text-xs text-ink-muted">{status}</span>
    </div>
  );
}
