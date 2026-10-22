/**
 * Converts the full-resolution originals in assets-src/textures into
 * seamless, web-sized JPEG tiles in public/textures.
 *
 *   npm run textures
 *
 * Pipeline per texture:
 *   1. Resize so the longest edge is TILE_EDGE px.
 *   2. Flatten lighting: subtract a heavy blur (the photo's illumination
 *      gradient) and add the global mean back. Without this every repeat of
 *      the tile shows the same light/dark patch and the grid becomes visible.
 *   3. Make it tileable with an offset blend: cross-fade the image into a copy
 *      of itself shifted by half a tile, weight 1 at the edges and 0 at the
 *      centre, along x then y. The blend is contrast-preserving (deviations
 *      from the mean are renormalised), so blended regions have the same
 *      grain contrast as untouched ones and no soft bands appear.
 * No mirroring, so there is no reflected symmetry. Originals are never modified.
 */
import { mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const SRC = path.resolve('assets-src/textures')
const OUT = path.resolve('public/textures')
const TILE_EDGE = 1600
const QUALITY = 78
/** Blur sigma (px) used to estimate the illumination gradient. */
const FLATTEN_SIGMA = 70
const CHANNELS = 3

const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v)
const smoothstep = (t) => t * t * (3 - 2 * t)

/** Weight of the shifted copy at normalised position `pos`: 1 at the edges, 0 at the centre. */
function edgeWeight(pos) {
  const d = Math.min(pos, 1 - pos) * 2 // 0 at edge, 1 at centre
  return 1 - smoothstep(d)
}

function channelMeans(img) {
  const sums = [0, 0, 0]
  for (let i = 0; i < img.length; i += CHANNELS) {
    sums[0] += img[i]
    sums[1] += img[i + 1]
    sums[2] += img[i + 2]
  }
  const n = img.length / CHANNELS
  return sums.map((s) => s / n)
}

/** img - blurred + mean, per channel. */
function flattenLighting(img, blurred, means) {
  const out = Buffer.alloc(img.length)
  for (let i = 0; i < img.length; i += CHANNELS) {
    for (let c = 0; c < CHANNELS; c++) {
      out[i + c] = clamp(Math.round(img[i + c] - blurred[i + c] + means[c]))
    }
  }
  return out
}

/** Contrast-preserving cross-fade of `img` with a copy shifted half-way along one axis. */
function blendAxis(img, width, height, axis, means) {
  const out = Buffer.alloc(img.length)
  const half = axis === 'x' ? Math.floor(width / 2) : Math.floor(height / 2)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const w = axis === 'x' ? edgeWeight(x / width) : edgeWeight(y / height)
      const norm = Math.sqrt((1 - w) * (1 - w) + w * w)
      const sx = axis === 'x' ? (x + half) % width : x
      const sy = axis === 'y' ? (y + half) % height : y
      const i = (y * width + x) * CHANNELS
      const j = (sy * width + sx) * CHANNELS
      for (let c = 0; c < CHANNELS; c++) {
        const m = means[c]
        const v = ((img[i + c] - m) * (1 - w) + (img[j + c] - m) * w) / norm + m
        out[i + c] = clamp(Math.round(v))
      }
    }
  }
  return out
}

await mkdir(OUT, { recursive: true })

const files = (await readdir(SRC)).filter((f) => /\.(jpe?g|png|webp|tiff?)$/i.test(f))

for (const file of files) {
  const name = path.parse(file).name.replace(/-original$/, '')
  const source = sharp(path.join(SRC, file)).rotate()
  const meta = await source.metadata()
  const landscape = (meta.width ?? 0) >= (meta.height ?? 0)

  const resized = source.resize({
    width: landscape ? TILE_EDGE : undefined,
    height: landscape ? undefined : TILE_EDGE,
    withoutEnlargement: true,
  })

  const { data, info } = await resized
    .clone()
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width, height } = info

  const blurred = await resized.clone().removeAlpha().blur(FLATTEN_SIGMA).raw().toBuffer()

  const means = channelMeans(data)
  const flat = flattenLighting(data, blurred, means)
  const seamless = blendAxis(blendAxis(flat, width, height, 'x', means), width, height, 'y', means)

  const out = await sharp(seamless, { raw: { width, height, channels: CHANNELS } })
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toFile(path.join(OUT, `${name}.jpg`))

  console.log(
    `${file} (${meta.width}x${meta.height}) -> ${name}.jpg ${width}x${height} seamless, ${(out.size / 1024).toFixed(0)} KB`,
  )
}
