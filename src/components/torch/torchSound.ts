import { audio, type AudioEngine } from '@/audio/engine'
import { createLoop, type Loop } from '@/audio/loop'

/**
 * The torch's sound. One 13 s clip holds three parts:
 *
 *   0 - 1 s    the switch clicking on
 *   1 - 11 s   the ambience of the torch running
 *   11 - 13 s  the switch clicking off (unused)
 *
 * start() plays the switch-on once and then loops the ambience for as long as
 * the page is open (see audio/loop.ts for how the seam is hidden).
 *
 * Playback goes through the shared audio engine, which owns the autoplay
 * unlock: if the browser will not play until the visitor interacts, that is
 * reported through onNeedsGesture and start() waits for the gesture. The
 * returned promise settles when the switch-on actually starts, which is the
 * moment the light should come on. If audio is unavailable or the clip fails
 * to load, start() settles at once so the torch never stays off.
 */

export const TORCH_SOUND_URL = `${import.meta.env.BASE_URL}audio/torch.mp3`

export type TorchSoundCues = {
  /** Seconds into the clip where the switch-on ends and the ambience begins. */
  switchOnEnd: number
  /** Seconds into the clip where the ambience ends and the switch-off begins. */
  ambienceEnd: number
}

export const TORCH_SOUND_CUES: TorchSoundCues = { switchOnEnd: 1, ambienceEnd: 11 }

/** The torch's level on the master bus, 0-1. */
const VOLUME = 0.43

export type TorchSoundOutcome = 'playing' | 'silent'

export type TorchSound = {
  /** Resolves when the light should switch on: as the sound starts, or at once if it cannot. */
  start(): Promise<TorchSoundOutcome>
  /** Stops playback and releases the torch's channel. */
  stop(): void
}

export type TorchSoundOptions = {
  url?: string
  cues?: TorchSoundCues
  volume?: number
  engine?: AudioEngine
  /** Called if the browser will not play until the visitor interacts. */
  onNeedsGesture?: () => void
}

export function createTorchSound({
  url = TORCH_SOUND_URL,
  cues = TORCH_SOUND_CUES,
  volume = VOLUME,
  engine = audio,
  onNeedsGesture,
}: TorchSoundOptions = {}): TorchSound {
  let stopped = false
  let channel: GainNode | undefined
  let loop: Loop | undefined

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
      await engine.unlock(() => {
        if (!stopped) onNeedsGesture?.()
      })
      if (stopped) return 'silent'
      channel = engine.channel(volume, 'torch')
      // Switch-on followed by the ambience as one uncut piece, then the ambience repeats.
      loop = createLoop({
        context,
        buffer,
        out: channel,
        firstStart: 0,
        loopStart: cues.switchOnEnd,
        loopEnd: cues.ambienceEnd,
      })
      return 'playing'
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
