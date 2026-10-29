import type { EvidenceMedia } from '@/types/evidence'

/** One print in the pile that comes out of the evidence bag. */
export type Photo = {
  id: string
  /** The picture: for a film, its still. Without one the print says a photograph is to follow. */
  media?: EvidenceMedia
  /** Typed along the print's bottom border: what it is, where, when. */
  caption?: string
  /**
   * A film: the YouTube id. The print carries the still until it reaches the
   * front of the pile, where the film itself plays in the frame.
   */
  video?: { youtube: string }
}

const print = (name: string): string => `/evidence/photos/${name}.webp`

/**
 * The moonlighting pile: design jobs, a single and its video, two film skits
 * and an animation, in the order the prints are stacked. Opened from the
 * pile of photographs in the evidence bag; the carousel remembers where it
 * was left. Sources sit in assets-src/evidence/photos (the designs from the
 * old dimelu.me, the stills from YouTube) and go through `npm run evidence`.
 */
export const moonlightingPhotos: Photo[] = [
  {
    id: 'design-1',
    media: { src: print('design-1'), alt: 'Cover art, square format' },
    caption: 'Cover art · Adobe Creative Suite',
  },
  {
    id: 'design-2',
    media: { src: print('design-2'), alt: 'Cover art, square format' },
    caption: 'Cover art · Adobe Creative Suite',
  },
  {
    id: 'design-5',
    media: { src: print('design-5'), alt: 'A flyer, portrait format' },
    caption: 'Flyer · Adobe Creative Suite',
  },
  {
    id: 'design-3',
    media: { src: print('design-3'), alt: 'Cover art, square format' },
    caption: 'Cover art · Adobe Creative Suite',
  },
  {
    id: 'design-4',
    media: { src: print('design-4'), alt: 'Cover art, square format' },
    caption: 'Cover art · Adobe Creative Suite',
  },
  {
    id: 'music-was-a-good-day',
    media: { src: print('yt-ZPWtfxaj3Yc'), alt: 'Still from the music video for Was a Good Day' },
    caption: '“Was a Good Day” · debut single and music video',
    video: { youtube: 'ZPWtfxaj3Yc' },
  },
  {
    id: 'film-skit-1',
    media: { src: print('yt-AzMlU86AP-s'), alt: 'Still from a short film skit' },
    caption: 'Skit for an album promotion · written and directed',
    video: { youtube: 'AzMlU86AP-s' },
  },
  {
    id: 'film-skit-2',
    media: { src: print('yt-DVcO-mRHDCw'), alt: 'Still from a second short film skit' },
    caption: 'Skit for an album promotion · written and directed',
    video: { youtube: 'DVcO-mRHDCw' },
  },
  {
    id: 'animation',
    media: { src: print('yt-j7XBMVEvy7g'), alt: 'Still from an animated short' },
    caption: 'Animated short · drawn and voiced',
    video: { youtube: 'j7XBMVEvy7g' },
  },
  {
    id: 'public-worship',
    media: {
      src: print('public-worship'),
      alt: 'Public Worship 2025 poster: red PW letters over a collage of city landmarks and raised hands, with a list of New York dates',
    },
    caption: 'Public Worship 2025 · campaign poster and dates',
  },
  {
    id: 'obsessed-sketch-to-screen',
    media: {
      src: print('obsessed-sketch-to-screen'),
      alt: 'Three hand-drawn phone sketches above the three finished Obsessed screens they became',
    },
    caption: 'Obsessed · lo-fi sketches to hi-fi screens',
  },
  {
    id: 'essessment-design',
    media: {
      src: print('essessment-design'),
      alt: 'eSSESSMENT interface: a multi-channel chart over an interview, and a camera calibration dialog',
    },
    caption: 'eSSESSMENT · interview and camera calibration screens, Chess Solutions',
  },
  {
    id: 'presage-site-design',
    media: {
      src: print('presage-site-design'),
      alt: 'A full-page design for the Presage Technologies website: hero, feature list and a free-trial plan',
    },
    caption: 'Presage Technologies · website design',
  },
  {
    id: 'onecard-screens',
    media: {
      src: print('onecard-screens'),
      alt: 'Six OneCard app screens in dark mode: an empty state, active cards, creating a card, an invite and a card in use',
    },
    caption: 'OneCard · app screens, a shared card for group spending',
  },
]
