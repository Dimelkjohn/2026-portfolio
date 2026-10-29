import type { CSSProperties } from 'react'
import { sfx as siteSfx, type Sfx } from '@/audio/sfx'
import { moonlightingPhotos, type Photo } from '@/data/photos'
import { Pile } from './Pile'

type PhotoCarouselProps = {
  open: boolean
  /** Which print is at the front. Owned by the caller so it survives closing. */
  index: number
  onIndexChange: (index: number) => void
  /** Called once the pile has left the desk (or at once under reduced motion). */
  onClose: () => void
  /** Where on screen the pile was opened from, in viewport pixels; the close heads back there. */
  origin?: { x: number; y: number }
  items?: Photo[]
  /** The effects to play: the pile landing, a print flipped, the pile leaving. */
  sfx?: Sfx
}

/** Paper sounds for a pile of prints, rather than the folders' thud and flip. */
const PAPER_SOUNDS = { land: 'paperThud', step: 'paperFlip', leave: 'whoosh' } as const

/**
 * One print: the picture itself, at its own proportions, as big as the pile's
 * box allows. A film shows its still like any other print; once it is the
 * front print, the film itself plays in its place. A photograph at the front
 * opens full size in a new tab when clicked. The caption is not on the print:
 * the pile shows it on a tag underneath.
 */
function PrintCard({ photo, front }: { photo: Photo; front: boolean }) {
  const film = photo.video && front
  return (
    <div className="dossier__picture" style={{ '--ratio': photo.ratio } as CSSProperties}>
      {film ? (
        <iframe
          className="dossier__picture-film"
          src={`https://www.youtube-nocookie.com/embed/${photo.video!.youtube}?rel=0`}
          title={photo.caption ?? 'Film'}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : photo.media ? (
        <a
          className="dossier__picture-link"
          href={photo.media.src}
          target="_blank"
          rel="noreferrer"
          aria-label="Open the photograph full size in a new tab"
          tabIndex={front ? undefined : -1}
        >
          <img
            className="dossier__picture-img"
            src={photo.media.src}
            alt={photo.media.alt}
            draggable={false}
          />
        </a>
      ) : (
        <div className="dossier__picture-img dossier__picture-img--none" aria-hidden="true">
          Photograph to follow
        </div>
      )}
    </div>
  )
}

/**
 * The photographs from the evidence bag, as a pile of prints dropped onto the
 * desk (see Pile for the mechanics, shared with the case files). The position
 * is the caller's, so reopening picks up where the last visit stopped.
 */
export function PhotoCarousel({
  open,
  items = moonlightingPhotos,
  sfx = siteSfx,
  ...rest
}: PhotoCarouselProps) {
  // Mounted only while open, so every opening starts fresh at the drop.
  if (!open || items.length === 0) return null
  return (
    <Pile
      items={items}
      sfx={sfx}
      sounds={PAPER_SOUNDS}
      label="Moonlighting"
      eyebrow="Exhibits"
      noun="photograph"
      variant="photos"
      renderCard={(photo, _i, offset) => <PrintCard photo={photo} front={offset === 0} />}
      caption={(photo) => photo.caption}
      {...rest}
    />
  )
}
