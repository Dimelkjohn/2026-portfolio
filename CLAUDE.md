# Dimelu 2026 Portfolio

Portfolio site styled as a detective evidence board (cork board, pinned
evidence, red thread, torchlight at night). See README.md for the stack,
layout, and how the board and torch work.

Remote: https://github.com/Dimelkjohn/2026-portfolio (private, branch `master`).

## Status

Done: initial load (cork board texture, night overlay, torch beam with lag,
sway, breathing and random flicker), and sound: the page opens as the
darkened board with no beam, a click plays the torch switch-on clip and the
beam comes on with it, then the
clip's ambience loops for the whole visit. Experimental and may be removed: a
housefly (`src/components/fly/`) that darts across the board under the
torch and buzzes louder as the cursor nears it. Background music: two tracks
in `src/data/music.ts`, random first, then alternating with a crossfade.
Evidence items with hover tooltips (fun facts) are built
(`src/components/evidence/`); the board is being filled zone by zone, with the
bottom-left (identifying marks, notes written as the office's reads on John,
handprint with five strengths) and the top-left photos (vintage B&W, three
in instant-film frames), the centre hub (one torn sheet asking "who is John Dimelu"), the top-right
known employment (a press cutting per job, each opening the selected-work
carousel in `src/components/work/`, a stack of files on a scanned
manila folder; each cutting is a scanned torn newspaper with its headline
printed on the blank patch, the oldest tinted tan; and a service record
receipt on creased till paper) and the red thread (`src/components/evidence/Threads.tsx`, endpoints measured
from the DOM) in place. Next: the other zones (top centre logistics,
right design work, bottom centre contact and résumé), media and copy for
the exhibits in the carousel, facts on hover for the photos, and a mobile layout. Data model in
`src/types/evidence.ts`; content goes in `src/data/board.ts`.

## Before the repo goes public

Delete `docs/inspiration/` first. It holds watermarked stock photos used only
as references. Do not make the repo public with that folder present.

## Commands

- `npm run dev` / `npm run build` / `npm run check` (typecheck + lint + format + tests)
- `npm test` runs Vitest once; `npm run test:watch` for watch mode.
- `npm run textures` rebuilds `public/textures` from `assets-src/textures` (git-ignored originals).
- `npm run evidence` rebuilds `public/props` (tape) and `public/evidence` (prints, photos)
  from `assets-src/evidence` (git-ignored originals, copied from the user's media folder).
- GitHub CLI is installed at `C:\Program Files\GitHub CLI\gh.exe` and logged in as Dimelkjohn.

## Conventions

- TypeScript strict, `@/` maps to `src/`. Named exports for components.
- Styling: Tailwind utilities for layout; bespoke visual effects live in a
  co-located `.css` file next to the component (board.css, torchlight.css).
  Design tokens go in the `@theme` block in `src/index.css`.
- Per-frame visual updates write CSS custom properties directly to the DOM
  (see `useTorch`); never route pointer movement through React state.
- Respect `prefers-reduced-motion` for any new animation (`useReducedMotion`).
- Board content (items, fun facts, threads) belongs in `src/data/board.ts`,
  typed by `src/types/evidence.ts`, not in components. Every item has a
  `fastener` (pin colour and position, or tape); new media goes through
  `npm run evidence`, never hand-copied into `public/`. Clicking a note lifts
  it to the centre (`EvidenceLayer`, a `<dialog>` portal above the torch
  layers); anything with `labels` (lab tags shown only when lifted) lifts too,
  and `clickable: true | false` on an item overrides both ways. `opens: 'work'`
  makes a click open the selected-work carousel instead (`WorkCarousel`, one
  shared stack of case files from `src/data/work.ts`; its index lives in
  `EvidenceLayer` so it keeps its place between visits). It opens by being
  dropped onto the desk and closes by being snatched toward its opener, all
  CSS keyframes keyed off `dossier--entering|settled|leaving`; reduced motion
  fades instead. Handwriting on notes
  uses two Google fonts via tokens in `src/index.css`: `--font-note`
  (Swanky and Moo Moo, loose script) and `--font-note-caps` (Rock Salt,
  capitals only), chosen per note with `hand: 'script' | 'caps'`; a note's
  `headline` is written big in `--font-marker` (Permanent Marker). Pins are lit from
  the torch by `src/components/evidence/pinLighting.ts` (per-frame custom
  properties, same pattern as `useTorch`).
- All sound goes through the shared engine in `src/audio/engine.ts` (one
  AudioContext, master gain, clip cache, one autoplay unlock). New sounds
  take `audio.channel(volume, bus)` and `audio.load()`; never create another
  AudioContext. Each object has a bus (`torch`, `fly`, `music`) with an
  on/off switch in `src/audio/preferences.ts`, shown top-right by
  `SoundControls` under a master "All sound" switch that turns every sound on
  or off together. Clips live in `public/audio/`. See README "How the sound works".
- Tests sit next to the code as `*.test.tsx`, using Testing Library queries
  by role/text first, `data-testid` only for presentational layers.
- Prettier: no semicolons, single quotes, width 100. Husky runs lint-staged on commit.
- Replacing a file in `public/textures` under the same name needs a hard
  reload (Ctrl+Shift+R) in the browser; the dev server does not bust the cache.
