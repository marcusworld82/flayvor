import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type {
  Collection,
  MediaRecord,
  CollectionMembership,
  PromptVersion,
  AnalysisResult,
  AppSettings,
  Field,
  SwipeAction,
  AnalysisMode,
} from '../types';
import * as db from '../lib/db';

interface AppState {
  ready: boolean;
  collections: Collection[];
  activeCollectionId: string | null;
  mediaById: Record<string, MediaRecord>;
  memberships: CollectionMembership[];
  currentDeck: MediaRecord[];
  deckIndex: number;
  lastAction: CollectionMembership | null;
  settings: AppSettings | null;
  isAnalyzing: boolean;
  analysisError: string | null;

  // Actions
  init: () => Promise<void>;
  createCollection: (name: string, field: Field, purpose?: string) => Promise<Collection>;
  renameCollection: (id: string, name: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  setActiveCollection: (id: string | null) => Promise<void>;
  uploadMedia: (files: FileList | File[]) => Promise<MediaRecord[]>;
  swipe: (action: SwipeAction) => Promise<void>;
  undo: () => Promise<void>;
  loadDeck: () => Promise<void>;
  analyzeMedia: (mediaId: string, mode: AnalysisMode) => Promise<AnalysisResult | null>;
  getPrompts: (mediaId: string) => Promise<PromptVersion[]>;
  savePromptEdit: (prompt: PromptVersion) => Promise<void>;
  refreshSettings: () => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
}

const LOCAL_OWNER = 'local';

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  collections: [],
  activeCollectionId: null,
  mediaById: {},
  memberships: [],
  currentDeck: [],
  deckIndex: 0,
  lastAction: null,
  settings: null,
  isAnalyzing: false,
  analysisError: null,

  init: async () => {
    const [collections, settings] = await Promise.all([
      db.listCollections(),
      db.getSettings(),
    ]);

    let activeId = localStorage.getItem('flayvor-active-collection');
    if (activeId && !collections.find((c) => c.id === activeId)) {
      activeId = null;
    }
    if (!activeId && collections.length > 0) {
      activeId = collections[0].id;
    }

    // Load media for known memberships later; keep map empty for now
    set({
      ready: true,
      collections,
      activeCollectionId: activeId,
      settings,
    });

    if (activeId) {
      await get().loadDeck();
    }
  },

  createCollection: async (name, field, purpose) => {
    const now = new Date().toISOString();
    const c: Collection = {
      id: uuid(),
      name,
      field,
      purpose,
      styleKeywords: [],
      createdAt: now,
      updatedAt: now,
    };
    await db.saveCollection(c);
    set((s) => ({
      collections: [c, ...s.collections],
      activeCollectionId: c.id,
    }));
    localStorage.setItem('flayvor-active-collection', c.id);
    await get().loadDeck();
    return c;
  },

  renameCollection: async (id, name) => {
    const existing = get().collections.find((c) => c.id === id);
    if (!existing) return;
    const updated = { ...existing, name, updatedAt: new Date().toISOString() };
    await db.saveCollection(updated);
    set((s) => ({
      collections: s.collections.map((c) => (c.id === id ? updated : c)),
    }));
  },

  deleteCollection: async (id) => {
    await db.deleteCollection(id);
    set((s) => {
      const next = s.collections.filter((c) => c.id !== id);
      const nextActive =
        s.activeCollectionId === id ? (next[0]?.id ?? null) : s.activeCollectionId;
      if (nextActive) {
        localStorage.setItem('flayvor-active-collection', nextActive);
      } else {
        localStorage.removeItem('flayvor-active-collection');
      }
      return {
        collections: next,
        activeCollectionId: nextActive,
        currentDeck: nextActive === s.activeCollectionId ? [] : s.currentDeck,
        deckIndex: 0,
      };
    });
    if (get().activeCollectionId) {
      await get().loadDeck();
    }
  },

