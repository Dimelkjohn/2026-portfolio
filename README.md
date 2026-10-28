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
npm run evidence       # regenerate public/props and public/evidence from assets-src/evidence
```

## Project layout

```
src/
  App.tsx                 composes the board and the torch
  index.css               Tailwind import, design tokens, torch root variables
  components/
    board/                cork board (full viewport) + evidence layer
    evidence/             EvidenceItem (each kind of paper, fun-fact tag), Fastener (pins, tape)
    torch/                night overlay + beam that follows the pointer
  hooks/
    useTorch.ts           frame loop: pointer easing, sway, breathing, flicker
    useReducedMotion.ts   prefers-reduced-motion as a React value
  data/board.ts           board content (items + threads), filled zone by zone
  types/evidence.ts       EvidenceItem / Thread / BoardData model
  lib/cn.ts               class name helper
  test/setup.ts           jest-dom matchers, matchMedia stub
scripts/optimize-textures.mjs  builds the seamless cork tile (see below)
scripts/prepare-evidence.mjs   cuts tape strips, knocks out ink prints (see below)
public/textures/          generated web-sized textures (committed)
public/props/             masking-tape strips (committed)
public/evidence/          prints and photos pinned to the board (committed)
assets-src/               full-resolution originals, git-ignored (textures/, evidence/)
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

## How the evidence works

Every pinned thing is an `EvidenceItem` from `src/data/board.ts`, rendered by
`src/components/evidence/EvidenceItem.tsx`. Its `kind` picks the paper
(photo, polaroid, clipping, post-it, receipt, fingerprint card, a cutout
whose PNG is the paper, or a note: a photographed scrap of paper with
handwriting laid over it, inside an `inset` that keeps clear of any tape or
tab baked into the photo; `hand` picks Swanky and Moo Moo (`--font-note`) or
Rock Salt in capitals (`--font-note-caps`), and a `headline` is written big under it in Permanent Marker (`--font-marker`)), its `placement` is in percent of the board and is
written to custom properties so `evidence.css` owns the geometry, and its
`fastener` is a flat thumbtack (drawn inline as SVG, four colours, anywhere
along the top edge) or masking tape (one strip, two corners or four, any
length). The tacks are lit by the torch: each is drawn as if lit from
straight above, and `pinLighting.ts` rotates that drawing toward the beam
centre every frame (reading the `--torch-x/y` that `useTorch` writes), so
the bright rim, the glint and the contact shadow follow the light. The
glint fades as the beam moves off. Under reduced motion it updates only on
pointer moves. Items sit below the torch
layers, so they are lit like the cork. Hover or focus lifts the item a touch
and swings out a manila tag with the fun fact; the show and hide is pure
CSS. The paper is a `<button>` whenever there is something to reveal.

Clickable items (notes, for now) light up with a white halo on hover and
focus. Clicking one lifts it out of the board: `EvidenceLayer` renders a copy
in a fixed `<dialog>` above the night layer, spanning the viewport like the
board so the percent placement lands on the same spot, then on the next
frame translates and scales it to the centre (`liftFor`), pin or tape and
all, in one CSS transition. Click, Escape or the backdrop sends it back the
same way and the overlay is removed once the transition settles (or after a
fallback delay). Under reduced motion it snaps. An item with `labels` lifts
too, and once it has arrived its lab tags fade in: each is anchored to a
point on the paper in percent, sits above, below, left or right of it on a
short leader, and is sized in inverse proportion to the lift scale so it
reads at screen size. The handprint carries five, one strength per finger.

`npm run evidence` builds the assets from `assets-src/evidence`: it splits
the masking-tape sheet into strips by flood-filling the cream pixels, and
turns ink-on-white prints into ink-on-alpha so they multiply onto the
card's paper, cuts the note papers out of their black or white backgrounds
(flood-filled from the border, with the baked-in drop shadow faded rather
than kept), and prepares John's photos: every one gets the same vintage pass
(soften, lifted blacks and dulled whites, film grain, vignette), black and
white with a warm paper tone by default or faded colour on request, and
three are mounted in instant-film frames. The frames' windows are painted as a checkerboard or
plain white in the source, so the script finds each window by walking out
from the frame's centre until a band holds nothing as bright as the window,
knocks it out, and drops in the photo cropped to the window around the
subject (`position: attention`).

## How the thread works

`Threads.tsx` draws the red thread as one SVG over the evidence layer. The
data (`threads` in `src/data/board.ts`) only says which items are tied
together; the endpoints are measured from the DOM, the centre of each item's
pin or the top edge of taped paper, so moving an item moves its thread. A
thread only ties to a pin somebody can see: if another item covers the pin
(checked with `elementFromPoint`), that run is skipped, and a test keeps
every pinned item in the data tied to something. Each
run is a shallow quadratic curve (`thread.ts`): pulled straight by tension,
sagging a little under its own weight, with the sag varied per thread, and
held back a few pixels from each pin centre so it reads as tucked under the
head. A dark offset copy under the red gives it a hair of lift off the
paper. It sits above the items and below a hovered one, so paper you point
at comes up through the thread. Measured on mount, once more after the
first paint settles, and on resize; nothing runs per frame.

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

