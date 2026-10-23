import { useEffect } from 'react'
import { createMusic } from '@/audio/music'
import { MUSIC_TRACKS, type MusicTrack } from '@/data/music'

type MusicProps = {
  /** Tracks to alternate between. Defaults to the site's playlist. */
  tracks?: readonly MusicTrack[]
}

/**
 * Plays the background music for as long as it is mounted. Renders nothing;
 * the on/off switch lives in SoundControls and drives the music bus.
 */
export function Music({ tracks = MUSIC_TRACKS }: MusicProps) {
  useEffect(() => {
    const music = createMusic({ tracks })
    void music.start()
    return () => music.stop()
  }, [tracks])

  return null
}
