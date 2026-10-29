import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Sfx } from '@/audio/sfx'
import type { Photo } from '@/data/photos'
import { PhotoCarousel } from './PhotoCarousel'

const prints: Photo[] = [
  { id: 'a', ratio: 2 / 3, media: { src: '/a.webp', alt: 'A poster' }, caption: 'Poster, 2024' },
  {
    id: 'b',
    ratio: 16 / 9,
    media: { src: '/b.webp', alt: 'A film still' },
    caption: 'Still, 2025',
    video: { youtube: 'abc123' },
  },
  { id: 'c', ratio: 1.5 },
]

describe('PhotoCarousel', () => {
  it('drops a pile of prints with their captions, named for the zone', () => {
    render(
      <PhotoCarousel open index={0} onIndexChange={() => {}} onClose={() => {}} items={prints} />,
    )
    expect(screen.getByRole('dialog', { name: 'Moonlighting' })).toBeInTheDocument()
    expect(screen.getByAltText('A poster')).toBeInTheDocument()
    expect(screen.getByText('Poster, 2024')).toBeInTheDocument()
    expect(screen.getByText('01 / 03')).toBeInTheDocument()
    // No folder, no typed tab: these are prints.
    expect(document.querySelector('.dossier__folder')).toBeNull()
    expect(document.querySelector('.dossier--photos')).not.toBeNull()
  })

  it('opens a photograph full size in a new tab when clicked', () => {
    render(
      <PhotoCarousel open index={0} onIndexChange={() => {}} onClose={() => {}} items={prints} />,
    )
    const link = screen.getByRole('link', { name: 'Open the photograph full size in a new tab' })
    expect(link).toHaveAttribute('href', '/a.webp')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toContainElement(screen.getByAltText('A poster'))
  })

  it('shows a film as its still until it is at the front, then plays it in the frame', () => {
    const { rerender } = render(
      <PhotoCarousel open index={0} onIndexChange={() => {}} onClose={() => {}} items={prints} />,
    )
    // Behind the front print: the still, no player.
    expect(screen.getByAltText('A film still')).toBeInTheDocument()
    expect(document.querySelector('iframe')).toBeNull()
    rerender(
      <PhotoCarousel open index={1} onIndexChange={() => {}} onClose={() => {}} items={prints} />,
    )
    const player = document.querySelector<HTMLIFrameElement>('iframe')
    expect(player?.src).toContain('youtube-nocookie.com/embed/abc123')
    expect(screen.queryByAltText('A film still')).toBeNull()
  })

  it('steps through the prints with the arrows and shows the blank for a missing picture', () => {
    let index = 0
    const { rerender } = render(
      <PhotoCarousel
        open
        index={index}
        onIndexChange={(i) => {
          index = i
        }}
        onClose={() => {}}
        items={prints}
      />,
    )
    // The index is the caller's: each step reports the next one and the caller renders it.
    const next = () => {
      fireEvent.click(screen.getByRole('button', { name: 'Next photograph' }))
      rerender(
        <PhotoCarousel
          open
          index={index}
          onIndexChange={(i) => {
            index = i
          }}
          onClose={() => {}}
          items={prints}
        />,
      )
    }
    next()
    next()
    expect(screen.getByText('03 / 03')).toBeInTheDocument()
    expect(screen.getByText('Photograph to follow')).toBeInTheDocument()
  })

  it('lands and flips with paper sounds, not the folders', () => {
    vi.useFakeTimers()
    const sfx: Sfx = { play: vi.fn<Sfx['play']>(), preload: vi.fn<Sfx['preload']>() }
    render(
      <PhotoCarousel
        open
        index={0}
        onIndexChange={() => {}}
        onClose={() => {}}
        items={prints}
        sfx={sfx}
      />,
    )
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(sfx.play).toHaveBeenLastCalledWith('paperThud')
    fireEvent.click(screen.getByRole('button', { name: 'Next photograph' }))
    expect(sfx.play).toHaveBeenLastCalledWith('paperFlip')
    vi.useRealTimers()
  })
})
