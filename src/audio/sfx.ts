import { audio, type AudioEngine } from './engine'

/**
 * One-shot sound effects: short clips fired once, on their own `sfx` bus of
 * the shared engine (so the panel's Effects switch covers all of them). A
 * clip is fetched and decoded once by the engine's cache; each play is a
 * fresh buffer source into a throwaway gain that is dropped when it ends.
 * Plays only while the context is already running: effects are triggered by
 * clicks, which is after the torch's unlock, and are never worth waiting for.
 */

const BASE = import.meta.env.BASE_URL

export const SFX_URLS = {
  /** The pile of folders landing on the desk. */
  thud: `${BASE}audio/folder-thud.mp3`,
  /** Flipping to the next or previous file. */
  flip: `${BASE}audio/folder-flip.mp3`,
  /** The pile snatched off the desk. */
  whoosh: `${BASE}audio/folder-whoosh.mp3`,
  /** A pile of prints set down on the desk. */
  paperThud: `${BASE}audio/paper-thud.mp3`,
  /** A print flipped over. */
  paperFlip: `${BASE}audio/paper-flip.mp3`,
} as const

export type SfxName = keyof typeof SFX_URLS

/**
 * Seconds to skip at the start of a clip, for one that opens with a pause:
 * the paper flip sits a fifth of a second behind the click otherwise.
 */
const SKIPS: Partial<Record<SfxName, number>> = { paperFlip: 0.2 }

/** Level of each effect on the sfx bus, 0-1. */
const LEVELS: Record<SfxName, number> = {
  thud: 0.2,
  flip: 0.2,
  whoosh: 0.1,
  paperThud: 0.3,
  paperFlip: 0.3,
}

export type Sfx = {
  play(name: SfxName): void
  /** Fetch and decode every clip ahead of its first play. */
  preload(): void
}

export type SfxOptions = {
  engine?: AudioEngine
  urls?: Record<SfxName, string>
  levels?: Record<SfxName, number>
  skips?: Partial<Record<SfxName, number>>
}

const noop = () => {}

export function createSfx({
  engine = audio,
  urls = SFX_URLS,
  levels = LEVELS,
  skips = SKIPS,
}: SfxOptions = {}): Sfx {
  return {
    preload() {
      if (!engine.context) return
      for (const url of Object.values(urls)) engine.load(url).catch(noop)
    },
    play(name) {
      const context = engine.context
      if (!context) return
      engine.load(urls[name]).then((buffer) => {
        if (context.state !== 'running') return
        const source = context.createBufferSource()
        source.buffer = buffer
        const out = engine.channel(levels[name], 'sfx')
        source.connect(out)
        source.onended = () => out.disconnect()
        source.start(0, skips[name] ?? 0)
      }, noop)
    },
  }
}

/** The site's effects. */
export const sfx = createSfx()
