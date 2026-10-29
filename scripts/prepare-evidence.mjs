/**
 * Turns the raw evidence media in assets-src/evidence into web assets:
 *
 *   npm run evidence
 *
 *   public/props/tape/tape-NN.png   each strip of masking tape from the tape
 *                                   sheet, background removed, cropped
 *   public/evidence/me-*             John's photos, vintage black and white, some
 *                                   mounted in instant-film frames
 *   public/evidence/*.png|webp      ink prints with the white paper knocked
 *                                   out to alpha, photos resized, and note
 *                                   papers (assets-src/evidence/notes) cut out
 *   public/evidence/bag.webp        the evidence bag (assets-src/evidence/bag.png,
 *                                   already cut out), its flat plastic made
 *                                   see-through so the cork shows inside it,
 *                                   with its shadow on the cork baked in
 *   public/evidence/mark-arrow-red.png the marker arrow drawn on the "examine
 *                                   photos" note, and mark-moon.png the moon
 *                                   on the "moonlighting" label (their own
 *                                   step, `marks`, so adding a mark does not
 *                                   regrind the notes)
 *   public/evidence/photo-stack.webp the pile of prints that goes in the bag,
 *                                   finished here as seen through the plastic:
 *                                   softened, bent along the bag's creases,
 *                                   shaded by them, darks deeper and whites
 *                                   dulled, with its three-layer shadow under
 *                                   it. All of it is baked so the page draws a
 *                                   plain image and filters nothing per frame.
 *   public/evidence/photo-stack-glow.webp the white halo the pile shows on
 *                                   hover: its silhouette blurred four ways,
 *                                   faded in as a texture instead of being
 *                                   blurred live, which stalled the frame
 *   public/evidence/handshake.jpg   the make-contact print (assets-src/evidence/me),
 *                                   the same vintage pass as John's photos
 *   public/evidence/photos/*.webp   the prints in the moonlighting pile
 *                                   (assets-src/evidence/photos: the designs
 *                                   and the film stills), resized whole
 *   public/evidence/work-*.webp     the photograph in each selected-work file
 *                                   (assets-src/evidence/work), resized whole;
 *                                   the sheet crops it to the print box from
 *                                   its top left
 *
 * One step alone: node scripts/prepare-evidence.mjs exhibits
 *
 * Originals are never modified. Sources are git-ignored; outputs are committed.
 */
import { mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const SRC = path.resolve('assets-src/evidence')
const PROPS = path.resolve('public/props')
const OUT = path.resolve('public/evidence')

const clamp = (v, lo = 0, hi = 255) => (v < lo ? lo : v > hi ? hi : v)
const src = (name) => path.join(SRC, name)

// ---- Tape -------------------------------------------------------------------

/**
 * The tape sheet is cream strips on white. Alpha comes from how far a pixel's
 * blue channel sits below its brightest channel: white has none, the cream
 * tape has plenty, whatever the lighting. Strips are then split apart by
 * flood-filling connected opaque regions.
 */
async function tape() {
  const { data, info } = await sharp(src('adhesive-sticky-tape-cover.jpg'))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width, height } = info
  const rgba = Buffer.alloc(width * height * 4)
  for (let p = 0, i = 0; p < width * height; p++, i += 3) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const warmth = Math.max(r, g) - b
    const alpha = clamp(((warmth - 8) / 28) * 255)
    rgba[p * 4] = r
    rgba[p * 4 + 1] = g
    rgba[p * 4 + 2] = b
    rgba[p * 4 + 3] = alpha
  }

  // Connected components over alpha > 96, 4-connected.
  const label = new Int32Array(width * height).fill(-1)
  const boxes = []
  const stack = []
  for (let start = 0; start < width * height; start++) {
    if (label[start] !== -1 || rgba[start * 4 + 3] <= 96) continue
    const id = boxes.length
    const box = { x0: width, y0: height, x1: 0, y1: 0, n: 0 }
    boxes.push(box)
    stack.push(start)
    label[start] = id
    while (stack.length) {
      const p = stack.pop()
      const x = p % width
      const y = (p - x) / width
      box.n++
      if (x < box.x0) box.x0 = x
      if (x > box.x1) box.x1 = x
      if (y < box.y0) box.y0 = y
      if (y > box.y1) box.y1 = y
      const neighbours = [p - 1, p + 1, p - width, p + width]
      if (x === 0) neighbours[0] = -1
      if (x === width - 1) neighbours[1] = -1
      for (const q of neighbours) {
        if (q < 0 || q >= width * height || label[q] !== -1 || rgba[q * 4 + 3] <= 96) continue
        label[q] = id
        stack.push(q)
      }
    }
  }

  const strips = boxes
    .map((b, id) => ({ ...b, id }))
    .filter((b) => b.n > 400)
    .sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0)

  const dir = path.join(PROPS, 'tape')
  await mkdir(dir, { recursive: true })
  const pad = 3
  let n = 0
  for (const s of strips) {
    n++
    const left = Math.max(0, s.x0 - pad)
    const top = Math.max(0, s.y0 - pad)
    const w = Math.min(width, s.x1 + pad + 1) - left
    const h = Math.min(height, s.y1 + pad + 1) - top
    // Keep this strip's pixels plus its soft edge (within 2px of it), nothing else.
    const near = (p) => {
      const x = p % width
      const y = (p - x) / width
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const xx = x + dx
          const yy = y + dy
          if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue
          if (label[yy * width + xx] === s.id) return true
        }
      }
      return false
    }
    const crop = Buffer.alloc(w * h * 4)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = (top + y) * width + (left + x)
        const o = (y * w + x) * 4
        crop[o] = rgba[p * 4]
        crop[o + 1] = rgba[p * 4 + 1]
        crop[o + 2] = rgba[p * 4 + 2]
        crop[o + 3] = label[p] === s.id || (rgba[p * 4 + 3] > 0 && near(p)) ? rgba[p * 4 + 3] : 0
      }
    }
    const name = `tape-${String(n).padStart(2, '0')}.png`
    await sharp(crop, { raw: { width: w, height: h, channels: 4 } })
      .png({ compressionLevel: 9 })
      .toFile(path.join(dir, name))
    console.log(`tape  ${name}  ${w}x${h}`)
  }
}

// ---- Prints and photos --------------------------------------------------------

