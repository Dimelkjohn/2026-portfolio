/** Stable small hash of an id, so an item always gets the same tape strips, tear and creases. */
export function hash(text: string): number {
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0
  return h
}

/** A small deterministic generator in [0, 1) (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type TornOptions = {
  /** How far the tear wanders in from the edge, percent of the paper. */
  rag?: number
  /** Points per edge. */
  steps?: number
}

/**
 * The outline of a cutting torn from a page, as a CSS polygon(): every edge
 * wanders in and out, with the odd deeper nick, and no two seeds tear alike.
 * Coordinates are percent, clockwise from the top-left corner.
 */
export function tornOutline(seed: string, { rag = 2.5, steps = 16 }: TornOptions = {}): string {
  const next = rng(hash(seed))
  const nick = () => (next() < 0.18 ? rag * (1 + next() * 1.5) : 0)
  const wobble = () => next() * rag + nick()
  const pts: string[] = []
  const f = (n: number) => Number(n.toFixed(1))
  for (let i = 0; i <= steps; i++) pts.push(`${f((i / steps) * 100)}% ${f(wobble())}%`)
  for (let i = 1; i <= steps; i++) pts.push(`${f(100 - wobble())}% ${f((i / steps) * 100)}%`)
  for (let i = steps - 1; i >= 0; i--) pts.push(`${f((i / steps) * 100)}% ${f(100 - wobble())}%`)
  for (let i = steps - 1; i >= 1; i--) pts.push(`${f(wobble())}% ${f((i / steps) * 100)}%`)
  return `polygon(${pts.join(', ')})`
}

/** Where the crease texture sits on this paper, so no two sheets share a wrinkle. */
export function creases(seed: string): { x: string; y: string; size: string } {
  const h = hash(seed)
  return { x: `${h % 97}%`, y: `${(h >>> 3) % 89}%`, size: `${150 + ((h >>> 5) % 90)}%` }
}
