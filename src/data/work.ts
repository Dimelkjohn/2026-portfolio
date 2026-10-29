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
  /** The case notes: two short sentences or so, leaving room for the link line under the tags. */
  summary: string
  /**
   * The stack, one line on the sheet, so five short names at most. These are
   * what a recruiter's eye lands on: lead with the strongest, best-known
   * tool, and leave out anything that would not impress on its own.
   */
  tags: string[]
  /**
   * Photographs for the file. Several play through in turn while the file is
   * at the front (held still under reduced motion); without any, the file
   * says so.
   */
  media?: EvidenceMedia[]
  /** Where the exhibit lives. Without one the file shows the link line sealed. */
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
      'An iPhone accountability coach: you set the training and nutrition standard, it grades each day S to F against it. Three bad days put you on the Bench for a week. Built alone, live on the App Store.',
    tags: ['React Native', 'TypeScript', 'Supabase', 'Claude API', 'Expo'],
    media: [
      {
        src: '/evidence/work-obsessed.webp',
        alt: 'The Obsessed listing on the App Store: the icon, the name, and the first screenshots',
      },
    ],
    link: 'https://apps.apple.com/us/app/obsessed-accountability-coach/id6793333821',
  },
  {
    id: 'authentica',
    title: 'Authentica',
    tab: 'Authentica',
    kind: 'dashboard',
    year: '2023 to 2026',
    role: 'Frontend engineer, Chess Solutions',
    summary:
      'Deepfake detection for intelligence analysts at Chess Solutions: upload media, run a bench of detection plugins, read a report that leads with the verdict. I built the React front end and its reports.',
    tags: ['React', 'TypeScript', 'GraphQL', 'WebSockets'],
    media: [
      {
        src: '/evidence/work-authentica.webp',
        alt: 'An Authentica report: a video still, the summary assessment, a probability chart and motion-vector frames',
      },
    ],
    link: 'https://www.chessgrp.com/authentica',
  },
  {
    id: 'v2l',
    title: 'V2L',
    tab: 'V2L',
    kind: 'website',
    year: '2026',
    role: 'Design and build',
    summary:
      'The site of Visions 2 Life, a faith-driven film and photography collective, built as a desktop: films, music videos, stills and a verse of the day each in its own window, with a dock along the bottom.',
    tags: ['Next.js', 'React', 'UI design'],
    media: [
      {
        src: '/evidence/work-v2l.webp',
        alt: 'The V2L site as a macOS desktop: a Photos window of stills over editor windows, with a dock below',
      },
    ],
    link: 'https://v2lhive.com/',
  },
  {
    id: 'bumper-globe',
    title: 'Bumper Globe',
    tab: 'Bumper Globe',
    kind: 'website',
    year: '2023',
    role: 'Design and build',
    summary:
      'A redesign for a Baltimore collision centre with its own booking system: appointments saved to MongoDB, confirmed by email and cancellable, plus a staff login to see the list. Express and EJS.',
    tags: ['Node.js', 'Express', 'MongoDB', 'Passport', 'jQuery'],
    media: [
      {
        src: '/evidence/work-bumper-globe.webp',
        alt: 'The Bumper Globe homepage: technicians at a car bumper under the headline and a schedule-service button',
      },
    ],
    link: 'https://bumper-globe-website.onrender.com/',
  },
  {
    id: 'webfruit',
    title: 'Webfruit',
    tab: 'Webfruit',
    kind: 'website',
    year: '',
    role: 'Co-founder, design lead',
    summary:
      'A web studio I co-founded at college with a team of designers and developers, taking client sites on project by project. Customers followed their build on our portal; I led design and the CMS builds.',
    tags: ['Webflow', 'WordPress'],
    media: [
      {
        src: '/evidence/work-webfruit-1.webp',
        alt: 'The Webfruit homepage: the watermelon logo, the headline Ignite Your Brand, Get a Website, and an illustration',
      },
      {
        src: '/evidence/work-webfruit-2.webp',
        alt: 'The Webfruit client portal: a greeting beside a live preview of the client site being built',
      },
      {
        src: '/evidence/work-webfruit-3.webp',
        alt: 'A client site built by Webfruit: a police lodge homepage over an aerial view of the Capitol',
      },
      {
        src: '/evidence/work-webfruit-4.webp',
        alt: 'The same client site: its news page, a grid of posts with photographs',
      },
    ],
  },
  {
    id: 'old-portfolio',
    title: 'The previous portfolio',
    tab: 'Old Portfolio',
    kind: 'website',
    year: '2023 to 2026',
    role: 'Design and build',
    summary:
      "The old address. Lived in it, loved it, but you've got to grow: a new set of skills wants a new canvas to show them off on, so the yellow scribbles gave way to cork and torchlight.",
    tags: ['React', 'React Router', 'Material UI'],
    media: [
      {
        src: '/evidence/work-old-portfolio.webp',
        alt: 'The old dimelu.me: a scribbled-out name and a pixel headline on yellow paper, with glasses doodled around it',
      },
    ],
    // The old address will carry this board once it is published, so the exhibit
    // is the print itself: the one screenshot that survives of the old site.
    link: '/evidence/work-old-portfolio.webp',
  },
  {
    id: 'this-portfolio',
    title: 'This board',
    tab: 'This Portfolio',
    kind: 'website',
    year: '2026',
    role: 'Design and build',
    summary:
      "Time for a new portfolio, and I'd been deep in Dexter, Criminal Minds and L.A. Noire. The noir got the better of me, so here is a case board with me as the suspect. Hope you enjoyed the investigation.",
    tags: ['React 19', 'TypeScript', 'Vite', 'Tailwind', 'Web Audio'],
    media: [
      {
        src: '/evidence/work-this-board.webp',
        alt: 'The evidence board under torchlight: pinned photographs, notes and red thread on cork',
      },
    ],
  },
]
