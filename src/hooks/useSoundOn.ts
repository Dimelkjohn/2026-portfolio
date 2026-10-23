import { useSyncExternalStore } from 'react'
import { soundPreferences, type SoundId } from '@/audio/preferences'

/** Whether a sound is switched on, as a React value that follows the switch. */
export function useSoundOn(id: SoundId): boolean {
  return useSyncExternalStore(
    soundPreferences.subscribe,
    () => soundPreferences.isOn(id),
    () => soundPreferences.isOn(id),
  )
}
