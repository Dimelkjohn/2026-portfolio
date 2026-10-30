import { describe, expect, it } from 'vitest'
import { REFERENCE_HEIGHT, REFERENCE_WIDTH, stageFrame } from './layout'

describe('stageFrame', () => {
  it('is the window itself on the desktop the board was drawn on', () => {
    expect(stageFrame(REFERENCE_WIDTH, REFERENCE_HEIGHT)).toEqual({ scale: 1, left: 0, top: 0 })
  })

  it('scales to the width and crops the top and bottom in a wider window', () => {
    const frame = stageFrame(2560, 1080)
    expect(frame.scale).toBeCloseTo(2560 / 1920)
    expect(frame.left).toBe(0)
    expect(frame.top).toBeCloseTo((1080 - 919 * (2560 / 1920)) / 2)
    expect(frame.top).toBeLessThan(0)
  })

  it('scales to the height and crops the sides in a squarer window', () => {
    const frame = stageFrame(1366, 768)
    expect(frame.scale).toBeCloseTo(768 / 919)
    expect(frame.top).toBe(0)
    expect(frame.left).toBeCloseTo((1366 - 1920 * (768 / 919)) / 2)
    expect(frame.left).toBeLessThan(0)
  })
})
