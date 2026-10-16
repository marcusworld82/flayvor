import { useEffect, useState } from 'react';
import { Trash2, Pencil, Heart } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { CollectionPicker } from '../components/CollectionPicker';
import * as db from '../lib/db';
import type { MediaRecord, CollectionMembership } from '../types';
import { formatDuration } from '../lib/utils';
import { MediaDetailsDrawer } from '../components/MediaDetailsDrawer';

export function CollectionsPage() {
  const activeId = useAppStore((s) => s.activeCollectionId);
  const collections = useAppStore((s) => s.collections);
  const renameCollection = useAppStore((s) => s.renameCollection);
  const deleteCollection = useAppStore((s) => s.deleteCollection);
  const mediaById = useAppStore((s) => s.mediaById);

  const [saved, setSaved] = useState<{ membership: CollectionMembership; media: MediaRecord }[]>(
    []
  );
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [details, setDetails] = useState<MediaRecord | null>(null);

  const active = collections.find((c) => c.id === activeId);

  useEffect(() => {
    if (!activeId) {
      setSaved([]);
      return;
    }
    (async () => {
      const memberships = await db.getMembershipsForCollection(activeId);
      const saves = memberships.filter((m) => m.action === 'save');
      const items: { membership: CollectionMembership; media: MediaRecord }[] = [];
      for (const m of saves) {
        let media = mediaById[m.mediaId] ?? (await db.getMedia(m.mediaId));
        if (media) {
          if (media.blobKey && (!media.url || media.url.startsWith('blob:'))) {
            const blob = await db.getMediaBlob(media.blobKey);
            if (blob) media = { ...media, url: URL.createObjectURL(blob) };
          }
          items.push({ membership: m, media });
        }
      }
      items.sort((a, b) => b.membership.createdAt.localeCompare(a.membership.createdAt));
      setSaved(items);
    })();
  }, [activeId, mediaById]);

  if (!active) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <p className="text-ink-muted mb-4">Select or create a collection</p>
        <CollectionPicker />
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <CollectionPicker />
        {editingName ? (
          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (nameDraft.trim()) {
                await renameCollection(active.id, nameDraft.trim());
              }
              setEditingName(false);
            }}
          >
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
            />
            <button type="submit" className="btn-primary text-sm">
              Save
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl">{active.name}</h1>
            <button
              type="button"
              className="btn-ghost p-1.5"
              onClick={() => {
                setNameDraft(active.name);
                setEditingName(true);
              }}
              aria-label="Rename"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="btn-ghost p-1.5 text-rose-600"
              onClick={async () => {
                if (confirm(`Delete collection "${active.name}"? Swipe history will be removed.`)) {
                  await deleteCollection(active.id);
                }
              }}
              aria-label="Delete collection"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {active.purpose && (
        <p className="text-sm text-ink-muted mb-4">{active.purpose}</p>
      )}

      <div className="flex items-center gap-2 mb-4 text-sm text-ink-muted">
        <Heart className="w-4 h-4 text-plum" />
        {saved.length} saved reference{saved.length !== 1 ? 's' : ''}
      </div>

      {saved.length === 0 ? (
        <div className="card-surface p-12 text-center">
          <p className="text-ink-muted">
            No saves yet. Go to Discover, upload references, and swipe right.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {saved.map(({ media }) => (
            <button
              key={media.id}
              type="button"
              onClick={() => setDetails(media)}
              className="group relative aspect-[4/5] rounded-xl overflow-hidden border border-border bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-plum"
            >
              {media.type === 'image' ? (
                <img
                  src={media.url}
                  alt=""
                  className="w-full h-full object-cover transition-transform group-hover:scale-[1.02]"
                />
              ) : (
                <>
                  <video
                    src={media.url}
                    className="w-full h-full object-cover"
                    muted
                    preload="metadata"
                  />
                  <span className="absolute bottom-2 right-2 rounded bg-black/70 text-white text-[10px] px-1.5 py-0.5 tabular-nums">
                    {formatDuration(media.durationSec)}
                  </span>
                </>
              )}
              {/* Hover prompt preview (desktop) — no AI call */}
              <div className="hidden md:flex absolute inset-x-0 bottom-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/70 to-transparent">
                <span className="text-[11px] text-white/90">Tap for prompts</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {details && (
        <MediaDetailsDrawer media={details} open={!!details} onClose={() => setDetails(null)} />
      )}
    </div>
  );
}
