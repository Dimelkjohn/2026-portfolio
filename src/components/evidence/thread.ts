/**
 * Geometry for the red thread. A thread runs from one pin to another as a
 * shallow curve: pulled straight by tension, sagging a little under its own
 * weight. Each end stops short of the pin centre so it reads as tucked under
 * the pin head.
 */

export type Point = { x: number; y: number }

/** How far, as a fraction of the span, the thread drops at its middle. */
export const DEFAULT_SAG = 0.05
/** Pixels each end is held back from the pin centre, when nothing hides the thread under the head. */
export const PIN_INSET = 7

/** The radius of a pin's head from the pin's drawn width: the head is 13/40 of the box (see Fastener). */
export const pinHeadRadius = (pinWidth: number) => pinWidth * (13 / 40)

/** A stable 0-1 value from a string, to vary the sag per thread. */
export function jitter(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return ((h >>> 0) % 1000) / 1000
}

type ThreadPathOptions = {
  sag?: number
  /** How far each end is held back from its point: one figure for both, or [from, to]. */
  inset?: number | [number, number]
}

/** SVG path for a thread between two pin centres. */
export function threadPath(
  from: Point,
  to: Point,
  { sag = DEFAULT_SAG, inset = PIN_INSET }: ThreadPathOptions = {},
): string {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  if (length === 0) return ''
  const ux = dx / length
  const uy = dy / length
  const [insetA, insetB] = typeof inset === 'number' ? [inset, inset] : inset
  const a = { x: from.x + ux * insetA, y: from.y + uy * insetA }
  const b = { x: to.x - ux * insetB, y: to.y - uy * insetB }
  // Control point: the midpoint, dropped straight down by the sag.
  const cx = (a.x + b.x) / 2
  const cy = (a.y + b.y) / 2 + sag * length
  const f = (n: number) => n.toFixed(1)
  return `M ${f(a.x)} ${f(a.y)} Q ${f(cx)} ${f(cy)} ${f(b.x)} ${f(b.y)}`
}
