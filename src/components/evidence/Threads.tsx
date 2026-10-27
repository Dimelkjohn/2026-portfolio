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
 * Where a thread ties onto an item: the centre of its pin, or the top centre
 * of the paper when it is held by tape or nothing. Null when that point is
 * covered by another item: a thread cannot tie to a pin nobody can see.
 * (elementFromPoint skips pointer-transparent layers, so the thread SVG and
 * the torch do not get in the way of the test.)
 */
function anchorOf(container: HTMLElement, id: string): Point | null {
  const item = container.querySelector<HTMLElement>(`[data-evidence-id="${id}"]`)
  if (!item) return null
  const pin = item.querySelector<HTMLElement>('.evidence__pin')
  const box = (
    pin ??
    item.querySelector<HTMLElement>('.evidence__paper') ??
    item
  ).getBoundingClientRect()
  const x = box.left + box.width / 2
  const y = pin ? box.top + box.height / 2 : box.top + 2
  // jsdom has no hit testing; there, every pin counts as visible.
  const onTop =
    typeof document.elementFromPoint === 'function' ? document.elementFromPoint(x, y) : null
  if (onTop && !item.contains(onTop) && onTop.closest('.evidence')) return null
  const origin = container.getBoundingClientRect()
  return { x: x - origin.left, y: (pin ? y : box.top) - origin.top }
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
        const a = from ? anchorOf(container, from) : null
        const b = to ? anchorOf(container, to) : null
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
