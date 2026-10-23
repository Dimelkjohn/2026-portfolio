import { describe, expect, it, vi } from 'vitest'
import type { AudioEngine } from './engine'
import { createSoundPreferences } from './preferences'

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
    expect(prefs.isOn('torch')).toBe(true)
    expect(prefs.isOn('fly')).toBe(true)
    expect(levels).toEqual([
      ['torch', 1],
      ['fly', 1],
      ['music', 1],
    ])
  })

  it('toggling updates the bus, persists and notifies', () => {
    const { engine, levels } = fakeEngine()
    const storage = fakeStorage()
    const prefs = createSoundPreferences(engine, storage)
    const listener = vi.fn<() => void>()
    prefs.subscribe(listener)
    prefs.toggle('torch')
    expect(prefs.isOn('torch')).toBe(false)
    expect(levels.at(-1)).toEqual(['torch', 0])
    expect(JSON.parse(storage.stored!)).toMatchObject({ torch: false })
    expect(listener).toHaveBeenCalledTimes(1)
    prefs.setOn('torch', false)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('restores saved choices and ignores junk', () => {
    const { engine } = fakeEngine()
    const restored = createSoundPreferences(
      engine,
      fakeStorage(JSON.stringify({ torch: false, fly: 'yes', bogus: 1 })),
    )
    expect(restored.isOn('torch')).toBe(false)
    expect(restored.isOn('fly')).toBe(true)
    const junk = createSoundPreferences(engine, fakeStorage('{not json'))
    expect(junk.isOn('torch')).toBe(true)
  })

  it('works without storage', () => {
    const { engine } = fakeEngine()
    const prefs = createSoundPreferences(engine, undefined)
    prefs.toggle('fly')
    expect(prefs.isOn('fly')).toBe(false)
  })
})
