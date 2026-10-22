import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Torchlight } from './Torchlight'

const root = () => document.documentElement.style
const px = (name: string) => Number.parseFloat(root().getPropertyValue(name))

/** Manual animation-frame queue so tests can advance the loop frame by frame. */
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
    /** Run every queued frame, `count` times, advancing the clock `ms` per frame. */
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

describe('Torchlight', () => {
  let frames: ReturnType<typeof createFrameQueue>

  beforeEach(() => {
    frames = createFrameQueue()
    vi.stubGlobal('requestAnimationFrame', frames.request)
    vi.stubGlobal('cancelAnimationFrame', frames.cancel)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders light layers that ignore the pointer', () => {
    render(<Torchlight />)
    for (const id of ['torch-glow', 'torch-hotspot', 'torch-dark']) {
      expect(screen.getByTestId(id)).toHaveAttribute('aria-hidden', 'true')
    }
  })

  it('starts the beam at the viewport centre at full intensity', () => {
    render(<Torchlight />)
    expect(px('--torch-x')).toBe(window.innerWidth / 2)
    expect(px('--torch-y')).toBe(window.innerHeight / 2)
    expect(px('--torch-scale')).toBe(1)
    expect(px('--torch-intensity')).toBe(1)
  })

  it('eases toward the pointer instead of jumping', () => {
    render(<Torchlight lag={200} flicker={false} />)
    const startX = window.innerWidth / 2
    act(() => {
      fireEvent.pointerMove(window, { clientX: startX + 400, clientY: 100 })
      frames.advance(2)
    })
    const afterTwoFrames = px('--torch-x')
    expect(afterTwoFrames).toBeGreaterThan(startX)
    expect(afterTwoFrames).toBeLessThan(startX + 400)

    act(() => frames.advance(120))
    expect(px('--torch-x')).toBeCloseTo(startX + 400, 0)
    expect(px('--torch-y')).toBeCloseTo(100, 0)
  })

  it('snaps to the pointer when lag is zero', () => {
    render(<Torchlight lag={0} flicker={false} />)
    act(() => {
      fireEvent.pointerMove(window, { clientX: 120, clientY: 340 })
      frames.advance(1)
    })
    expect(px('--torch-x')).toBe(120)
    expect(px('--torch-y')).toBe(340)
  })

  it('keeps the light within bounds while flickering', () => {
    render(<Torchlight />)
    let minIntensity = 1
    let minScale = 1
    let maxScale = 1
    act(() => {
      // ~20 s at 60 fps: long enough to cross several random flicker bursts.
      for (let i = 0; i < 1200; i++) {
        frames.advance(1)
        minIntensity = Math.min(minIntensity, px('--torch-intensity'))
        minScale = Math.min(minScale, px('--torch-scale'))
        maxScale = Math.max(maxScale, px('--torch-scale'))
      }
    })
    expect(minIntensity).toBeGreaterThanOrEqual(0.55)
    expect(minIntensity).toBeLessThan(1)
    expect(minScale).toBeGreaterThan(0.9)
    expect(maxScale).toBeLessThan(1.1)
    expect(maxScale).toBeGreaterThan(minScale)
  })

  it('cleans up the custom properties on unmount', () => {
    const { unmount } = render(<Torchlight />)
    unmount()
    for (const name of ['--torch-x', '--torch-y', '--torch-scale', '--torch-intensity']) {
      expect(root().getPropertyValue(name)).toBe('')
    }
  })
})
