import type { EvidenceMedia } from '@/types/evidence'

/** One exhibit in the selected-work carousel. */
export type Work = {
  id: string
  title: string
  /** Short name on the folder tab: 'Exhibit 01: Obsessed App'. */
  tab: string
  /** What sort of thing it is. */
  kind: 'iOS app' | 'website' | 'dashboard' | 'tool' | 'video' | 'design'
  year: string
  role: string
  summary: string
  tags: string[]
  /** A photograph for the file; without one the file says so. */
  media?: EvidenceMedia
  link?: string
}

/**
 * Selected work, in the order the files are stacked. Opened from any press
 * cutting on the board; the carousel remembers where it was left.
 */
export const selectedWork: Work[] = [
  {
    id: 'obsessed',
    title: 'Obsessed',
    tab: 'Obsessed App',
    kind: 'iOS app',
    year: '2026',
    role: 'Founder, lead engineer',
    summary:
      'An accountability-first fitness app, live on the App Store and built end to end: Expo, React Native and TypeScript on a documented design system; a Supabase backend whose lockouts are enforced in the database; a grading engine that settles each day at local midnight; RevenueCat payments and gated production releases.',
    tags: ['React Native', 'Expo', 'TypeScript', 'Supabase', 'RevenueCat'],
  },
  {
    id: 'obsessed-site',
    title: 'Obsessed, the website',
    tab: 'Obsessed Website',
    kind: 'website',
    year: '2026',
    role: 'Design and build',
    summary: 'The public face of the app: the pitch, the loop, the download.',
    tags: ['React', 'TypeScript'],
  },
  {
    id: 'chess-dashboard',
    title: 'Chess Dashboard',
    tab: 'Chess Dashboard',
    kind: 'dashboard',
    year: '2023 to 2025',
    role: 'Software engineer, Chess Solutions',
    summary:
      'A real-time React dashboard for high-frequency polygraph data streams. WebSocket updates batched and normalised before render, memoised and selectively subscribed so it stays quick under load, GraphQL behind it, and a reusable component architecture under it.',
    tags: ['React', 'TypeScript', 'WebSockets', 'GraphQL'],
  },
  {
    id: 'bumper-globe',
    title: 'Bumper Globe',
    tab: 'Bumper Globe',
    kind: 'tool',
    year: '',
    role: '',
    summary: 'Case notes to follow.',
    tags: [],
  },
  {
    id: 'old-portfolio',
    title: 'The previous portfolio',
    tab: 'Old Portfolio',
    kind: 'video',
    year: '2024',
    role: 'Design and build',
    summary: 'The last known address, on film: dimelu.me before the board went up.',
    tags: ['React'],
    link: 'https://dimelu.me/',
  },
  {
    id: 'this-portfolio',
    title: 'This board',
    tab: 'This Portfolio',
    kind: 'website',
    year: '2026',
    role: 'Design and build',
    summary:
      'The evidence board you are looking at: cork, torchlight, red thread, and a sound engine with one AudioContext. React 19, TypeScript, Vite and Tailwind, with an image pipeline that tears, tints and creases every piece of paper.',
    tags: ['React 19', 'TypeScript', 'Vite', 'Tailwind', 'Web Audio'],
  },
  {
    id: 'mypicasso',
    title: 'MyPicasso',
    tab: 'MyPicasso',
    kind: 'tool',
    year: '',
    role: '',
    summary: 'Case notes to follow.',
    tags: [],
  },
  {
    id: 'repo-surfer',
    title: 'Repo Surfer',
    tab: 'Repo Surfer',
    kind: 'tool',
    year: '',
    role: '',
    summary: 'Case notes to follow.',
    tags: [],
  },
]
