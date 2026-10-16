import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  Collection,
  MediaRecord,
  CollectionMembership,
  PromptVersion,
  AnalysisResult,
  TasteProfile,
  AppSettings,
  UsageLedger,
} from '../types';

interface FlayvorDB extends DBSchema {
  collections: {
    key: string;
    value: Collection;
    indexes: { 'by-updated': string };
  };
  media: {
    key: string;
    value: MediaRecord;
    indexes: { 'by-owner': string; 'by-hash': string };
  };
  blobs: {
    key: string;
    value: { key: string; blob: Blob; createdAt: string };
  };
  memberships: {
    key: string;
    value: CollectionMembership;
    indexes: { 'by-collection': string; 'by-media': string; 'by-collection-action': [string, string] };
  };
  prompts: {
    key: string;
    value: PromptVersion;
    indexes: { 'by-media': string; 'by-media-type': [string, string] };
  };
  analyses: {
    key: string;
    value: AnalysisResult;
    indexes: { 'by-media': string; 'by-media-mode': [string, string] };
  };
  tasteProfiles: {
    key: string;
    value: TasteProfile;
    indexes: { 'by-collection': string };
  };
  settings: {
    key: string;
    value: AppSettings & { id: string };
  };
  usage: {
    key: string;
    value: UsageLedger;
  };
}

const DB_NAME = 'flayvor-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<FlayvorDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<FlayvorDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const collections = db.createObjectStore('collections', { keyPath: 'id' });
        collections.createIndex('by-updated', 'updatedAt');

        const media = db.createObjectStore('media', { keyPath: 'id' });
        media.createIndex('by-owner', 'ownerId');
        media.createIndex('by-hash', 'hash');

        db.createObjectStore('blobs', { keyPath: 'key' });

        const memberships = db.createObjectStore('memberships', { keyPath: 'id' });
        memberships.createIndex('by-collection', 'collectionId');
        memberships.createIndex('by-media', 'mediaId');
        memberships.createIndex('by-collection-action', ['collectionId', 'action']);

        const prompts = db.createObjectStore('prompts', { keyPath: 'id' });
        prompts.createIndex('by-media', 'mediaId');
        prompts.createIndex('by-media-type', ['mediaId', 'type']);

        const analyses = db.createObjectStore('analyses', { keyPath: 'id' });
        analyses.createIndex('by-media', 'mediaId');
        analyses.createIndex('by-media-mode', ['mediaId', 'mode']);

        const profiles = db.createObjectStore('tasteProfiles', { keyPath: 'id' });
        profiles.createIndex('by-collection', 'collectionId');

        db.createObjectStore('settings', { keyPath: 'id' });
        db.createObjectStore('usage', { keyPath: 'date' });
      },
    });
  }
  return dbPromise;
}

