import { fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeAudioContextClass, fakeFetch } from '@/test/fakeAudio'
import { createAudioEngine } from './engine'

describe('createAudioEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn(fakeFetch()))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('reports no context where Web Audio is unsupported and still unlocks', async () => {
    const engine = createAudioEngine(undefined)
    expect(engine.context).toBeUndefined()
    await expect(engine.unlock()).resolves.toBeUndefined()
    await expect(engine.load('/x.mp3')).rejects.toThrow('not supported')
  })

  it('creates one context and one master bus, lazily', () => {
    const { Ctx, instances } = fakeAudioContextClass()
    const engine = createAudioEngine(Ctx)
    expect(instances).toHaveLength(0)
    const a = engine.context
    const b = engine.context
    expect(a).toBe(b)
    expect(instances).toHaveLength(1)
    expect(instances[0]!.gains).toHaveLength(1)
    expect(instances[0]!.gains[0]!.connections).toContain(instances[0]!.destination)
  })

  it('unlocks straight away when the browser allows it', async () => {
    const { Ctx, instances } = fakeAudioContextClass()
    const engine = createAudioEngine(Ctx)
    const onBlocked = vi.fn<() => void>()
    await engine.unlock(onBlocked)
    expect(instances[0]!.state).toBe('running')
    expect(onBlocked).not.toHaveBeenCalled()
  })

  it('asks for a gesture when blocked and resolves on the first click', async () => {
    const { Ctx, instances } = fakeAudioContextClass()
    const engine = createAudioEngine(Ctx)
    const onBlocked = vi.fn<() => void>()
    let unlocked = false
    void engine.context
    instances[0]!.allowed = false
    const first = engine.unlock(onBlocked).then(() => {
      unlocked = true
    })
    // A second sound asking at the same time shares the wait and is told too.
    const onBlockedLater = vi.fn<() => void>()
    const second = engine.unlock(onBlockedLater)

    await vi.advanceTimersByTimeAsync(200)
    expect(onBlocked).toHaveBeenCalledTimes(1)
    expect(onBlockedLater).toHaveBeenCalledTimes(1)
    expect(unlocked).toBe(false)

    // Someone asking after the verdict is told immediately.
    const onBlockedLate = vi.fn<() => void>()
    void engine.unlock(onBlockedLate)
    expect(onBlockedLate).toHaveBeenCalledTimes(1)

    instances[0]!.allowed = true
    fireEvent.pointerDown(window)
    await first
    await second
    expect(unlocked).toBe(true)
    expect(instances[0]!.state).toBe('running')
  })

  it('fetches and decodes each clip once', async () => {
    const { Ctx, instances } = fakeAudioContextClass()
    const engine = createAudioEngine(Ctx)
    const [a, b] = await Promise.all([engine.load('/a.mp3'), engine.load('/a.mp3')])
    await engine.load('/b.mp3')
    expect(a).toBe(b)
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(instances[0]!.decoded).toHaveLength(2)
  })

  it('does not cache a failed load', async () => {
    const { Ctx } = fakeAudioContextClass()
    const engine = createAudioEngine(Ctx)
    vi.stubGlobal('fetch', vi.fn(fakeFetch(404)))
    await expect(engine.load('/missing.mp3')).rejects.toThrow('404')
    vi.stubGlobal('fetch', vi.fn(fakeFetch(200)))
    await expect(engine.load('/missing.mp3')).resolves.toBeTruthy()
  })

  it('channels feed the master bus and follow the master volume', () => {
    const { Ctx, instances } = fakeAudioContextClass()
    const engine = createAudioEngine(Ctx)
    const channel = engine.channel(0.5)
    const master = instances[0]!.gains[0]!
    expect(channel.gain.value).toBe(0.5)
    expect((channel as unknown as { connections: unknown[] }).connections).toContain(master)
    engine.volume = 0.25
    expect(master.gain.value).toBe(0.25)
    engine.volume = 7
    expect(engine.volume).toBe(1)
  })
})
