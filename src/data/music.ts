/** Background music. Tracks alternate for as long as the page is open. */
export type MusicTrack = {
  title: string
  artist: string
  url: string
}

export const MUSIC_TRACKS: readonly MusicTrack[] = [
  {
    title: 'This Cheese Is Mine',
    artist: 'Etienne Roussel',
    url: `${import.meta.env.BASE_URL}audio/this-cheese-is-mine.mp3`,
  },
  {
    title: 'Miss Negroni',
    artist: 'Sugoi',
    url: `${import.meta.env.BASE_URL}audio/miss-negroni.mp3`,
  },
]
