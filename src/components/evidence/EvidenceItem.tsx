import type { CSSProperties } from 'react'
import type { EvidenceItem as EvidenceItemData, EvidenceMedia } from '@/types/evidence'
import { cn } from '@/lib/cn'
import { Fastener } from './Fastener'
import { creases, tornOutline } from './torn'
import './evidence.css'

export type Lift = {
  /** Translation, in px, that puts the item at the centre of the screen. */
  dx: number
  dy: number
  /** Scale that makes it large enough to read. */
  scale: number
  /** False on the first frame (still on the board), true once it should travel. */
  entered: boolean
}

type EvidenceItemProps = {
  item: EvidenceItemData
  /**
   * When given, the paper is a button and clicking it calls this, with the
   * item's root element. The layer uses it to lift notes to the centre.
   */
  onOpen?: (item: EvidenceItemData, element: HTMLElement) => void
  /** This copy is the lifted one in the overlay: travel to the centre once entered. */
  lift?: Lift
  /** Hidden in place while its lifted copy is shown. */
  ghost?: boolean
}

/** Default width, percent of board width, when the placement does not say. */
const DEFAULT_WIDTH: Record<EvidenceItemData['kind'], number> = {
  photo: 10,
  polaroid: 12,
  clipping: 30,
  postit: 11,
  receipt: 11,
  fingerprint: 10,
  cutout: 10,
  note: 7,
}

/**
 * One piece of evidence pinned to the board. Placement is written as custom
 * properties on the root so the CSS owns the geometry. The paper is a button
 * when there is something to reveal (a fun fact now, a gallery later), so it
 * takes hover and keyboard focus. The fun fact is a tooltip tag that hangs off
 * the item on hover and focus; the show and hide is pure CSS, so pointer
 * movement never reaches React.
 */
export function EvidenceItem({ item, onOpen, lift, ghost }: EvidenceItemProps) {
  const {
    id,
    kind,
    placement,
    media,
    text,
    body,
    dateline,
    worn,
    footer,
    size,
    inset,
    hand,
    headline,
    mark,
    labels,
    annotations,
    funFact,
    gallery,
  } = item
  const fastener = item.fastener ?? { kind: 'pin' as const }
  const style = {
    '--x': `${placement.x}%`,
    '--y': `${placement.y}%`,
    '--w': `${placement.width ?? DEFAULT_WIDTH[kind]}%`,
    '--rotate': `${placement.rotate ?? 0}deg`,
    '--z': placement.z ?? 1,
    ...(kind === 'clipping' && !media && tornStyle(id)),
    ...(kind === 'receipt' && creaseStyle(id)),
    ...(size && { '--print-scale': size }),
    ...(lift && {
      '--lift-dx': `${lift.dx.toFixed(1)}px`,
      '--lift-dy': `${lift.dy.toFixed(1)}px`,
      '--lift-s': lift.scale.toFixed(3),
    }),
  } as CSSProperties
  const factId = `evidence-${id}-fact`
  const label = media?.alt ?? text ?? kind
  const interactive = Boolean(funFact || gallery || onOpen)

  const paper = (
    <>
      {kind === 'clipping' && media && (
        <>
          <img className="evidence__cutout" src={media.src} alt={media.alt} draggable={false} />
          <div className="evidence__print" style={inset ? { inset } : undefined}>
            {dateline && <span className="evidence__dateline">{dateline}</span>}
            {text && <h2 className="evidence__headline">{text}</h2>}
          </div>
        </>
      )}
      {kind === 'clipping' && !media && (
        <Clipping headline={text} body={body} dateline={dateline} />
      )}
      {kind === 'receipt' && <Receipt header={text} body={body} footer={footer} />}
      {kind === 'fingerprint' && <Fingerprint media={media} label={text} />}
      {(kind === 'photo' || kind === 'polaroid') && <Print media={media} caption={text} />}
      {kind === 'cutout' && media && (
        <>
          <img className="evidence__cutout" src={media.src} alt={media.alt} draggable={false} />
          {text && (
            <span className="evidence__frame-caption" style={inset ? { inset } : undefined}>
              {text}
            </span>
          )}
        </>
      )}
      {kind === 'postit' && <p className="evidence__note">{text}</p>}
      {kind === 'note' && media && (
        <>
          <img className="evidence__cutout" src={media.src} alt={media.alt} draggable={false} />
          {(text || headline) && (
            <p
              className={cn(
                'evidence__scrawl',
                hand === 'caps' && 'evidence__scrawl--caps',
                headline && 'evidence__scrawl--titled',
              )}
              style={inset ? { inset } : undefined}
            >
              {text && <Scrawl text={text} mark={mark} />}
              {headline && (
                <strong className="evidence__marker">
                  {headline.split(' ').map((word, i) => (
                    <span key={i} className="evidence__marker-word">
                      {word}
                    </span>
                  ))}
                </strong>
              )}
            </p>
          )}
        </>
      )}
    </>
  )

  return (
    <article
      className={cn(
        'evidence',
        `evidence--${kind}`,
        `evidence--held-${fastener.kind}`,
        worn && 'evidence--worn',
        kind === 'clipping' && media && 'evidence--scan',
        interactive && 'evidence--clickable',
        lift && 'evidence--lifted',
        lift?.entered && 'evidence--entered',
        ghost && 'evidence--ghost',
      )}
      style={style}
      aria-label={label}
      data-evidence-id={id}
    >
      {interactive ? (
        <button
          type="button"
          className="evidence__paper"
          aria-label={label}
          aria-describedby={funFact ? factId : undefined}
          onClick={
            onOpen
              ? (event) => onOpen(item, event.currentTarget.closest<HTMLElement>('.evidence')!)
              : undefined
          }
        >
          {paper}
        </button>
      ) : (
        <div className="evidence__paper">{paper}</div>
      )}
      {annotations?.map((mark, i) => (
        <img
          key={i}
          className="evidence__annotation"
          src={mark.src}
          alt={mark.alt}
          draggable={false}
          style={
            {
              '--ax': `${mark.x}%`,
              '--ay': `${mark.y}%`,
              '--aw': `${mark.width}%`,
              '--ar': `${mark.rotate ?? 0}deg`,
            } as CSSProperties
          }
        />
      ))}
      <Fastener fastener={fastener} seed={id} />
      {lift && labels && labels.length > 0 && (
        <ul className="evidence__labels" aria-label="Findings">
          {labels.map((label) => (
            <li
              key={`${label.x}-${label.y}`}
              className={cn('evidence__label', `evidence__label--${label.side ?? 'above'}`)}
              style={{ '--lx': `${label.x}%`, '--ly': `${label.y}%` } as CSSProperties}
            >
              {label.text}
            </li>
          ))}
        </ul>
      )}
      {funFact && (
        <span role="tooltip" id={factId} className="evidence__fact">
          {funFact}
        </span>
      )}
    </article>
  )
}