A fifth property, `--torch-power`, is 0 while the torch is off (no beam; the
board shows under the plain night darkness) and stutters up to 1 during the
switch-on, driven by the `lit` option of `useTorch`.

## How the sound works

All sound goes through one Web Audio engine, `src/audio/engine.ts`: a single
`AudioContext`, a master gain, a clip cache (fetch + decode once per URL)
and the autoplay unlock. Any new sound should take a channel from
`audio.channel(volume)` and load clips with `audio.load(url)` rather than
creating its own context; the browser caps contexts per tab and the unlock
must only happen once for everything.

Seamless looping lives in `src/audio/loop.ts`: repeats of a slice of a clip
are queued on the audio clock with a 0.35 s equal-power crossfade between
them, so there is no audible seam and no dependence on timers firing on
time. The first pass can start earlier in the clip than the loop (a lead-in).

Each object plays into its own bus of the engine (`torch`, `fly`, `music`),
and `src/audio/preferences.ts` holds one on/off switch per bus, remembered
in localStorage and shown as the switches in the top-right corner
(`src/components/sound/SoundControls.tsx`), under a master "All sound"
switch that reads on when every sound is on and turns all of them on or off
together. A muted sound keeps running, so the torch's light stays
in sync with its (silent) clip. Everything defaults to on.

Music (`src/audio/music.ts`, mounted by `src/components/music/Music.tsx`)
plays the tracks in `src/data/music.ts` (`public/audio/*.mp3`): one picked
at random when the page opens, then each one fading into the next over 3 s
as it ends, round the list for the whole visit. Tracks are streamed through
`<audio>` elements routed into the music bus, never decoded into memory.

The torch's clip is `public/audio/torch.mp3` (13 s): 0-1 s the switch
clicking on, 1-11 s the ambience of the torch running, 11-13 s the switch-off
(unused). `src/components/torch/torchSound.ts` plays the switch-on and the
first ambience run as one piece, then loops the 1-11 s slice. Cue points and
the level are constants at the top of that file.

The fly's buzz is `public/audio/fly.mp3` (7 s), looped from 1 s to the end
by `src/components/fly/flySound.ts` on its own muted channel. `Fly.tsx` sets
the channel level every frame from the distance between the cursor (the
beam centre) and the fly: full within 90 px, falling off squared to a faint
floor at 560 px and beyond, silent while the fly is out of sight. It waits
for the same autoplay unlock as the torch, so it simply starts once sound is
allowed.

Browsers refuse to play sound until the visitor has clicked, tapped or
pressed a key. `Torchlight` opens with no beam, asks the engine to unlock, and sets
`lit` the moment the switch-on actually starts playing, so the light and the
sound come on together. If the first attempt is refused (always the case on
a first visit) a faint "Click anywhere to switch on the torch" prompt appears
and the first gesture starts both. If Web Audio is unavailable or the clip
fails to load, the torch switches on silently rather than staying off.
Tests use the fake Web Audio in `src/test/fakeAudio.ts`.

## The fly (experimental, may be removed)

`src/components/fly/` puts a housefly on the board now and then. `flight.ts`
is a pure model: it rests out of sight, crosses the viewport in darts
(a fresh impulse every 70-220 ms, the odd hover), flips direction and
crosses back. `Fly.tsx` writes the pose to the DOM each frame: the sprite
(mirrored when flying right, tilted into its heading, slightly blurred at
speed), a shimmer
over the wings, a CSS keyframe that rocks the image +-18deg about a pivot on
the head at ~11 beats a second (the wing beat; pure CSS, no per-frame
JavaScript), and its shadow on the cork. The torch is at the viewer and hits
the board head-on, so the shadow (the sprite's blurred silhouette) sits
straight behind the fly, with a small fixed offset so it is not hidden by
the fly itself. The fly hangs nearer the viewer than the board, so the
shadow is enlarged 1.5-2.3x, soft and faint, more so the higher it drifts.
It does not move with the beam. The stage sits below the torch
layers, so the fly is only seen where the beam falls. Not rendered under
reduced motion. The sprite is `public/sprites/fly.png`, made from
`assets-src/sprites/fly-original.png` by trimming and resizing to 192 px.

## Roadmap

- [x] Initial load: cork board, night overlay, torchlight
- [x] Evidence items pinned to the board with hover tooltips (fun facts)
- [ ] Board content, zone by zone: centre hub, bottom-left and top-left in, the rest to come
- [x] Red thread between items converging on "who is John Dimelu?"
- [ ] Clickable items open a carousel for a closer look

## Before making the repo public

- Delete `docs/inspiration/` (watermarked stock photos, reference only) and
  commit the removal. The Figma draft in that folder can be kept elsewhere.
- Then: `gh repo edit Dimelkjohn/2026-portfolio --visibility public --accept-visibility-change-consequences`
