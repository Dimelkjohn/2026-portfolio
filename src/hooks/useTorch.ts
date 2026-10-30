import { useEffect, useRef } from 'react'
import { boardScale } from '@/components/view/layout'
import { attract, centresOf, DEFAULT_REACH, type MagnetOptions, type Point } from './magnet'
import { useReducedMotion } from './useReducedMotion'

export type TorchOptions = {
  /**
   * Time constant of the beam's lag behind the pointer, in milliseconds.
   * Larger = heavier, more hand-held. 0 snaps. Ignored under reduced motion.
   */
  lag?: number
  /** Breathing, sway and random flicker. Off under reduced motion regardless. */
  flicker?: boolean
  /**
   * Whether the torch is switched on. No beam while false; flipping
   * to true runs the switch-on (a short electrical stutter up to full power).
   * Defaults to true.
   */
  lit?: boolean
  /**
   * The pull of the nearest clickable piece on the beam (see magnet.ts), or
   * false for none. On by default, with the magnet's own reach and pull.
   */
  magnet?: MagnetOptions | false
}

/** One shared default, so the effect does not restart on every render. */
const DEFAULT_MAGNET: MagnetOptions = {}

/** What the beam is drawn to: the paper of every piece on the board that a click does something with. */
const MAGNET_SELECTOR = 'section[aria-label="Evidence"] .evidence--clickable .evidence__paper'

const DEFAULT_LAG = 85

/** Intensity never drops below this during a flicker (1 = full). */
const INTENSITY_FLOOR = 0.55
/** Seconds between flicker bursts, picked uniformly from this range. */
const BURST_GAP: [number, number] = [2.5, 9]
/** Burst length in seconds. */
const BURST_LENGTH: [number, number] = [0.12, 0.5]
/** Seconds from the switch click to full power. Matches the switch-on sound. */
const SWITCH_ON_LENGTH = 0.9

const rand = (min: number, max: number) => min + Math.random() * (max - min)

/**
 * Power (0-1) as a function of seconds since the switch was pressed.
 * A real torch does not fade in: the contact arcs for a moment, then holds.
 * Without stutter (reduced motion) it is a plain ease-out.
 */
function switchOnCurve(t: number, stutter: boolean): number {
  if (t <= 0) return 0
  if (t >= SWITCH_ON_LENGTH) return 1
  if (stutter) {
    if (t < 0.08) return 0
    if (t < 0.16) return 0.6
    if (t < 0.22) return 0.3
    const p = (t - 0.22) / (SWITCH_ON_LENGTH - 0.22)
    return 0.8 + 0.2 * (1 - (1 - p) ** 2)
  }
  const p = t / SWITCH_ON_LENGTH
  return 1 - (1 - p) ** 2
}

/**
 * The light's behaviour over time, independent of the pointer.
 * Returns radius scale (breathing) and intensity (brightness, with flicker).
 */
function createFlicker() {
  let nextBurstAt = rand(BURST_GAP[0], BURST_GAP[1])
  let burstEndsAt = 0
  let burstLevel = 1
  let burstTarget = 1
  let intensity = 1

  return (t: number, dt: number) => {
    // Slow breathing of the beam radius: two incommensurate sines so it never loops visibly.
    const scale = 1 + 0.035 * Math.sin(t * 0.9) + 0.02 * Math.sin(t * 2.3 + 1.7)

    if (t >= nextBurstAt && t >= burstEndsAt) {
      burstEndsAt = t + rand(BURST_LENGTH[0], BURST_LENGTH[1])
      nextBurstAt = burstEndsAt + rand(BURST_GAP[0], BURST_GAP[1])
    }

    const inBurst = t < burstEndsAt
    if (inBurst) {
      // Stutter: re-pick a dim level every ~40ms so the burst looks electrical, not smooth.
      if (Math.random() < dt / 0.04) burstTarget = rand(INTENSITY_FLOOR, 0.92)
    } else {
      burstTarget = 1
    }

    // Fast attack when dimming, gentler recovery when brightening.
    const rate = burstTarget < burstLevel ? 28 : 10
    burstLevel += (burstTarget - burstLevel) * Math.min(1, rate * dt)

    // A faint constant shimmer on top so the steady state is never perfectly flat.
    const shimmer = 1 - 0.015 * (0.5 + 0.5 * Math.sin(t * 13.7) * Math.sin(t * 7.1))
    intensity = Math.max(INTENSITY_FLOOR, burstLevel * shimmer)

    return { scale, intensity }
  }
}

const PROPERTIES = ['--torch-x', '--torch-y', '--torch-scale', '--torch-intensity', '--torch-power']

