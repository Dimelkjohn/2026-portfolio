import { useEffect, useState, type CSSProperties } from 'react'
import { sfx as siteSfx, type Sfx } from '@/audio/sfx'
import { Fastener } from '@/components/evidence/Fastener'
import { tornOutline } from '@/components/evidence/torn'
import { selectedWork, type Work } from '@/data/work'
import type { EvidenceMedia } from '@/types/evidence'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/cn'
import { Pile, wrap } from './Pile'

export { wrap }

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

/**
 * The print's edge: a fine, dense tear, so it reads as a photo on paper rather
 * than a rectangle. The box is about 2.6 times wider than it is tall, so the
 * sides take a proportionally smaller bite than the top and bottom.
 */
const PRINT_TEAR = { rag: 0.8, ragX: 0.3, steps: 48 }
/** How long each photograph holds on a file with several, before the next fades in. */
const FRAME_MS = 3200

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

/** One case file: the manila folder, its typed tab, and the sheet of notes inside. */
function CaseFile({ work, i, offset }: { work: Work; i: number; offset: number }) {
  return (
    <>
      <img className="dossier__folder" src="/evidence/folder.webp" alt="" draggable={false} />
      <span className="dossier__tab">
        Exhibit {String(i + 1).padStart(2, '0')}: {work.tab}
      </span>
      <div className="dossier__sheet">
        <Print media={work.media} seed={work.id} active={offset === 0} />
        <h3 className="dossier__title">{work.title}</h3>
        {(work.year || work.role) && (
          <p className="dossier__meta">{[work.year, work.role].filter(Boolean).join(' · ')}</p>
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
    </>
  )
}

/**
 * Selected work as a stack of case files (see Pile for the mechanics). The
 * position is the caller's, so reopening from any cutting picks up where the
 * last visit stopped.
 */
export function WorkCarousel({
  open,
  items = selectedWork,
  sfx = siteSfx,
  ...rest
}: WorkCarouselProps) {
  // Mounted only while open, so every opening starts fresh at the drop.
  if (!open || items.length === 0) return null
  return (
    <Pile
      items={items}
      sfx={sfx}
      label="Selected work"
      eyebrow="Exhibits"
      noun="exhibit"
      variant="files"
      renderCard={(work, i, offset) => <CaseFile work={work} i={i} offset={offset} />}
      {...rest}
    />
  )
}
