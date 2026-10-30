import type { CSSProperties } from 'react'
import { EvidenceItem } from '@/components/evidence/EvidenceItem'
import { Fastener } from '@/components/evidence/Fastener'
import { boardData } from '@/data/board'
import { contactLinks, RESUME_URL } from '@/data/contact'
import { moonlightingPhotos } from '@/data/photos'
import { selectedWork } from '@/data/work'
import { ViewToggle } from './ViewToggle'
import './simplified.css'

type Posting = { role: string; years: string; employer: string }

/** The roles in full: the receipt abbreviates them to fit its till paper, the sheet has room. */
const FULL_ROLES: Record<string, string> = {
  FOUNDER: 'Founder & Lead Software Engineer',
  ENGINEER: 'Frontend Engineer',
  INTERN: 'Full Stack Software Engineering Intern',
}

/**
 * The service record on the board, read as a list: its lines come in pairs,
 * a role with its years, then the employer, down to the rule.
 */
function postings(): Posting[] {
  const record = boardData.items.find((item) => item.id === 'service-record')
  const lines = (record?.body ?? '').split('\n')
  const out: Posting[] = []
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const line = lines[i]!
    if (line.startsWith('---')) break
    const match = line.trim().match(/^(\S+)\s+(\S+)$/)
    if (!match) continue
    out.push({
      role: FULL_ROLES[match[1]!] ?? title(match[1]!),
      years: match[2]!,
      employer: title(lines[i + 1]!.trim()),
    })
  }
  return out
}

/** The torn sheet from the board's centre, asking the question: the same piece, pinned to this page. */
const hub = boardData.items.find((item) => item.id === 'hub')

/**
 * Loose threads off the sheet's pin, running off the paper's edges: where
 * they go to is the board's business. They fan out upward and sideways from
 * the pin, each drooping by its own amount, never so far that the droop
 * crosses the "who is" written under the pin. Laid out once from a fixed
 * seed, so the sheet looks the same on every visit.
 */
type LooseThread = { x: number; y: number; dip: number; swing: number }

const THREAD_COUNT = 14
/** How far below the pin a thread may hang, in px: the "who is" sits just under this. */
const DROOP_LIMIT = 50
/** Where the pin goes through the sheet, percent of its height: a little lower than on the board. */
const PIN_Y = 9
/** How far either side of the pin the paper reaches, in px: past that a thread is cut off anyway. */
const PAPER_HALF = 340
const REACH = 1600

/**
 * A thread's curve: it leaves the pin hanging down and swings out before it
 * rises away, so the slack shows as a U near the pin. A cubic from the pin
 * to the far end, the first handle below the pin a short way out, the second
 * halfway along and a little low.
 */
const handles = ({ x, y, dip, swing }: LooseThread) => ({
  x1: x * swing,
  y1: dip * 1.8,
  x2: x * 0.55,
  y2: y * 0.5 + dip,
})

/**
 * Where a thread starts, in px from the pin's centre: just inside the rim of
 * the pin head (drawn 22px wide on the sheet, so a head of radius 7), so the
 * threads tuck under it instead of knotting at its centre.
 */
const THREAD_START = 6

const loosePath = (t: LooseThread) => {
  const h = handles(t)
  // Set off along the line to the first handle, so the start sits under the head.
  const len = Math.hypot(h.x1, h.y1) || 1
  const sx = (h.x1 / len) * THREAD_START
  const sy = (h.y1 / len) * THREAD_START
  return `M ${sx.toFixed(1)} ${sy.toFixed(1)} C ${h.x1} ${h.y1} ${h.x2} ${h.y2} ${t.x} ${t.y}`
}

