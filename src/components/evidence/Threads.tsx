import { useEffect, useRef } from 'react'
import type { Thread } from '@/types/evidence'
import { DEFAULT_SAG, jitter, threadPath, type Point } from './thread'
import './threads.css'

type ThreadsProps = {
  threads: Thread[]
  /** The element the items are positioned in; thread coordinates are relative to it. */
  within: () => HTMLElement | null
}

/**
 * Where a thread could tie onto an item: the centre of each of its pins, or
 * the top centre of the paper when it is held by tape or nothing. A point
 * covered by another item is left out: a thread cannot tie to a pin nobody
 * can see. (elementFromPoint skips pointer-transparent layers, so the thread
 * SVG and the torch do not get in the way of the test.)
 */
/** How far down a piece of taped paper the thread ties, as a share of its height. */
const PAPER_TIE = 0.08

function anchorsOf(container: HTMLElement, id: string): Point[] {
  const item = container.querySelector<HTMLElement>(`[data-evidence-id="${id}"]`)
  if (!item) return []
  // A spot is tested for cover at (x, y); a paper edge then ties at its top.
  type Spot = { x: number; y: number; top?: number }
  const pins = Array.from(item.querySelectorAll<HTMLElement>('.evidence__pin'))
  let spots: Spot[]
  if (pins.length > 0) {
    spots = pins.map((pin) => {
      const box = pin.getBoundingClientRect()
      return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
    })
  } else {
    // Taped paper ties at the tape, a little below the box's top: the top
    // few pixels of a taped note's image are clear around the tape, so a hit
    // test right at the edge falls through to whatever lies beneath.
    const box = (
      item.querySelector<HTMLElement>('.evidence__paper') ?? item
    ).getBoundingClientRect()
    const y = box.top + box.height * PAPER_TIE
    spots = [{ x: box.left + box.width / 2, y, top: y }]
  }
  const origin = container.getBoundingClientRect()
  return spots
    .filter(({ x, y }) => {
      // jsdom has no hit testing; there, every pin counts as visible.
      const onTop =
        typeof document.elementFromPoint === 'function' ? document.elementFromPoint(x, y) : null
      return !(onTop && !item.contains(onTop) && onTop.closest('.evidence'))
    })
    .map((spot) => ({ x: spot.x - origin.left, y: (spot.top ?? spot.y) - origin.top }))
}

/** The anchor nearest `toward`, or the first when there is nothing to aim at. */
function anchorOf(container: HTMLElement, id: string, toward?: Point): Point | null {
  const anchors = anchorsOf(container, id)
  if (anchors.length === 0) return null
  if (!toward) return anchors[0]!
  let best = anchors[0]!
  let bestD = Number.POSITIVE_INFINITY
  for (const a of anchors) {
    const d = (a.x - toward.x) ** 2 + (a.y - toward.y) ** 2
    if (d < bestD) {
      bestD = d
      best = a
    }
  }
  return best
}

/**
 * The red thread, as one SVG laid over the items. Endpoints are measured
 * from the DOM (pins and paper edges), so the data only says which items
 * are tied together. Measured on mount, after the first paint settles, and
 * on resize; the items themselves never move, so nothing runs per frame.
 */
export function Threads({ threads, within }: ThreadsProps) {
  const svg = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const paint = () => {
      const container = within()
      const el = svg.current
      if (!container || !el) return
      const { width, height } = container.getBoundingClientRect()
      el.setAttribute('viewBox', `0 0 ${width} ${height}`)
      for (const path of Array.from(el.querySelectorAll<SVGPathElement>('path[data-thread]'))) {
        const [from, to] = (path.dataset.thread ?? '').split('>')
        // Each end picks the pin nearest the other, so a two-pin piece ties at the right corner.
        const first = from ? anchorOf(container, from) : null
        const b = to ? anchorOf(container, to, first ?? undefined) : null
        const a = from ? anchorOf(container, from, b ?? undefined) : null
        const sag = DEFAULT_SAG * (0.6 + 0.8 * jitter(path.dataset.thread ?? ''))
        path.setAttribute('d', a && b ? threadPath(a, b, { sag }) : '')
      }
    }
    paint()
    const settle = window.setTimeout(paint, 400)
    window.addEventListener('resize', paint)
    return () => {
      window.clearTimeout(settle)
      window.removeEventListener('resize', paint)
    }
  }, [threads, within])

  if (threads.length === 0) return null
  return (
    <svg ref={svg} className="threads" aria-hidden="true" preserveAspectRatio="none">
      {threads.map((t) => {
        const key = `${t.from}>${t.to}`
        return (
          <g key={key}>
            <path className="threads__shadow" data-thread={key} />
            <path className="threads__thread" data-thread={key} />
          </g>
        )
      })}
    </svg>
  )
}
