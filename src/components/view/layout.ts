import { useMediaQuery } from '@/hooks/useMediaQuery'

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
