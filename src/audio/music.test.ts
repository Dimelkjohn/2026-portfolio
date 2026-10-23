import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAudioEngine } from './engine'
import { createMusic } from './music'
import { fakeAudioContextClass, FakeMediaElement } from '@/test/fakeAudio'

const tracks = [
  { title: 'A', artist: 'a', url: '/a.mp3' },
  { title: 'B', artist: 'b', url: '/b.mp3' },
]

function setup(random = () => 0) {
  const { Ctx, instances } = fakeAudioContextClass()
  const engine = createAudioEngine(Ctx)
  const elements: FakeMediaElement[] = []
  const music = createMusic({
    tracks,
    engine,
    random,
    volume: 0.5,
    crossfade: 3,
    createElement: () => {
      const el = new FakeMediaElement()
      el.duration = 120
      elements.push(el)
      return el as unknown as HTMLMediaElement
    },
  })
  return { music, elements, ctx: () => instances[0]! }
}

describe('createMusic', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('picks a random track to start and routes every track through the music bus', async () => {
    const { music, elements, ctx } = setup(() => 0.99)
    await expect(music.start()).resolves.toBe('playing')
    expect(elements.map((el) => el.src)).toEqual(['/a.mp3', '/b.mp3'])
    expect(music.current).toBe(1)
    expect(elements[1]!.plays).toBe(1)
    expect(elements[0]!.plays).toBe(0)
    expect(ctx().elementSources).toHaveLength(2)
    music.stop()
  })

  it('bounces to the other track as one ends, crossfading, and back again', async () => {
    const { music, elements } = setup(() => 0)
    await music.start()
    const [a, b] = elements as [FakeMediaElement, FakeMediaElement]
    expect(music.current).toBe(0)

    a.seek(60)
    expect(music.current).toBe(0)
    expect(b.plays).toBe(0)

    // Inside the last 3 s of A: B starts while A fades out, then A is paused.
    a.seek(117.5)
    expect(music.current).toBe(1)
    expect(b.plays).toBe(1)
    expect(a.paused).toBe(false)
    vi.advanceTimersByTime(3100)
    expect(a.paused).toBe(true)

    // A later timeupdate from A (no longer current) changes nothing.
    a.seek(119)
    expect(music.current).toBe(1)

    b.seek(118)
    expect(music.current).toBe(0)
    expect(a.plays).toBe(2)
    expect(a.currentTime).toBe(0)
    music.stop()
  })

  it('still moves on if a track simply ends', async () => {
    const { music, elements } = setup(() => 0)
    await music.start()
    elements[0]!.end()
    expect(music.current).toBe(1)
    expect(elements[1]!.plays).toBe(1)
    music.stop()
  })

  it('is silent with no tracks or no Web Audio, and stops cleanly', async () => {
    await expect(
      createMusic({ tracks: [], engine: createAudioEngine(undefined) }).start(),
    ).resolves.toBe('silent')
    const { music, elements } = setup()
    await music.start()
    music.stop()
    expect(elements.every((el) => el.paused && el.src === '')).toBe(true)
    expect(music.current).toBe(-1)
  })
})
