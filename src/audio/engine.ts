/**
 * One Web Audio context for the whole site.
 *
 * Every sound (the torch, and whatever is added later) plays through this
 * engine into one master gain, so that:
 *   - the browser's autoplay unlock happens once, for every sound at once;
 *   - each clip is fetched and decoded once, however many sounds use it;
 *   - there is one master volume to mute or duck from;
 *   - the tab never hits the per-page AudioContext limit.
 *
 * Use the shared `audio` instance in app code. `createAudioEngine` exists so
 * tests can build an isolated one around a fake AudioContext.
 */

export type AudioEngine = {
  /** The context, created on first use; undefined where Web Audio is unsupported. */
  readonly context: AudioContext | undefined
  /**
   * A new gain node for one sound to play into. It feeds the named bus
   * (created on demand) or, with no bus, the master directly.
   */
  channel(volume?: number, bus?: string): GainNode
  /**
   * Level of a named bus, 0-1: the per-object on/off switch. Remembered even
   * before the bus exists, so it can be set from saved preferences at startup.
   */
  setBusLevel(bus: string, level: number): void
  /** Fetch and decode a clip, cached by URL. */
  load(url: string): Promise<AudioBuffer>
  /**
   * Resolves once the context is running. Browsers only allow that after the
   * visitor has clicked, tapped or pressed a key; if the first attempt is
   * refused, `onBlocked` is called so the UI can ask for a gesture, and the
   * promise waits for one. Resolves at once where Web Audio is unsupported.
   */
  unlock(onBlocked?: () => void): Promise<void>
  /** Master volume, 0-1. */
  volume: number
  /** Close the context. Tests only; the app keeps its engine for the page's life. */
  dispose(): void
}

/** Events that count as a user gesture for autoplay purposes. */
const GESTURES = ['pointerdown', 'keydown', 'touchend'] as const
/** How long the first resume() gets before we decide the browser wants a gesture. */
const BLOCKED_AFTER_MS = 150

const noop = () => {}

export function createAudioEngine(
  Context: typeof AudioContext | undefined = typeof AudioContext === 'undefined'
    ? undefined
    : AudioContext,
): AudioEngine {
  let context: AudioContext | undefined
  let master: GainNode | undefined
  let volume = 1
  let unlocking: Promise<void> | undefined
  let blocked = false
  const blockedListeners = new Set<() => void>()
  const clips = new Map<string, Promise<AudioBuffer>>()
  const buses = new Map<string, GainNode>()
  const busLevels = new Map<string, number>()

  const bus = (name: string) => {
    let node = buses.get(name)
    if (!node && context && master) {
      node = context.createGain()
      node.gain.value = busLevels.get(name) ?? 1
      node.connect(master)
      buses.set(name, node)
    }
    return node
  }

  const ensure = () => {
    if (!Context) return undefined
    if (!context) {
      context = new Context()
      master = context.createGain()
      master.gain.value = volume
      master.connect(context.destination)
      // iOS suspends the context when the tab is backgrounded or a call comes in.
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && context?.state !== 'running') context?.resume().catch(noop)
      })
    }
    return context
  }

  const startUnlock = (ctx: AudioContext) =>
    new Promise<void>((resolve) => {
      let timer: ReturnType<typeof setTimeout> | undefined
      const finish = () => {
        clearTimeout(timer)
        ctx.removeEventListener('statechange', check)
        for (const type of GESTURES) window.removeEventListener(type, attempt)
        blocked = false
        blockedListeners.clear()
        resolve()
      }
      const check = () => {
        if (ctx.state === 'running') finish()
      }
      const attempt = () => {
        ctx.resume().then(check, noop)
      }
      ctx.addEventListener('statechange', check)
      for (const type of GESTURES) window.addEventListener(type, attempt)
      attempt()
      timer = setTimeout(() => {
        if (ctx.state === 'running') return
        blocked = true
        for (const listener of blockedListeners) listener()
      }, BLOCKED_AFTER_MS)
    })

  return {
    get context() {
      return ensure()
    },
    get volume() {
      return volume
    },
    set volume(value: number) {
      volume = Math.min(1, Math.max(0, value))
      if (master) master.gain.value = volume
    },
    channel(gain = 1, busName) {
      const ctx = ensure()
      if (!ctx || !master) throw new Error('Web Audio is not supported here')
      const node = ctx.createGain()
      node.gain.value = gain
      node.connect((busName && bus(busName)) || master)
      return node
    },
    setBusLevel(name, level) {
      const value = Math.min(1, Math.max(0, level))
      busLevels.set(name, value)
      const node = buses.get(name)
      if (node && context) node.gain.setTargetAtTime(value, context.currentTime, 0.02)
    },
    load(url) {
      const ctx = ensure()
      if (!ctx) return Promise.reject(new Error('Web Audio is not supported here'))
      let clip = clips.get(url)
      if (!clip) {
        clip = fetch(url)
          .then((response) => {
            if (!response.ok) throw new Error(`audio: ${response.status} for ${url}`)
            return response.arrayBuffer()
          })
          .then((bytes) => ctx.decodeAudioData(bytes))
        clip.catch(() => clips.delete(url))
        clips.set(url, clip)
      }
      return clip
    },
    unlock(onBlocked) {
      const ctx = ensure()
      if (!ctx || ctx.state === 'running') return Promise.resolve()
      if (onBlocked) {
        if (blocked) onBlocked()
        else blockedListeners.add(onBlocked)
      }
      unlocking ??= startUnlock(ctx)
      return unlocking
    },
    dispose() {
      context?.close().catch(noop)
      context = undefined
      master = undefined
      unlocking = undefined
      blocked = false
      blockedListeners.clear()
      clips.clear()
      buses.clear()
    },
  }
}

/** The site's audio engine. */
export const audio = createAudioEngine()
