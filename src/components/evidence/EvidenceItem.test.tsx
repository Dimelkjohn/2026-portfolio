import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { EvidenceItem as EvidenceItemData } from '@/types/evidence'
import { EvidenceItem } from './EvidenceItem'

const postit: EvidenceItemData = {
  id: 'q',
  kind: 'postit',
  placement: { x: 40, y: 35, width: 12, rotate: 3, z: 7 },
  text: 'Who is John Dimelu?',
  funFact: 'Follow the thread.',
}

describe('EvidenceItem', () => {
  it('positions the item from its placement', () => {
    render(<EvidenceItem item={postit} />)
    const item = screen.getByRole('article', { name: 'Who is John Dimelu?' })
    expect(item.style.getPropertyValue('--x')).toBe('40%')
    expect(item.style.getPropertyValue('--y')).toBe('35%')
    expect(item.style.getPropertyValue('--w')).toBe('12%')
    expect(item.style.getPropertyValue('--rotate')).toBe('3deg')
    expect(item.style.getPropertyValue('--z')).toBe('7')
  })

  it('exposes the fun fact as a tooltip describing a focusable paper', () => {
    render(<EvidenceItem item={postit} />)
    const paper = screen.getByRole('button', { name: 'Who is John Dimelu?' })
    // Hidden until hover or focus, so the query has to include hidden elements.
    expect(screen.getByRole('tooltip', { hidden: true })).toHaveTextContent('Follow the thread.')
    expect(paper).toHaveAccessibleDescription('Follow the thread.')
  })

  it('is plain paper, not focusable, without a fun fact or gallery', () => {
    render(<EvidenceItem item={{ ...postit, funFact: undefined }} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('renders a clipping with its headline and body', () => {
    render(
      <EvidenceItem
        item={{
          id: 'c',
          kind: 'clipping',
          placement: { x: 0, y: 0 },
          text: 'Local man rebuilds portfolio',
          body: 'Witnesses describe a quiet engineer.',
        }}
      />,
    )
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/rebuilds portfolio/)
    expect(screen.getByText(/quiet engineer/)).toBeInTheDocument()
  })

  it('prints a dateline instead of the masthead on an inside-page cutting', () => {
    const { container } = render(
      <EvidenceItem
        item={{
          id: 'c',
          kind: 'clipping',
          placement: { x: 0, y: 0 },
          dateline: 'The Daily · Metro · 2022',
          text: 'Intern leaves codebase cleaner',
        }}
      />,
    )
    expect(screen.getByText('The Daily · Metro · 2022')).toBeInTheDocument()
    expect(container.querySelector('.evidence__masthead')).toBeNull()
  })

  it('prints the headline on a scanned cutting instead of drawing the paper', () => {
    const { container } = render(
      <EvidenceItem
        item={{
          id: 'c',
          kind: 'clipping',
          placement: { x: 0, y: 0 },
          media: { src: '/evidence/news-wide.png', alt: 'Torn newspaper cutting' },
          dateline: 'The Daily · Metro · 2022',
          text: 'Intern leaves codebase cleaner',
        }}
      />,
    )
    expect(screen.getByRole('img', { name: 'Torn newspaper cutting' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Intern leaves codebase cleaner' }),
    ).toBeInTheDocument()
    expect(container.querySelector('.evidence__masthead')).toBeNull()
    expect(container.querySelector('.evidence__column')).toBeNull()
  })

  it('tears each clipping to its own outline and marks a worn one', () => {
    const clip = (id: string, worn?: boolean) => (
      <EvidenceItem
        item={{ id, kind: 'clipping', placement: { x: 0, y: 0 }, text: 'Headline', worn }}
      />
    )
    const a = render(clip('clip-a')).container.querySelector<HTMLElement>('.evidence')!
    const b = render(clip('clip-b', true)).container.querySelector<HTMLElement>('.evidence')!
    expect(a.style.getPropertyValue('--torn')).toMatch(/^polygon\(/)
    expect(a.style.getPropertyValue('--torn')).not.toBe(b.style.getPropertyValue('--torn'))
    expect(a).not.toHaveClass('evidence--worn')
    expect(b).toHaveClass('evidence--worn')
  })

  it('holds the paper with a red pin by default', () => {
    const { container } = render(<EvidenceItem item={postit} />)
    const pin = container.querySelector<SVGElement>('.evidence__pin')
    expect(pin).toHaveAttribute('data-color', 'red')
    expect(pin).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('.evidence__tape')).toBeNull()
  })

  it('renders the chosen pin colour and position', () => {
    const { container } = render(
      <EvidenceItem item={{ ...postit, fastener: { kind: 'pin', color: 'yellow', x: 20 } }} />,
    )
    const pin = container.querySelector<SVGElement>('.evidence__pin')
    expect(pin).toHaveAttribute('data-color', 'yellow')
    expect(pin?.style.getPropertyValue('--pin-x')).toBe('20%')
  })

  it('renders tape strips, two for diagonal corners, and the same strips every render', () => {
    const item = { ...postit, fastener: { kind: 'tape' as const, corners: 'diagonal' as const } }
    const first = render(<EvidenceItem item={item} />)
    const strips = first.container.querySelectorAll<HTMLImageElement>('.evidence__tape')
    expect(strips).toHaveLength(2)
    const sources = [...strips].map((s) => s.src)
    first.unmount()
    const second = render(<EvidenceItem item={item} />)
    const again = [...second.container.querySelectorAll<HTMLImageElement>('.evidence__tape')]
    expect(again.map((s) => s.src)).toEqual(sources)
    expect(second.container.querySelector('.evidence__pin')).toBeNull()
  })

  it('writes a headline in marker under the lead-in on a titled note', () => {
    render(
      <EvidenceItem
        item={{
          id: 'hub',
          kind: 'note',
          placement: { x: 40, y: 40 },
          media: { src: '/evidence/note-lined-torn.webp', alt: 'Torn lined sheet' },
          text: 'who is',
          headline: 'John Dimelu',
        }}
      />,
    )
    expect(screen.getByText('who is')).toHaveClass('evidence__scrawl--titled')
    expect(screen.getByText('John')).toHaveClass('evidence__marker-word')
    expect(screen.getByText('Dimelu').parentElement).toHaveClass('evidence__marker')
  })

  it('renders an ink print on a fingerprint card when media is given', () => {
    render(
      <EvidenceItem
        item={{
          id: 'f',
          kind: 'fingerprint',
          placement: { x: 0, y: 0 },
          media: { src: '/evidence/handprint.png', alt: 'Full handprint' },
          text: 'LEFT HAND',
        }}
      />,
    )
    expect(screen.getByRole('img', { name: 'Full handprint' })).toBeInTheDocument()
    expect(screen.getByText('LEFT HAND')).toBeInTheDocument()
  })

  it('shows lab tags only on the lifted copy', () => {
    const labelled = {
      ...postit,
      funFact: undefined,
      labels: [{ x: 10, y: 20, text: 'Steady hand' }],
    }
    const flat = render(<EvidenceItem item={labelled} />)
    expect(flat.queryByRole('list', { name: 'Findings' })).not.toBeInTheDocument()
    flat.unmount()
    render(<EvidenceItem item={labelled} lift={{ dx: 0, dy: 0, scale: 2, entered: true }} />)
    const tag = screen.getByRole('listitem')
    expect(tag).toHaveTextContent('Steady hand')
    expect(tag.style.getPropertyValue('--lx')).toBe('10%')
    expect(tag).toHaveClass('evidence__label--above')
  })

  it('renders a photo with its image when media is given', () => {
    render(
      <EvidenceItem
        item={{
          id: 'p',
          kind: 'polaroid',
          placement: { x: 0, y: 0 },
          media: { src: '/photos/beach.jpg', alt: 'John at the beach' },
          text: 'Low tide',
        }}
      />,
    )
    expect(screen.getByRole('img', { name: 'John at the beach' })).toHaveAttribute(
      'src',
      '/photos/beach.jpg',
    )
    expect(screen.getByRole('article', { name: 'John at the beach' })).toBeInTheDocument()
  })
})
