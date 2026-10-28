import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type AnimationEvent,
  type CSSProperties,
  type WheelEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { sfx as siteSfx, type Sfx } from '@/audio/sfx'
import { Fastener } from '@/components/evidence/Fastener'
import { tornOutline } from '@/components/evidence/torn'
import { selectedWork, type Work } from '@/data/work'
import type { EvidenceMedia } from '@/types/evidence'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/cn'
import './work-carousel.css'

type WorkCarouselProps = {
  open: boolean
  /** Which file is at the front. Owned by the caller so it survives closing. */
  index: number
  onIndexChange: (index: number) => void
  /** Called once the pile has left the desk (or at once under reduced motion). */
  onClose: () => void
  /** Where on screen the pile was opened from, in viewport pixels; the close heads back there. */
  origin?: { x: number; y: number }
  items?: Work[]
  /** The effects to play: the thud on landing, the flip on stepping, the whoosh on leaving. */
  sfx?: Sfx
}

type PrintProps = {
  media: EvidenceMedia[] | undefined
  /** The exhibit's id: seeds the tear and the tape so they never change. */
  seed: string
  /** Only the front file plays through its photographs. */
  active: boolean
}

/**
 * The photograph, taped to the sheet at its corners like the prints on the
 * board. A file with several photographs shows them in turn, each fading
 * into the next while the file is at the front; under reduced motion the
 * first one simply stays.
 */
function Print({ media, seed, active }: PrintProps) {
  const reducedMotion = useReducedMotion()
  const [frame, setFrame] = useState(0)
  const count = media?.length ?? 0
  const plays = active && count > 1 && !reducedMotion

  useEffect(() => {
    if (!plays) return
    const t = window.setInterval(() => setFrame((f) => (f + 1) % count), FRAME_MS)
    return () => window.clearInterval(t)
  }, [plays, count])

  return (
    <div
      className="dossier__print"
      style={{ '--torn': tornOutline(seed, PRINT_TEAR) } as CSSProperties}
    >
      {media && count > 0 ? (
        media.map((picture, i) => (
          <img
            key={picture.src}
            className={cn('dossier__photo', i === frame && 'dossier__photo--shown')}
            src={picture.src}
            alt={picture.alt}
            aria-hidden={i !== frame}
            draggable={false}
          />
        ))
      ) : (
        <div className="dossier__photo dossier__photo--none" aria-hidden="true">
          No photograph on file
        </div>
      )}
      <Fastener fastener={{ kind: 'tape', corners: 'diagonal' }} seed={seed} />
    </div>
  )
}

/** Files further back than this in the stack are not drawn. */
const VISIBLE_BEHIND = 3
/** Wheel travel that counts as one step, and the pause before the next. */
const WHEEL_STEP = 40
const WHEEL_LOCK_MS = 480
/** Longest the drop or the snatch may take before the phase moves on regardless. */
const DROP_FALLBACK_MS = 1000
const LEAVE_FALLBACK_MS = 420
/** When the pile hits the desk, into the drop (68% of its 400ms). */
const IMPACT_MS = 268

type Phase = 'entering' | 'settled' | 'leaving'

export const wrap = (i: number, n: number) => ((i % n) + n) % n

/**
 * The print's edge: a fine, dense tear, so it reads as a photo on paper rather
 * than a rectangle. The box is about 2.6 times wider than it is tall, so the
 * sides take a proportionally smaller bite than the top and bottom.
 */
const PRINT_TEAR = { rag: 0.8, ragX: 0.3, steps: 48 }
/** How long each photograph holds on a file with several, before the next fades in. */
const FRAME_MS = 3200

/** The dust the pile raises when it lands: one cloud image, three times, rolling out left, right and up. */
const PUFFS = ['left', 'right', 'up'] as const

/**
 * Selected work as a stack of case files in a fixed overlay above the night
 * layer. The front file is the current exhibit; the rest fan back behind it.
 * Arrow buttons, arrow keys and the wheel cycle; Escape and the backdrop
 * close. The position is the caller's, so reopening from any cutting picks
 * up where the last visit stopped.
 *
 * On open the pile is dropped onto the desk: it falls in from close to the
 * camera, lands with a short bounce, its shadow tightens under it and a puff
 * of dust rolls out from under it; the label, arrows and count appear once
 * the dust has settled. On close it is snatched away toward whatever opened
 * it. Both are CSS animations keyed off the phase class; under reduced
 * motion the pile fades in and out in place.
 */
export function WorkCarousel({
  open,
  items = selectedWork,
  sfx = siteSfx,
  ...rest
}: WorkCarouselProps) {
  // Mounted only while open, so every opening starts fresh at the drop.
  if (!open || items.length === 0) return null
  return <Pile items={items} sfx={sfx} {...rest} />
}

type PileProps = Omit<WorkCarouselProps, 'open' | 'items' | 'sfx'> & { items: Work[]; sfx: Sfx }

