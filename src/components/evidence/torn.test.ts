import { describe, expect, it } from 'vitest'
import { creases, tornOutline } from './torn'

describe('tornOutline', () => {
  it('is a polygon that stays within the paper', () => {
    const outline = tornOutline('clip-a')
    expect(outline.startsWith('polygon(')).toBe(true)
    const nums = outline.match(/-?[\d.]+(?=%)/g)!.map(Number)
    expect(nums.length).toBeGreaterThan(100)
    for (const n of nums) {
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThanOrEqual(100)
    }
  })

  it('tears the same cutting the same way every time, and two cuttings differently', () => {
    expect(tornOutline('clip-a')).toBe(tornOutline('clip-a'))
    expect(tornOutline('clip-a')).not.toBe(tornOutline('clip-b'))
  })
})

describe('creases', () => {
  it('places the texture differently for different papers', () => {
    expect(creases('clip-a')).toEqual(creases('clip-a'))
    expect(creases('clip-a')).not.toEqual(creases('clip-b'))
  })
})