/**
 * Ink on white paper becomes ink on alpha: alpha = darkness (and any alpha the
 * source already had), colour forced to ink so the paper beneath shows through.
 */
/**
 * `gain` multiplies the darkness-to-alpha mapping: >1 makes light strokes
 * (crayon) read heavier. `alphaGain` multiplies alpha the source already has,
 * for faint strokes drawn on transparency.
 */
async function ink(
  file,
  out,
  { width, ink: inkColour = [20, 18, 18], trim = false, gain = 1, alphaGain = 1 } = {},
) {
  let img = sharp(src(file)).ensureAlpha()
  if (width) img = img.resize({ width, withoutEnlargement: true })
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
  for (let i = 0; i < data.length; i += 4) {
    const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    const darkness = clamp((((255 - luma) / 255 - 0.06) / 0.9) * gain) * 255
    data[i + 3] = Math.min(Math.round(data[i + 3] * alphaGain), 255, Math.round(darkness))
    data[i] = inkColour[0]
    data[i + 1] = inkColour[1]
    data[i + 2] = inkColour[2]
  }
  let result = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  if (trim) result = result.trim({ threshold: 8 })
  const written = await result.png({ compressionLevel: 9 }).toFile(path.join(OUT, out))
  console.log(`ink   ${out}  ${written.width}x${written.height}`)
}

/**
 * Photos. `bw` makes a hard black-and-white print: greyscale, then contrast
 * stretched about mid-grey, the way old crime-scene photos were printed.
 */
async function photo(file, out, { width = 720, quality = 80, bw = false } = {}) {
  let img = sharp(src(file)).resize({ width, withoutEnlargement: true })
  if (bw)
    img = img
      .greyscale()
      .linear(1.45, -0.45 * 128)
      .normalise()
  const info = await img.webp({ quality }).toFile(path.join(OUT, out))
  console.log(`photo ${out}  ${info.width}x${info.height}`)
}

async function copyPng(file, out, { width } = {}) {
  let img = sharp(src(file))
  if (width) img = img.resize({ width, withoutEnlargement: true })
  const info = await img.png({ compressionLevel: 9 }).toFile(path.join(OUT, out))
  console.log(`png   ${out}  ${info.width}x${info.height}`)
}

// ---- Notes ----------------------------------------------------------------------

const NOTES = path.join(SRC, 'notes')
const note = (name) => path.join(NOTES, name)

/** Flood-fill the background in from the image border through pixels that pass `isBg`. */
function floodBackground(width, height, isBg) {
  const n = width * height
  const bg = new Uint8Array(n)
  const stack = []
  const push = (p) => {
    if (bg[p] || !isBg(p)) return
    bg[p] = 1
    stack.push(p)
  }
  for (let x = 0; x < width; x++) {
    push(x)
    push((height - 1) * width + x)
  }
  for (let y = 0; y < height; y++) {
    push(y * width)
    push(y * width + width - 1)
  }
  while (stack.length) {
    const p = stack.pop()
    const x = p % width
    if (x > 0) push(p - 1)
    if (x < width - 1) push(p + 1)
    if (p >= width) push(p - width)
    if (p < n - width) push(p + width)
  }
  return bg
}

/** Paper photographed on black: alpha from brightness, then trim. */
async function noteOnBlack(file, out, { width = 700 } = {}) {
  const { data, info } = await sharp(note(file))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const rgba = Buffer.alloc(info.width * info.height * 4)
  for (let p = 0, i = 0; i < data.length; p++, i += 3) {
    const bright = Math.max(data[i], data[i + 1], data[i + 2])
    rgba[p * 4] = data[i]
    rgba[p * 4 + 1] = data[i + 1]
    rgba[p * 4 + 2] = data[i + 2]
    rgba[p * 4 + 3] = clamp(((bright - 8) / 28) * 255)
  }
  const result = await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 8 })
    .resize({ width, withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, out))
  console.log(`note  ${out}  ${result.width}x${result.height}`)
}

/**
 * Paper photographed on white, with a soft drop shadow baked in. The
 * background is the neutral near-white region connected to the border; the
 * shadow is the neutral grey fringe next to it, faded out by brightness so
 * only a hint remains. Coloured pixels (the paper) stay opaque, and so does
 * anything neutral away from the edge (the tape).
 */
async function noteOnWhite(file, out, { width = 700, bgLuma = 245, tint, src = note } = {}) {
  const { data, info } = await sharp(src(file))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  const luma = (p) => 0.299 * data[p * 3] + 0.587 * data[p * 3 + 1] + 0.114 * data[p * 3 + 2]
  const neutral = (p) =>
    Math.max(data[p * 3], data[p * 3 + 1], data[p * 3 + 2]) -
      Math.min(data[p * 3], data[p * 3 + 1], data[p * 3 + 2]) <
    14
  const bg = floodBackground(w, h, (p) => neutral(p) && luma(p) > bgLuma)
  // Distance-to-background, up to 8px, by repeated dilation.
  const FRINGE = 8
  let edge = bg
  const near = new Uint8Array(w * h)
  for (let d = 0; d < FRINGE; d++) {
    const next = new Uint8Array(w * h)
    for (let p = 0; p < w * h; p++) {
      if (edge[p]) {
        next[p] = 1
        continue
      }
      const x = p % w
      if (
        (x > 0 && edge[p - 1]) ||
        (x < w - 1 && edge[p + 1]) ||
        (p >= w && edge[p - w]) ||
        (p < w * h - w && edge[p + w])
      ) {
        next[p] = 1
        near[p] = 1
      }
    }
    edge = next
  }
  const rgba = Buffer.alloc(w * h * 4)
  for (let p = 0; p < w * h; p++) {
    rgba[p * 4] = data[p * 3]
    rgba[p * 4 + 1] = data[p * 3 + 1]
    rgba[p * 4 + 2] = data[p * 3 + 2]
    let a = 255
    if (bg[p]) a = 0
    else if (near[p] && neutral(p) && luma(p) > 200) a = clamp(((246 - luma(p)) / 46) * 255)
    rgba[p * 4 + 3] = a
  }
  let sheet = sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .trim({ threshold: 8 })
    .resize({ width, withoutEnlargement: true })
  if (tint) sheet = sheet.tint(tint)
  const result = await sheet.png({ compressionLevel: 9 }).toFile(path.join(OUT, out))
  console.log(`note  ${out}  ${result.width}x${result.height}`)
}

