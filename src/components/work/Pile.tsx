import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type AnimationEvent,
  type CSSProperties,
  type ReactNode,
  type WheelEvent,
} from 'react'
import { createPortal } from 'react-dom'
import type { Sfx, SfxName } from '@/audio/sfx'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/cn'
import './work-carousel.css'

export type PileProps<T extends { id: string }> = {
  items: T[]
  /** Which card is at the front. Owned by the caller so it survives closing. */
  index: number
  onIndexChange: (index: number) => void
  /** Called once the pile has left the desk (or at once under reduced motion). */
  onClose: () => void
  /** Where on screen the pile was opened from, in viewport pixels; the close heads back there. */
  origin?: { x: number; y: number }
  /** The effects to play: the thud on landing, the flip on stepping, the whoosh on leaving. */
  sfx: Sfx
  /** Which effect is which, so a pile of prints can sound like paper rather than folders. */
  sounds?: { land: SfxName; step: SfxName; leave: SfxName }
  /** The pile's name: on the label and as the dialog's name. */
  label: string
  /** The small red word before the name on the label. */
  eyebrow: string
  /** What one card is called, for the arrows' labels: 'exhibit', 'photograph'. */
  noun: string
  /** Shapes the stack: case files, or a pile of prints. */
  variant: 'files' | 'photos'
  /** Draws the face of one card, given its place in the stack. */
  renderCard: (item: T, i: number, offset: number) => ReactNode
}

/** Cards further back than this in the stack are not drawn. */
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

/** The folders' sounds, unless a pile says otherwise. */
const FOLDER_SOUNDS = { land: 'thud', step: 'flip', leave: 'whoosh' } as const

/** The red marker arrow drawn on the arrow tags (the same mark as on the examine-photos note). */
const ARROW_URL = `${import.meta.env.BASE_URL}evidence/mark-arrow-red.png`

/** The dust the pile raises when it lands: one cloud image, three times, rolling out left, right and up. */
const PUFFS = ['left', 'right', 'up'] as const

/**
 * A stack of cards in a fixed overlay above the night layer: case files for
 * the selected work, prints for the photographs. The front card is the
 * current one; the rest fan back behind it. Arrow buttons, arrow keys and
 * the wheel cycle; Escape and the backdrop close. The position is the
 * caller's, so reopening picks up where the last visit stopped.
 *
 * On open the pile is dropped onto the desk: it falls in from close to the
 * camera, lands with a short bounce, its shadow tightens under it and a puff
 * of dust rolls out from under it; the label, arrows and count appear once
 * the dust has settled. On close it is snatched away toward whatever opened
 * it. Both are CSS animations keyed off the phase class; under reduced
 * motion the pile fades in and out in place.
 */
export function Pile<T extends { id: string }>({
  index,
  onIndexChange,
  onClose,
  origin,
  items,
  sfx,
  sounds = FOLDER_SOUNDS,
  label,
  eyebrow,
  noun,
  variant,
  renderCard,
}: PileProps<T>) {
  const reducedMotion = useReducedMotion()
  const n = items.length
  const current = wrap(index, n)
  const wheel = useRef({ travel: 0, lockedUntil: 0 })
  const front = useRef<HTMLButtonElement>(null)
  const [phase, setPhase] = useState<Phase>('entering')

  const step = useCallback(
    (by: number) => {
      sfx.play(sounds.step)
      onIndexChange(wrap(current + by, n))
    },
    [sfx, sounds.step, current, n, onIndexChange],
  )

  // The thud lands with the pile.
  useEffect(() => {
    const t = window.setTimeout(() => sfx.play(sounds.land), reducedMotion ? 0 : IMPACT_MS)
    return () => window.clearTimeout(t)
  }, [sfx, sounds.land, reducedMotion])

  // The way out: play the snatch, then tell the owner; or go at once.
  const leave = useCallback(() => {
    if (phase === 'leaving') return
    sfx.play(sounds.leave)
    if (reducedMotion) {
      onClose()
      return
    }
    setPhase('leaving')
  }, [phase, reducedMotion, onClose, sfx, sounds.leave])

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
      className={cn(
        'dossier',
        `dossier--${variant}`,
        `dossier--${phase}`,
        reducedMotion && 'dossier--still',
      )}
      style={exit}
      aria-modal="true"
      aria-label={label}
      onWheel={onWheel}
    >
      <button type="button" className="dossier__backdrop" aria-label="Close" onClick={leave} />
      <h2 className="dossier__label">
        <span className="dossier__eyebrow">{eyebrow}</span>
        {label}
      </h2>
      <div className="dossier__stack" aria-live="polite" onAnimationEnd={onStackAnimationEnd}>
        <span className="dossier__shadow" aria-hidden="true" />
        {items.map((item, i) => {
          // Signed distance from the front card, the short way round the stack.
          let offset = i - current
          if (offset > n / 2) offset -= n
          if (offset < -n / 2) offset += n
          const hidden = offset > VISIBLE_BEHIND || offset < -1
          // Landing order: the back of the pile first, the front card last.
          const order = offset === -1 ? VISIBLE_BEHIND : VISIBLE_BEHIND - offset
          return (
            <article
              key={item.id}
              className={cn(
                'dossier__file',
                offset === 0 && 'dossier__file--front',
                offset === -1 && 'dossier__file--prev',
                hidden && 'dossier__file--hidden',
              )}
              style={{ '--offset': offset, '--drop-order': order } as CSSProperties}
              aria-hidden={offset !== 0}
            >
              <div className="dossier__fall">{renderCard(item, i, offset)}</div>
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
        aria-label={`Previous ${noun}`}
        onClick={() => step(-1)}
      >
        <img className="dossier__arrow-mark" src={ARROW_URL} alt="" draggable={false} />
      </button>
      <button
        type="button"
        className="dossier__arrow dossier__arrow--next"
        aria-label={`Next ${noun}`}
        onClick={() => step(1)}
      >
        <img className="dossier__arrow-mark" src={ARROW_URL} alt="" draggable={false} />
      </button>
      <p className="dossier__count">
        {String(current + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
      </p>
    </dialog>,
    document.body,
  )
}
