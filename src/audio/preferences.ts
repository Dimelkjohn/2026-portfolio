import { audio, type AudioEngine } from './engine'

/**
 * Which sounds the visitor wants on. One switch per object; each drives a
 * bus of the audio engine, so a sound keeps running (and keeps the light in
 * sync, in the torch's case) while muted. Remembered in localStorage.
 */

export type SoundId = 'torch' | 'fly' | 'music'

export type SoundInfo = {
  id: SoundId
  label: string
  /** False for sounds that exist as a switch but have nothing behind them yet. */
  available: boolean
}

export const SOUNDS: readonly SoundInfo[] = [
  { id: 'torch', label: 'Flashlight', available: true },
  { id: 'fly', label: 'Fly (Gus)', available: true },
  { id: 'music', label: 'Music', available: true },
]

/** Everything on unless the visitor switches it off. */
const DEFAULTS: Record<SoundId, boolean> = { torch: true, fly: true, music: true }
const STORAGE_KEY = 'dimelu.sounds'

export type SoundPreferences = {
  isOn(id: SoundId): boolean
  setOn(id: SoundId, on: boolean): void
  toggle(id: SoundId): void
  subscribe(listener: () => void): () => void
}

export function createSoundPreferences(
  engine: AudioEngine = audio,
  storage: Pick<Storage, 'getItem' | 'setItem'> | undefined = safeStorage(),
): SoundPreferences {
  const state: Record<SoundId, boolean> = { ...DEFAULTS, ...load(storage) }
  const listeners = new Set<() => void>()

  const apply = (id: SoundId) => engine.setBusLevel(id, state[id] ? 1 : 0)
  for (const { id } of SOUNDS) apply(id)

  return {
    isOn: (id) => state[id],
    setOn(id, on) {
      if (state[id] === on) return
      state[id] = on
      apply(id)
      try {
        storage?.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch {
        // Private mode or quota: the choice just does not persist.
      }
      for (const listener of listeners) listener()
    },
    toggle(id) {
      this.setOn(id, !state[id])
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

function safeStorage() {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}

function load(storage: Pick<Storage, 'getItem'> | undefined): Partial<Record<SoundId, boolean>> {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    const out: Partial<Record<SoundId, boolean>> = {}
    for (const { id } of SOUNDS) {
      const value = (parsed as Record<string, unknown>)[id]
      if (typeof value === 'boolean') out[id] = value
    }
    return out
  } catch {
    return {}
  }
}

/** The site's sound switches. */
export const soundPreferences = createSoundPreferences()
