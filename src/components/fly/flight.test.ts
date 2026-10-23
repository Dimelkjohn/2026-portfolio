import { describe, expect, it } from 'vitest'
import { createFlight, type FlyPose } from './flight'

/** Deterministic random (mulberry32) so a failing run can be replayed. */
function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const viewport = { width: 1200, height: 800 }
const DT = 1 / 60

/** Step until `until(pose)` holds, returning every pose seen; throws after `maxSeconds`. */
function run(
  flight: ReturnType<typeof createFlight>,
  until: (p: FlyPose) => boolean,
  maxSeconds = 60,
) {
  const poses: FlyPose[] = []
  for (let i = 0; i < maxSeconds / DT; i++) {
    const pose = flight.step(DT, viewport)
    poses.push(pose)
    if (until(pose)) return poses
  }
  throw new Error('condition never met')
}

describe('createFlight', () => {
  it('rests out of sight first, then crosses left to right', () => {
    const flight = createFlight({ random: seeded(1), firstRest: 0.5 })
    const waiting = run(flight, (p) => p.visible)
    expect(waiting.length).toBeGreaterThan(0.5 / DT - 2)
    expect(waiting.slice(0, -1).every((p) => !p.visible)).toBe(true)

    const first = waiting.at(-1)!
    expect(first.dir).toBe(1)
    expect(first.x).toBeLessThan(0)

    const crossing = run(flight, (p) => !p.visible)
    const flown = crossing.slice(0, -1)
    expect(flown.at(-1)!.x).toBeGreaterThan(viewport.width)
    // It gets there in a sensible time: not a glide, not a teleport.
    expect(flown.length * DT).toBeGreaterThan(1.5)
    expect(flown.length * DT).toBeLessThan(12)
  })

  it('comes back the other way after resting', () => {
    const flight = createFlight({ random: seeded(2), firstRest: 0, rest: [1, 1] })
    run(flight, (p) => p.visible)
    run(flight, (p) => !p.visible)
    const resting = run(flight, (p) => p.visible)
    expect(resting.length * DT).toBeGreaterThan(0.9)

    const back = run(flight, (p) => !p.visible).slice(0, -1)
    expect(back[0]!.dir).toBe(-1)
    expect(back[0]!.x).toBeGreaterThan(viewport.width)
    expect(back.at(-1)!.x).toBeLessThan(0)
  })

  it('darts rather than glides: speed and heading keep changing', () => {
    const flight = createFlight({ random: seeded(3), firstRest: 0 })
    run(flight, (p) => p.visible)
    const flown = run(flight, (p) => !p.visible).slice(0, -1)
    const speeds = flown.map((p) => p.speed)
    const ups = flown.filter((p) => p.tilt < -0.1).length
    const downs = flown.filter((p) => p.tilt > 0.1).length
    expect(Math.max(...speeds) / Math.min(...speeds)).toBeGreaterThan(2)
    expect(ups).toBeGreaterThan(0)
    expect(downs).toBeGreaterThan(0)
  })

  it('stays inside the viewport vertically and within the tilt limit', () => {
    for (const seed of [4, 5, 6, 7]) {
      const flight = createFlight({ random: seeded(seed), firstRest: 0, rest: [0, 0] })
      for (let i = 0; i < 40 / DT; i++) {
        const p = flight.step(DT, viewport)
        if (!p.visible) continue
        expect(p.y).toBeGreaterThan(0)
        expect(p.y).toBeLessThan(viewport.height)
        expect(Math.abs(p.tilt)).toBeLessThanOrEqual(0.55 + 1e-9)
        expect(p.altitude).toBeGreaterThanOrEqual(0)
        expect(p.altitude).toBeLessThanOrEqual(1)
      }
    }
  })
})
