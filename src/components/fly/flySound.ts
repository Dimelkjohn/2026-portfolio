import { audio, type AudioEngine } from '@/audio/engine'
import { createLoop, type Loop } from '@/audio/loop'

/**
 * The fly's buzz. The clip loops from LOOP_START to its end, seamlessly (see
 * audio/loop.ts), on its own channel of the shared engine. The channel starts
 * muted; Fly.tsx sets its level every frame from how close the cursor is to
 * the fly. Starting waits for the engine's autoplay unlock, which the torch
 * already triggers, so the buzz simply begins once sound is allowed.
 */

export const FLY_SOUND_URL = `${import.meta.env.BASE_URL}audio/fly.mp3`
/** Seconds into the clip where the loop begins (the first second is skipped). */
export const FLY_LOOP_START = 1

/** How quickly the level follows setLevel, as a time constant in seconds. */
const LEVEL_SMOOTHING = 0.06

export type FlySound = {
  /** Resolves once the buzz is looping (muted), or at once if sound is unavailable. */
  start(): Promise<'playing' | 'silent'>
  /** Set the channel level, 0-1. Smoothed, so it never clicks. */
  setLevel(level: number): void
  /** Stops playback and releases the channel. */
  stop(): void
}

export type FlySoundOptions = {
  url?: string
  loopStart?: number
  engine?: AudioEngine
}

export function createFlySound({
  url = FLY_SOUND_URL,
  loopStart = FLY_LOOP_START,
  engine = audio,
}: FlySoundOptions = {}): FlySound {
  let stopped = false
  let channel: GainNode | undefined
  let loop: Loop | undefined
  let level = 0

  return {
    async start() {
      const context = engine.context
      if (stopped || !context) return 'silent'
      let buffer: AudioBuffer
      try {
        buffer = await engine.load(url)
      } catch {
        return 'silent'
      }
      await engine.unlock()
      if (stopped) return 'silent'
      channel = engine.channel(0, 'fly')
      channel.gain.setValueAtTime(level, context.currentTime)
      loop = createLoop({ context, buffer, out: channel, loopStart })
      return 'playing'
    },
    setLevel(next) {
      level = Math.min(1, Math.max(0, next))
      const context = engine.context
      if (channel && context) {
        channel.gain.setTargetAtTime(level, context.currentTime, LEVEL_SMOOTHING)
      }
    },
    stop() {
      stopped = true
      loop?.stop()
      loop = undefined
      channel?.disconnect()
      channel = undefined
    },
  }
}
