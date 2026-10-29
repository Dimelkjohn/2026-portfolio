import { act, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ClueCounter } from './ClueCounter'
import { createClues } from './clues'

describe('ClueCounter', () => {
  it('shows the clues found out of the total, and closes the case when they all are', () => {
    const store = createClues(2)
    render(<ClueCounter store={store} />)
    const counter = screen.getByRole('status')
    expect(counter).toHaveTextContent('Clues found')
    expect(counter).toHaveTextContent('00 / 02')
    act(() => store.found('x'))
    expect(counter).toHaveTextContent('01 / 02')
    act(() => store.found('y'))
    expect(counter).toHaveTextContent('Case closed')
    expect(counter).not.toHaveTextContent('02 / 02')
  })
})
