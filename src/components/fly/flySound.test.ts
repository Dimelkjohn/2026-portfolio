import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAudioEngine } from '@/audio/engine'
import { fakeAudioContextClass, fakeFetch, type FakeAudioContext } from '@/test/fakeAudio'
import { createFlySound } from './flySound'

/** The fake decoder reports every clip as 13 s long. */
const CLIP_LENGTH = 13

function setup(loopStart = 1) {
  const { Ctx, instances } = fakeAudioContextClass()
  const engine = createAudioEngine(Ctx)
  const sound = createFlySound({ url: '/fly.mp3', loopStart, engine })
  return { engine, sound, ctx: () => instances[0] as FakeAudioContext }
}

describe('createFlySound', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn(fakeFetch()))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('loops the clip from the loop start to its end, muted', async () => {
    const { sound, ctx } = setup(1)
    await expect(sound.start()).resolves.toBe('playing')
    const sources = ctx().sources
    expect(sources.length).toBeGreaterThanOrEqual(2)
    for (const source of sources) {
      expect(source.started).toMatchObject({ offset: 1, duration: CLIP_LENGTH - 1 })
    }
    // Gains are created in order: master, then the channel (its bus comes right after). Silent at first.
    const channel = ctx().gains[1]!
    expect(channel.gain.value).toBe(0)
    sound.stop()
  })

  it('follows setLevel smoothly and clamps it', async () => {
    const { sound, ctx } = setup()
    await sound.start()
    const channel = ctx().gains[1]!
    sound.setLevel(0.4)
    sound.setLevel(7)
    sound.setLevel(-1)
    expect(channel.gain.targets.map((t) => t.value)).toEqual([0.4, 1, 0])
    expect(channel.gain.targets[0]!.timeConstant).toBeGreaterThan(0)
    sound.stop()
  })

  it('remembers a level set before playback starts', async () => {
    const { sound, ctx } = setup()
    sound.setLevel(0.3)
    await sound.start()
    expect(ctx().gains[1]!.gain.value).toBe(0.3)
    sound.stop()
  })

  it('is silent where Web Audio is unsupported or the clip is missing', async () => {
    const engine = createAudioEngine(undefined)
    await expect(createFlySound({ engine }).start()).resolves.toBe('silent')
    vi.stubGlobal('fetch', vi.fn(fakeFetch(404)))
    const { sound, ctx } = setup()
    await expect(sound.start()).resolves.toBe('silent')
    expect(ctx().sources).toHaveLength(0)
  })

  it('stop() silences everything, even if called while loading', async () => {
    const { sound, ctx } = setup()
    await sound.start()
    sound.stop()
    expect(ctx().sources.every((s) => s.stopped)).toBe(true)

    const late = setup()
    const started = late.sound.start()
    late.sound.stop()
    await expect(started).resolves.toBe('silent')
    expect(late.ctx().sources).toHaveLength(0)
  })
})