/** The lowest point, in px below the pin, of the part of a thread's curve that is on the paper. */
function lowest(thread: LooseThread): number {
  const h = handles(thread)
  let low = 0
  for (let i = 0; i <= 60; i++) {
    const t = i / 60
    // The pin's own term is zero: the curve starts at the origin.
    const b = 3 * (1 - t) ** 2 * t
    const c = 3 * (1 - t) * t * t
    const d = t ** 3
    const x = b * h.x1 + c * h.x2 + d * thread.x
    if (Math.abs(x) > PAPER_HALF) break
    low = Math.max(low, b * h.y1 + c * h.y2 + d * thread.y)
  }
  return low
}

function looseThreads(): LooseThread[] {
  // A small seeded generator, so the lay of the threads is fixed.
  let state = 0x9e3779b9
  const random = () => {
    state = (state + 0x6d2b79f5) | 0
    let z = Math.imul(state ^ (state >>> 15), 1 | state)
    z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296
  }
  const threads: LooseThread[] = []
  for (let i = 0; i < THREAD_COUNT; i++) {
    // Spread round the upper half, a shade past horizontal either side, with some jitter.
    const angle = Math.PI * (-1.04 + (1.08 * (i + 0.2 + 0.6 * random())) / THREAD_COUNT)
    const reach = REACH * (0.7 + 0.6 * random())
    // The outer threads, the ones heading out sideways, hang loose; the inner ones, heading up, stay taut.
    const outer = Math.abs(Math.cos(angle)) ** 1.5
    const thread: LooseThread = {
      x: Math.round(Math.cos(angle) * reach),
      y: Math.round(Math.sin(angle) * reach),
      // From barely slack to a full hang, swinging out a little or a long way before it rises.
      dip: Math.round((10 + 70 * random()) * (0.12 + 0.88 * outer)),
      swing: 0.1 + 0.3 * random(),
    }
    if (i === 0) {
      // The outermost thread on the left was never tied off properly: it hangs right down
      // past the sheet's corner, then climbs steeply away up and to the left.
      thread.x = -1400
      thread.y = -1000
      thread.dip = 170
      thread.swing = 0.5
    } else {
      // Take up slack until the droop clears the writing.
      while (thread.dip > 0 && lowest(thread) > DROOP_LIMIT) thread.dip -= 2
    }
    threads.push(thread)
  }
  return threads
}

const LOOSE_THREADS = looseThreads()

/** The creative list's bullet: one of the board's red pin heads before each piece. */
function PinBullet() {
  return (
    <span className="simplified__bullet" aria-hidden="true">
      <Fastener fastener={{ kind: 'pin', color: 'red' }} seed="" />
    </span>
  )
}

const title = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase())

/**
 * The simplified view: everything the board says, as one plain typed sheet
 * with no torch, no pins and nothing to find. Who John is, where he has
 * worked, the selected work, the moonlighting, and how to reach him.
 */
type SimplifiedViewProps = {
  /** The sheet is the whole site (a viewport too narrow for the board): no view switch, and a word about the board. */
  sole?: boolean
}