/** Already transparent: trim and shrink. */
async function noteReady(file, out, { width = 700, src = note } = {}) {
  const result = await sharp(src(file))
    .trim({ threshold: 8 })
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(path.join(OUT, out))
  console.log(`note  ${out}  ${result.width}x${result.height}`)
}

/**
 * Crumpled paper as a light multiply layer: greyscale, stretched to full
 * range, then lifted so the flats sit near white and only the creases darken
 * whatever paper colour sits under it.
 */
async function wrinkle(file, out, { width = 1000 } = {}) {
  // Two passes: sharp applies normalise late in its pipeline, after linear.
  const spread = await sharp(note(file))
    .resize({ width, withoutEnlargement: true })
    .greyscale()
    .normalise()
    .toBuffer()
  const result = await sharp(spread)
    .linear(0.22, 200)
    .webp({ quality: 80 })
    .toFile(path.join(OUT, out))
  console.log(`paper ${out}  ${result.width}x${result.height}`)
}

async function notes() {
  // Marker scribbles that go on the notes, knocked out to ink on alpha.
  await ink(
    'notes/black-ink-shape-watercolor-paper-texture_1194-206953.avif',
    'mark-underline.png',
    { trim: true },
  )
  await ink('notes/circle-crayon.png', 'mark-circle-crayon-red.png', {
    trim: true,
    ink: [179, 18, 27],
    alphaGain: 2.2,
  })
  await ink('notes/circle.jfif', 'mark-circle-red.png', {
    trim: true,
    ink: [179, 18, 27],
    gain: 2.8,
  })
  await noteReady('630a0f6a-6b8a-4568-90f0-dbd89a95fe85_rw_1920.png', 'note-yellow-square.webp')
  await noteReady('6909dbfa-b5ba-423d-b34b-2e42a33f3910_rw_1920.png', 'note-blue-square.webp')
  await noteReady('a-piece-of-brown-paper-with-a-yellow-sticky-note-png.webp', 'note-kraft.webp')
  await noteReady(
    'sticky-note-with-paper-texture-illustration-realistic-sticky-note-paper-texture-illustration-textured-post-it-note-illustration-free-png.webp',
    'note-beige-taped.webp',
  )
  await noteOnWhite('8735b91a93a6ffee8c385cf6071d5f79.jpg', 'note-yellow-taped.png')
  await noteOnBlack(
    'StickyNote-Vertical-Wrinkled-2-04-PNG_Image-Isolated_Object.webp',
    'note-orange.png',
  )
  await noteOnBlack('StickyNote-Wrinkled-1-04-PNG_Image-Isolated_Object.webp', 'note-blue.png')
  // Wide torn sheet of lined paper: the DIMELU note in the hub.
  await noteReady('torn-lined.webp', 'note-lined-torn.webp')
  await wrinkle('paper-wrinkle.jfif', 'paper-wrinkle.webp')
  await noteOnBlack(
    'StickyNote-Wrinkled-Ripped-1-04-PNG_Image-Isolated_Object.webp',
    'note-blue-torn.png',
  )
}

async function evidence() {
  await mkdir(OUT, { recursive: true })
  await ink('360_F_66436085_xXMb3Gyo4EeUmQwjq0sFSepd0vaHrQMe.jpg', 'prints-three.png')
  await ink('e28b6f38b271364d3f238c7ffee45012.jpg', 'palm-small.png')
  await ink('Palm-Print-Left-Full-Palm-300-dpi-179x300.jpg', 'palm-left.png')
  await ink('istockphoto-157295571-612x612.jpg', 'prints-smudged.png')
  await ink('handprint-1.png', 'handprint.png', { width: 900 })
  await copyPng('Thumbnails.png', 'tenprint-card.png')
  await copyPng('Receipt.png', 'receipt.png')
  await photo('images.jfif', 'scene-armchair.webp', { bw: true })
  await photo('47.webp', 'scene-tenement.webp', { bw: true })
  await photo('NYC40671.jpg', 'mugshot-monitor.webp')
  await photo('preview (1).jpg', 'scene-desk.webp', { bw: true })
  await photo('preview.jpg', 'scene-bucket.webp', { bw: true })
}

// ---- Newspaper scans and the case folder ------------------------------------

const NEWS = path.join(SRC, 'news')
const newsSrc = (name) => path.join(NEWS, name)

/**
 * Torn cuttings with a blank patch for the headline, photographed on white
 * (knocked out like the notes) or already on alpha. The tall one is tinted
 * tan for the worn cutting. The manila folder is the carousel's file.
 */
/**
 * Paper exported over a dark checkerboard (the "transparent" preview baked
 * into a JPEG): the background is the neutral dark region connected to the
 * border, flood-filled so dark print inside the paper survives.
 */
