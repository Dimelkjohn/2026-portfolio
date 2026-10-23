import { audio, type AudioEngine } from './engine'
import type { MusicTrack } from '@/data/music'

/**
 * Background music. One track is picked at random when the page opens;
 * when it nears its end the next one fades in over it, and so on round the
 * list for as long as the page is open (with two tracks: back and forth).
 *
 * Tracks are streamed through <audio> elements routed into the engine's
 * music bus, not decoded into memory: a decoded three-minute track is tens
 * of megabytes. Playback waits for the engine's autoplay unlock, which the
 * torch already triggers.
 */

/** The music's level on its bus, 0-1. Background: under the ambience. */
const VOLUME = 0.19
/** Overlap between the end of one track and the start of the next, in seconds. */
const CROSSFADE = 3

export type Music = {
  /** Resolves once the first track is playing, or at once if sound is unavailable. */
  start(): Promise<'playing' | 'silent'>
  /** Index into the track list of what is playing, or -1. */
  readonly current: number
  stop(): void
}

export type MusicOptions = {
  tracks: readonly MusicTrack[]
  engine?: AudioEngine
  volume?: number
  crossfade?: number
  /** Random source in [0, 1); injectable for tests. */
  random?: () => number
  /** Media element factory; injectable for tests. */
  createElement?: () => HTMLMediaElement
}

type Player = {
  element: HTMLMediaElement
  gain: GainNode
  onTime: () => void
  onEnded: () => void
}

const noop = () => {}

export function createMusic({
  tracks,
  engine = audio,
  volume = VOLUME,
  crossfade = CROSSFADE,
  random = Math.random,
  createElement = () => new Audio(),
}: MusicOptions): Music {
  let stopped = false
  let current = -1
  let players: Player[] = []
  let context: AudioContext | undefined

  const fadeTo = (player: Player, level: number) => {
    if (!context) return
    const now = context.currentTime
    player.gain.gain.cancelScheduledValues(now)
    player.gain.gain.setValueAtTime(player.gain.gain.value, now)
    player.gain.gain.linearRampToValueAtTime(level, now + crossfade)
  }

  const play = (index: number) => {
    if (stopped) return
    const previous = current >= 0 ? players[current] : undefined
    current = index
    const player = players[index]!
    player.element.currentTime = 0
    fadeTo(player, volume)
    player.element.play().catch(noop)

    if (previous && previous !== player) {
      fadeTo(previous, 0)
      setTimeout(() => {
        if (current !== players.indexOf(previous)) previous.element.pause()
      }, crossfade * 1000)
    }
  }

  const next = () => play((current + 1) % players.length)

  const setup = (track: MusicTrack): Player => {
    const element = createElement()
    element.src = track.url
    element.preload = 'auto'
    const gain = engine.channel(0, 'music')
    engine.connectElement(element, gain)

    const player: Player = {
      element,
      gain,
      // Start the next track while this one is still finishing: the crossfade.
      onTime: () => {
        if (players[current] !== player) return
        const { duration, currentTime } = element
        if (Number.isFinite(duration) && duration > 0 && duration - currentTime <= crossfade) next()
      },
      // Safety net if timeupdate never caught the tail (throttled tab, odd durations).
      onEnded: () => {
        if (players[current] === player) next()
      },
    }
    element.addEventListener('timeupdate', player.onTime)
    element.addEventListener('ended', player.onEnded)
    return player
  }

  return {
    get current() {
      return current
    },
    async start() {
      context = engine.context
      if (stopped || !context || tracks.length === 0) return 'silent'
      await engine.unlock()
      if (stopped) return 'silent'
      players = tracks.map(setup)
      play(Math.floor(random() * players.length))
      return 'playing'
    },
    stop() {
      stopped = true
      for (const player of players) {
        player.element.removeEventListener('timeupdate', player.onTime)
        player.element.removeEventListener('ended', player.onEnded)
        player.element.pause()
        player.element.removeAttribute('src')
        player.gain.disconnect()
      }
      players = []
      current = -1
    },
  }
}
