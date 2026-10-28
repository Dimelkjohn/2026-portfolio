import { describe, expect, it, vi } from 'vitest'
import type { AudioEngine } from './engine'
import { SOUNDS, createSoundPreferences } from './preferences'

function fakeEngine() {
  const levels: Array<[string, number]> = []
  const engine = { setBusLevel: (bus: string, level: number) => levels.push([bus, level]) }
  return { engine: engine as unknown as AudioEngine, levels }
}

function fakeStorage(initial?: string) {
  let stored = initial
  return {
    getItem: () => stored ?? null,
    setItem: (_key: string, value: string) => {
      stored = value
    },
    get stored() {
      return stored
    },
  }
}

describe('createSoundPreferences', () => {
  it('starts from the defaults and pushes them to the engine buses', () => {
    const { engine, levels } = fakeEngine()
    const prefs = createSoundPreferences(engine, fakeStorage())
    expect(prefs.isOn('sfx')).toBe(true)
    expect(prefs.isOn('fly')).toBe(true)
    expect(levels).toEqual([
      ['music', 1],
      ['sfx', 1],
      ['fly', 1],
    ])
  })

  it('toggling updates the bus, persists and notifies', () => {
    const { engine, levels } = fakeEngine()
    const storage = fakeStorage()
    const prefs = createSoundPreferences(engine, storage)
    const listener = vi.fn<() => void>()
    prefs.subscribe(listener)
    prefs.toggle('sfx')
    expect(prefs.isOn('sfx')).toBe(false)
    expect(levels.at(-1)).toEqual(['sfx', 0])
    expect(JSON.parse(storage.stored!)).toMatchObject({ sfx: false })
    expect(listener).toHaveBeenCalledTimes(1)
    prefs.setOn('sfx', false)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('restores saved choices and ignores junk', () => {
    const { engine } = fakeEngine()
    const restored = createSoundPreferences(
      engine,
      fakeStorage(JSON.stringify({ sfx: false, fly: 'yes', bogus: 1 })),
    )
    expect(restored.isOn('sfx')).toBe(false)
    expect(restored.isOn('fly')).toBe(true)
    const junk = createSoundPreferences(engine, fakeStorage('{not json'))
    expect(junk.isOn('sfx')).toBe(true)
  })

  it('works without storage', () => {
    const { engine } = fakeEngine()
    const prefs = createSoundPreferences(engine, undefined)
    prefs.toggle('fly')
    expect(prefs.isOn('fly')).toBe(false)
  })
})

describe('master switch', () => {
  it('is on only when every sound is on', () => {
    const prefs = createSoundPreferences(fakeEngine().engine, fakeStorage())
    expect(prefs.isMasterOn()).toBe(true)
    prefs.setOn('fly', false)
    expect(prefs.isMasterOn()).toBe(false)
  })

  it('switching it on turns every sound on, and off turns every sound off', () => {
    const { engine, levels } = fakeEngine()
    const storage = fakeStorage()
    const prefs = createSoundPreferences(engine, storage)
    prefs.setOn('fly', false)
    levels.length = 0
    prefs.setMasterOn(true)
    expect(levels).toEqual([['fly', 1]])
    expect(SOUNDS.every(({ id }) => prefs.isOn(id))).toBe(true)
    levels.length = 0
    prefs.setMasterOn(false)
    expect(levels).toEqual([
      ['music', 0],
      ['sfx', 0],
      ['fly', 0],
    ])
    expect(JSON.parse(storage.stored!)).toEqual({ sfx: false, fly: false, music: false })
  })

  it('toggling from a mixed state turns everything on first', () => {
    const prefs = createSoundPreferences(fakeEngine().engine, fakeStorage())
    prefs.setOn('music', false)
    prefs.toggleMaster()
    expect(prefs.isMasterOn()).toBe(true)
    prefs.toggleMaster()
    expect(SOUNDS.some(({ id }) => prefs.isOn(id))).toBe(false)
  })
})
