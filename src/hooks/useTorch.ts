import { useEffect } from 'react'
import { useReducedMotion } from './useReducedMotion'

export type TorchOptions = {
  /**
   * Time constant of the beam's lag behind the pointer, in milliseconds.
   * Larger = heavier, more hand-held. 0 snaps. Ignored under reduced motion.
   */
  lag?: number
  /** Breathing, sway and random flicker. Off under reduced motion regardless. */
  flicker?: boolean
}

const DEFAULT_LAG = 85

/** Intensity never drops below this during a flicker (1 = full). */
const INTENSITY_FLOOR = 0.55
/** Seconds between flicker bursts, picked uniformly from this range. */
const BURST_GAP: [number, number] = [2.5, 9]
/** Burst length in seconds. */
const BURST_LENGTH: [number, number] = [0.12, 0.5]

const rand = (min: number, max: number) => min + Math.random() * (max - min)

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

/**
 * Drives the torch. Writes four custom properties to :root every frame:
 *   --torch-x / --torch-y   beam centre (px), eased toward the pointer with hand-held sway
 *   --torch-scale           radius multiplier (slow breathing)
 *   --torch-intensity       brightness 0.55-1 (random flicker, never off)
 *
 * Writes go straight to the DOM in a requestAnimationFrame loop; React never
 * re-renders for pointer movement. Under reduced motion the loop is skipped:
 * the beam snaps to the pointer and the light holds steady.
 */
export function useTorch({ lag = DEFAULT_LAG, flicker = true }: TorchOptions = {}) {
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const root = document.documentElement
    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const current = { ...target }
    const animate = !reducedMotion
    const tick = createFlicker()
    let frame = 0
    let last = 0
    let start = 0

    const paint = (x: number, y: number, scale: number, intensity: number) => {
      root.style.setProperty('--torch-x', `${x.toFixed(1)}px`)
      root.style.setProperty('--torch-y', `${y.toFixed(1)}px`)
      root.style.setProperty('--torch-scale', scale.toFixed(3))
      root.style.setProperty('--torch-intensity', intensity.toFixed(3))
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

      if (flicker) {
        const light = tick(t, dt)
        scale = light.scale
        intensity = light.intensity
        // Hand-held sway: a few px of slow drift around the eased position.
        x += 5 * Math.sin(t * 1.1) + 3 * Math.sin(t * 2.9 + 0.8)
        y += 4 * Math.sin(t * 1.4 + 2.1) + 3 * Math.sin(t * 3.3)
      }

      paint(x, y, scale, intensity)
      frame = requestAnimationFrame(step)
    }

    const onPointerMove = (event: PointerEvent) => {
      target.x = event.clientX
      target.y = event.clientY
      if (!animate) paint(target.x, target.y, 1, 1)
    }

    const onVisibility = () => {
      if (!animate) return
      if (document.hidden) {
        cancelAnimationFrame(frame)
        frame = 0
      } else if (!frame) {
        last = 0
        frame = requestAnimationFrame((now) => {
          last = now
          step(now)
        })
      }
    }

    paint(current.x, current.y, 1, 1)
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerdown', onPointerMove, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    if (animate) frame = requestAnimationFrame(step)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerMove)
      document.removeEventListener('visibilitychange', onVisibility)
      for (const name of ['--torch-x', '--torch-y', '--torch-scale', '--torch-intensity']) {
        root.style.removeProperty(name)
      }
    }
  }, [lag, flicker, reducedMotion])
}
