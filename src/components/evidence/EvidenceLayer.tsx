import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { EvidenceItem as EvidenceItemData, Thread } from '@/types/evidence'
import { boardData } from '@/data/board'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/cn'
import { EvidenceItem, type Lift } from './EvidenceItem'
import { WorkCarousel } from '@/components/work/WorkCarousel'
import { startPinLighting } from './pinLighting'
import { Threads } from './Threads'

type EvidenceLayerProps = {
  /** Defaults to the board content in src/data/board.ts. */
  items?: EvidenceItemData[]
  threads?: Thread[]
}

/**
 * Which kinds lift to the centre when clicked. Anything with labels lifts
 * too, and `clickable` on an item overrides either way.
 */
const LIFTS = new Set<EvidenceItemData['kind']>(['note'])
const lifts = (item: EvidenceItemData) =>
  item.clickable ?? (LIFTS.has(item.kind) || Boolean(item.labels?.length))
const interactive = (item: EvidenceItemData) => Boolean(item.opens) || lifts(item)

/** The lifted item fills at most this much of the viewport. */
const MAX_WIDTH_FRACTION = 0.46
const MAX_HEIGHT_FRACTION = 0.72
/** Longest the return trip may take before the overlay is torn down regardless. */
const SETTLE_FALLBACK_MS = 600

type Lifted = { item: EvidenceItemData; dx: number; dy: number; scale: number }

/**
 * Work out the translate and scale that carry an item from where it sits on
 * the board to the centre of the screen. Geometry is the unrotated layout
 * box (offset*), because the item's CSS rotation is about its top centre and
 * the lifted copy keeps that same origin.
 */
export function liftFor(
  box: { left: number; top: number; width: number; height: number },
  viewport: { width: number; height: number },
): Pick<Lift, 'dx' | 'dy' | 'scale'> {
  const maxW = Math.min(viewport.width * MAX_WIDTH_FRACTION, 620)
  const maxH = viewport.height * MAX_HEIGHT_FRACTION
  const scale = Math.max(1, Math.min(maxW / box.width, maxH / box.height))
  return {
    dx: viewport.width / 2 - (box.left + box.width / 2),
    dy: viewport.height / 2 - box.top - (box.height * scale) / 2,
    scale,
  }
}

/**
 * Everything pinned to the board, in one coordinate space. Also runs the pin
 * lighting, and lifts a clicked note out of the board: a copy is rendered in
 * a fixed overlay above the night layer at exactly the same place (the
 * overlay spans the viewport like the board, so the percent placement lands
 * identically), then travels to the centre and scales up. Click, Escape or
 * the backdrop sends it back, and the overlay is removed once it has settled.
 */
export function EvidenceLayer({
  items = boardData.items,
  threads = boardData.threads,
}: EvidenceLayerProps) {
  const within = useCallback(() => layer.current?.parentElement ?? null, [])
  const reducedMotion = useReducedMotion()
  const layer = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const [lifted, setLifted] = useState<Lifted | null>(null)
  const [entered, setEntered] = useState(false)
  const [closing, setClosing] = useState(false)
  // The selected-work carousel: open or not, and which file is at the front.
  // The index lives here, not in the carousel, so it survives closing.
  const [workOpen, setWorkOpen] = useState(false)
  const [workIndex, setWorkIndex] = useState(0)
  const workOpener = useRef<HTMLElement | null>(null)
  const [workOrigin, setWorkOrigin] = useState<{ x: number; y: number }>()

  useEffect(
    () => startPinLighting({ container: document, animate: !reducedMotion }),
    [reducedMotion, items],
  )

  // When the carousel closes, focus goes back to the paper that opened it.
  useEffect(() => {
    if (workOpen || !workOpener.current) return
    workOpener.current
      .querySelector<HTMLElement>('.evidence__paper')
      ?.focus({ preventScroll: true })
    workOpener.current = null
  }, [workOpen])

  const open = useCallback((item: EvidenceItemData, el: HTMLElement) => {
    if (item.opens === 'work') {
      workOpener.current = el
      const r = el.getBoundingClientRect()
      setWorkOrigin({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
      setWorkOpen(true)
      return
    }
    const box = {
      left: el.offsetLeft,
      top: el.offsetTop,
      width: el.offsetWidth || 1,
      height: el.offsetHeight || 1,
    }
    setLifted({ item, ...liftFor(box, { width: window.innerWidth, height: window.innerHeight }) })
    setClosing(false)
  }, [])

  const finish = useCallback(() => {
    const id = lifted?.item.id
    setLifted(null)
    setEntered(false)
    setClosing(false)
    if (id) {
      layer.current
        ?.querySelector<HTMLElement>(`[data-evidence-id="${id}"] .evidence__paper`)
        ?.focus({ preventScroll: true })
    }
  }, [lifted])

  const close = useCallback(() => {
    if (!lifted || closing) return
    if (reducedMotion) {
      finish()
      return
    }
    setClosing(true)
    setEntered(false)
  }, [lifted, closing, reducedMotion, finish])

  // Travel on the frame after mount, so the transition has a start state.
  useEffect(() => {
    if (!lifted) return
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setEntered(true))
    })
    stage.current?.querySelector<HTMLElement>('.evidence__paper')?.focus({ preventScroll: true })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [lifted])

  useEffect(() => {
    if (!lifted) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lifted, close])

  // The way back: tear down on transitionend, or after a fallback delay.
  useEffect(() => {
    if (!closing) return
    const timer = window.setTimeout(finish, SETTLE_FALLBACK_MS)
    return () => window.clearTimeout(timer)
  }, [closing, finish])

  return (
    <>
      <section ref={layer} className="contents" aria-label="Evidence">
        {items.map((item) => (
          <EvidenceItem
            key={item.id}
            item={item}
            onOpen={interactive(item) ? open : undefined}
            ghost={lifted?.item.id === item.id}
          />
        ))}
        <Threads threads={threads} within={within} />
      </section>
      <WorkCarousel
        open={workOpen}
        index={workIndex}
        origin={workOrigin}
        onIndexChange={setWorkIndex}
        onClose={() => setWorkOpen(false)}
      />
      {lifted &&
        createPortal(
          <dialog
            open
            className={cn('lift', entered && 'lift--entered')}
            aria-modal="true"
            aria-label={
              lifted.item.title ?? lifted.item.media?.alt ?? lifted.item.text ?? 'Evidence'
            }
          >
            <button type="button" className="lift__backdrop" aria-label="Close" onClick={close} />
            {lifted.item.title && <h2 className="lift__title">{lifted.item.title}</h2>}
            <div
              ref={stage}
              className="lift__stage"
              onTransitionEnd={(event) => {
                if (closing && event.propertyName === 'transform') finish()
              }}
            >
              <EvidenceItem
                item={lifted.item}
                onOpen={close}
                lift={{ dx: lifted.dx, dy: lifted.dy, scale: lifted.scale, entered }}
              />
            </div>
          </dialog>,
          document.body,
        )}
    </>
  )
}
