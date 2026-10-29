/**
 * Shared model for everything pinned to the board.
 * Rendered by `src/components/evidence`; content lives in `src/data/board.ts`.
 */

/** Position, size and rotation on the board, in percent of board width/height. */
export type BoardPlacement = {
  /** 0-100, left edge of the item. */
  x: number
  /** 0-100, top edge of the item. */
  y: number
  /** Width as a percent of board width. Each kind has a sensible default. */
  width?: number
  /** Degrees; small values look hand-pinned. */
  rotate?: number
  /** Stacking order among evidence items. */
  z?: number
}

/**
 * The kind of paper.
 *   photo        print with a thin white border
 *   polaroid     instant print with the thick bottom border
 *   clipping     torn newspaper column
 *   postit       yellow sticky note, handwritten
 *   receipt      narrow till receipt, typed
 *   fingerprint  white card with ink on it (media) or a drawn print
 *   cutout       the image is the paper: a PNG with its own alpha, no card
 *   note         a photographed scrap of paper (media) with handwriting (text) on it
 */
export type EvidenceKind =
  | 'photo'
  | 'polaroid'
  | 'clipping'
  | 'postit'
  | 'receipt'
  | 'fingerprint'
  | 'cutout'
  | 'note'
  /** A clear evidence bag: see-through plastic drawn over whatever is bagged; never takes the pointer. */
  | 'bag'

export type PinColor = 'red' | 'white' | 'yellow' | 'black'

/** What holds the paper to the cork. Default: one red pin, top centre. */
export type Fastener =
  | {
      kind: 'pin'
      color?: PinColor
      /**
       * 0-100, where along the top edge the pin goes. Default 50. A list puts
       * a pin at each place, for a wide piece held at both corners; a thread
       * ties to whichever pin is nearest its other end.
       */
      x?: number | number[]
      /**
       * 0-100, how far down the paper the pin goes. Default 0, the top edge.
       * A pin through the middle of a piece, say, sits at 50.
       */
      y?: number
    }
  | {
      kind: 'tape'
      /** One strip across the top, two opposite corners, or all four. Default 'top'. */
      corners?: 'top' | 'diagonal' | 'all'
      /** Strip length as a percent of the item's width. Default 55 (top) or 42 (corners). */
      width?: number
    }
  | { kind: 'none' }

/** A lab tag pinned to a point on the paper, shown only in the lifted view. */
export type EvidenceLabel = {
  /** Anchor point, percent of the paper's width and height. */
  x: number
  y: number
  text: string
  /** Which side of the anchor the tag sits on. Default 'above'. */
  side?: 'above' | 'below' | 'left' | 'right'
}

/** An ink mark drawn over the paper itself (a circled face, an arrow), placed in percent. */
export type EvidenceAnnotation = EvidenceMedia & {
  /** Centre of the mark, percent of the paper. */
  x: number
  y: number
  /** Width, percent of the paper; height follows the image. */
  width: number
  rotate?: number
}

export type EvidenceMedia = {
  src: string
  alt: string
  caption?: string
}

export type EvidenceItem = {
  id: string
  kind: EvidenceKind
  placement: BoardPlacement
  fastener?: Fastener
  /**
   * Shown as the pinned thumbnail on the board. On a clipping, a scanned
   * cutting with a blank patch for the headline; without it the clipping is
   * drawn (torn and creased) from CSS.
   */
  media?: EvidenceMedia
  /**
   * Short text on the paper itself: a post-it note, a polaroid caption,
   * a clipping headline, a receipt header, a fingerprint card label.
   */
  text?: string
  /** Longer copy: clipping body, receipt lines (newline separated). */
  body?: string
  /**
   * Clippings only: the small line above the headline (paper, place, date),
   * for a cutting taken from inside the paper. Without it the clipping is
   * the front page, with the masthead.
   */
  dateline?: string
  /** Clippings only: an old cutting, browned and beaten rather than fresh newsprint. */
  worn?: boolean
  /** Receipts only: the centred closing lines under the last rule (the thank-you). */
  footer?: string
  /**
   * Sits inside a bag: place it under the bag's z. Its image should already
   * look as it does through the plastic (the pipeline bakes that for the photo
   * pile); the page only keeps it under the bag on hover.
   */
  bagged?: boolean
  /**
   * What a click opens instead of lifting the paper. 'work' is the
   * selected-work carousel, one shared stack of files that keeps its place
   * between visits whichever item opened it; 'photos' is the pile of prints
   * from the evidence bag (src/data/photos.ts), the same mechanics.
   */
  opens?: 'work' | 'photos'
  /**
   * With `opens: 'work'`: the id of the file (src/data/work.ts) the pile
   * opens on, so a cutting tells its own story. Without it the pile opens
   * where it was last left.
   */
  opensAt?: string
  /** Clippings on a scan: multiplier on the printed headline's size. Default 1. */
  size?: number
  /**
   * Notes: where the writing may go, as a CSS inset in percent of the paper
   * (top right bottom left), clear of any tape or tab baked into the photo.
   * Default '14% 10%'. Clippings on a scan (`media`): the blank patch of the
   * cutting where the dateline and headline print. Default '12%'. Framed cutouts: where the caption sits on the frame's
   * bottom margin. Default 'auto 8% 5% 8%'.
   */
  inset?: string
  /**
   * Notes only: which handwriting. 'script' (default) is the loose script;
   * 'caps' is the marker scrawl, always rendered in capitals.
   */
  hand?: 'script' | 'caps'
  /**
   * Notes only: a headline written big in thick marker under `text` (or
   * alone), centred on the paper: the hub's "who is / John Dimelu", the
   * question marks around it.
   */
  headline?: string
  /**
   * Notes only: an ink mark. Beneath the writing by default (an underline, a
   * scribble); with `around`, drawn over the first occurrence of that word in
   * the text instead (a circle).
   */
  mark?: EvidenceMedia & { around?: string }
  /** Ink marks drawn over the paper, always visible. */
  annotations?: EvidenceAnnotation[]
  /**
   * Overrides whether the item lifts to the centre when clicked: true makes
   * any paper lift, false keeps a note (or labelled paper) plain.
   */
  clickable?: boolean
  /** Heading shown over the lifted view, e.g. 'Core strengths'. */
  title?: string
  /**
   * Findings written on the paper when it is lifted (so the item is
   * clickable): one tag per point of interest, e.g. a strength per finger.
   */
  labels?: EvidenceLabel[]
  /** Fun fact revealed in the hover tooltip. */
  funFact?: string
  /** When present, clicking opens the carousel with these images. */
  gallery?: EvidenceMedia[]
}

/** Red thread between two evidence items (or to the centre). */
export type Thread = {
  from: string
  to: string
}

export type BoardData = {
  items: EvidenceItem[]
  threads: Thread[]
}
