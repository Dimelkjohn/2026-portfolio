import type { EvidenceItem } from '@/types/evidence'

/** Kinds that lift to the centre when clicked unless the item says otherwise. */
const LIFTS = new Set<EvidenceItem['kind']>(['note'])

/** Whether a click lifts this item to the centre of the screen. */
export const lifts = (item: EvidenceItem) =>
  item.clickable ?? (LIFTS.has(item.kind) || Boolean(item.labels?.length))

/** Whether this item does anything when clicked: opens a pile or the contact sheet, or lifts. */
export const interactive = (item: EvidenceItem) => Boolean(item.opens) || lifts(item)
