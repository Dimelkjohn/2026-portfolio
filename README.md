# Dimelu 2026 Portfolio

Portfolio for John Dimelu, frontend and full-stack engineer, UI/UX designer.
The whole site is a detective evidence board: pinned photos, newspaper
clippings and post-it notes joined by red thread, viewed at night by torchlight.

## Stack

| Concern    | Choice                                          |
| ---------- | ----------------------------------------------- |
| Framework  | React 19 + TypeScript (strict), Vite 8          |
| Styling    | Tailwind v4 (`@theme` tokens) + plain CSS files |
| Motion     | `motion` (Framer Motion), CSS custom properties |
| Tests      | Vitest + Testing Library (jsdom)                |
| Lint / fmt | oxlint, Prettier (Tailwind class sorting)       |
| Git hooks  | Husky + lint-staged on pre-commit               |

## Scripts

```sh
npm run dev            # start the dev server
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
    useTorch.ts           pointer tracking -> --torch-x/--torch-y on :root
    useReducedMotion.ts   prefers-reduced-motion as a React value
  data/board.ts           board content (items + threads), empty for now
  types/evidence.ts       EvidenceItem / Thread / BoardData model
  lib/cn.ts               class name helper
  test/setup.ts           jest-dom matchers, matchMedia stub
public/textures/          generated web-sized textures (npm run textures)
assets-src/textures/      full-resolution originals, git-ignored
scripts/optimize-textures.mjs  sharp script that fills public/textures
docs/inspiration/         reference images for the look
```

## How the torch works

`useTorch` listens for `pointermove` and eases the beam toward the pointer in a
`requestAnimationFrame` loop, writing `--torch-x` and `--torch-y` directly to
`:root`. No React state is touched per move. Two fixed layers read those
variables: a warm soft-light glow and a dark overlay with a radial mask that
punches the hole. A registered `--torch-flicker` property animates the radius
for a hand-held feel. Reduced motion disables the lag and the flicker; touch
devices get a wider, lighter beam.

## Roadmap

- [x] Initial load: cork board, night overlay, torchlight
- [ ] Evidence items pinned to the board with hover tooltips (fun facts)
- [ ] Red thread between items converging on "who is John Dimelu?"
- [ ] Clickable items open a carousel for a closer look
