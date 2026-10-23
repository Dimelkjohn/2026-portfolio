/**
 * The fly's flight path. Pure model, no DOM: feed it time and a viewport,
 * read back a pose. It crosses the viewport left to right, rests out of
 * sight, then crosses back, and so on.
 *
 * A housefly does not glide: it darts. Every 70-220 ms it picks a new
 * impulse (a fresh speed and a fresh vertical direction) and its velocity
 * snaps toward it; now and then it hangs in the air for a moment instead.
 * On top of that there is a tiny high-frequency wobble, and the body tilts
 * into the direction of travel with a little lag.
 */

export type Viewport = { width: number; height: number }

export type FlyPose = {
  /** Body centre in viewport px. */
  x: number
  y: number
  /** Speed in px/s, for motion blur. */
  speed: number
  /** Body tilt in radians, relative to the facing direction; positive = nose down. */
  tilt: number
  /** +1 flying right, -1 flying left. The sprite faces left, so +1 means mirrored. */
  dir: 1 | -1
  /** 0 = skimming the board, 1 = well above it; drives the shadow. */
  altitude: number
  /** False while resting out of sight. */
  visible: boolean
}

export type FlightOptions = {
  /** Random source in [0, 1); injectable for tests. */
  random?: () => number
  /** Seconds out of sight between crossings, [min, max]. */
  rest?: [number, number]
  /** Seconds before the first crossing. */
  firstRest?: number
}

/** How far beyond the viewport edge the fly starts and ends, in px. */
const MARGIN = 80
/** Vertical band of the viewport the fly keeps to, as fractions of height. */
const BAND: [number, number] = [0.12, 0.88]
/** Chance that an impulse is a hover rather than a dart. */
const HOVER_CHANCE = 0.16
/** How fast velocity snaps to the current impulse, per second. */
const SNAP = 14
/** How fast the body tilt follows the velocity, per second. */
const TILT_RATE = 9
const MAX_TILT = 0.55

export function createFlight({
  random = Math.random,
  rest = [2.5, 7],
  firstRest = 1.5,
}: FlightOptions = {}) {
  const rand = (min: number, max: number) => min + random() * (max - min)

  let t = 0
  let flying = false
  let restUntil = firstRest
  let dir: 1 | -1 = 1
  let x = 0
  let y = 0
  let vx = 0
  let vy = 0
  let targetVx = 0
  let targetVy = 0
  let impulseAt = 0
  let tilt = 0
  const altitudePhase = rand(0, Math.PI * 2)

  const cruise = (viewport: Viewport) => Math.max(420, viewport.width * 0.42)

  const takeOff = (viewport: Viewport) => {
    flying = true
    x = dir > 0 ? -MARGIN : viewport.width + MARGIN
    y = rand(BAND[0], BAND[1]) * viewport.height
    vx = targetVx = dir * cruise(viewport)
    vy = targetVy = 0
    tilt = 0
    impulseAt = t
  }

  const land = () => {
    flying = false
    dir = dir > 0 ? -1 : 1
    restUntil = t + rand(rest[0], rest[1])
  }

  const impulse = (viewport: Viewport) => {
    const c = cruise(viewport)
    if (random() < HOVER_CHANCE) {
      targetVx = dir * rand(-0.1, 0.2) * c
      targetVy = rand(-0.15, 0.15) * c
      impulseAt = t + rand(0.12, 0.35)
    } else {
      targetVx = dir * rand(0.45, 1.5) * c
      targetVy = rand(-0.7, 0.7) * c
      impulseAt = t + rand(0.07, 0.22)
    }
    // Keep to the band: steer back if an impulse would carry it out.
    const top = BAND[0] * viewport.height
    const bottom = BAND[1] * viewport.height
    if (y < top) targetVy = Math.abs(targetVy) + 0.2 * c
    if (y > bottom) targetVy = -Math.abs(targetVy) - 0.2 * c
  }

  return {
    /** Advance the model by `dt` seconds. */
    step(dt: number, viewport: Viewport): FlyPose {
      t += dt

      if (!flying) {
        if (t >= restUntil) takeOff(viewport)
        else return { x, y, speed: 0, tilt, dir, altitude: 0.5, visible: false }
      }

      if (t >= impulseAt) impulse(viewport)

      const k = Math.min(1, SNAP * dt)
      vx += (targetVx - vx) * k
      vy += (targetVy - vy) * k
      x += vx * dt
      y += vy * dt

      const speed = Math.hypot(vx, vy)
      const wantedTilt = Math.max(-MAX_TILT, Math.min(MAX_TILT, Math.atan2(vy, Math.abs(vx))))
      tilt += (wantedTilt - tilt) * Math.min(1, TILT_RATE * dt)

      const gone = dir > 0 ? x > viewport.width + MARGIN : x < -MARGIN
      if (gone) land()

      // Tiny wobble layered on the output only, so it never feeds back into the path.
      const wx = 1.2 * Math.sin(t * 41)
      const wy = 1.6 * Math.sin(t * 53 + 1)
      const altitude = 0.5 + 0.5 * Math.sin(t * 0.8 + altitudePhase)

      return { x: x + wx, y: y + wy, speed, tilt, dir, altitude, visible: flying }
    },
  }
}
