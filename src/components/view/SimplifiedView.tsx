import { boardData } from '@/data/board'
import { contactLinks } from '@/data/contact'
import { moonlightingPhotos } from '@/data/photos'
import { selectedWork } from '@/data/work'
import { ViewToggle } from './ViewToggle'
import './simplified.css'

type Posting = { role: string; years: string; employer: string }

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
    out.push({ role: title(match[1]!), years: match[2]!, employer: title(lines[i + 1]!.trim()) })
  }
  return out
}

const title = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase())

/**
 * The simplified view: everything the board says, as one plain typed sheet
 * with no torch, no pins and nothing to find. Who John is, where he has
 * worked, the selected work, the moonlighting, and how to reach him.
 */
export function SimplifiedView() {
  return (
    <main className="simplified">
      <ViewToggle place="sheet" />
      <article className="simplified__sheet">
        <header className="simplified__head">
          <p className="simplified__eyebrow">Case summary</p>
          <h1 className="simplified__title">Who is John Dimelu</h1>
          <p className="simplified__lede">
            Front-end engineer by day, all-out creative by night. This is the board as a plain
            sheet: the same facts, nothing hidden in the dark.
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
                {work.link ? (
                  <a className="simplified__link" href={work.link} target="_blank" rel="noreferrer">
                    Open the exhibit
                  </a>
                ) : (
                  <p className="simplified__sealed">Sealed: no public address</p>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section className="simplified__section" aria-labelledby="simplified-moonlighting">
          <h2 id="simplified-moonlighting" className="simplified__heading">
            Moonlighting
          </h2>
          <ul className="simplified__list simplified__list--tight">
            {moonlightingPhotos.map((photo) => {
              const href = photo.video
                ? `https://www.youtube.com/watch?v=${photo.video.youtube}`
                : photo.media?.src
              const text = photo.caption ?? photo.media?.alt ?? 'Photograph to follow'
              return (
                <li key={photo.id}>
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
