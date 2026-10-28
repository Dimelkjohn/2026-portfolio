import { audio, type AudioEngine } from './engine'

/**
 * Which sounds the visitor wants on. One switch per bus of the audio engine
 * (SFX carries the flashlight and the one-shot effects); each switch drives
 * its bus's level, so a sound keeps running (and keeps the light in
 * sync, in the torch's case) while muted. The master switch is simply all
 * of them at once: on turns every sound on, off turns every sound off.
 * Remembered in localStorage.
 */

export type SoundId = 'sfx' | 'fly' | 'music'

export type SoundInfo = {
  id: SoundId
  label: string
  /** False for sounds that exist as a switch but have nothing behind them yet. */
  available: boolean
}

export const SOUNDS: readonly SoundInfo[] = [
  { id: 'music', label: 'Music', available: true },
  { id: 'sfx', label: 'SFX', available: true },
  { id: 'fly', label: 'Fly (Gus)', available: true },
]

/** Everything on unless the visitor switches it off. */
const DEFAULTS: Record<SoundId, boolean> = { music: true, sfx: true, fly: true }
const STORAGE_KEY = 'dimelu.sounds'

export type SoundPreferences = {
  isOn(id: SoundId): boolean
  setOn(id: SoundId, on: boolean): void
  toggle(id: SoundId): void
  /** True when every sound is on. */
  isMasterOn(): boolean
  /** Switch every sound on or off together. */
  setMasterOn(on: boolean): void
  /** All off if everything is on; otherwise all on. */
  toggleMaster(): void
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

  const persistAndNotify = () => {
    try {
      storage?.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Private mode or quota: the choice just does not persist.
    }
    for (const listener of listeners) listener()
  }

  const allOn = () => SOUNDS.every(({ id }) => state[id])

  return {
    isOn: (id) => state[id],
    setOn(id, on) {
      if (state[id] === on) return
      state[id] = on
      apply(id)
      persistAndNotify()
    },
    toggle(id) {
      this.setOn(id, !state[id])
    },
    isMasterOn: allOn,
    setMasterOn(on) {
      let changed = false
      for (const { id } of SOUNDS) {
        if (state[id] === on) continue
        state[id] = on
        apply(id)
        changed = true
      }
      if (changed) persistAndNotify()
    },
    toggleMaster() {
      this.setMasterOn(!allOn())
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
