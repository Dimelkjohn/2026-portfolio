import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FlySound } from './flySound'
import { Fly } from './Fly'

const { createFlySound, buzzes } = vi.hoisted(() => {
  type Fake = { levels: number[]; stop: ReturnType<typeof vi.fn<() => void>> }
  const fakes: Fake[] = []
  const mock = vi.fn<(options?: unknown) => FlySound>(() => {
    const fake: Fake = { levels: [], stop: vi.fn<() => void>() }
    fakes.push(fake)
    return {
      start: () => Promise.resolve('playing' as const),
      setLevel: (level: number) => {
        fake.levels.push(level)
      },
      stop: fake.stop,
    }
  })
  return { createFlySound: mock, buzzes: fakes }
})

vi.mock('./flySound', () => ({ createFlySound }))

function createFrameQueue() {
  let queue: FrameRequestCallback[] = []
  let now = 0
  let id = 0
  return {
    request: (cb: FrameRequestCallback) => {
      queue.push(cb)
      return ++id
    },
    cancel: () => {
      queue = []
    },
    advance(count: number, ms = 16) {
      for (let i = 0; i < count; i++) {
        now += ms
        const pending = queue
        queue = []
        for (const cb of pending) cb(now)
      }
    },
  }
}

const bodyPosition = (stage: HTMLElement) => {
  const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(
    stage.querySelector<HTMLElement>('.fly__body')!.style.transform,
  )!
  return { x: Number(m[1]), y: Number(m[2]) }
}

const placeTorch = (x: number, y: number) => {
  document.documentElement.style.setProperty('--torch-x', `${x}px`)
  document.documentElement.style.setProperty('--torch-y', `${y}px`)
}

describe('Fly', () => {
  let frames: ReturnType<typeof createFrameQueue>

  beforeEach(() => {
    frames = createFrameQueue()
    buzzes.length = 0
    createFlySound.mockClear()
    vi.stubGlobal('requestAnimationFrame', frames.request)
    vi.stubGlobal('cancelAnimationFrame', frames.cancel)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    document.documentElement.style.removeProperty('--torch-x')
    document.documentElement.style.removeProperty('--torch-y')
  })

  it('is decorative and hidden until it takes off', () => {
    render(<Fly firstRest={5} sound={false} />)
    const stage = screen.getByTestId('fly')
    expect(stage).toHaveAttribute('aria-hidden', 'true')
    act(() => frames.advance(10))
    expect(stage.style.visibility).toBe('hidden')
    expect(createFlySound).not.toHaveBeenCalled()
  })

  it('moves the body and shadow every frame once airborne', () => {
    render(<Fly firstRest={0} sound={false} />)
    const stage = screen.getByTestId('fly')
    act(() => frames.advance(5))
    expect(stage.style.visibility).toBe('visible')

    const body = stage.querySelector<HTMLElement>('.fly__body')!
    const shadow = stage.querySelector<HTMLElement>('.fly__shadow')!
    // First crossing goes left to right; the left-facing sprite is mirrored for it.
    expect(body.style.transform).toMatch(/translate\(.*\) rotate\(.*rad\) scaleX\(-1\)/)
    expect(shadow.style.transform).toMatch(/translate\(/)

    const before = body.style.transform
    act(() => frames.advance(5))
    expect(body.style.transform).not.toBe(before)
  })

  it('buzzes louder the closer the cursor is, and not at all while out of sight', () => {
    render(<Fly firstRest={1} />)
    expect(createFlySound).toHaveBeenCalledTimes(1)
    const stage = screen.getByTestId('fly')
    const buzz = buzzes[0]!

    act(() => frames.advance(3))
    expect(stage.style.visibility).toBe('hidden')
    expect(buzz.levels).toEqual([0])

    act(() => frames.advance(70))
    expect(stage.style.visibility).toBe('visible')
    const { x, y } = bodyPosition(stage)

    placeTorch(x + 2000, y)
    act(() => frames.advance(1))
    const far = buzz.levels.at(-1)!
    placeTorch(x, y)
    act(() => frames.advance(1))
    const near = buzz.levels.at(-1)!

    expect(far).toBeGreaterThan(0)
    expect(far).toBeLessThan(0.05)
    expect(near).toBeGreaterThan(far * 10)
    expect(near).toBeLessThanOrEqual(1)
  })

  it('stops the buzz on unmount', () => {
    const { unmount } = render(<Fly />)
    unmount()
    expect(buzzes[0]!.stop).toHaveBeenCalledTimes(1)
  })

  it('renders nothing under reduced motion', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query) =>
        ({
          matches: true,
          media: query,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          dispatchEvent: () => false,
        }) as MediaQueryList,
    )
    render(<Fly />)
    expect(screen.queryByTestId('fly')).not.toBeInTheDocument()
    expect(createFlySound).not.toHaveBeenCalled()
  })
})
