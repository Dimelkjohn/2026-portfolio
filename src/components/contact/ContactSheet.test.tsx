import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ContactSheet } from './ContactSheet'

describe('ContactSheet', () => {
  it('deals out a tag per way in, the channel first, and focuses the first', () => {
    render(<ContactSheet open onClose={() => {}} />)
    const dialog = screen.getByRole('dialog', { name: 'Make contact' })
    expect(dialog).toBeInTheDocument()
    const links = screen.getAllByRole('link')
    expect(links.map((a) => a.textContent)).toEqual([
      'Emailpaul.johndim@gmail.com',
      'LinkedInjohn-dimelu',
      'GitHubDimelkjohn',
      'Résumédownload the PDF',
    ])
    // A plain mailto: an encoded display name makes some mail handlers open nothing.
    expect(links[0]).toHaveAttribute('href', 'mailto:paul.johndim@gmail.com')
    expect(links[0]).not.toHaveAttribute('target')
    expect(links[1]).toHaveAttribute('target', '_blank')
    expect(links[0]).toHaveFocus()
  })

  it('gathers the tags back up before closing, on Escape or the backdrop', () => {
    vi.useFakeTimers()
    const onClose = vi.fn<() => void>()
    const { rerender } = render(<ContactSheet open onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    // The deal runs backwards first (four tags, just under a second); the owner hears nothing until it is done.
    expect(document.querySelector('.contact--leaving')).not.toBeNull()
    expect(onClose).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(1100)
    })
    expect(onClose).toHaveBeenCalledTimes(1)
    rerender(<ContactSheet open={false} onClose={onClose} />)
    expect(screen.queryByRole('dialog')).toBeNull()
    // Opened again, it deals in afresh and the backdrop still closes it.
    rerender(<ContactSheet open onClose={onClose} />)
    expect(document.querySelector('.contact--leaving')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    act(() => {
      vi.advanceTimersByTime(1100)
    })
    expect(onClose).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })
})