// --- Collections ---
export async function listCollections(): Promise<Collection[]> {
  const db = await getDB();
  const all = await db.getAll('collections');
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getCollection(id: string) {
  const db = await getDB();
  return db.get('collections', id);
}

export async function saveCollection(c: Collection) {
  const db = await getDB();
  await db.put('collections', c);
  return c;
}

export async function deleteCollection(id: string) {
  const db = await getDB();
  const tx = db.transaction(['collections', 'memberships', 'tasteProfiles'], 'readwrite');
  await tx.objectStore('collections').delete(id);
  const memberships = await tx.objectStore('memberships').index('by-collection').getAllKeys(id);
  for (const key of memberships) {
    await tx.objectStore('memberships').delete(key);
  }
  const profiles = await tx.objectStore('tasteProfiles').index('by-collection').getAllKeys(id);
  for (const key of profiles) {
    await tx.objectStore('tasteProfiles').delete(key);
  }
  await tx.done;
}

// --- Media & Blobs ---
export async function saveMedia(record: MediaRecord, blob?: Blob) {
  const db = await getDB();
  const tx = db.transaction(['media', 'blobs'], 'readwrite');
  await tx.objectStore('media').put(record);
  if (blob && record.blobKey) {
    await tx.objectStore('blobs').put({
      key: record.blobKey,
      blob,
      createdAt: new Date().toISOString(),
    });
  }
  await tx.done;
  return record;
}

export async function getMedia(id: string) {
  const db = await getDB();
  return db.get('media', id);
}

export async function getMediaBlob(blobKey: string): Promise<Blob | undefined> {
  const db = await getDB();
  const entry = await db.get('blobs', blobKey);
  return entry?.blob;
}

export async function listMediaByOwner(ownerId: string) {
  const db = await getDB();
  return db.getAllFromIndex('media', 'by-owner', ownerId);
}

// --- Memberships / Swipes ---
export async function saveMembership(m: CollectionMembership) {
  const db = await getDB();
  await db.put('memberships', m);
  return m;
}

export async function getMembershipsForCollection(collectionId: string) {
  const db = await getDB();
  return db.getAllFromIndex('memberships', 'by-collection', collectionId);
}

export async function getSavedMediaIds(collectionId: string): Promise<string[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('memberships', 'by-collection-action', [collectionId, 'save']);
  return all.map((m) => m.mediaId);
}

export async function getPassedMediaIds(collectionId: string): Promise<string[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('memberships', 'by-collection-action', [collectionId, 'pass']);
  return all.map((m) => m.mediaId);
}

export async function undoLastMembership(collectionId: string): Promise<CollectionMembership | null> {
  const db = await getDB();
  const all = await db.getAllFromIndex('memberships', 'by-collection', collectionId);
  if (all.length === 0) return null;
  const sorted = all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const last = sorted[0];
  await db.delete('memberships', last.id);
  return last;
}

// --- Prompts ---
export async function savePrompt(p: PromptVersion) {
  const db = await getDB();
  await db.put('prompts', p);
  return p;
}

export async function getPromptsForMedia(mediaId: string) {
  const db = await getDB();
  return db.getAllFromIndex('prompts', 'by-media', mediaId);
}

export async function getPromptByType(mediaId: string, type: string) {
  const db = await getDB();
  return db.getFromIndex('prompts', 'by-media-type', [mediaId, type]);
}

// --- Analyses ---
export async function saveAnalysis(a: AnalysisResult) {
  const db = await getDB();
  await db.put('analyses', a);
  return a;
}

export async function getAnalysis(mediaId: string, mode: string) {
  const db = await getDB();
  return db.getFromIndex('analyses', 'by-media-mode', [mediaId, mode]);
}

export async function getAnalysesForMedia(mediaId: string) {
  const db = await getDB();
  return db.getAllFromIndex('analyses', 'by-media', mediaId);
}

// --- Taste Profiles ---
export async function saveTasteProfile(p: TasteProfile) {
  const db = await getDB();
  await db.put('tasteProfiles', p);
  return p;
}

export async function getTasteProfile(collectionId: string) {
  const db = await getDB();
  const all = await db.getAllFromIndex('tasteProfiles', 'by-collection', collectionId);
  return all[0] ?? null;
}

// --- Settings ---
export async function getSettings(): Promise<AppSettings> {
  const db = await getDB();
  const s = await db.get('settings', 'app');
  if (s) {
    const { id: _, ...rest } = s;
    return rest as AppSettings;
  }
  const defaults: AppSettings = {
    theme: 'system',
    demoMode: true,
    budget: {
      aiSpendingEnabled: false,
      dailyUsdLimit: 2,
      monthlyUsdLimit: 20,
      maxCostPerAction: 0.5,
      dailyAnalysisLimit: 20,
      dailyImageGenLimit: 10,
    },
  };
  await db.put('settings', { id: 'app', ...defaults });
  return defaults;
}

export async function saveSettings(settings: AppSettings) {
  const db = await getDB();
  await db.put('settings', { id: 'app', ...settings });
  return settings;
}

// --- Usage (local estimate only) ---
export async function getUsage(date: string) {
  const db = await getDB();
  return (
    (await db.get('usage', date)) ?? {
      date,
      incurredUsd: 0,
      reservedUsd: 0,
      analysisCount: 0,
      imageGenCount: 0,
    }
  );
}

export async function updateUsage(date: string, patch: Partial<UsageLedger>) {
  const db = await getDB();
  const current = await getUsage(date);
  const next = { ...current, ...patch };
  await db.put('usage', next);
  return next;
}