export function SimplifiedView({ sole = false }: SimplifiedViewProps) {
  return (
    <main className="simplified">
      {sole ? (
        <p className="simplified__notice">
          This looks a whole lot cooler on a bigger screen. Promise ;)
        </p>
      ) : (
        <ViewToggle place="sheet" />
      )}
      <article className="simplified__sheet">
        <img
          className="simplified__hero"
          src="/evidence/simplified-hero.webp"
          alt="A corner of the evidence board: photographs of John pinned among handwritten notes and red thread"
          draggable={false}
        />
        {hub && (
          <div
            className="simplified__hub"
            style={{ '--pin-y': `${PIN_Y}%` } as CSSProperties}
            aria-hidden="true"
          >
            <EvidenceItem
              item={{
                ...hub,
                placement: { x: 0, y: 0, width: 100, rotate: -3 },
                fastener: { kind: 'none' },
              }}
            />
            {/* The thread over the paper, and the pin over the thread: so the pin is drawn apart. */}
            <svg className="simplified__threads">
              {LOOSE_THREADS.map((t) => (
                <g key={`${t.x},${t.y}`}>
                  <path className="simplified__thread-shadow" d={loosePath(t)} />
                  <path className="simplified__thread" d={loosePath(t)} />
                </g>
              ))}
            </svg>
            <div className="simplified__pin">
              <Fastener fastener={{ kind: 'pin', color: 'red', y: PIN_Y }} seed="simplified-hub" />
            </div>
          </div>
        )}
        <header className="simplified__head">
          <p className="simplified__eyebrow">Case summary</p>
          <h1 className="sr-only">who is John Dimelu</h1>
          <p className="simplified__tagline">
            Full-Stack Product Engineer <span aria-hidden="true">·</span> Design Systems{' '}
            <span aria-hidden="true">·</span> AI
          </p>
          <p className="simplified__lede">
            Full-stack engineer with five years of experience shipping web and mobile products end
            to end, from design system to database to production. Fluent in TypeScript, React, React
            Native, Node.js, PostgreSQL and Python, with hands-on work on backend APIs, payments,
            scheduled workflows and real-time data. Turns product requirements into scalable
            services and fast, responsive interfaces, owning features end to end and working
            directly with customers and stakeholders to ship practical solutions.
          </p>
          <p className="simplified__resume">
            <a className="simplified__link" href={RESUME_URL} target="_blank" rel="noreferrer">
              Download the résumé (PDF)
            </a>
          </p>
        </header>

        <section className="simplified__section" aria-labelledby="simplified-employment">
          <h2 id="simplified-employment" className="simplified__heading">
            Known employment
          </h2>
          <ul className="simplified__list">
            {postings().map((p) => (
              <li key={p.employer} className="simplified__posting">
                <span className="simplified__role">{p.role}</span>
                <span className="simplified__employer">{p.employer}</span>
                <span className="simplified__years">{p.years}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="simplified__section" aria-labelledby="simplified-work">
          <h2 id="simplified-work" className="simplified__heading">
            Selected work
          </h2>
          <ol className="simplified__list">
            {selectedWork.map((work) => (
              <li key={work.id} className="simplified__work">
                <h3 className="simplified__work-title">{work.title}</h3>
                {(work.year || work.role) && (
                  <p className="simplified__meta">
                    {[work.year, work.role].filter(Boolean).join(' · ')}
                  </p>
                )}
                <p className="simplified__summary">{work.summary}</p>
                {work.tags.length > 0 && (
                  <p className="simplified__tags">{work.tags.join(' · ')}</p>
                )}
                {work.link && (
                  <a className="simplified__link" href={work.link} target="_blank" rel="noreferrer">
                    Open the exhibit
                  </a>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section className="simplified__section" aria-labelledby="simplified-moonlighting">
          <h2 id="simplified-moonlighting" className="simplified__heading">
            Creative work: design and film
          </h2>
          <ul className="simplified__list simplified__list--tight">
            {moonlightingPhotos.map((photo) => {
              const href = photo.video
                ? `https://www.youtube.com/watch?v=${photo.video.youtube}`
                : photo.media?.src
              const text = photo.caption ?? photo.media?.alt ?? 'Photograph to follow'
              return (
                <li key={photo.id} className="simplified__pinned">
                  <PinBullet />
                  {href ? (
                    <a className="simplified__link" href={href} target="_blank" rel="noreferrer">
                      {text}
                    </a>
                  ) : (
                    text
                  )}
                  {photo.video && <span className="simplified__note"> (film)</span>}
                </li>
              )
            })}
          </ul>
        </section>

        <section className="simplified__section" aria-labelledby="simplified-contact">
          <h2 id="simplified-contact" className="simplified__heading">
            Make contact
          </h2>
          <ul className="simplified__list simplified__list--tight">
            {contactLinks.map((link) => (
              <li key={link.id}>
                <span className="simplified__channel">{link.channel}</span>
                <a
                  className="simplified__link"
                  href={link.href}
                  target={link.href.startsWith('mailto:') ? undefined : '_blank'}
                  rel={link.href.startsWith('mailto:') ? undefined : 'noreferrer'}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </article>
    </main>
  )
}
