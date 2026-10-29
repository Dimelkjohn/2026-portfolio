import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createViewPreference } from './viewPreference'
import { ViewToggle } from './ViewToggle'

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    data,
  }
}

describe('ViewToggle', () => {
  it('offers the two views with the board on by default, and remembers a switch', () => {
    const storage = fakeStorage()
    const preference = createViewPreference(storage)
    render(<ViewToggle preference={preference} place="board" />)
    const board = screen.getByRole('button', { name: 'Board' })
    const simplified = screen.getByRole('button', { name: 'Simplified' })
    expect(board).toHaveAttribute('aria-pressed', 'true')
    expect(simplified).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(simplified)
    expect(simplified).toHaveAttribute('aria-pressed', 'true')
    expect(board).toHaveAttribute('aria-pressed', 'false')
    expect(preference.get()).toBe('simplified')
    expect(storage.data.get('dimelu.view')).toBe('simplified')
  })

  it('starts on the remembered view', () => {
    const preference = createViewPreference(fakeStorage({ 'dimelu.view': 'simplified' }))
    render(<ViewToggle preference={preference} place="board" />)
    expect(screen.getByRole('button', { name: 'Simplified' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
