import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAudioEngine } from '@/audio/engine'
import { fakeAudioContextClass, type FakeAudioContext } from '@/test/fakeAudio'
import { createSfx } from './sfx'

const flush = () => new Promise((r) => setTimeout(r, 0))

function setup() {
  const { Ctx, instances } = fakeAudioContextClass()
  const engine = createAudioEngine(Ctx)
  const sfx = createSfx({
    engine,
    urls: {
      thud: '/thud.mp3',
      flip: '/flip.mp3',
      whoosh: '/whoosh.mp3',
      paperThud: '/paper-thud.mp3',
      paperFlip: '/paper-flip.mp3',
    },
    levels: { thud: 0.9, flip: 0.7, whoosh: 0.6, paperThud: 0.5, paperFlip: 0.5 },
    skips: { paperFlip: 0.2 },
  })
  return { engine, sfx, ctx: () => instances[0] as FakeAudioContext }
}

describe('createSfx', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response(new ArrayBuffer(16))))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('plays a clip once through a gain on the sfx bus', async () => {
    const { engine, sfx, ctx } = setup()
    void engine.context
    await engine.unlock()
    sfx.play('thud')
    await flush()
    await flush()
    expect(ctx().sources).toHaveLength(1)
    const source = ctx().sources[0]!
    expect(source.started).toBeDefined()
    // Source -> its own gain at the effect's level -> the sfx bus.
    const out = source.connections[0]!
    expect(out.gain.value).toBe(0.9)
    expect(out.connections).toHaveLength(1)
    source.onended?.()
    expect(out.disconnected).toBe(true)
  })

  it('starts a clip past its leading pause when told to skip', async () => {
    const { engine, sfx, ctx } = setup()
    void engine.context
    await engine.unlock()
    sfx.play('paperFlip')
    sfx.play('thud')
    await flush()
    await flush()
    const [flip, thud] = ctx().sources
    expect(flip?.started?.offset).toBe(0.2)
    expect(thud?.started?.offset).toBe(0)
  })

  it('stays silent until the context is running', async () => {
    const { engine, sfx, ctx } = setup()
    void engine.context
    ctx().allowed = false
    sfx.play('flip')
    await flush()
    await flush()
    expect(ctx().sources).toHaveLength(0)
  })
})
