import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TorchSound, TorchSoundOptions, TorchSoundOutcome } from './torchSound'
import { Torchlight } from './Torchlight'

const { createTorchSound, sounds } = vi.hoisted(() => {
  type Fake = {
    options: TorchSoundOptions
    resolve: (outcome: TorchSoundOutcome) => void
    stop: ReturnType<typeof vi.fn<() => void>>
  }
  const fakeSounds: Fake[] = []
  const createTorchSoundMock = vi.fn<(options?: TorchSoundOptions) => TorchSound>(
    (options = {}) => {
      let resolve!: Fake['resolve']
      const started = new Promise<TorchSoundOutcome>((r) => {
        resolve = r
      })
      const fake: Fake = { options, resolve, stop: vi.fn<() => void>() }
      fakeSounds.push(fake)
      return { start: () => started, stop: fake.stop }
    },
  )
  return { createTorchSound: createTorchSoundMock, sounds: fakeSounds }
})

vi.mock('./torchSound', () => ({ createTorchSound }))

const root = () => document.documentElement.style
const px = (name: string) => Number.parseFloat(root().getPropertyValue(name))
const PROPERTIES = ['--torch-x', '--torch-y', '--torch-scale', '--torch-intensity', '--torch-power']

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
    now: () => now,
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
    sounds.length = 0
    createTorchSound.mockClear()
    vi.stubGlobal('requestAnimationFrame', frames.request)
    vi.stubGlobal('cancelAnimationFrame', frames.cancel)
    // The switch-on is timed against performance.now(); keep it on the frame clock.
    vi.spyOn(performance, 'now').mockImplementation(frames.now)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders light layers that ignore the pointer', () => {
    render(<Torchlight sound={false} />)
    for (const id of ['torch-glow', 'torch-hotspot', 'torch-dark']) {
      expect(screen.getByTestId(id)).toHaveAttribute('aria-hidden', 'true')
    }
  })

  it('starts the beam at the viewport centre at full intensity when silent', () => {
    render(<Torchlight sound={false} />)
    expect(px('--torch-x')).toBe(window.innerWidth / 2)
    expect(px('--torch-y')).toBe(window.innerHeight / 2)
    expect(px('--torch-scale')).toBe(1)
    expect(px('--torch-intensity')).toBe(1)
    expect(px('--torch-power')).toBe(1)
    expect(createTorchSound).not.toHaveBeenCalled()
  })

  it('eases toward the pointer instead of jumping', () => {
    render(<Torchlight sound={false} lag={200} flicker={false} />)
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
    render(<Torchlight sound={false} lag={0} flicker={false} />)
    act(() => {
      fireEvent.pointerMove(window, { clientX: 120, clientY: 340 })
      frames.advance(1)
    })
    expect(px('--torch-x')).toBe(120)
    expect(px('--torch-y')).toBe(340)
  })

  it('keeps the light within bounds while flickering', () => {
    render(<Torchlight sound={false} />)
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
    const { unmount } = render(<Torchlight sound={false} />)
    unmount()
    for (const name of PROPERTIES) {
      expect(root().getPropertyValue(name)).toBe('')
    }
  })

  it('opens with no beam and switches on when the sound starts', async () => {
    render(<Torchlight />)
    expect(createTorchSound).toHaveBeenCalledTimes(1)
    expect(px('--torch-power')).toBe(0)
    act(() => frames.advance(30))
    expect(px('--torch-power')).toBe(0)

    await act(async () => {
      sounds[0]!.resolve('playing')
    })
    // Still dark on the click itself, then the contact arcs, then full power.
    act(() => frames.advance(1))
    expect(px('--torch-power')).toBe(0)
    act(() => frames.advance(8))
    expect(px('--torch-power')).toBeGreaterThan(0)
    expect(px('--torch-power')).toBeLessThan(1)
    act(() => frames.advance(60))
    expect(px('--torch-power')).toBe(1)
  })

  it('asks for a click only when the browser refuses to play, then hides the prompt', async () => {
    render(<Torchlight />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    act(() => sounds[0]!.options.onNeedsGesture?.())
    expect(screen.getByRole('status')).toHaveTextContent(/click anywhere/i)

    await act(async () => {
      sounds[0]!.resolve('playing')
    })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('seals the board from the pointer until the torch is lit', async () => {
    const onBoard = vi.fn<() => void>()
    const unlock = vi.fn<() => void>()
    window.addEventListener('pointerdown', unlock)
    render(
      <>
        <button type="button" onClick={onBoard} style={{ position: 'fixed', inset: 0 }}>
          board
        </button>
        <Torchlight />
      </>,
    )
    const shield = screen.getByTestId('torch-shield')
    expect(getComputedStyle(shield).pointerEvents).not.toBe('none')
    // The shield is a sibling above the board, so the click lands on it, not the board.
    fireEvent.pointerDown(shield)
    fireEvent.click(shield)
    expect(onBoard).not.toHaveBeenCalled()
    expect(unlock).toHaveBeenCalledTimes(1)

    await act(async () => {
      sounds[0]!.resolve('playing')
    })
    expect(screen.queryByTestId('torch-shield')).not.toBeInTheDocument()
    window.removeEventListener('pointerdown', unlock)
  })

  it('never seals the board when the torch is silent and on from the start', () => {
    render(<Torchlight sound={false} />)
    expect(screen.queryByTestId('torch-shield')).not.toBeInTheDocument()
  })

  it('passes the clip URL through and stops the sound on unmount', () => {
    const { unmount } = render(<Torchlight sound="/elsewhere/torch.mp3" />)
    expect(sounds[0]!.options.url).toBe('/elsewhere/torch.mp3')
    unmount()
    expect(sounds[0]!.stop).toHaveBeenCalledTimes(1)
  })
})
