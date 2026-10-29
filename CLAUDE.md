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
from the DOM) in place. The carousel's seven files are filled (print, three-line
blurb, one-line stack, link or SEALED stamp); each print is built by the
pipeline's `exhibits` step and a file may hold several photographs that
play through. Until the torch is lit a shield seals the board from the
pointer, with a typed prompt. The right zone (the evidence bag with the
photo stack that opens the moonlighting pile) and the bottom centre (the
handshake that deals out the contact tags, résumé included) are in. The
top centre logistics zone is scrapped. A clue counter sits bottom-left and
a BOARD | SIMPLIFIED switch is taped to the board; the simplified view is
one typed sheet with a strip of the board, the hub sheet pinned over it and
the same facts as the board. Next: the résumé PDF in public/, facts on
hover for the photos, and a mobile layout. Data model in
`src/types/evidence.ts`; content goes in `src/data/board.ts`.

## Before the repo goes public

Delete `docs/inspiration/` first. It holds watermarked stock photos used only
as references. Do not make the repo public with that folder present.

## Favicon

`public/favicon.png` (and the flattened `apple-touch-icon.png`) is a big "?" in
Permanent Marker on the yellow square note. It was rendered in the browser
(canvas, with the web font loaded) because the image pipeline cannot reach
Google Fonts; to change it, redraw it the same way and resize with sharp.

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
  `fastener` (pin colour and position, or tape); a `kind: 'bag'` item is
  see-through plastic that never takes the pointer, and an item with
  `bagged: true` placed under it stays under the plastic on hover yet is
  clickable (the through-the-plastic look and its hover halo are baked into
  images by the pipeline's `bag` step, so nothing is filtered at runtime); new media goes through
  `npm run evidence`, never hand-copied into `public/`. Clicking a note lifts
  it to the centre (`EvidenceLayer`, a `<dialog>` portal above the torch
  layers); anything with `labels` (lab tags shown only when lifted) lifts too,
  and `clickable: true | false` on an item overrides both ways. `opens: 'work'`
  makes a click open the selected-work carousel instead (`WorkCarousel`, one
  shared stack of case files from `src/data/work.ts`; its index lives in
  `EvidenceLayer` so it keeps its place between visits, unless the item
  also names a file with `opensAt`, in which case it opens on that one). It opens by being
  dropped onto the desk and closes by being snatched toward its opener, all
  CSS keyframes keyed off `dossier--entering|settled|leaving`; reduced motion
  fades instead. The mechanics live in `Pile` (`src/components/work/Pile.tsx`)
  and are shared with `PhotoCarousel`, a pile of prints from
  `src/data/photos.ts` opened by `opens: 'photos'` (the photographs in the
  evidence bag); each print is the picture itself at its own shape (`ratio`,
  width over height, in the data) with its caption on a tag under the pile;
  a print with a `video` (YouTube id) shows its still until it
  is at the front, then plays in its place, and the pile lands and flips with
  paper sounds (`paperThud`, `paperFlip`). Print sources live in
  `assets-src/evidence/photos` and build with the `photos` step.
  `opens: 'contact'` (the handshake, bottom centre) deals out the ways to
  reach John from `src/data/contact.ts` as typed tags (`ContactSheet`). Handwriting on notes
  uses two Google fonts via tokens in `src/index.css`: `--font-note`
  (Swanky and Moo Moo, loose script) and `--font-note-caps` (Rock Salt,
  capitals only), chosen per note with `hand: 'script' | 'caps'`; a note's
  `headline` is written big in `--font-marker` (Permanent Marker). Pins are lit from
  the torch by `src/components/evidence/pinLighting.ts` (per-frame custom
  properties, same pattern as `useTorch`).
- A clue count sits bottom-left over the board (`src/components/clues`):
  every item a click does something with counts once when first opened
  (`interactive` in `src/components/evidence/interactive.ts` decides what
  counts; the view switch is not an item and does not).
- The site has two views, switched by the paper tag top-left (`ViewToggle`,
  remembered in localStorage by `src/components/view/viewPreference.ts`):
  the board, and `SimplifiedView`, one plain typed sheet built from the same
  data files (service record, selected work, moonlighting prints, contact).
  Anything added to the board's data should show up there too.
- All sound goes through the shared engine in `src/audio/engine.ts` (one
  AudioContext, master gain, clip cache, one autoplay unlock). New sounds
  take `audio.channel(volume, bus)` and `audio.load()`; never create another
  AudioContext. Each sound has a bus (`sfx` for the flashlight and the
  one-shot effects, `fly`, `music`) with an
  on/off switch in `src/audio/preferences.ts`, shown top-right by
  `SoundControls` under a master "All sound" switch that turns every sound on
  or off together; each switch is a marker tick (on) or red cross (off),
  ink marks from the pipeline's `marks` step, stamped down on change. One-shot effects go through `src/audio/sfx.ts` (`sfx.play('thud')`,
  the carousel's thud, flip and whoosh) on the `sfx` bus. Clips live in `public/audio/`. See README "How the sound works".
- Tests sit next to the code as `*.test.tsx`, using Testing Library queries
  by role/text first, `data-testid` only for presentational layers.
- Prettier: no semicolons, single quotes, width 100. Husky runs lint-staged on commit.
- Replacing a file in `public/textures` under the same name needs a hard
  reload (Ctrl+Shift+R) in the browser; the dev server does not bust the cache.