async function noteOnChecker(file, out, { width = 700, src = note, rotate = 0 } = {}) {
  const { data, info } = await sharp(src(file))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  const luma = (p) => 0.299 * data[p * 3] + 0.587 * data[p * 3 + 1] + 0.114 * data[p * 3 + 2]
  const neutral = (p) =>
    Math.max(data[p * 3], data[p * 3 + 1], data[p * 3 + 2]) -
      Math.min(data[p * 3], data[p * 3 + 1], data[p * 3 + 2]) <
    12
  const bg = floodBackground(w, h, (p) => neutral(p) && luma(p) < 96)
  const rgba = Buffer.alloc(w * h * 4)
  for (let p = 0; p < w * h; p++) {
    rgba[p * 4] = data[p * 3]
    rgba[p * 4 + 1] = data[p * 3 + 1]
    rgba[p * 4 + 2] = data[p * 3 + 2]
    rgba[p * 4 + 3] = bg[p] ? 0 : 255
  }
  const result = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .rotate(rotate, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .trim({ threshold: 8 })
    .resize({ width, withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, out))
  console.log(`note  ${out}  ${result.width}x${result.height}`)
}

/**
 * Grey smoke exported over a light checkerboard that was baked in (the file
 * has no real alpha). Where the smoke is thin the checker shows through at
 * full contrast; where it is thick the squares vanish. So the local contrast
 * of the board, measured over a window a little wider than one square, is
 * the inverse of the smoke's alpha. The result is a dry tan at that alpha,
 * softened.
 */
async function smokeOnChecker(file, out, { width = 640, src = note } = {}) {
  const { data, info } = await sharp(src(file))
    .removeAlpha()
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  // The checker's two greys and its square size, read off the top row.
  let lo = 255
  let hi = 0
  for (let x = 0; x < w; x++) {
    lo = Math.min(lo, data[x])
    hi = Math.max(hi, data[x])
  }
  const mid = (lo + hi) / 2
  let runs = 0
  for (let x = 1; x < w; x++) if (data[x] > mid !== data[x - 1] > mid) runs++
  const square = Math.max(4, Math.round(w / Math.max(1, runs)))
  // A window of at least two squares always sees both board colours, even at the edges.
  const r = square + 1
  // Separable min and max over a (2r+1) window: rows, then columns.
  const pass = (srcBuf, pick, horizontal) => {
    const outBuf = new Uint8Array(w * h)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let v = srcBuf[y * w + x]
        for (let k = -r; k <= r; k++) {
          const xx = horizontal ? x + k : x
          const yy = horizontal ? y : y + k
          if (xx < 0 || xx >= w || yy < 0 || yy >= h) continue
          v = pick(v, srcBuf[yy * w + xx])
        }
        outBuf[y * w + x] = v
      }
    }
    return outBuf
  }
  const mn = pass(pass(data, Math.min, true), Math.min, false)
  const mx = pass(pass(data, Math.max, true), Math.max, false)
  const contrast = hi - lo
  const alpha = Buffer.alloc(w * h)
  for (let q = 0; q < w * h; q++) alpha[q] = clamp((1 - (mx[q] - mn[q]) / contrast) * 255)
  // The window is clipped at the image edge, so the edge reads as smoke: blank a margin.
  const edge = r + 2
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x < edge || y < edge || x >= w - edge || y >= h - edge) alpha[y * w + x] = 0
    }
  }
  // Soften the alpha past the window, then marry it to white.
  // Keep the blur in one channel: sharp would otherwise hand back three.
  const soft = await sharp(alpha, { raw: { width: w, height: h, channels: 1 } })
    .blur(square * 1.1)
    .toColourspace('b-w')
    .raw()
    .toBuffer()
  // The smoke never quite hides the board, so stretch the densest part (the
  // 99.5th percentile, so a stray pixel cannot set it) to near opaque.
  const hist = new Uint32Array(256)
  for (let q = 0; q < w * h; q++) hist[soft[q]]++
  let peak = 255
  for (let seen = 0; peak > 1; peak--) {
    seen += hist[peak]
    if (seen > w * h * 0.005) break
  }
  const stretch = 235 / peak
  const rgba = Buffer.alloc(w * h * 4)
  // Dust off a desk, not smoke: the cloud is a dry tan rather than white.
  const [dr, dg, db] = [206, 180, 140]
  for (let q = 0; q < w * h; q++) {
    rgba[q * 4] = dr
    rgba[q * 4 + 1] = dg
    rgba[q * 4 + 2] = db
    // A gentle gamma lifts the thin fringes so the cloud reads as one body.
    rgba[q * 4 + 3] = clamp(255 * Math.pow(Math.min(1, (soft[q] * stretch) / 255), 0.8))
  }
  const result = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .trim({ threshold: 10 })
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(path.join(OUT, out))
  console.log(`smoke ${out}  ${result.width}x${result.height}  square ${square}px`)
}

async function news() {
  await smokeOnChecker('dust.png', 'dust.webp', { src: newsSrc })
  // Four more cuttings, buried behind the zone as clutter.
  await noteOnWhite('news-bg-1.jpg', 'news-bg-1.png', { width: 520, bgLuma: 230, src: newsSrc })
  await noteOnChecker('news-bg-2.jpg', 'news-bg-2.png', { width: 900, src: newsSrc })
  await noteReady('news-bg-3.png', 'news-bg-3.webp', { width: 700, src: newsSrc })
  await noteReady('news-square.png', 'news-square.webp', { width: 700, src: newsSrc })
  await noteOnWhite('news-wide.jpg', 'news-wide.png', { width: 760, bgLuma: 238, src: newsSrc })
  await noteOnWhite('news-tall.jpg', 'news-tall.png', {
    width: 620,
    bgLuma: 238,
    tint: { r: 206, g: 168, b: 112 },
    src: newsSrc,
  })
  await noteReady('folder.png', 'folder.webp', { width: 1100, src: newsSrc })
}

// ---- Photos of John -----------------------------------------------------------

const ME = path.join(SRC, 'me')
const FRAMES = path.join(SRC, 'frames')
const PHOTO_WIDTH = 900
const FRAME_WIDTH = 800

/**
 * Vintage print: soften a touch, lift the blacks and dull the whites (faded
 * paper), film grain and a vignette. Black and white by default, with a warm
 * paper tone; `colour: true` keeps the colour, faded and desaturated like an
 * old print. Takes and returns a sharp pipeline; the caller sizes first.
 */
/**
 * How hard a black-and-white print reads: 'punchy' stretches the tones to
 * full range, 'soft' fades them, 'faded' more so, like a print left in the sun,
 * 'deep' sinks the darks and takes the top off the whites, a print that came
 * out dense.
 */
const TONES = {
  punchy: (img) => img.normalise({ lower: 1, upper: 99 }).linear(1.02, -4),
  soft: (img) => img.linear(0.78, 34),
  faded: (img) => img.linear(0.62, 62),
  deep: (img) => img.linear(0.9, -10),
}

