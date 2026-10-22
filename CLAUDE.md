# Dimelu 2026 Portfolio

Portfolio site styled as a detective evidence board (cork board, pinned
evidence, red thread, torchlight at night). See README.md for the stack.

## Commands

- `npm run dev` / `npm run build` / `npm run check` (typecheck + lint + format + tests)
- `npm test` runs Vitest once; `npm run test:watch` for watch mode.

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
- Tests sit next to the code as `*.test.tsx`, using Testing Library queries
  by role/text first, `data-testid` only for presentational layers.
- Prettier: no semicolons, single quotes, width 100. Husky runs lint-staged on commit.
