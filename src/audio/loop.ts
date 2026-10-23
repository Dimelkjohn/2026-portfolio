/**
 * Seamless looping of a slice of a decoded clip.
 *
 * Each repeat is a fresh buffer source scheduled on the audio clock and
 * equal-power crossfaded into the one before it, so the loop seam is
 * inaudible and playback never depends on JavaScript timers firing on time.
 * The first pass can start earlier in the clip than the loop does (a lead-in
 * such as a switch click) and runs uncut into the first loop pass.
 */

export type LoopOptions = {
  context: AudioContext
  buffer: AudioBuffer
  /** Node the loop plays into, typically a channel from the engine. */
  out: AudioNode
  /** Seconds into the clip where each repeat starts. */
  loopStart: number
  /** Seconds into the clip where each repeat ends. Defaults to the clip's end. */
  loopEnd?: number
  /** Seconds into the clip where the very first pass starts. Defaults to loopStart. */
  firstStart?: number
  /** Overlap between one repeat and the next, in seconds. */
  crossfade?: number
}

export type Loop = {
  /** Stops every scheduled repeat and stops queuing more. */
  stop(): void
}

/** How much audio to keep queued on the audio clock, in seconds. */
const QUEUE_AHEAD = 24
/** How often to top the queue up, in milliseconds. */
const QUEUE_EVERY = 4000
const DEFAULT_CROSSFADE = 0.35

const CURVE_STEPS = 64
const FADE_IN = Float32Array.from({ length: CURVE_STEPS }, (_, i) =>
  Math.sin(((i / (CURVE_STEPS - 1)) * Math.PI) / 2),
)
const FADE_OUT = Float32Array.from({ length: CURVE_STEPS }, (_, i) =>
  Math.cos(((i / (CURVE_STEPS - 1)) * Math.PI) / 2),
)

export function createLoop({
  context,
  buffer,
  out,
  loopStart,
  loopEnd = buffer.duration,
  firstStart = loopStart,
  crossfade = DEFAULT_CROSSFADE,
}: LoopOptions): Loop {
  const live = new Set<AudioBufferSourceNode>()
  let timer: ReturnType<typeof setTimeout> | undefined

  const segment = (at: number, offset: number, duration: number, fadeIn: boolean) => {
    const gain = context.createGain()
    gain.connect(out)
    if (fadeIn) gain.gain.setValueCurveAtTime(FADE_IN, at, crossfade)
    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(gain)
    source.onended = () => {
      source.disconnect()
      gain.disconnect()
      live.delete(source)
    }
    live.add(source)
    source.start(at, offset, duration)
    return gain
  }

  const repeatLength = loopEnd - loopStart
  const t0 = context.currentTime + 0.02
  let lastGain = segment(t0, firstStart, loopEnd - firstStart, false)
  let segmentEnd = t0 + (loopEnd - firstStart)

  const queue = () => {
    while (segmentEnd - context.currentTime < QUEUE_AHEAD) {
      const at = segmentEnd - crossfade
      lastGain.gain.setValueCurveAtTime(FADE_OUT, at, crossfade)
      lastGain = segment(at, loopStart, repeatLength, true)
      segmentEnd = at + repeatLength
    }
    timer = setTimeout(queue, QUEUE_EVERY)
  }
  queue()

  return {
    stop() {
      clearTimeout(timer)
      for (const source of live) {
        try {
          source.stop()
        } catch {
          // already ended
        }
      }
      live.clear()
    },
  }
}