async function vintage(img, { colour = false, tone = 'soft' } = {}) {
  let toned = img.blur(0.5)
  toned = colour
    ? toned.modulate({ saturation: 0.68 }).linear(0.86, 24)
    : TONES[tone](toned.greyscale()).tint({ r: 238, g: 230, b: 216 })
  const { data, info } = await toned.raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info
  const grain = await sharp({
    create: {
      width,
      height,
      channels: 3,
      noise: { type: 'gaussian', mean: 128, sigma: 14 },
    },
  })
    .png()
    .toBuffer()
  const vignette = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs><radialGradient id="v" cx="50%" cy="48%" r="72%">
        <stop offset="55%" stop-color="black" stop-opacity="0"/>
        <stop offset="100%" stop-color="black" stop-opacity="0.42"/>
      </radialGradient></defs>
      <rect width="100%" height="100%" fill="url(#v)"/></svg>`,
  )
  return sharp(data, { raw: { width, height, channels: info.channels } }).composite([
    { input: grain, blend: 'soft-light' },
    { input: vignette, blend: 'multiply' },
  ])
}

/** An unframed print. */
async function print(file, out, { width = PHOTO_WIDTH, colour = false, tone } = {}) {
  const img = sharp(path.join(ME, file)).rotate().resize({ width, withoutEnlargement: true })
  const result = await (
    await vintage(img, { colour, tone })
  )
    .jpeg({ quality: 84 })
    .toFile(path.join(OUT, out))
  console.log(`photo ${out}  ${result.width}x${result.height}`)
}

/**
 * Find the frame's window and make it transparent. The sources paint the
 * window as a checkerboard or plain white, so the window is the region
 * reachable from the image centre through "textured light" pixels (the
 * checker) or near-white ones. Any near-white region reachable from the
 * image border is background outside the frame and goes transparent too.
 */
async function cutFrame(file) {
  const { data, info } = await sharp(path.join(FRAMES, file))
    .resize({ width: FRAME_WIDTH })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  const n = w * h
  const luma = new Float32Array(n)
  for (let p = 0; p < n; p++) {
    luma[p] = 0.299 * data[p * 3] + 0.587 * data[p * 3 + 1] + 0.114 * data[p * 3 + 2]
  }
  // The window is a checkerboard or plain white, and its brightest squares
  // are brighter than any frame paper. Take that brightness from the block
  // around the centre, then walk out along the middle row and column: the
  // window ends where the next SPAN pixels hold nothing that bright.
  const SPAN = 40
  const BAND = 14
  const cx = w >> 1
  const cy = h >> 1
  let peak = 0
  for (let y = cy - 40; y <= cy + 40; y++) {
    for (let x = cx - 40; x <= cx + 40; x++) peak = Math.max(peak, luma[y * w + x])
  }
  const bright = peak - 4
  const anyBright = (xa, xb, ya, yb) => {
    for (let y = Math.max(0, ya); y <= Math.min(h - 1, yb); y++) {
      for (let x = Math.max(0, xa); x <= Math.min(w - 1, xb); x++) {
        if (luma[y * w + x] >= bright) return true
      }
    }
    return false
  }
  // Walk along x (dir +-1) over a band of rows, and along y over a band of columns.
  const walkX = (dir) => {
    for (let x = cx; x >= 0 && x < w; x += dir) {
      const [a, b] = dir > 0 ? [x, x + SPAN] : [x - SPAN, x]
      if (!anyBright(a, b, cy - BAND, cy + BAND)) return x - dir
    }
    return dir > 0 ? w - 1 : 0
  }
  const walkY = (dir) => {
    for (let y = cy; y >= 0 && y < h; y += dir) {
      const [a, b] = dir > 0 ? [y, y + SPAN] : [y - SPAN, y]
      if (!anyBright(cx - BAND, cx + BAND, a, b)) return y - dir
    }
    return dir > 0 ? h - 1 : 0
  }
  const x1 = walkX(1)
  const x0 = walkX(-1)
  const y1 = walkY(1)
  const y0 = walkY(-1)
  const window = new Uint8Array(n)
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) window[y * w + x] = 1

  const flood = (seeds, ok) => {
    const mask = new Uint8Array(n)
    const stack = []
    for (const s of seeds) {
      if (ok(s) && !mask[s]) {
        mask[s] = 1
        stack.push(s)
      }
    }
    while (stack.length) {
      const p = stack.pop()
      const x = p % w
      const next = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]
      for (const q of next) {
        if (q < 0 || q >= n || mask[q] || !ok(q)) continue
        mask[q] = 1
        stack.push(q)
      }
    }
    return mask
  }
  const border = []
  for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x)
  for (let y = 0; y < h; y++) border.push(y * w, y * w + w - 1)
  const outside = flood(border, (p) => luma[p] >= 250 && !window[p])

  if (x1 - x0 > w * 0.95 || y1 - y0 > h * 0.95 || x1 - x0 < w * 0.3) {
    throw new Error(`${file}: window detection failed (${x0},${y0})-(${x1},${y1})`)
  }
  const rgba = Buffer.alloc(n * 4)
  for (let p = 0; p < n; p++) {
    rgba[p * 4] = data[p * 3]
    rgba[p * 4 + 1] = data[p * 3 + 1]
    rgba[p * 4 + 2] = data[p * 3 + 2]
    rgba[p * 4 + 3] = window[p] || outside[p] ? 0 : 255
  }
  // Inset the window a pixel so the photo tucks under the frame edge.
  const win = { left: x0 - 1, top: y0 - 1, width: x1 - x0 + 3, height: y1 - y0 + 3 }
  return {
    frame: sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
      .png()
      .toBuffer(),
    w,
    h,
    win,
  }
}

/**
 * A photo mounted in an instant-film frame, cropped to the window. The crop
 * centres on `focus` (fractions of the photo) when given, else on whatever
 * sharp's attention strategy finds.
 */
async function framed(photoFile, frameFile, out, { focus, tone } = {}) {
  const { frame, w, h, win } = await cutFrame(frameFile)
  let source = sharp(path.join(ME, photoFile)).rotate()
  if (focus) {
    const meta = await source.metadata()
    const upright = (meta.orientation ?? 1) >= 5
    const iw = upright ? meta.height : meta.width
    const ih = upright ? meta.width : meta.height
    const scale = Math.max(win.width / iw, win.height / ih)
    const rw = Math.ceil(iw * scale)
    const rh = Math.ceil(ih * scale)
    const left = Math.round(clamp(focus[0] * rw - win.width / 2, 0, rw - win.width))
    const top = Math.round(clamp(focus[1] * rh - win.height / 2, 0, rh - win.height))
    source = sharp(await source.resize({ width: rw, height: rh }).toBuffer()).extract({
      left,
      top,
      width: win.width,
      height: win.height,
    })
  } else {
    source = source.resize({
      width: win.width,
      height: win.height,
      fit: 'cover',
      position: 'attention',
    })
  }
  const photo = await (await vintage(source, { tone })).png().toBuffer()
  const result = await sharp({
    create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: photo, left: win.left, top: win.top },
      { input: await frame, left: 0, top: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, out))
  console.log(`frame ${out}  ${result.width}x${result.height}  window ${win.width}x${win.height}`)
}

/**
 * CCTV stills: grey, hard contrast, heavy grain, no warmth. Only frames with
 * nobody identifiable in them are used.
 */
async function cctv(file, out, { width = 640, colour = false } = {}) {
  let img = sharp(path.join(SRC, 'cctv', file)).resize({ width, withoutEnlargement: true })
  img = colour
    ? img.modulate({ saturation: 0.8 }).normalise({ lower: 2, upper: 98 }).linear(1.04, -2)
    : img.greyscale().normalise({ lower: 2, upper: 98 }).linear(1.08, -6)
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
  const grain = await sharp({
    create: {
      width: info.width,
      height: info.height,
      channels: 3,
      noise: { type: 'gaussian', mean: 128, sigma: 22 },
    },
  })
    .png()
    .toBuffer()
  const result = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .composite([{ input: grain, blend: 'soft-light' }])
    .jpeg({ quality: 78 })
    .toFile(path.join(OUT, out))
  console.log(`cctv  ${out}  ${result.width}x${result.height}`)
}

async function me() {
  await cctv('fgbrwvn3jstndy04.avif', 'cctv-lot.jpg')
  await cctv(
    'b25lY21zOjcyY2EyNGUwLTYwZmItNGNiNi05YjQxLTA3YjEyZmIwYzQ5ZDo1ZGZlYTI0Mi05YjEzLTRhMTktYjVhOS0xZTM3ZjgxY2VmNjA=.avif',
    'cctv-street.jpg',
  )
  await framed('1684114365882.jpeg', 'polariodfram2.png', 'me-beanie-framed.png', {
    tone: 'punchy',
  })
  await framed('IMG_0305 (1).JPG', 'polariodfram3.jfif', 'me-leaves-framed.png', {
    focus: [0.4, 0.4],
    tone: 'faded',
  })
  await framed('IMG_0500.jpeg', 'polariodframe1.jpg', 'me-helmet-framed.png', { tone: 'soft' })
  await print('IMG_2202.jpg', 'me-fallon.jpg', { width: 700, tone: 'punchy' })
  await print('IMG_0174.jpeg', 'me-kid.jpg', { width: 700, colour: true })
  await print('IMG_3504.jpeg', 'me-passport.jpg', { width: 600, colour: true })
}

// ---- Selected-work exhibits ---------------------------------------------------

const WORK = path.join(SRC, 'work')
/** Widest the print box gets on screen is ~500px; this leaves room for high-density screens. */
const PRINT_WIDTH = 1600

/**
 * One exhibit's photograph, whole: resized to the print's width and no more,
 * its own proportions kept. The sheet crops it to the print box from its top
 * left (CSS object-fit: cover), so nothing is cropped away here.
 */
async function exhibit(file, out) {
  const result = await sharp(path.join(WORK, file))
    .resize({ width: PRINT_WIDTH, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(path.join(OUT, out))
  console.log(`exhibit  ${out}  ${result.width}x${result.height}`)
}

async function exhibits() {
  await exhibit('obsessed-app-store.png', 'work-obsessed.webp')
  await exhibit('bumper-globe.png', 'work-bumper-globe.webp')
  await exhibit('authentica.png', 'work-authentica.webp')
  await exhibit('v2l.png', 'work-v2l.webp')
  for (const n of [1, 2, 3, 4]) await exhibit(`webfruit-${n}.png`, `work-webfruit-${n}.webp`)
  await exhibit('this-board.png', 'work-this-board.webp')
  await exhibit('old-portfolio.png', 'work-old-portfolio.webp')
}

// ---- The evidence bag ---------------------------------------------------------

/**
 * Bakes a shadow under a cut-out: the canvas grows by `pad` on every side,
 * then each layer is the image's own alpha, as black at `opacity`, dropped
 * `dy` pixels and blurred by `blur`, laid beneath the image. Transparent
 * plastic throws a fainter shadow than solid paper, since the alpha carries
 * through. Returns a sharp pipeline of the result.
 */
async function withShadow(input, { pad, layers }) {
  const clear = { r: 0, g: 0, b: 0, alpha: 0 }
  const base = await sharp(input)
    .ensureAlpha()
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: clear })
    .png()
    .toBuffer()
  const { data: alpha, info } = await sharp(base)
    .extractChannel('alpha')
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width, height } = info
  const shadows = []
  for (const { dy, blur, opacity } of layers) {
    const rgba = Buffer.alloc(width * height * 4)
    for (let y = dy; y < height; y++) {
      const srcRow = (y - dy) * width
      const dstRow = y * width
      for (let x = 0; x < width; x++)
        rgba[(dstRow + x) * 4 + 3] = Math.round(alpha[srcRow + x] * opacity)
    }
    const layer = await sharp(rgba, { raw: { width, height, channels: 4 } })
      .blur(blur)
      .png()
      .toBuffer()
    shadows.push({ input: layer, blend: 'dest-over' })
  }
  return sharp(base).composite(shadows)
}

/**
 * The zip bag is photographed on white and already cut out, but its body is
 * opaque. Real bag plastic is clear: only the creases, the highlights and
 * the blue zip are solid. So alpha follows how far a pixel strays from the
 * flat grey of the body, which keeps every fold and glint and lets the cork
 * show through the rest; strongly coloured pixels (the zip) stay as they are.
 */
async function bag() {
  const { data, info } = await sharp(src('bag.png'))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const BODY = 197 // the flat plastic's brightness
  const SPREAD = 58 // how far a crease or highlight gets from it
  const FLOOR = 0.3 // how solid the flat plastic stays
  for (let p = 0; p < info.width * info.height; p++) {
    const i = p * 4
    const a = data[i + 3]
    if (a === 0) continue
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const saturation = Math.max(r, g, b) - Math.min(r, g, b)
    if (saturation > 40) continue
    const lum = (r + g + b) / 3
    const solid = Math.min(1, FLOOR + (1 - FLOOR) * (Math.abs(lum - BODY) / SPREAD))
    data[i + 3] = Math.round(a * solid)
  }
  const plastic = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .resize({ width: 1200 })
    .png()
    .toBuffer()
  // Its shadow: at the edges, zip and folds, where the plastic is solid; faint where it is clear.
  const result = await (
    await withShadow(plastic, {
      pad: 50,
      layers: [
        { dy: 5, blur: 3, opacity: 0.6 },
        { dy: 5, blur: 4, opacity: 0.5 },
        { dy: 21, blur: 16, opacity: 0.45 },
      ],
    })
  )
    .webp({ quality: 85, alphaQuality: 90 })
    .toFile(path.join(OUT, 'bag.webp'))
  console.log(`bag  bag.webp  ${result.width}x${result.height}`)
  const maps = await bagMaps()

  // What goes in it: already cut out. Softened a touch, as a print under plastic
  // is, and given a thick pile's shadow: tight contact, its own thickness, and the
  // wide faint penumbra of the plastic tented over it.
  const prints = await throughPlastic(
    await sharp(src('photo-stack.png'))
      .resize({ width: 1000, withoutEnlargement: true })
      .blur(1)
      .png()
      .toBuffer(),
    maps,
  )
  const stack = await (
    await withShadow(prints, {
      pad: 90,
      layers: [
        { dy: 3, blur: 3, opacity: 0.55 },
        { dy: 20, blur: 18, opacity: 0.45 },
        { dy: 48, blur: 40, opacity: 0.25 },
      ],
    })
  )
    .webp({ quality: 85, alphaQuality: 90 })
    .toFile(path.join(OUT, 'photo-stack.webp'))
  await halo('photo-stack.webp', 'photo-stack-glow.webp')
  console.log(`bag  photo-stack.webp  ${stack.width}x${stack.height}`)
}

/**
 * The bag's creases, read off the bag photo, as two maps the pile is finished
 * with. Its brightness is a height field: ridges (folds standing up off the
 * print) catch the light, troughs (plastic pressed into a fold) are dark.
 *   folds: the slope across and down, in [-1, 1], which bends the print the way
 *          plastic lying on it would.
 *   shade: how dark each pixel is under the plastic, 0 to 1: a ridge throws a
 *          soft shadow a little below itself (the board is lit from above),
 *          a trough darkens where it is.
 * Both at the same small size, stretched over the pile when applied.
 */
async function bagMaps() {
  const WIDTH = 600
  const BODY = 197
  const { data, info } = await sharp(src('bag.png'))
    .resize({ width: WIDTH })
    .ensureAlpha()
    .toColourspace('b-w')
    .blur(1.6)
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  const lum = (x, y) => {
    x = clamp(x, 0, width - 1)
    y = clamp(y, 0, height - 1)
    const i = (y * width + x) * channels
    // Transparent pixels count as the flat body, so the edge of the bag is no cliff.
    return data[i + channels - 1] < 128 ? BODY : data[i]
  }
  const GAIN = 2.2 / 128 // slope per unit of brightness, into [-1, 1]
  const dx = new Float32Array(width * height)
  const dy = new Float32Array(width * height)
  const ridge = new Float32Array(width * height)
  const trough = new Float32Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      dx[i] = Math.max(-1, Math.min(1, (lum(x + 1, y) - lum(x - 1, y)) * GAIN))
      dy[i] = Math.max(-1, Math.min(1, (lum(x, y + 1) - lum(x, y - 1)) * GAIN))
      const l = lum(x, y)
      ridge[i] = Math.min(1, Math.max(0, (l - BODY - 14) / 38))
      trough[i] = Math.min(1, Math.max(0, (BODY - l - 10) / 40))
    }
  }
  const DROP = 6
  const rawShade = Buffer.alloc(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const above = y - DROP >= 0 ? ridge[(y - DROP) * width + x] : 0
      rawShade[y * width + x] = Math.round(
        255 * Math.min(1, 0.5 * above + 0.35 * trough[y * width + x]),
      )
    }
  }
  // sharp hands a blurred one-channel image back with more channels than one, so take the first of each.
  const { data: blurred, info: blurredInfo } = await sharp(rawShade, {
    raw: { width, height, channels: 1 },
  })
    .blur(2.5)
    .raw()
    .toBuffer({ resolveWithObject: true })
  const shade = new Uint8Array(width * height)
  for (let i = 0; i < width * height; i++) shade[i] = blurred[i * blurredInfo.channels]
  return { width, height, dx, dy, shade }
}

/**
 * Finishes a cut-out as seen through the bag: bent along the creases (each
 * pixel is fetched from where the plastic's slope points, bilinearly, in
 * premultiplied colour so clear edges stay clean), darkened by the crease
 * shade, then toned (darks deeper, whites dulled, a little less colour).
 * `bend` is the furthest a pixel moves, in pixels of the image.
 */
async function throughPlastic(input, maps, { bend = 30 } = {}) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width, height } = info
  // Premultiply, so sampling never bleeds the colour of transparent pixels.
  const pre = new Float32Array(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    const a = data[i * 4 + 3] / 255
    pre[i * 4] = data[i * 4] * a
    pre[i * 4 + 1] = data[i * 4 + 1] * a
    pre[i * 4 + 2] = data[i * 4 + 2] * a
    pre[i * 4 + 3] = a
  }
  const sample = (fx, fy, c) => {
    const x0 = Math.floor(fx)
    const y0 = Math.floor(fy)
    const tx = fx - x0
    const ty = fy - y0
    const at = (x, y) =>
      x < 0 || y < 0 || x >= width || y >= height ? 0 : pre[(y * width + x) * 4 + c]
    return (
      at(x0, y0) * (1 - tx) * (1 - ty) +
      at(x0 + 1, y0) * tx * (1 - ty) +
      at(x0, y0 + 1) * (1 - tx) * ty +
      at(x0 + 1, y0 + 1) * tx * ty
    )
  }
  // The maps are small and stretched over the image, so read them bilinearly:
  // nearest-neighbour steps would print as bands across the print.
  const mapAt = (arr, x, y) => {
    const fx = Math.min(maps.width - 1.001, (x / width) * maps.width)
    const fy = Math.min(maps.height - 1.001, (y / height) * maps.height)
    const x0 = Math.floor(fx)
    const y0 = Math.floor(fy)
    const tx = fx - x0
    const ty = fy - y0
    const w = maps.width
    return (
      arr[y0 * w + x0] * (1 - tx) * (1 - ty) +
      arr[y0 * w + x0 + 1] * tx * (1 - ty) +
      arr[(y0 + 1) * w + x0] * (1 - tx) * ty +
      arr[(y0 + 1) * w + x0 + 1] * tx * ty
    )
  }
  const out = Buffer.alloc(width * height * 4)
  const BRIGHT = 0.88
  const CONTRAST = 1.1
  const SAT = 0.9
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = x + mapAt(maps.dx, x, y) * bend
      const sy = y + mapAt(maps.dy, x, y) * bend
      const a = sample(sx, sy, 3)
      const o = (y * width + x) * 4
      if (a <= 0.002) continue
      let r = sample(sx, sy, 0) / a
      let g = sample(sx, sy, 1) / a
      let b = sample(sx, sy, 2) / a
      // The crease shade, then the tone.
      const dark = 1 - mapAt(maps.shade, x, y) / 255
      r *= dark
      g *= dark
      b *= dark
      const l = 0.299 * r + 0.587 * g + 0.114 * b
      r = l + (r - l) * SAT
      g = l + (g - l) * SAT
      b = l + (b - l) * SAT
      out[o] = clamp(Math.round((r * BRIGHT - 128) * CONTRAST + 128))
      out[o + 1] = clamp(Math.round((g * BRIGHT - 128) * CONTRAST + 128))
      out[o + 2] = clamp(Math.round((b * BRIGHT - 128) * CONTRAST + 128))
      out[o + 3] = Math.round(a * 255)
    }
  }
  return sharp(out, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer()
}

/**
 * The white halo a clickable piece shows under the pointer, as an image: the
 * finished cut-out's silhouette in white, blurred at four widths and summed,
 * the same recipe as the CSS halo (drop-shadows of 3, 6, 16 and 34px at
 * display size, here in the image's own pixels). Shown by fading it in behind
 * the piece, so hovering costs a texture, not four live blurs of a big image.
 */
async function halo(finishedFile, out) {
  const { data: alpha, info } = await sharp(path.join(OUT, finishedFile))
    .extractChannel('alpha')
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width, height } = info
  // Display is about 0.58 px per image px, so an on-screen radius r is r / 0.58 here; sigma is half the radius.
  const layers = [
    { sigma: 2.6, strength: 1 },
    { sigma: 5.2, strength: 1 },
    { sigma: 14, strength: 0.95 },
    { sigma: 29, strength: 0.7 },
  ]
  const sum = new Float32Array(width * height)
  for (const { sigma, strength } of layers) {
    const blurred = await sharp(alpha, { raw: { width, height, channels: 1 } })
      .blur(sigma)
      .raw()
      .toBuffer({ resolveWithObject: true })
    const step = blurred.info.channels
    for (let i = 0; i < width * height; i++) sum[i] += (blurred.data[i * step] / 255) * strength
  }
  const rgba = Buffer.alloc(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = 255
    rgba[i * 4 + 1] = 255
    rgba[i * 4 + 2] = 255
    rgba[i * 4 + 3] = Math.round(255 * Math.min(1, sum[i]))
  }
  const result = await sharp(rgba, { raw: { width, height, channels: 4 } })
    .webp({ quality: 80, alphaQuality: 90 })
    .toFile(path.join(OUT, out))
  console.log(`bag  ${out}  ${result.width}x${result.height}`)
}

// ---- Marker marks added after the notes were cut --------------------------------

async function marks() {
  // Lighter than full ink, so it reads as marker drawn on the note.
  await ink('notes/arrow-red.png', 'mark-arrow-red.png', {
    trim: true,
    ink: [179, 18, 27],
    gain: 1.05,
  })
  // A yellow crayon moon and stars, turned to black marker at three-quarter strength:
  // the source already carries its own alpha, so the gain only stops the yellow reading as pale.
  await ink('notes/moon.png', 'mark-moon.png', { trim: true, gain: 6, alphaGain: 0.72 })
  // A wide marker loop in the thread red, drawn round the view that is on.
  await ink('notes/circle-wide.png', 'mark-circle-wide-red.png', {
    trim: true,
    ink: [179, 18, 27],
    gain: 1.6,
  })
  // The sound switches: a marker tick in paper white for on, a cross in the thread red for off.
  await ink('notes/check.jpg', 'mark-check.png', {
    trim: true,
    width: 160,
    ink: [243, 236, 217],
    gain: 1.1,
  })
  // A long marker stroke in the thread red, drawn under the prompt in the dark.
  await ink('notes/underline.png', 'mark-underline-red.png', {
    trim: true,
    width: 900,
    ink: [179, 18, 27],
    gain: 1.2,
  })
  await ink('notes/cross.webp', 'mark-cross-red.png', {
    trim: true,
    width: 160,
    ink: [179, 18, 27],
    gain: 1.3,
  })
}

// ---- The moonlighting prints ----------------------------------------------------

/** Every picture in assets-src/evidence/photos, resized to the print's width and no more. */
async function photos() {
  const dir = path.join(SRC, 'photos')
  const outDir = path.join(OUT, 'photos')
  await mkdir(outDir, { recursive: true })
  const files = (await readdir(dir)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort()
  for (const file of files) {
    const out = file.replace(/\.[^.]+$/, '.webp')
    const result = await sharp(path.join(dir, file))
      .rotate()
      .resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(path.join(outDir, out))
    console.log(`photo  photos/${out}  ${result.width}x${result.height}`)
  }
}

// ---- Make contact ---------------------------------------------------------------

/** The handshake, printed like the rest of the photographs on the board. */
async function contact() {
  await print('handshake.jpg', 'handshake.jpg', { width: 900, tone: 'deep' })
}

// ---- The simplified view -------------------------------------------------------

/** The sheet's hero: a shot of the board's top-left corner, as is. */
async function simplified() {
  const info = await sharp(src('simplified-hero.png'))
    .resize({ width: 1440, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(path.join(OUT, 'simplified-hero.webp'))
  console.log(`hero  simplified-hero.webp  ${info.width}x${info.height}`)
}

/**
 * The tall strip of newsprint down the board's right edge: the fourth scan
 * turned a quarter turn to the left so its column reads upright, its own
 * step so it can be rebuilt without regrinding the other scans.
 */
async function newsSide() {
  await noteOnChecker('news-bg-4.jpg', 'news-bg-4.png', { width: 600, src: newsSrc, rotate: -90 })
}

const steps = {
  tape,
  evidence,
  notes,
  marks,
  news,
  newsSide,
  me,
  bag,
  exhibits,
  photos,
  contact,
  simplified,
}
const only = process.argv[2]
if (only && !(only in steps)) {
  console.error(`Unknown step "${only}". One of: ${Object.keys(steps).join(', ')}`)
  process.exit(1)
}
for (const [name, step] of Object.entries(steps)) {
  if (!only || only === name) await step()
}
