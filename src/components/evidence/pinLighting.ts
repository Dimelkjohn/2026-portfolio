/**
 * Lights the thumbtacks from the torch.
 *
 * Each pin SVG draws its shading as if the light came from straight above
 * (12 o'clock): bright rim and glint at the top, contact shadow offset
 * downward. Rotating that drawing to face the beam centre makes the light
 * appear to come from the torch. Per frame this writes two custom properties
 * on every pin:
 *   --pin-angle   degrees to rotate the drawing so "up" points at the torch
 *   --pin-glint   0.15-1, how strong the specular is (fades as the beam moves off)
 *
 * Reads the beam centre from the --torch-x / --torch-y properties that
 * useTorch writes to :root every frame. Writes go straight to the DOM.
 */

const RAD_TO_DEG = 180 / Math.PI

/** Rotation that turns the pin's "light from above" drawing toward the torch. */
export function lightAngle(pinX: number, pinY: number, torchX: number, torchY: number): number {
  return Math.atan2(torchY - pinY, torchX - pinX) * RAD_TO_DEG + 90
}

/** Specular strength by distance from the beam centre, in beam radii. */
export function glintStrength(distance: number, radius: number): number {
  const t = 1 - distance / (radius * 2.2)
  return Math.min(1, Math.max(0.15, t))
}

type PinRecord = { el: HTMLElement; x: number; y: number; angle?: string; glint?: string }

/** Beyond this many beam radii the glint sits at its floor and the pin is in the dark: nothing to redraw. */
const REACH = 2.4

/** Milliseconds between re-measuring pin positions (they only move on resize/hover). */
const MEASURE_EVERY = 400

export type PinLightingOptions = {
  /** Where the pins live. */
  container: ParentNode
  /**
   * Follow the torch every frame (it sways on its own) or only when the
   * pointer moves (reduced motion: the beam snaps to the pointer and holds).
   */
  animate: boolean
}

export function startPinLighting({ container, animate }: PinLightingOptions): () => void {
  const root = document.documentElement
  const radius = parseFloat(getComputedStyle(root).getPropertyValue('--torch-radius')) || 240
  let pins: PinRecord[] = []
  let measuredAt = 0
  let lastX = Number.NaN
  let lastY = Number.NaN
  let frame = 0

  const measure = () => {
    pins = Array.from(container.querySelectorAll<HTMLElement>('.evidence__pin')).map((el) => {
      const r = el.getBoundingClientRect()
      return { el, x: r.left + r.width / 2, y: r.top + r.height / 2 }
    })
  }

  const torch = () => {
    const x = parseFloat(root.style.getPropertyValue('--torch-x'))
    const y = parseFloat(root.style.getPropertyValue('--torch-y'))
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null
  }

  const paint = (now: number) => {
    if (now - measuredAt > MEASURE_EVERY) {
      measure()
      measuredAt = now
    }
    const t = torch()
    if (!t || (Math.abs(t.x - lastX) < 0.5 && Math.abs(t.y - lastY) < 0.5)) return
    lastX = t.x
    lastY = t.y
    for (const pin of pins) {
      const distance = Math.hypot(t.x - pin.x, t.y - pin.y)
      // A pin the beam cannot reach keeps whatever it last showed; every write repaints its SVG.
      if (distance > radius * REACH && pin.glint === '0.15') continue
      const angle = `${lightAngle(pin.x, pin.y, t.x, t.y).toFixed(0)}deg`
      const glint = glintStrength(distance, radius).toFixed(2)
      if (angle !== pin.angle) {
        pin.el.style.setProperty('--pin-angle', angle)
        pin.angle = angle
      }
      if (glint !== pin.glint) {
        pin.el.style.setProperty('--pin-glint', glint)
        pin.glint = glint
      }
    }
  }

  const loop = (now: number) => {
    paint(now)
    frame = requestAnimationFrame(loop)
  }
  const once = () => {
    if (frame) return
    frame = requestAnimationFrame((now) => {
      frame = 0
      paint(now)
    })
  }
  const onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(frame)
      frame = 0
    } else if (animate) {
      frame = requestAnimationFrame(loop)
    }
  }
  const onResize = () => {
    measuredAt = 0
    lastX = Number.NaN
    once()
  }

  if (animate) frame = requestAnimationFrame(loop)
  else window.addEventListener('pointermove', once, { passive: true })
  window.addEventListener('resize', onResize)
  document.addEventListener('visibilitychange', onVisibility)
  once()

  return () => {
    cancelAnimationFrame(frame)
    window.removeEventListener('pointermove', once)
    window.removeEventListener('resize', onResize)
    document.removeEventListener('visibilitychange', onVisibility)
    for (const pin of pins) {
      pin.el.style.removeProperty('--pin-angle')
      pin.el.style.removeProperty('--pin-glint')
    }
  }
}
