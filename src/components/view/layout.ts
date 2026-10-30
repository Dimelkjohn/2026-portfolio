import { useMediaQuery } from '@/hooks/useMediaQuery'

/**
 * The board is one fixed picture, drawn on a window 1920 by 919 CSS px (the
 * desktop it was designed on). Every window shows that picture scaled to
 * cover it and centred: the same pieces at the same places and sizes, cut by
 * the window's edges where the desktop cuts them, with a little more cropped
 * at the sides (a squarer window) or the top and bottom (a wider one). The
 * CSS side is --u in src/index.css, one design pixel in the current window.
 */
export const REFERENCE_WIDTH = 1920
export const REFERENCE_HEIGHT = 919

export type StageFrame = {
  /** One design px in window px. */
  scale: number
  /** Window position of the picture's top left corner: negative along an axis the window crops. */
  left: number
  top: number
}

/** Where the design picture lies in a window. Pure, for tests; defaults to this window. */
export function stageFrame(
  width: number = window.innerWidth,
  height: number = window.innerHeight,
): StageFrame {
  const scale = Math.max(width / REFERENCE_WIDTH, height / REFERENCE_HEIGHT)
  return {
    scale,
    left: (width - REFERENCE_WIDTH * scale) / 2,
    top: (height - REFERENCE_HEIGHT * scale) / 2,
  }
}

/** How big the board is in this window compared with the one it was drawn on (1 on the 1920 by 919 desktop). */
export function boardScale(width?: number, height?: number): number {
  return stageFrame(width, height).scale
}

/**
 * Where the typed sheet is the whole site: no view switch, and a line
 * saying the board is worth a bigger screen. That is any viewport narrower
 * than a laptop's (the smallest common laptop is 1366 wide), and any touch
 * device whatever its width, since an iPad Pro held sideways is as wide as
 * that laptop but has no hover for the torch and the tooltips. From a
 * laptop up, with a mouse or trackpad, the visitor can switch between the
 * two views.
 */
export const SHEET_ONLY_QUERY = '(max-width: 1279px), (hover: none) and (pointer: coarse)'

/** True on a viewport that gets the sheet alone: phones, tablets, and windows narrower than a laptop. */
export function useSheetOnly(): boolean {
  return useMediaQuery(SHEET_ONLY_QUERY)
}
