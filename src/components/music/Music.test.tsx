import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Music as MusicPlayer, MusicOptions } from '@/audio/music'
import { Music } from './Music'

const { createMusic, players } = vi.hoisted(() => {
  type Fake = {
    start: ReturnType<typeof vi.fn<() => Promise<'playing'>>>
    stop: ReturnType<typeof vi.fn<() => void>>
  }
  const fakes: Fake[] = []
  const mock = vi.fn<(options: MusicOptions) => MusicPlayer>(() => {
    const fake: Fake = {
      start: vi.fn<() => Promise<'playing'>>(() => Promise.resolve('playing')),
      stop: vi.fn<() => void>(),
    }
    fakes.push(fake)
    return { ...fake, current: -1 }
  })
  return { createMusic: mock, players: fakes }
})

vi.mock('@/audio/music', () => ({ createMusic }))

describe('Music', () => {
  it('starts the playlist on mount and stops it on unmount', () => {
    const { container, unmount } = render(<Music />)
    expect(container).toBeEmptyDOMElement()
    expect(createMusic).toHaveBeenCalledTimes(1)
    expect(createMusic.mock.calls[0]![0].tracks).toHaveLength(2)
    expect(players[0]!.start).toHaveBeenCalledTimes(1)
    unmount()
    expect(players[0]!.stop).toHaveBeenCalledTimes(1)
  })
})
