# Dimelu 2026 Portfolio

Portfolio for John Dimelu, frontend and full-stack engineer, UI/UX designer.
The whole site is a detective evidence board: pinned photos, newspaper
clippings and post-it notes joined by red thread, viewed at night by torchlight.

Repo: https://github.com/Dimelkjohn/2026-portfolio (private while in progress).

## Stack

| Concern    | Choice                                          |
| ---------- | ----------------------------------------------- |
| Framework  | React 19 + TypeScript (strict), Vite 8          |
| Styling    | Tailwind v4 (`@theme` tokens) + plain CSS files |
| Motion     | `motion` (Framer Motion), CSS custom properties |
| Images     | `sharp` build script for textures               |
| Tests      | Vitest + Testing Library (jsdom)                |
| Lint / fmt | oxlint, Prettier (Tailwind class sorting)       |
| Git hooks  | Husky + lint-staged on pre-commit               |

## Scripts

```sh
npm run dev            # start the dev server (http://localhost:5173)
npm run build          # typecheck + production build to dist/
npm run preview        # serve the production build
npm run check          # typecheck + lint + format check + tests
npm run test:watch     # vitest in watch mode
npm run lint:fix       # oxlint with autofix
npm run format         # prettier --write .
npm run textures       # regenerate public/textures from assets-src/textures
```

## Project layout

```
src/
  App.tsx                 composes the board and the torch
  index.css               Tailwind import, design tokens, torch root variables
  components/
    board/                cork board (full viewport) + evidence layer
    torch/                night overlay + beam that follows the pointer
  hooks/
    useTorch.ts           frame loop: pointer easing, sway, breathing, flicker
    useReducedMotion.ts   prefers-reduced-motion as a React value
  data/board.ts           board content (items + threads), empty for now
  types/evidence.ts       EvidenceItem / Thread / BoardData model
  lib/cn.ts               class name helper
  test/setup.ts           jest-dom matchers, matchMedia stub
scripts/optimize-textures.mjs  builds the seamless cork tile (see below)
public/textures/          generated web-sized textures (committed)
assets-src/textures/      full-resolution originals, git-ignored (35 MB)
docs/inspiration/         reference images for the look (see note below)
```

## How the board works

The cork is one 1600x1068 JPEG tile built by `npm run textures` from the
original photo in `assets-src/textures`. The script flattens the photo's
lighting (subtracts a heavy blur), then makes it tileable with a
contrast-preserving offset blend, so repeats show no grid, seams or soft
bands. There is no mirroring. The CSS tiles it at `--cork-tile-size`
(1000px, in `src/index.css`); smaller means finer grain. A large soft-light
mottle layer sits on top to break any residual repetition, and a procedural
noise layer underneath is the fallback if the photo fails to load.

## How the torch works

`useTorch` runs a `requestAnimationFrame` loop and writes four custom
properties to `:root` each frame: `--torch-x` / `--torch-y` (beam centre,
eased toward the pointer with an 85ms time constant plus a few px of
hand-held sway), `--torch-scale` (slow breathing of the radius) and
`--torch-intensity` (random flicker bursts every 2.5-9s, floor 0.55, never
off). No React state is touched per frame.

Three fixed layers read those variables: a soft-light warm spill, a
screen-blended hotspot with corona and reflector rings and an orange edge
fringe, and the dark overlay whose radial mask punches out the beam. The
page cursor is hidden; the beam is the cursor. Reduced motion snaps the beam
and holds it steady; touch devices get a wider, lighter beam. Knobs live at
the top of `src/hooks/useTorch.ts` and in `src/index.css`.

## Roadmap

- [x] Initial load: cork board, night overlay, torchlight
- [ ] Evidence items pinned to the board with hover tooltips (fun facts)
- [ ] Red thread between items converging on "who is John Dimelu?"
- [ ] Clickable items open a carousel for a closer look

## Before making the repo public

- Delete `docs/inspiration/` (watermarked stock photos, reference only) and
  commit the removal. The Figma draft in that folder can be kept elsewhere.
- Then: `gh repo edit Dimelkjohn/2026-portfolio --visibility public --accept-visibility-change-consequences`
