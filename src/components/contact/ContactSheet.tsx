import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { contactLinks, type ContactLink } from '@/data/contact'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/cn'
import './contact.css'

type ContactSheetProps = {
  open: boolean
  /** Called once the tags have been gathered back up (or at once under reduced motion). */
  onClose: () => void
  items?: ContactLink[]
}

/** The deal: first tag after this long, each later one this much later, each taking this long. */
const DEAL_DELAY_MS = 80
const DEAL_STAGGER_MS = 110
const DEAL_MS = 320
/** The backdrop's fade, which on the way out starts after the last tag has gone. */
const FADE_MS = 240

/**
 * The ways to reach John, dealt out as typed tags when the handshake is
 * clicked: each tag names the channel in red and the address after it, in
 * the same style as the exhibit labels. Escape and the backdrop close it,
 * which runs the deal in reverse: the last tag goes first, then the
 * backdrop clears.
 */
export function ContactSheet({ open, onClose, items = contactLinks }: ContactSheetProps) {
  // Mounted only while open, so every opening deals in afresh.
  if (!open) return null
  return <Sheet onClose={onClose} items={items} />
}

function Sheet({ onClose, items }: { onClose: () => void; items: ContactLink[] }) {
  const reducedMotion = useReducedMotion()
  const first = useRef<HTMLAnchorElement>(null)
  const [leaving, setLeaving] = useState(false)

  // The whole way out: the tags back in reverse order, then the backdrop.
  const leaveMs = DEAL_DELAY_MS + (items.length - 1) * DEAL_STAGGER_MS + DEAL_MS + FADE_MS

  const leave = useCallback(() => {
    if (reducedMotion) {
      onClose()
      return
    }
    setLeaving(true)
  }, [reducedMotion, onClose])

  useEffect(() => {
    if (leaving) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') leave()
    }
    window.addEventListener('keydown', onKey)
    first.current?.focus({ preventScroll: true })
    return () => window.removeEventListener('keydown', onKey)
  }, [leaving, leave])

  useEffect(() => {
    if (!leaving) return
    const t = window.setTimeout(onClose, leaveMs)
    return () => window.clearTimeout(t)
  }, [leaving, leaveMs, onClose])

  const n = items.length
  return createPortal(
    <dialog
      open
      className={cn('contact', leaving && 'contact--leaving', reducedMotion && 'contact--still')}
      style={
        {
          '--deal-delay': `${DEAL_DELAY_MS}ms`,
          '--deal-stagger': `${DEAL_STAGGER_MS}ms`,
          '--deal': `${DEAL_MS}ms`,
          '--fade': `${FADE_MS}ms`,
          '--n': n,
        } as CSSProperties
      }
      aria-modal="true"
      aria-label="Make contact"
    >
      <button type="button" className="contact__backdrop" aria-label="Close" onClick={leave} />
      <ul className="contact__tags">
        {items.map((link, i) => (
          <li key={link.id} className="contact__item" style={{ '--i': i } as CSSProperties}>
            <a
              ref={i === 0 ? first : undefined}
              className="contact__tag"
              href={link.href}
              target={link.href.startsWith('mailto:') ? undefined : '_blank'}
              rel={link.href.startsWith('mailto:') ? undefined : 'noreferrer'}
              tabIndex={leaving ? -1 : undefined}
            >
              <span className="contact__channel">{link.channel}</span>
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </dialog>,
    document.body,
  )
}
