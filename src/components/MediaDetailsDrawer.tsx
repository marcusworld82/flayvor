import { useEffect, useState } from 'react';
import { X, Copy, Check, Loader2, Sparkles } from 'lucide-react';
import type { MediaRecord, AnalysisResult, PromptVersion, AnalysisMode } from '../types';
import { useAppStore } from '../store/useAppStore';
import { formatDuration, formatBytes } from '../lib/utils';

interface Props {
  media: MediaRecord;
  open: boolean;
  onClose: () => void;
}

export function MediaDetailsDrawer({ media, open, onClose }: Props) {
  const analyzeMedia = useAppStore((s) => s.analyzeMedia);
  const getPrompts = useAppStore((s) => s.getPrompts);
  const isAnalyzing = useAppStore((s) => s.isAnalyzing);
  const analysisError = useAppStore((s) => s.analysisError);
  const settings = useAppStore((s) => s.settings);

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [prompts, setPrompts] = useState<PromptVersion[]>([]);
  const [mode, setMode] = useState<AnalysisMode>('standard');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [tab, setTab] = useState<'info' | 'prompts' | 'analysis'>('info');

  useEffect(() => {
    if (!open) return;
    getPrompts(media.id).then(setPrompts);
    // Load cached analysis if any
    import('../lib/db').then(({ getAnalysesForMedia }) => {
      getAnalysesForMedia(media.id).then((list) => {
        if (list.length) setAnalysis(list[0]);
      });
    });
  }, [open, media.id, getPrompts]);

  const handleAnalyze = async () => {
    const result = await analyzeMedia(media.id, mode);
    if (result) {
      setAnalysis(result);
      const p = await getPrompts(media.id);
      setPrompts(p);
      setTab('analysis');
    }
  };

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  if (!open) return null;

  const spendingEnabled = settings?.budget.aiSpendingEnabled ?? false;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface border-l border-border h-full overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-surface border-b border-border px-4 py-3 flex items-center justify-between z-10">
          <h2 className="font-display text-lg">Reference details</h2>
          <button type="button" onClick={onClose} className="btn-ghost p-2" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Preview */}
          <div className="rounded-xl overflow-hidden bg-black/5 aspect-video flex items-center justify-center">
            {media.type === 'image' ? (
              <img src={media.url} alt="" className="max-w-full max-h-full object-contain" />
            ) : (
              <video src={media.url} className="max-w-full max-h-full" controls muted playsInline />
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-border">
            {(['info', 'prompts', 'analysis'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-3 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
                  tab === t
                    ? 'border-plum text-plum'
                    : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'info' && (
            <dl className="space-y-2 text-sm">
              <Row label="Source" value={media.sourceLabel ?? media.source} />
              <Row label="Type" value={media.type} />
              <Row label="Filename" value={media.filename} />
              <Row
                label="Dimensions"
                value={
                  media.width && media.height ? `${media.width} × ${media.height}` : undefined
                }
              />
              <Row label="Duration" value={formatDuration(media.durationSec)} />
              <Row label="Size" value={formatBytes(media.sizeBytes)} />
              <Row label="Creator" value={media.creator} />
              {media.originalUrl && (
                <div>
                  <dt className="text-ink-muted">Original URL</dt>
                  <dd className="mt-0.5">
                    <a
                      href={media.originalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-plum underline break-all"
                    >
                      {media.originalUrl}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          )}

          {tab === 'prompts' && (
            <div className="space-y-4">
              {prompts.length === 0 && !analysis && (
                <p className="text-sm text-ink-muted">
                  No prompts yet. Run analysis to generate reconstructed and style-only prompts.
                </p>
              )}
              {prompts.map((p) => (
                <PromptBlock
                  key={p.id}
                  label={labelForType(p.type)}
                  content={p.content}
                  meta={`${p.model ?? 'local'} · ${p.isEdited ? 'edited' : 'original'}`}
                  onCopy={() => copy(p.content, p.id)}
                  copied={copiedId === p.id}
                />
              ))}
              {analysis?.reconstructedPrompt &&
                !prompts.find((p) => p.type === 'reconstructed') && (
                  <PromptBlock
                    label="Reconstructed prompt"
                    content={analysis.reconstructedPrompt}
                    meta="from analysis"
                    onCopy={() => copy(analysis.reconstructedPrompt!, 'recon')}
                    copied={copiedId === 'recon'}
                  />
                )}
              {analysis?.styleOnlyPrompt && !prompts.find((p) => p.type === 'style_only') && (
                <PromptBlock
                  label="Style only"
                  content={analysis.styleOnlyPrompt}
                  meta="from analysis"
                  onCopy={() => copy(analysis.styleOnlyPrompt!, 'style')}
                  copied={copiedId === 'style'}
                />
              )}
            </div>
          )}

          {tab === 'analysis' && (
            <div className="space-y-4">
              {!analysis && (
                <div className="space-y-3">
                  <p className="text-sm text-ink-muted">
                    Analysis uses Gemini on the server after an explicit action. Results are cached
                    per media + mode. Hover and copy never trigger analysis.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={`btn text-sm ${mode === 'standard' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setMode('standard')}
                    >
                      Standard
                    </button>
                    <button
                      type="button"
                      className={`btn text-sm ${mode === 'detailed' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setMode('detailed')}
                    >
                      Detailed
                    </button>
                  </div>
                  {!spendingEnabled && (
                    <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 rounded-lg px-3 py-2">
                      AI spending is disabled in Settings. Enable it and set budget limits before
                      live analysis. Demo mode returns a structured mock interpretation.
                    </p>
                  )}
                  <button
                    type="button"
                    className="btn-primary w-full"
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing…
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Analyze for prompt
                      </>
                    )}
                  </button>
                  {analysisError && (
                    <p className="text-sm text-rose-600">{analysisError}</p>
                  )}
                </div>
              )}

              {analysis && (
                <div className="space-y-3 text-sm">
                  <p className="text-xs text-ink-muted">
                    Model: {analysis.model} · Mode: {analysis.mode}
                    {analysis.coverageNote ? ` · ${analysis.coverageNote}` : ''}
                  </p>
                  {analysis.subject && <Field label="Subject" value={analysis.subject} />}
                  {analysis.composition && (
                    <Field label="Composition" value={analysis.composition} />
                  )}
                  {analysis.palette && analysis.palette.length > 0 && (
                    <div>
                      <p className="text-ink-muted mb-1">Palette</p>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.palette.map((c) => (
                          <span
                            key={c}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs"
                          >
                            <span
                              className="w-3 h-3 rounded-full border border-black/10"
                              style={{ background: c }}
                            />
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {analysis.lighting && <Field label="Lighting" value={analysis.lighting} />}
                  {analysis.mood && <Field label="Mood" value={analysis.mood} />}
                  {analysis.styleTraits && analysis.styleTraits.length > 0 && (
                    <div>
                      <p className="text-ink-muted mb-1">Style traits</p>
                      <div className="flex flex-wrap gap-1">
                        {analysis.styleTraits.map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-plum/10 text-plum px-2 py-0.5 text-xs"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {analysis.reconstructedPrompt && (
                    <PromptBlock
                      label="Reconstructed prompt"
                      content={analysis.reconstructedPrompt}
                      onCopy={() => copy(analysis.reconstructedPrompt!, 'a-recon')}
                      copied={copiedId === 'a-recon'}
                    />
                  )}
                  {analysis.styleOnlyPrompt && (
                    <PromptBlock
                      label="Style only"
                      content={analysis.styleOnlyPrompt}
                      onCopy={() => copy(analysis.styleOnlyPrompt!, 'a-style')}
                      copied={copiedId === 'a-style'}
                    />
                  )}
                  <button
                    type="button"
                    className="btn-secondary w-full text-sm"
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                  >
                    Re-analyze ({mode})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-3">
      <dt className="text-ink-muted w-24 shrink-0">{label}</dt>
      <dd className="min-w-0 break-words">{value}</dd>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-ink-muted mb-0.5">{label}</p>
      <p>{value}</p>
    </div>
  );
}

function PromptBlock({
  label,
  content,
  meta,
  onCopy,
  copied,
}: {
  label: string;
  content: string;
  meta?: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="rounded-xl border border-border p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{label}</p>
          {meta && <p className="text-xs text-ink-muted">{meta}</p>}
        </div>
        <button type="button" onClick={onCopy} className="btn-ghost p-1.5" aria-label="Copy">
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed bg-canvas rounded-lg p-3">
        {content}
      </pre>
    </div>
  );
}

function labelForType(type: string) {
  switch (type) {
    case 'original':
      return 'Original prompt';
    case 'reconstructed':
      return 'Reconstructed prompt';
    case 'style_only':
      return 'Style only';
    case 'adapted':
      return 'Adapted prompt';
    default:
      return type;
  }
}
