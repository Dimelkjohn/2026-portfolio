import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Board } from './Board'

describe('Board', () => {
  it('renders an accessible landmark with a heading', () => {
    render(<Board />)
    expect(screen.getByRole('main', { name: /evidence board/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/who is john dimelu/i)
  })

  it('renders children inside the evidence layer', () => {
    render(
      <Board>
        <span>pinned</span>
      </Board>,
    )
    expect(screen.getByTestId('board-layer')).toHaveTextContent('pinned')
  })
})