  setActiveCollection: async (id) => {
    set({ activeCollectionId: id, deckIndex: 0, lastAction: null });
    if (id) {
      localStorage.setItem('flayvor-active-collection', id);
      await get().loadDeck();
    } else {
      localStorage.removeItem('flayvor-active-collection');
      set({ currentDeck: [], memberships: [] });
    }
  },

  uploadMedia: async (files) => {
    const list = Array.from(files);
    const results: MediaRecord[] = [];

    for (const file of list) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      if (!isVideo && !isImage) continue;

      // Basic size check (client-side; server will revalidate)
      const maxBytes = isVideo ? 80 * 1024 * 1024 : 20 * 1024 * 1024;
      if (file.size > maxBytes) {
        console.warn(`Skipping ${file.name}: exceeds size limit`);
        continue;
      }

      const id = uuid();
      const blobKey = `blob-${id}`;
      const objectUrl = URL.createObjectURL(file);

      let width: number | undefined;
      let height: number | undefined;
      let durationSec: number | undefined;

      if (isImage) {
        const dims = await getImageDimensions(objectUrl);
        width = dims.width;
        height = dims.height;
      } else {
        const meta = await getVideoMeta(objectUrl);
        width = meta.width;
        height = meta.height;
        durationSec = meta.duration;
        if (durationSec && durationSec > 120) {
          console.warn(`Skipping ${file.name}: video longer than 120s`);
          URL.revokeObjectURL(objectUrl);
          continue;
        }
      }

      const record: MediaRecord = {
        id,
        type: isVideo ? 'video' : 'image',
        source: 'upload',
        url: objectUrl,
        blobKey,
        filename: file.name,
        mimeType: file.type,
        width,
        height,
        durationSec,
        sizeBytes: file.size,
        createdAt: new Date().toISOString(),
        ownerId: LOCAL_OWNER,
        sourceLabel: 'Upload',
      };

      await db.saveMedia(record, file);
      results.push(record);
    }

    set((s) => {
      const nextMap = { ...s.mediaById };
      for (const r of results) nextMap[r.id] = r;
      return { mediaById: nextMap };
    });

    // Prepend uploads to current deck so user can swipe them immediately
    set((s) => ({
      currentDeck: [...results, ...s.currentDeck],
      deckIndex: 0,
    }));

