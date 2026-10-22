/**
 * Shared model for everything pinned to the board.
 * The initial load renders none of these yet; the shape is here so the
 * tooltip / carousel work can build on it without reshaping data later.
 */

/** Position and rotation on the board, in percent of board width/height. */
export type BoardPlacement = {
  /** 0-100, left edge of the item. */
  x: number
  /** 0-100, top edge of the item. */
  y: number
  /** Degrees; small values look hand-pinned. */
  rotate?: number
  /** Stacking order among evidence items. */
  z?: number
}

export type EvidenceKind = 'photo' | 'polaroid' | 'clipping' | 'postit' | 'receipt' | 'fingerprint'

export type EvidenceMedia = {
  src: string
  alt: string
  caption?: string
}

export type EvidenceItem = {
  id: string
  kind: EvidenceKind
  placement: BoardPlacement
  /** Shown as the pinned thumbnail on the board. */
  media?: EvidenceMedia
  /** Handwritten text for post-its and captions. */
  text?: string
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
