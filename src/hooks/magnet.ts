/**
 * The pull of the nearest clickable on the torch beam: within `reach` px of
 * a piece's centre the beam leans toward it, gently, by a share of the
 * distance that grows as the pointer gets closer. A nudge rather than a
 * snap: the pointer still goes where the hand puts it, the beam just finds
 * the paper a little before the hand does.
 */
export type Point = { x: number; y: number }

export type MagnetOptions = {
  /** How close, in px from a centre, the pull begins. */
  reach?: number
  /**
   * The strongest share of the remaining distance the beam is pulled across,
   * reached as the pointer nears the centre. The beam moves at most
   * pull * reach / 4 px (10 px at the defaults), a nudge under the sway.
   */
  pull?: number
}

export const DEFAULT_REACH = 120
export const DEFAULT_PULL = 0.35

/**
 * Where the beam should aim, given the pointer and the centres it could be
 * drawn to. The pull is `pull * (1 - d / reach)` of the way to the nearest
 * centre, zero at the edge of reach and at the centre itself.
 */
export function attract(
  pointer: Point,
  centres: readonly Point[],
  { reach = DEFAULT_REACH, pull = DEFAULT_PULL }: MagnetOptions = {},
): Point {
  let nearest: Point | null = null
  let best = reach * reach
  for (const c of centres) {
    const dx = c.x - pointer.x
    const dy = c.y - pointer.y
    const d2 = dx * dx + dy * dy
    if (d2 < best) {
      best = d2
      nearest = c
    }
  }
  if (!nearest) return pointer
  const d = Math.sqrt(best)
  const w = pull * (1 - d / reach)
  return { x: pointer.x + (nearest.x - pointer.x) * w, y: pointer.y + (nearest.y - pointer.y) * w }
}

/** The centres of every element the selector finds, in viewport px. */
export function centresOf(selector: string, root: ParentNode = document): Point[] {
  const out: Point[] = []
  for (const el of root.querySelectorAll<HTMLElement>(selector)) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) continue
    out.push({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
  }
  return out
}