    return results;
  },

  swipe: async (action) => {
    const { activeCollectionId, currentDeck, deckIndex, mediaById } = get();
    if (!activeCollectionId || deckIndex >= currentDeck.length) return;

    const media = currentDeck[deckIndex];
    const now = new Date().toISOString();
    const membership: CollectionMembership = {
      id: uuid(),
      collectionId: activeCollectionId,
      mediaId: media.id,
      action,
      createdAt: now,
      updatedAt: now,
    };

    await db.saveMembership(membership);

    // Ensure media is in map
    if (!mediaById[media.id]) {
      set((s) => ({ mediaById: { ...s.mediaById, [media.id]: media } }));
    }

    set((s) => ({
      memberships: [...s.memberships, membership],
      lastAction: membership,
      deckIndex: s.deckIndex + 1,
    }));
  },

  undo: async () => {
    const { activeCollectionId, lastAction, deckIndex } = get();
    if (!activeCollectionId || !lastAction) return;

    const undone = await db.undoLastMembership(activeCollectionId);
    if (!undone) return;

    set((s) => ({
      memberships: s.memberships.filter((m) => m.id !== undone.id),
      lastAction: null,
      deckIndex: Math.max(0, s.deckIndex - 1),
    }));
  },

  loadDeck: async () => {
    const { activeCollectionId } = get();
    if (!activeCollectionId) {
      set({ currentDeck: [], memberships: [], deckIndex: 0 });
      return;
    }

    const memberships = await db.getMembershipsForCollection(activeCollectionId);
    const savedIds = new Set(
      memberships.filter((m) => m.action === 'save').map((m) => m.mediaId)
    );
    const passedIds = new Set(
      memberships.filter((m) => m.action === 'pass').map((m) => m.mediaId)
    );
    const seenIds = new Set([...savedIds, ...passedIds]);

    // Load all local media
    const allMedia = await db.listMediaByOwner(LOCAL_OWNER);
    const mediaMap: Record<string, MediaRecord> = {};
    for (const m of allMedia) {
      // Revive blob URLs
      if (m.blobKey && (!m.url || m.url.startsWith('blob:'))) {
        const blob = await db.getMediaBlob(m.blobKey);
        if (blob) {
          m.url = URL.createObjectURL(blob);
        }
      }
      mediaMap[m.id] = m;
    }

    // Deck = media not yet swiped in this collection (uploads first)
    const unseen = allMedia.filter((m) => !seenIds.has(m.id));
    // Also include any already in currentDeck that aren't seen (fresh uploads)
    set({
      mediaById: mediaMap,
      memberships,
      currentDeck: unseen,
      deckIndex: 0,
      lastAction: null,
    });
  },

  analyzeMedia: async (mediaId, mode) => {
    set({ isAnalyzing: true, analysisError: null });
    try {
      // Check cache first
      const cached = await db.getAnalysis(mediaId, mode);
      if (cached) {
        set({ isAnalyzing: false });
        return cached;
      }

      const media = get().mediaById[mediaId] ?? (await db.getMedia(mediaId));
      if (!media) throw new Error('Media not found');

      // Prefer JSON + base64 so the same path works on Vercel serverless
      let fileBase64: string | undefined;
      if (media.blobKey) {
        const blob = await db.getMediaBlob(media.blobKey);
        if (blob) {
          const buf = await blob.arrayBuffer();
          fileBase64 = btoa(
            new Uint8Array(buf).reduce((s, b) => s + String.fromCharCode(b), '')
          );
        }
      }

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId,
          mode,
          type: media.type,
          mimeType: media.mimeType,
          fileBase64,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || err.message || 'Analysis failed');
      }

      const data = await res.json();
      const analysis: AnalysisResult = {
        id: data.id ?? uuid(),
        mediaId,
        mode,
        schemaVersion: data.schemaVersion ?? '1.0',
        model: data.model ?? 'mock',
        ...data.analysis,
        createdAt: new Date().toISOString(),
        usage: data.usage,
      };

      await db.saveAnalysis(analysis);

      // Also store reconstructed + style_only prompts if present
      if (analysis.reconstructedPrompt) {
        await db.savePrompt({
          id: uuid(),
          mediaId,
          type: 'reconstructed',
          content: analysis.reconstructedPrompt,
          model: analysis.model,
          createdAt: analysis.createdAt,
          updatedAt: analysis.createdAt,
          isEdited: false,
        });
      }
      if (analysis.styleOnlyPrompt) {
        await db.savePrompt({
          id: uuid(),
          mediaId,
          type: 'style_only',
          content: analysis.styleOnlyPrompt,
          model: analysis.model,
          createdAt: analysis.createdAt,
          updatedAt: analysis.createdAt,
          isEdited: false,
        });
      }

      set({ isAnalyzing: false });
      return analysis;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Analysis failed';
      set({ isAnalyzing: false, analysisError: msg });
      return null;
    }
  },

  getPrompts: async (mediaId) => {
    return db.getPromptsForMedia(mediaId);
  },

  savePromptEdit: async (prompt) => {
    const updated = {
      ...prompt,
      updatedAt: new Date().toISOString(),
      isEdited: true,
    };
    await db.savePrompt(updated);
  },

  refreshSettings: async () => {
    const settings = await db.getSettings();
    set({ settings });
  },

  updateSettings: async (patch) => {
    const current = get().settings ?? (await db.getSettings());
    const next = { ...current, ...patch };
    if (patch.budget) {
      next.budget = { ...current.budget, ...patch.budget };
    }
    await db.saveSettings(next);
    set({ settings: next });
  },
}));

function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = url;
  });
}

function getVideoMeta(url: string): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
      });
    };
    video.onerror = () => resolve({ width: 0, height: 0, duration: 0 });
    video.src = url;
  });
}
