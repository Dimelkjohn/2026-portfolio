import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Work } from '@/data/work'
import { WorkCarousel, wrap } from './WorkCarousel'

const items: Work[] = ['Alpha', 'Beta', 'Gamma'].map((title, i) => ({
  id: title.toLowerCase(),
  title,
  tab: title,
  kind: 'tool',
  year: String(2020 + i),
  role: 'Build',
  summary: `${title} notes.`,
  tags: [],
}))

describe('WorkCarousel', () => {
  it('renders nothing while closed', () => {
    render(
      <WorkCarousel
        open={false}
        index={0}
        onIndexChange={() => {}}
        onClose={() => {}}
        items={items}
      />,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows the file at the given index at the front, with a count', () => {
    render(
      <WorkCarousel open index={1} onIndexChange={() => {}} onClose={() => {}} items={items} />,
    )
    expect(screen.getByRole('dialog', { name: 'Selected work' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Beta' })).toBeInTheDocument()
    expect(screen.getByText('Exhibit 02: Beta')).toBeInTheDocument()
    expect(screen.getByText('02 / 03')).toBeInTheDocument()
  })

  it('steps with the arrows and wraps round the ends', () => {
    const onIndexChange = vi.fn<(index: number) => void>()
    render(
      <WorkCarousel
        open
        index={2}
        onIndexChange={onIndexChange}
        onClose={() => {}}
        items={items}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Next exhibit' }))
    expect(onIndexChange).toHaveBeenLastCalledWith(0)
    fireEvent.click(screen.getByRole('button', { name: 'Previous exhibit' }))
    expect(onIndexChange).toHaveBeenLastCalledWith(1)
  })

  it('steps with the arrow keys and closes on Escape or the backdrop', async () => {
    const onIndexChange = vi.fn<(index: number) => void>()
    const onClose = vi.fn<() => void>()
    render(
      <WorkCarousel open index={0} onIndexChange={onIndexChange} onClose={onClose} items={items} />,
    )
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(onIndexChange).toHaveBeenLastCalledWith(1)
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(onIndexChange).toHaveBeenLastCalledWith(2)
    fireEvent.keyDown(window, { key: 'Escape' })
    // The snatch plays first; a second request while leaving is ignored.
    expect(screen.getByRole('dialog')).toHaveClass('dossier--leaving')
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  it('drops in with a puff of dust, then settles', () => {
    // jsdom runs no CSS animations, so the settle comes from the fallback timer.
    vi.useFakeTimers()
    try {
      render(
        <WorkCarousel open index={0} onIndexChange={() => {}} onClose={() => {}} items={items} />,
      )
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveClass('dossier--entering')
      expect(dialog.querySelectorAll('.dossier__puff')).toHaveLength(3)
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      expect(dialog).toHaveClass('dossier--settled')
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('WorkCarousel sound', () => {
  it('thuds on landing, flips on stepping and whooshes on leaving', () => {
    vi.useFakeTimers()
    try {
      const sfx = { play: vi.fn<(name: string) => void>(), preload: vi.fn<() => void>() }
      render(
        <WorkCarousel
          open
          index={0}
          onIndexChange={() => {}}
          onClose={() => {}}
          items={items}
          sfx={sfx}
        />,
      )
      expect(sfx.play).not.toHaveBeenCalled()
      act(() => {
        vi.advanceTimersByTime(300)
      })
      expect(sfx.play).toHaveBeenLastCalledWith('thud')
      fireEvent.click(screen.getByRole('button', { name: 'Next exhibit' }))
      expect(sfx.play).toHaveBeenLastCalledWith('flip')
      fireEvent.keyDown(window, { key: 'Escape' })
      expect(sfx.play).toHaveBeenLastCalledWith('whoosh')
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('wrap', () => {
  it('keeps an index inside the stack from either end', () => {
    expect(wrap(3, 3)).toBe(0)
    expect(wrap(-1, 3)).toBe(2)
    expect(wrap(1, 3)).toBe(1)
  })
})
