import { useSyncExternalStore } from 'react'
import { soundPreferences, type SoundId } from '@/audio/preferences'

/** Whether a sound's own switch is on, as a React value that follows the switch. */
export function useSoundOn(id: SoundId): boolean {
  return useSyncExternalStore(
    soundPreferences.subscribe,
    () => soundPreferences.isOn(id),
    () => soundPreferences.isOn(id),
  )
}

/** Whether the master switch is on. */
export function useMasterSoundOn(): boolean {
  return useSyncExternalStore(
    soundPreferences.subscribe,
    () => soundPreferences.isMasterOn(),
    () => soundPreferences.isMasterOn(),
  )
}
