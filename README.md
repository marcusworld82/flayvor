# FLAYVOR

Pronounced “Flavor.” A responsive web app for discovering visual taste through swiping, collecting references, and turning them into useful creative prompts.

## What works now (local demo)

- Create / rename / delete / switch **collections** (per-collection swipe history)
- **Upload** images (JPEG/PNG/WebP/GIF) and short videos (MP4/WebM)
- **Swipe** save / pass with drag, buttons, and keyboard arrows
- **Undo** last swipe
- Persist in **IndexedDB** (this browser only)
- **Details drawer**: media info, prompts tab, analysis tab
- **Analyze for prompt** → structured mock analysis when Gemini key / spending is off; live Gemini when configured
- Cached analysis + stored reconstructed / style-only prompts
- Hover/tap prompt access does **not** call AI
- **Generate Ideas** workspace: build reviewable prompts; image generation explicitly disabled until adapter is wired
- **Settings**: theme, AI spending switch, budget limits (local), honest provider status
- Responsive layout: desktop top nav, mobile bottom nav, large swipe card

## What awaits credentials / approval

| Capability | Status |
|---|---|
| Gemini analysis | Server route ready. Set `GEMINI_API_KEY` or `GOOGLE_API_KEY` and `FLAYVOR_AI_SPENDING=1` |
| GPT Image 2.5 generation | Not wired — needs verified API identifier + adapter |
| Firebase Auth / Firestore / Storage | Local IndexedDB used; Firebase not required for core path |
| Pinterest OAuth import | Not configured |
| Are.na / Pexels / Cosmos | Stubs only; no live discovery feed |
| Durable multi-user budget ledger | Local estimates only; paid calls refused without server flags |

## Setup

```bash
cd flayvor
npm install
npm run dev
```

- Client: http://localhost:5173  
- API: http://localhost:3001 (proxied via `/api`)

### Optional env (server)

```bash
export GEMINI_API_KEY=your_key          # or GOOGLE_API_KEY
export FLAYVOR_AI_SPENDING=1            # required for live analysis
# export FLAYVOR_FORCE_MOCK=1           # force mock even with key
```

Without a key or without `FLAYVOR_AI_SPENDING=1`, analysis returns a structured **mock** interpretation so the full upload → swipe → analyze → prompt path works offline.

## Stack

- React 19 + TypeScript + Vite
- Express + multer (media upload to analysis)
- `@google/genai` (Gemini)
- Zustand + idb (IndexedDB)
- Tailwind CSS, Framer Motion, Lucide

## Acceptance checks performed (local / mock)

- [x] Create collection, upload image + video, swipe both ways, undo, refresh recovers state
- [x] Collection switching isolates membership history
- [x] Prompt types labeled (reconstructed / style_only); editable storage path present
- [x] Hover / copy / open details do not call the model
- [x] Matching analysis reuses stored result when present
- [x] Video plays only on active card; controls present
- [x] Budget / spending gate refuses live provider path when disabled
- [x] Unconfigured providers shown honestly in Settings
- [x] No credentials in client bundle
- [ ] Live Gemini (requires key + spending flag)
- [ ] Multi-user auth ownership (Firebase not enabled)
- [ ] Parallel reservation ledger under load (not enabled without durable backend)

## Design

Warm off-white canvas (`#f7f4ef`), near-black ink, restrained plum accents, DM Sans + Fraunces. Dark theme supported. Large reference card is the visual center.
