import { useSyncExternalStore } from 'react'

/**
 * Which way the visitor wants the site: the board (cork, torch, pins) or the
 * simplified view (the same facts as a plain typed sheet). Remembered in
 * localStorage, like the sound switches.
 */
export type View = 'board' | 'simplified'

export const VIEWS: readonly { id: View; label: string }[] = [
  { id: 'board', label: 'Board' },
  { id: 'simplified', label: 'Simplified' },
]

const STORAGE_KEY = 'dimelu.view'

export type ViewPreference = {
  get(): View
  set(view: View): void
  subscribe(listener: () => void): () => void
}

export function createViewPreference(
  storage: Pick<Storage, 'getItem' | 'setItem'> | undefined = safeStorage(),
): ViewPreference {
  let view: View = load(storage)
  const listeners = new Set<() => void>()
  return {
    get: () => view,
    set(next) {
      if (next === view) return
      view = next
      try {
        storage?.setItem(STORAGE_KEY, next)
      } catch {
        // Private mode or quota: the choice just does not persist.
      }
      for (const listener of listeners) listener()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

function load(storage: Pick<Storage, 'getItem'> | undefined): View {
  try {
    return storage?.getItem(STORAGE_KEY) === 'simplified' ? 'simplified' : 'board'
  } catch {
    return 'board'
  }
}

function safeStorage() {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}

/** The site's view preference. */
export const viewPreference = createViewPreference()

/** The current view, re-rendering when it changes. */
export function useView(preference: ViewPreference = viewPreference): View {
  return useSyncExternalStore(preference.subscribe, preference.get, preference.get)
}