/** Note text, with an optional ink mark under it or circling one word of it. */
function Scrawl({ text, mark }: { text: string; mark?: EvidenceItemData['mark'] }) {
  if (!mark) return text
  const at = mark.around ? text.indexOf(mark.around) : -1
  if (at < 0) {
    return (
      <>
        {text}
        <img className="evidence__mark" src={mark.src} alt={mark.alt} draggable={false} />
      </>
    )
  }
  const word = mark.around as string
  return (
    <>
      {text.slice(0, at)}
      <span className="evidence__circled">
        {word}
        <img className="evidence__circle" src={mark.src} alt={mark.alt} draggable={false} />
      </span>
      {text.slice(at + word.length)}
    </>
  )
}

function Print({ media, caption }: { media?: EvidenceMedia; caption?: string }) {
  return (
    <>
      {media ? (
        <img className="evidence__photo" src={media.src} alt={media.alt} draggable={false} />
      ) : (
        <span className="evidence__photo evidence__photo--blank" aria-hidden="true" />
      )}
      {caption && <span className="evidence__caption">{caption}</span>}
    </>
  )
}

function Clipping({
  headline,
  body,
  dateline,
}: {
  headline?: string
  body?: string
  dateline?: string
}) {
  return (
    <>
      {dateline ? (
        <span className="evidence__dateline">{dateline}</span>
      ) : (
        <span className="evidence__masthead" aria-hidden="true">
          The Daily
        </span>
      )}
      {headline && <h2 className="evidence__headline">{headline}</h2>}
      {body && <p className="evidence__column">{body}</p>}
    </>
  )
}

/** Till paper: a header, typed lines (a line of dashes prints as a dotted rule), a centred footer. */
function Receipt({ header, body, footer }: { header?: string; body?: string; footer?: string }) {
  const lines = body ? body.split('\n') : []
  return (
    <>
      {header && <span className="evidence__receipt-header">{header}</span>}
      {lines.length > 0 && (
        <pre className="evidence__receipt-lines">
          {lines.map((line, i) =>
            /^-{3,}$/.test(line) ? (
              <span key={i} className="evidence__receipt-rule" aria-hidden="true" />
            ) : (
              <span key={i}>{line + '\n'}</span>
            ),
          )}
        </pre>
      )}
      {footer && <span className="evidence__receipt-footer">{footer}</span>}
    </>
  )
}

/** Where this paper's creases fall, from its id, so no two sheets match. */
function creaseStyle(id: string) {
  const c = creases(id)
  return { '--crease-x': c.x, '--crease-y': c.y, '--crease-size': c.size }
}

/** A clipping's own tear as well as its creases. */
function tornStyle(id: string) {
  return { '--torn': tornOutline(id), ...creaseStyle(id) }
}

/** A card of ink: the supplied print, or a procedural one when there is no media. */
function Fingerprint({ media, label }: { media?: EvidenceMedia; label?: string }) {
  const rings = Array.from({ length: 11 }, (_, i) => 6 + i * 4.2)
  return (
    <>
      {media ? (
        <img className="evidence__ink" src={media.src} alt={media.alt} draggable={false} />
      ) : (
        <svg
          className="evidence__ink evidence__ink--drawn"
          viewBox="0 0 100 120"
          aria-hidden="true"
        >
          <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            {rings.map((r, i) => (
              <ellipse
                key={r}
                cx="50"
                cy="58"
                rx={r}
                ry={r * 1.25}
                strokeDasharray={i % 3 === 0 ? '18 5 30 4' : i % 3 === 1 ? '40 6 12 5' : '26 4'}
                strokeDashoffset={i * 7}
              />
            ))}
            <path d="M50 46c-4 3-5 9-2 13s8 4 10-1" />
          </g>
        </svg>
      )}
      {label && <span className="evidence__ink-label">{label}</span>}
    </>
  )
}
