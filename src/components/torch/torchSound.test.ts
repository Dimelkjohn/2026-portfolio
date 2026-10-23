import { fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAudioEngine } from '@/audio/engine'
import {
  fakeAudioContextClass,
  fakeFetch,
  type FakeAudioContext,
  type FakeSource,
} from '@/test/fakeAudio'
import { createTorchSound, TORCH_SOUND_CUES } from './torchSound'

const { switchOnEnd, ambienceEnd } = TORCH_SOUND_CUES
const ambienceLength = ambienceEnd - switchOnEnd

function setup() {
  const { Ctx, instances } = fakeAudioContextClass()
  const engine = createAudioEngine(Ctx)
  const onNeedsGesture = vi.fn<() => void>()
  const sound = createTorchSound({ url: '/torch.mp3', engine, onNeedsGesture })
  return { engine, sound, onNeedsGesture, ctx: () => instances[0] as FakeAudioContext }
}

describe('createTorchSound', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn(fakeFetch()))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('plays the switch-on and first ambience run as one piece, then loops the ambience', async () => {
    const { sound, ctx } = setup()
    await expect(sound.start()).resolves.toBe('playing')

    const [first, ...repeats] = ctx().sources as [FakeSource, ...FakeSource[]]
    expect(first.started).toMatchObject({ offset: 0, duration: ambienceEnd })
    expect(repeats.length).toBeGreaterThanOrEqual(2)

    let previousEnd = first.started!.at + first.started!.duration
    for (const repeat of repeats) {
      expect(repeat.started).toMatchObject({ offset: switchOnEnd, duration: ambienceLength })
      // Each repeat starts just before the previous one ends, inside the crossfade.
      expect(repeat.started!.at).toBeLessThan(previousEnd)
      expect(repeat.started!.at).toBeGreaterThan(previousEnd - 1)
      previousEnd = repeat.started!.at + repeat.started!.duration
    }
    sound.stop()
  })

  it('crossfades every repeat: the newcomer fades in while the old one fades out', async () => {
    const { sound, ctx } = setup()
    await sound.start()
    const [first, second] = ctx().sources as [FakeSource, FakeSource]
    const gainOf = (source: FakeSource) => source.connections[0]!
    const fadeOut = gainOf(first).gain.curves[0]!
    const fadeIn = gainOf(second).gain.curves[0]!
    expect(fadeOut.at).toBe(second.started!.at)
    expect(fadeIn.at).toBe(second.started!.at)
    expect(fadeOut.duration).toBe(fadeIn.duration)
    expect(fadeOut.curve[0]).toBeCloseTo(1)
    expect(fadeOut.curve.at(-1)).toBeCloseTo(0)
    expect(fadeIn.curve[0]).toBeCloseTo(0)
    expect(fadeIn.curve.at(-1)).toBeCloseTo(1)
    sound.stop()
  })

  it('keeps the queue topped up as the clock advances', async () => {
    const { sound, ctx } = setup()
    await sound.start()
    const before = ctx().sources.length
    ctx().currentTime += 30
    await vi.advanceTimersByTimeAsync(5000)
    expect(ctx().sources.length).toBeGreaterThan(before)
    sound.stop()
  })

  it('waits for a gesture when the browser blocks autoplay', async () => {
    const { sound, ctx, onNeedsGesture, engine } = setup()
    void engine.context
    ctx().allowed = false
    let outcome: string | undefined
    const started = sound.start().then((result) => {
      outcome = result
    })
    await vi.advanceTimersByTimeAsync(200)
    expect(onNeedsGesture).toHaveBeenCalledTimes(1)
    expect(outcome).toBeUndefined()
    expect(ctx().sources).toHaveLength(0)

    ctx().allowed = true
    fireEvent.keyDown(window, { key: 'Enter' })
    await started
    expect(outcome).toBe('playing')
    expect(ctx().sources.length).toBeGreaterThan(0)
    sound.stop()
  })

  it('switches on silently when the clip cannot be loaded', async () => {
    vi.stubGlobal('fetch', vi.fn(fakeFetch(404)))
    const { sound, ctx } = setup()
    await expect(sound.start()).resolves.toBe('silent')
    expect(ctx().sources).toHaveLength(0)
  })

  it('switches on silently where Web Audio is unsupported', async () => {
    const engine = createAudioEngine(undefined)
    const sound = createTorchSound({ engine })
    await expect(sound.start()).resolves.toBe('silent')
  })

  it('stop() silences every scheduled source and stops queuing', async () => {
    const { sound, ctx } = setup()
    await sound.start()
    sound.stop()
    expect(ctx().sources.every((source) => source.stopped)).toBe(true)
    const count = ctx().sources.length
    ctx().currentTime += 60
    await vi.advanceTimersByTimeAsync(10000)
    expect(ctx().sources).toHaveLength(count)
  })

  it('does nothing if stopped while still loading', async () => {
    const { sound, ctx } = setup()
    const started = sound.start()
    sound.stop()
    await expect(started).resolves.toBe('silent')
    expect(ctx().sources).toHaveLength(0)
  })
})
