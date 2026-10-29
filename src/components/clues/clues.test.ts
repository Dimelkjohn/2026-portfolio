import { describe, expect, it, vi } from 'vitest'
import { interactive } from '@/components/evidence/interactive'
import { boardData } from '@/data/board'
import { clues, createClues } from './clues'

describe('clues', () => {
  it('counts each piece once, however often it is opened, up to the total', () => {
    const store = createClues(3)
    const listener = vi.fn<() => void>()
    store.subscribe(listener)
    expect(store.found('a')).toBe(true)
    expect(store.found('a')).toBe(false)
    expect(store.found('b')).toBe(true)
    expect(store.count()).toBe(2)
    expect(listener).toHaveBeenCalledTimes(2)
    expect(store.complete()).toBe(false)
    store.found('c')
    expect(store.complete()).toBe(true)
    store.reset()
    expect(store.count()).toBe(0)
  })

  it('totals the clickable pieces on the board, and nothing else', () => {
    const clickable = boardData.items.filter(interactive)
    expect(clues.total()).toBe(clickable.length)
    // Every cutting, the pile, the handshake and the notes that lift; not the bag or a buried scan.
    expect(clickable.map((item) => item.id)).toEqual(
      expect.arrayContaining(['clip-obsessed', 'design-photos', 'handshake']),
    )
    expect(clickable.some((item) => item.id === 'design-bag')).toBe(false)
  })
})
