import { describe, expect, it } from 'vitest'
import { attract, centresOf } from './magnet'

describe('attract', () => {
  const centres = [
    { x: 100, y: 100 },
    { x: 400, y: 100 },
  ]

  it('leaves the pointer alone beyond reach', () => {
    expect(attract({ x: 250, y: 100 }, centres, { reach: 110, pull: 0.3 })).toEqual({
      x: 250,
      y: 100,
    })
  })

  it('leans toward the nearest centre, more the closer it gets, never all the way', () => {
    const far = attract({ x: 200, y: 100 }, centres, { reach: 110, pull: 0.3 })
    const near = attract({ x: 140, y: 100 }, centres, { reach: 110, pull: 0.3 })
    // Both pulled left, toward (100, 100).
    expect(far.x).toBeLessThan(200)
    expect(near.x).toBeLessThan(140)
    // The share grows as the pointer closes in: 0.3 * (1 - 100/110) at 100 px, 0.3 * (1 - 40/110) at 40 px.
    expect(200 - far.x).toBeCloseTo(100 * 0.3 * (1 - 100 / 110), 5)
    expect(140 - near.x).toBeCloseTo(40 * 0.3 * (1 - 40 / 110), 5)
    // At the centre there is nothing left to pull across.
    expect(attract({ x: 100, y: 100 }, centres)).toEqual({ x: 100, y: 100 })
  })

  it('picks the nearest centre when two are in reach', () => {
    const pulled = attract({ x: 260, y: 100 }, centres, { reach: 200, pull: 0.3 })
    expect(pulled.x).toBeGreaterThan(260)
  })

  it('does nothing with no centres', () => {
    expect(attract({ x: 5, y: 5 }, [])).toEqual({ x: 5, y: 5 })
  })
})

describe('centresOf', () => {
  it('measures the centre of each matching element and skips the unlaid', () => {
    const root = document.createElement('div')
    root.innerHTML = '<i class="p"></i><i class="p"></i><i class="q"></i>'
    const [a, b] = root.querySelectorAll<HTMLElement>('.p')
    a!.getBoundingClientRect = () => ({ left: 10, top: 20, width: 100, height: 50 }) as DOMRect
    b!.getBoundingClientRect = () => ({ left: 0, top: 0, width: 0, height: 0 }) as DOMRect
    expect(centresOf('.p', root)).toEqual([{ x: 60, y: 45 }])
  })
})
