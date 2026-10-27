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
 *
 * Originals are never modified. Sources are git-ignored; outputs are committed.
 */
import { mkdir } from 'node:fs/promises'
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
async function noteOnWhite(file, out, { width = 700 } = {}) {
  const { data, info } = await sharp(note(file))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  const luma = (p) => 0.299 * data[p * 3] + 0.587 * data[p * 3 + 1] + 0.114 * data[p * 3 + 2]
  const neutral = (p) =>
    Math.max(data[p * 3], data[p * 3 + 1], data[p * 3 + 2]) -
      Math.min(data[p * 3], data[p * 3 + 1], data[p * 3 + 2]) <
    14
  const bg = floodBackground(w, h, (p) => neutral(p) && luma(p) > 245)
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
  const result = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .trim({ threshold: 8 })
    .resize({ width, withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, out))
  console.log(`note  ${out}  ${result.width}x${result.height}`)
}

/** Already transparent: trim and shrink. */
async function noteReady(file, out, { width = 700 } = {}) {
  const result = await sharp(note(file))
    .trim({ threshold: 8 })
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(path.join(OUT, out))
  console.log(`note  ${out}  ${result.width}x${result.height}`)
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
 * full range, 'soft' fades them, 'faded' more so, like a print left in the sun.
 */
const TONES = {
  punchy: (img) => img.normalise({ lower: 1, upper: 99 }).linear(1.02, -4),
  soft: (img) => img.linear(0.78, 34),
  faded: (img) => img.linear(0.62, 62),
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

await tape()
await evidence()
await notes()
await me()