function Pile({ index, onIndexChange, onClose, origin, items, sfx }: PileProps) {
  const reducedMotion = useReducedMotion()
  const n = items.length
  const current = wrap(index, n)
  const wheel = useRef({ travel: 0, lockedUntil: 0 })
  const front = useRef<HTMLButtonElement>(null)
  const [phase, setPhase] = useState<Phase>('entering')

  const step = useCallback(
    (by: number) => {
      sfx.play('flip')
      onIndexChange(wrap(current + by, n))
    },
    [sfx, current, n, onIndexChange],
  )

  // The thud lands with the pile.
  useEffect(() => {
    const t = window.setTimeout(() => sfx.play('thud'), reducedMotion ? 0 : IMPACT_MS)
    return () => window.clearTimeout(t)
  }, [sfx, reducedMotion])

  // The way out: play the snatch, then tell the owner; or go at once.
  const leave = useCallback(() => {
    if (phase === 'leaving') return
    sfx.play('whoosh')
    if (reducedMotion) {
      onClose()
      return
    }
    setPhase('leaving')
  }, [phase, reducedMotion, onClose, sfx])

  useEffect(() => {
    if (phase === 'entering') {
      const t = window.setTimeout(() => setPhase('settled'), DROP_FALLBACK_MS)
      return () => window.clearTimeout(t)
    }
    if (phase === 'leaving') {
      const t = window.setTimeout(onClose, LEAVE_FALLBACK_MS)
      return () => window.clearTimeout(t)
    }
  }, [phase, onClose])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') leave()
      else if (phase === 'leaving') return
      else if (event.key === 'ArrowRight') step(1)
      else if (event.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, leave, step])

  useEffect(() => {
    front.current?.focus({ preventScroll: true })
  }, [])

  const onWheel = (event: WheelEvent) => {
    if (phase === 'leaving') return
    const now = performance.now()
    const w = wheel.current
    if (now < w.lockedUntil) return
    w.travel += Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
    if (Math.abs(w.travel) < WHEEL_STEP) return
    step(Math.sign(w.travel))
    w.travel = 0
    w.lockedUntil = now + WHEEL_LOCK_MS
  }

  const onStackAnimationEnd = (event: AnimationEvent) => {
    if (event.animationName === 'dossier-drop') setPhase('settled')
    else if (event.animationName === 'dossier-snatch') onClose()
  }

  // The snatch heads toward the opener: past it, shrinking, tilted its way.
  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 2
  const dx = origin ? origin.x - cx : 0
  const dy = origin ? origin.y - cy : window.innerHeight
  const exit = {
    '--exit-x': `${(dx * 1.6).toFixed(0)}px`,
    '--exit-y': `${(dy * 1.6).toFixed(0)}px`,
    '--exit-rot': `${dx < 0 ? -9 : 9}deg`,
  } as CSSProperties

  return createPortal(
    <dialog
      open
      className={cn('dossier', `dossier--${phase}`, reducedMotion && 'dossier--still')}
      style={exit}
      aria-modal="true"
      aria-label="Selected work"
      onWheel={onWheel}
    >
      <button type="button" className="dossier__backdrop" aria-label="Close" onClick={leave} />
      <h2 className="dossier__label">Selected work</h2>
      <div className="dossier__stack" aria-live="polite" onAnimationEnd={onStackAnimationEnd}>
        <span className="dossier__shadow" aria-hidden="true" />
        {items.map((work, i) => {
          // Signed distance from the front file, the short way round the stack.
          let offset = i - current
          if (offset > n / 2) offset -= n
          if (offset < -n / 2) offset += n
          const hidden = offset > VISIBLE_BEHIND || offset < -1
          // Landing order: the back of the pile first, the front file last.
          const order = offset === -1 ? VISIBLE_BEHIND : VISIBLE_BEHIND - offset
          return (
            <article
              key={work.id}
              className={cn(
                'dossier__file',
                offset === 0 && 'dossier__file--front',
                offset === -1 && 'dossier__file--prev',
                hidden && 'dossier__file--hidden',
              )}
              style={{ '--offset': offset, '--drop-order': order } as CSSProperties}
              aria-hidden={offset !== 0}
            >
              <div className="dossier__fall">
                <img
                  className="dossier__folder"
                  src="/evidence/folder.webp"
                  alt=""
                  draggable={false}
                />
                <span className="dossier__tab">
                  Exhibit {String(i + 1).padStart(2, '0')}: {work.tab}
                </span>
                <div className="dossier__sheet">
                  <Print media={work.media} seed={work.id} active={offset === 0} />
                  <h3 className="dossier__title">{work.title}</h3>
                  {(work.year || work.role) && (
                    <p className="dossier__meta">
                      {[work.year, work.role].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <p className="dossier__summary">{work.summary}</p>
                  {work.tags.length > 0 && (
                    <ul className="dossier__tags">
                      {work.tags.map((tag) => (
                        <li key={tag}>{tag}</li>
                      ))}
                    </ul>
                  )}
                  {/* Every file has the line; without an address it is struck through and stamped. */}
                  {work.link ? (
                    <a
                      className="dossier__link"
                      href={work.link}
                      target="_blank"
                      rel="noreferrer"
                      tabIndex={offset === 0 ? undefined : -1}
                    >
                      Open the exhibit
                    </a>
                  ) : (
                    <p className="dossier__link dossier__link--sealed">
                      <s>Open the exhibit</s>
                      <span className="dossier__stamp">Sealed</span>
                    </p>
                  )}
                </div>
              </div>
            </article>
          )
        })}
        <span className="dossier__dust" aria-hidden="true">
          {PUFFS.map((side) => (
            <img
              key={side}
              className={`dossier__puff dossier__puff--${side}`}
              src="/evidence/dust.webp"
              alt=""
              draggable={false}
            />
          ))}
        </span>
      </div>
      <button
        ref={front}
        type="button"
        className="dossier__arrow dossier__arrow--prev"
        aria-label="Previous exhibit"
        onClick={() => step(-1)}
      >
        ‹
      </button>
      <button
        type="button"
        className="dossier__arrow dossier__arrow--next"
        aria-label="Next exhibit"
        onClick={() => step(1)}
      >
        ›
      </button>
      <p className="dossier__count">
        {String(current + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
      </p>
    </dialog>,
    document.body,
  )
}