/**
 * Drives the torch. Writes five custom properties to :root every frame:
 *   --torch-x / --torch-y   beam centre (px), eased toward the pointer with hand-held sway
 *   --torch-scale           radius multiplier (slow breathing)
 *   --torch-intensity       brightness 0.55-1 (random flicker, never off)
 *   --torch-power           0 while unlit, stutters up to 1 once `lit` becomes true
 *
 * Writes go straight to the DOM in a requestAnimationFrame loop; React never
 * re-renders for pointer movement. Under reduced motion the loop only runs
 * for the switch-on fade: the beam snaps to the pointer and the light holds steady.
 */
export function useTorch({
  lag = DEFAULT_LAG,
  flicker = true,
  lit = true,
  magnet = DEFAULT_MAGNET,
}: TorchOptions = {}) {
  const reducedMotion = useReducedMotion()
  /** Timestamp the switch was pressed; -Infinity = on since before the loop started. */
  const litAt = useRef<number | null>(lit ? Number.NEGATIVE_INFINITY : null)
  /** Restarts the frame loop if it is idle (set by the main effect). */
  const kick = useRef<() => void>(() => {})

  useEffect(() => {
    const root = document.documentElement
    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const current = { ...target }
    const animate = !reducedMotion
    const tick = createFlicker()
    let frame = 0
    let last = 0
    let start = 0

    const power = (now: number) =>
      litAt.current === null ? 0 : switchOnCurve((now - litAt.current) / 1000, animate)

    const paint = (x: number, y: number, scale: number, intensity: number, p: number) => {
      root.style.setProperty('--torch-x', `${x.toFixed(1)}px`)
      root.style.setProperty('--torch-y', `${y.toFixed(1)}px`)
      root.style.setProperty('--torch-scale', scale.toFixed(3))
      root.style.setProperty('--torch-intensity', intensity.toFixed(3))
      root.style.setProperty('--torch-power', p.toFixed(3))
    }

    const step = (now: number) => {
      if (!start) start = last = now
      const dt = Math.min(0.1, (now - last) / 1000)
      const t = (now - start) / 1000
      last = now

      // Exponential ease toward the pointer, frame-rate independent.
      const k = lag > 0 ? 1 - Math.exp((-dt * 1000) / lag) : 1
      current.x += (target.x - current.x) * k
      current.y += (target.y - current.y) * k

      let x = current.x
      let y = current.y
      let scale = 1
      let intensity = 1

      if (flicker && animate) {
        const light = tick(t, dt)
        scale = light.scale
        intensity = light.intensity
        // Hand-held sway: a few px of slow drift around the eased position, in board units.
        x += (5 * Math.sin(t * 1.1) + 3 * Math.sin(t * 2.9 + 0.8)) * scale
        y += (4 * Math.sin(t * 1.4 + 2.1) + 3 * Math.sin(t * 3.3)) * scale
      }

      const p = power(now)
      paint(x, y, scale, intensity, p)
      // Under reduced motion the loop only lives as long as the switch-on.
      frame = animate || p < 1 ? requestAnimationFrame(step) : 0
    }

    const resume = () => {
      if (frame || document.hidden) return
      frame = requestAnimationFrame((now) => {
        last = now
        step(now)
      })
    }

    // The clickables' centres, measured once the pointer first moves and again
    // after a resize: the pieces do not move otherwise. Nothing pulls while a
    // pile or the contact sheet is open over the board. The magnet's reach,
    // like the sway, is in board units: it shrinks with the pieces.
    let scale = boardScale()
    let centres: Point[] | null = null
    const onResize = () => {
      centres = null
      scale = boardScale()
    }
    const aim = (x: number, y: number): Point => {
      if (!magnet || document.querySelector('dialog[open]')) return { x, y }
      centres ??= centresOf(MAGNET_SELECTOR)
      return attract({ x, y }, centres, {
        reach: (magnet.reach ?? DEFAULT_REACH) * scale,
        pull: magnet.pull,
      })
    }

    const onPointerMove = (event: PointerEvent) => {
      const aimed = aim(event.clientX, event.clientY)
      target.x = aimed.x
      target.y = aimed.y
      if (!animate) paint(target.x, target.y, 1, 1, power(performance.now()))
    }

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame)
        frame = 0
      } else {
        resume()
      }
    }

    kick.current = resume
    paint(current.x, current.y, 1, 1, power(performance.now()))
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerdown', onPointerMove, { passive: true })
    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVisibility)
    if (animate) resume()

    return () => {
      kick.current = () => {}
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerMove)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
      for (const name of PROPERTIES) root.style.removeProperty(name)
    }
  }, [lag, flicker, reducedMotion, magnet])

  // Declared after the main effect so `kick` is wired before the first switch-on.
  useEffect(() => {
    if (!lit) {
      litAt.current = null
      return
    }
    if (litAt.current !== null) return
    litAt.current = performance.now()
    kick.current()
  }, [lit])
}
