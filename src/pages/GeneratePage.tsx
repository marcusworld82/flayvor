import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { CollectionPicker } from '../components/CollectionPicker';
import { Copy, Check, AlertCircle } from 'lucide-react';

export function GeneratePage() {
  const activeId = useAppStore((s) => s.activeCollectionId);
  const settings = useAppStore((s) => s.settings);

  const [subject, setSubject] = useState('');
  const [styleDirection, setStyleDirection] = useState('');
  const [aspect, setAspect] = useState('1:1');
  const [count, setCount] = useState(1);
  const [prompt, setPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  const buildPrompt = () => {
    const parts = [
      subject.trim() && `Subject: ${subject.trim()}`,
      styleDirection.trim() && `Style direction: ${styleDirection.trim()}`,
      `Aspect ratio: ${aspect}`,
      'Photorealistic, high detail, natural lighting, no text overlays.',
    ].filter(Boolean);
    setPrompt(parts.join('\n'));
  };

  const spendingEnabled = settings?.budget.aiSpendingEnabled ?? false;

  return (
    <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl mb-1">Generate ideas</h1>
        <p className="text-sm text-ink-muted">
          Explicit generation workspace. Nothing runs until you click Generate. Image generation
          awaits a configured provider route.
        </p>
      </div>

      <CollectionPicker />

      {!activeId && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Select a collection first. You can apply its saved references or taste profile once
          analysis exists.
        </p>
      )}

      <div className="card-surface p-5 space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Subject or brief</span>
          <textarea
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-border bg-canvas px-3 py-2 text-sm"
            placeholder="e.g. A ceramic mug on a sunlit oak table"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Style direction</span>
          <textarea
            value={styleDirection}
            onChange={(e) => setStyleDirection(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-border bg-canvas px-3 py-2 text-sm"
            placeholder="From collection taste, or describe: soft film grain, muted earth tones…"
          />
        </label>

        <div className="flex flex-wrap gap-4">
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Aspect ratio</span>
            <select
              value={aspect}
              onChange={(e) => setAspect(e.target.value)}
              className="block rounded-lg border border-border bg-canvas px-3 py-2 text-sm"
            >
              {['1:1', '4:5', '3:4', '16:9', '9:16', '3:2'].map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Image count</span>
            <input
              type="number"
              min={1}
              max={4}
              value={count}
              onChange={(e) => setCount(Number(e.target.value) || 1)}
              className="block w-20 rounded-lg border border-border bg-canvas px-3 py-2 text-sm"
            />
          </label>
        </div>

        <button type="button" className="btn-secondary" onClick={buildPrompt}>
          Build reviewable prompt
        </button>

        {prompt && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Reviewable prompt</span>
              <button
                type="button"
                className="btn-ghost p-1.5"
                onClick={async () => {
                  await navigator.clipboard.writeText(prompt);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              className="w-full rounded-xl border border-border bg-canvas px-3 py-2 text-sm font-mono"
            />
          </div>
        )}

        <div className="rounded-xl border border-dashed border-border p-4 bg-canvas/50 space-y-2">
          <div className="flex items-start gap-2 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-ink-muted" />
            <div>
              <p className="font-medium">Image generation awaiting setup</p>
              <p className="text-ink-muted mt-1">
                Owner preference is GPT Image 2.5. No compatible configured route is active in this
                build. Prompt creation and export work fully. Enable AI spending and wire a server
                adapter when ready. Automatic generation is off; a Generate click is always required.
              </p>
              {!spendingEnabled && (
                <p className="text-amber-700 dark:text-amber-400 mt-2 text-xs">
                  AI spending is currently disabled in Settings.
                </p>
              )}
            </div>
          </div>
          <button type="button" className="btn-primary w-full opacity-50 cursor-not-allowed" disabled>
            Generate ({count} image{count > 1 ? 's' : ''}) — provider not configured
          </button>
        </div>
      </div>
    </div>
  );
}
