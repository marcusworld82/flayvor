import { useRef, useState } from 'react';
import { Upload, Plus, Image as ImageIcon, Film } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { SwipeCard } from '../components/SwipeCard';
import { CollectionPicker } from '../components/CollectionPicker';
import { MediaDetailsDrawer } from '../components/MediaDetailsDrawer';
import type { MediaRecord } from '../types';

export function DiscoverPage() {
  const activeCollectionId = useAppStore((s) => s.activeCollectionId);
  const collections = useAppStore((s) => s.collections);
  const currentDeck = useAppStore((s) => s.currentDeck);
  const deckIndex = useAppStore((s) => s.deckIndex);
  const lastAction = useAppStore((s) => s.lastAction);
  const swipe = useAppStore((s) => s.swipe);
  const undo = useAppStore((s) => s.undo);
  const uploadMedia = useAppStore((s) => s.uploadMedia);
  const createCollection = useAppStore((s) => s.createCollection);

  const [tab, setTab] = useState<'images' | 'videos'>('images');
  const [detailsMedia, setDetailsMedia] = useState<MediaRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const active = collections.find((c) => c.id === activeCollectionId);
  const remaining = currentDeck.slice(deckIndex);
  const visible = remaining.slice(0, 2);

  // Filter deck by tab for display count (actual swipe uses full deck; filter on load ideally)
  const filteredRemaining = remaining.filter((m) =>
    tab === 'images' ? m.type === 'image' : m.type === 'video'
  );

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    if (!activeCollectionId) {
      // Auto-create a collection if none
      await createCollection('My first collection', 'custom');
    }
    await uploadMedia(files);
    e.target.value = '';
  };

  if (!activeCollectionId || !active) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
        <p className="font-display text-3xl mb-2">Find your FLAYVOR</p>
        <p className="text-ink-muted mb-8">
          Create a collection, then upload references and start swiping. Your choices become
          creative direction.
        </p>
        <CollectionPicker />
        <button
          type="button"
          className="btn-primary mt-6"
          onClick={() => createCollection('My first collection', 'custom')}
        >
          <Plus className="w-4 h-4" />
          Start swiping
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4 py-4 md:py-6">
      {/* Top controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <CollectionPicker />
        <div className="flex rounded-full border border-border p-0.5 bg-surface">
          <button
            type="button"
            onClick={() => setTab('images')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === 'images' ? 'bg-plum/15 text-plum' : 'text-ink-muted'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Images
          </button>
          <button
            type="button"
            onClick={() => setTab('videos')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === 'videos' ? 'bg-plum/15 text-plum' : 'text-ink-muted'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            Videos
          </button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/mp4,video/webm"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>
        </div>
      </div>

      {/* Swipe workspace */}
      <div className="relative flex-1 min-h-[420px] md:min-h-[520px] max-w-card mx-auto w-full">
        {visible.length === 0 ? (
          <div className="absolute inset-0 card-surface flex flex-col items-center justify-center p-8 text-center">
            <p className="font-display text-xl mb-2">Deck is empty</p>
            <p className="text-ink-muted text-sm mb-6">
              Upload images or short videos to start building this collection's taste.
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4" />
              Upload references
            </button>
          </div>
        ) : (
          visible
            .map((media, i) => (
              <SwipeCard
                key={media.id}
                media={media}
                isTop={i === 0}
                onSave={() => swipe('save')}
                onPass={() => swipe('pass')}
                onUndo={undo}
                onDetails={() => setDetailsMedia(media)}
                canUndo={!!lastAction}
              />
            ))
            .reverse()
        )}
      </div>

      <p className="text-center text-xs text-ink-muted mt-4">
        {filteredRemaining.length} left in {tab} · Swipe right to save · ← → keys work
      </p>

      {detailsMedia && (
        <MediaDetailsDrawer
          media={detailsMedia}
          open={!!detailsMedia}
          onClose={() => setDetailsMedia(null)}
        />
      )}
    </div>
  );
}
