import { describe, expect, it } from 'vitest'
import { jitter, threadPath } from './thread'

describe('threadPath', () => {
  it('holds each end back by its own inset', () => {
    const d = threadPath({ x: 0, y: 0 }, { x: 100, y: 0 }, { sag: 0, inset: [10, 0] })
    expect(d.startsWith('M 10.0 0.0')).toBe(true)
    expect(d.endsWith('100.0 0.0')).toBe(true)
  })

  it('holds both ends back from the pin centres along the line', () => {
    const d = threadPath({ x: 0, y: 0 }, { x: 100, y: 0 }, { sag: 0, inset: 10 })
    expect(d).toBe('M 10.0 0.0 Q 50.0 0.0 90.0 0.0')
  })

  it('sags downward in proportion to the span', () => {
    const d = threadPath({ x: 0, y: 0 }, { x: 200, y: 0 }, { sag: 0.1, inset: 0 })
    expect(d).toBe('M 0.0 0.0 Q 100.0 20.0 200.0 0.0')
  })

  it('still drops the control point downward on a vertical run', () => {
    const d = threadPath({ x: 50, y: 0 }, { x: 50, y: 100 }, { sag: 0.1, inset: 0 })
    expect(d).toBe('M 50.0 0.0 Q 50.0 60.0 50.0 100.0')
  })

  it('returns nothing for a zero-length thread', () => {
    expect(threadPath({ x: 1, y: 1 }, { x: 1, y: 1 })).toBe('')
  })
})

describe('jitter', () => {
  it('is stable and within 0-1', () => {
    expect(jitter('hub-handprint')).toBe(jitter('hub-handprint'))
    expect(jitter('a')).not.toBe(jitter('b'))
    for (const s of ['a', 'b', 'hub-handprint']) {
      expect(jitter(s)).toBeGreaterThanOrEqual(0)
      expect(jitter(s)).toBeLessThan(1)
    }
  })
})
