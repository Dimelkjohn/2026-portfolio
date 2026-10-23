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
torch and buzzes louder as the cursor nears it. Next up, in order: evidence items with
hover tooltips (fun facts), red thread converging on a centre post-it cluster
("who is John Dimelu?"), then a carousel for clickable items. The data model
for all of that already exists in `src/types/evidence.ts`; content goes in
`src/data/board.ts`.

## Before the repo goes public

Delete `docs/inspiration/` first. It holds watermarked stock photos used only
as references. Do not make the repo public with that folder present.

## Commands

- `npm run dev` / `npm run build` / `npm run check` (typecheck + lint + format + tests)
- `npm test` runs Vitest once; `npm run test:watch` for watch mode.
- `npm run textures` rebuilds `public/textures` from `assets-src/textures` (git-ignored originals).
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
  typed by `src/types/evidence.ts`, not in components.
- All sound goes through the shared engine in `src/audio/engine.ts` (one
  AudioContext, master gain, clip cache, one autoplay unlock). New sounds
  take `audio.channel(volume, bus)` and `audio.load()`; never create another
  AudioContext. Each object has a bus (`torch`, `fly`, `music`) with an
  on/off switch in `src/audio/preferences.ts`, shown top-right by
  `SoundControls`. Clips live in `public/audio/`. See README "How the sound works".
- Tests sit next to the code as `*.test.tsx`, using Testing Library queries
  by role/text first, `data-testid` only for presentational layers.
- Prettier: no semicolons, single quotes, width 100. Husky runs lint-staged on commit.
- Replacing a file in `public/textures` under the same name needs a hard
  reload (Ctrl+Shift+R) in the browser; the dev server does not bust the cache.
