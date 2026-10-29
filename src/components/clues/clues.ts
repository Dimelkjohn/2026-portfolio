import { useSyncExternalStore } from 'react'
import { interactive } from '@/components/evidence/interactive'
import { boardData } from '@/data/board'

/**
 * The clue count: how many of the board's clickable pieces the visitor has
 * opened so far, out of how many there are. A piece counts once however
 * often it is clicked. The view switch is not a piece of evidence and does
 * not count. Kept for the visit only.
 */
export type Clues = {
  /** Note that a piece was opened. True the first time for that piece, when the count goes up. */
  found(id: string): boolean
  count(): number
  total(): number
  /** Every clue found. */
  complete(): boolean
  reset(): void
  subscribe(listener: () => void): () => void
}

export function createClues(total: number): Clues {
  const found = new Set<string>()
  const listeners = new Set<() => void>()
  const notify = () => {
    for (const listener of listeners) listener()
  }
  return {
    found(id) {
      if (found.has(id)) return false
      found.add(id)
      notify()
      return true
    },
    count: () => found.size,
    total: () => total,
    complete: () => total > 0 && found.size >= total,
    reset() {
      if (found.size === 0) return
      found.clear()
      notify()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

/**
 * When the CASE CLOSED stamp hits the counter, in ms after the last clue:
 * the number's jolt first, then the stamp's drop to its impact (its 420ms
 * delay plus the 45% mark of its 460ms slam, in clues.css).
 */
export const STAMP_IMPACT_MS = 630

/** The board's clues: every item a click does something with. */
export const clues = createClues(boardData.items.filter(interactive).length)

/** The count so far, re-rendering as clues are found. */
export function useClueCount(store: Clues = clues): number {
  return useSyncExternalStore(store.subscribe, store.count, store.count)
}
