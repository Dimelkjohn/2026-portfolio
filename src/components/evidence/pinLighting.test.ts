import { describe, expect, it } from 'vitest'
import { glintStrength, lightAngle } from './pinLighting'

describe('lightAngle', () => {
  it('is 0 when the torch is straight above the pin (the drawing already faces up)', () => {
    expect(lightAngle(100, 100, 100, 0)).toBeCloseTo(0)
  })

  it('turns the drawing clockwise toward a torch on the right', () => {
    expect(lightAngle(100, 100, 200, 100)).toBeCloseTo(90)
  })

  it('turns the drawing fully round for a torch below', () => {
    expect(lightAngle(100, 100, 100, 200)).toBeCloseTo(180)
  })

  it('turns the drawing the other way for a torch on the left (270 is -90)', () => {
    expect(lightAngle(100, 100, 0, 100)).toBeCloseTo(270)
  })
})

describe('glintStrength', () => {
  it('is full at the beam centre and fades with distance', () => {
    expect(glintStrength(0, 240)).toBe(1)
    expect(glintStrength(240, 240)).toBeLessThan(1)
    expect(glintStrength(240, 240)).toBeGreaterThan(glintStrength(400, 240))
  })

  it('never goes fully dark', () => {
    expect(glintStrength(5000, 240)).toBe(0.15)
  })
})
