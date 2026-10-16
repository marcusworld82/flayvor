export type MediaType = 'image' | 'video';

export type MediaSource =
  | 'upload'
  | 'pixabay'
  | 'unsplash'
  | 'openverse'
  | 'pexels'
  | 'are.na'
  | 'pinterest'
  | 'cosmos'
  | 'generated'
  | 'sample';

export type SwipeAction = 'save' | 'pass';

export type AnalysisMode = 'standard' | 'detailed';

export type PromptType = 'original' | 'reconstructed' | 'style_only' | 'adapted';

export type Field =
  | 'branding'
  | 'websites'
  | 'product'
  | 'fashion'
  | 'interiors'
  | 'motion'
  | 'music_video'
  | 'custom';

export interface Collection {
  id: string;
  name: string;
  purpose?: string;
  field: Field;
  styleKeywords: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaRecord {
  id: string;
  type: MediaType;
  source: MediaSource;
  /** Local blob URL or data URL for demo; or remote URL when available */
  url: string;
  /** For IndexedDB blob storage key */
  blobKey?: string;
  thumbnailUrl?: string;
  filename?: string;
  mimeType: string;
  width?: number;
  height?: number;
  durationSec?: number;
  sizeBytes?: number;
  /** Original external URL if imported */
  originalUrl?: string;
  creator?: string;
  sourceLabel?: string;
  hash?: string;
  createdAt: string;
  /** User who owns this media (local demo: "local") */
  ownerId: string;
}

export interface CollectionMembership {
  id: string;
  collectionId: string;
  mediaId: string;
  action: SwipeAction;
  tags?: PreferenceTag[];
  createdAt: string;
  updatedAt: string;
}

export interface PreferenceTag {
  category: 'subject' | 'color' | 'lighting' | 'composition' | 'texture' | 'typography' | 'camera_movement' | 'pacing' | 'transitions';
  value: string;
}

export interface PromptVersion {
  id: string;
  mediaId: string;
  type: PromptType;
  content: string;
  model?: string;
  settings?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
}

export interface AnalysisResult {
  id: string;
  mediaId: string;
  mode: AnalysisMode;
  schemaVersion: string;
  model: string;
  /** Structured analysis */
  subject?: string;
  composition?: string;
  palette?: string[];
  lighting?: string;
  texture?: string;
  mood?: string;
  typography?: string;
  medium?: string;
  styleTraits?: string[];
  reconstructedPrompt?: string;
  styleOnlyPrompt?: string;
  /** Video-specific */
  shots?: Array<{
    timestamp: string;
    description: string;
    camera?: string;
  }>;
  pacing?: string;
  cameraMovement?: string;
  transitions?: string;
  audioNotes?: string;
  loopBehavior?: string;
  overallPrompt?: string;
  shotPrompts?: string[];
  editingNotes?: string;
  /** Coverage disclosure */
  coverageNote?: string;
  createdAt: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    estimatedCostUsd?: number;
  };
}

export interface TasteProfile {
  id: string;
  collectionId: string;
  traits: Array<{
    category: string;
    value: string;
    evidenceMediaIds: string[];
    confidence: 'sparse' | 'moderate' | 'strong';
    userCorrected?: boolean;
  }>;
  clusters?: Array<{
    name: string;
    traitIds: string[];
    mediaIds: string[];
  }>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetSettings {
  aiSpendingEnabled: boolean;
  dailyUsdLimit: number;
  monthlyUsdLimit: number;
  maxCostPerAction: number;
  dailyAnalysisLimit: number;
  dailyImageGenLimit: number;
  preferredProvider?: string;
  preferredModel?: string;
}

export interface UsageLedger {
  date: string; // YYYY-MM-DD
  incurredUsd: number;
  reservedUsd: number;
  analysisCount: number;
  imageGenCount: number;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  budget: BudgetSettings;
  demoMode: boolean;
}

export const STARTER_FIELDS: { value: Field; label: string }[] = [
  { value: 'branding', label: 'Branding and graphic design' },
  { value: 'websites', label: 'Websites and UI' },
  { value: 'product', label: 'Product photography' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'interiors', label: 'Interiors and real estate' },
  { value: 'motion', label: 'Motion graphics' },
  { value: 'music_video', label: 'Music videos' },
  { value: 'custom', label: 'Custom' },
];

export const PREFERENCE_CATEGORIES = [
  'subject',
  'color',
  'lighting',
  'composition',
  'texture',
  'typography',
  'camera_movement',
  'pacing',
  'transitions',
] as const;
