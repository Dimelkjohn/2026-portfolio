import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { EvidenceItem } from '@/types/evidence'
import { boardData } from '@/data/board'
import { selectedWork } from '@/data/work'
import { clues } from '@/components/clues/clues'
import { stageFrame } from '@/components/view/layout'
import { EvidenceLayer, liftFor } from './EvidenceLayer'

const items: EvidenceItem[] = [
  { id: 'a', kind: 'postit', placement: { x: 10, y: 10 }, text: 'First' },
  { id: 'b', kind: 'receipt', placement: { x: 50, y: 50 }, text: 'Second' },
  {
    id: 'n',
    kind: 'note',
    placement: { x: 20, y: 60, width: 7, rotate: 4 },
    media: { src: '/evidence/note-blue.png', alt: 'Crumpled blue note' },
    text: 'night owl.',
  },
]

describe('EvidenceLayer', () => {
  it('pins every item it is given', () => {
    render(<EvidenceLayer items={items} />)
    expect(screen.getAllByRole('article')).toHaveLength(3)
  })

  it('renders the board data by default', () => {
    render(<EvidenceLayer />)
    expect(screen.queryAllByRole('article')).toHaveLength(boardData.items.length)
  })

  it('ties every pinned item on the board to at least one thread', () => {
    const tied = new Set(boardData.threads.flatMap((t) => [t.from, t.to]))
    const pinned = boardData.items.filter(
      (item) => (item.fastener ?? { kind: 'pin' }).kind === 'pin',
    )
    const loose = pinned.filter((item) => !tied.has(item.id)).map((item) => item.id)
    expect(loose).toEqual([])
  })

  it('only ties items that exist', () => {
    const ids = new Set(boardData.items.map((item) => item.id))
    const unknown = boardData.threads.flatMap((t) => [t.from, t.to]).filter((id) => !ids.has(id))
    expect(unknown).toEqual([])
  })

  it('board data ids are unique so each tooltip describes its own item', () => {
    const ids = boardData.items.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('makes notes and labelled paper clickable, and leaves the rest plain', () => {
    const labelled: EvidenceItem = {
      id: 'h',
      kind: 'fingerprint',
      placement: { x: 0, y: 0 },
      media: { src: '/evidence/handprint.png', alt: 'Handprint' },
      title: 'Core strengths',
      labels: [{ x: 50, y: 10, text: 'Steady hand' }],
    }
    const plain: EvidenceItem = {
      id: 'q',
      kind: 'note',
      clickable: false,
      placement: { x: 0, y: 0 },
      media: { src: '/evidence/note-orange.png', alt: 'Orange note' },
      headline: '?',
    }
    render(<EvidenceLayer items={[...items, labelled, plain]} />)
    expect(screen.getByRole('button', { name: 'Crumpled blue note' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Handprint' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Orange note' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'First' })).not.toBeInTheDocument()
  })

  it('names the lifted view after the item title and shows it as a heading', async () => {
    const user = userEvent.setup()
    const labelled: EvidenceItem = {
      id: 'h',
      kind: 'fingerprint',
      placement: { x: 0, y: 0 },
      media: { src: '/evidence/handprint.png', alt: 'Handprint' },
      title: 'Core strengths',
      labels: [{ x: 50, y: 10, text: 'Steady hand' }],
    }
    render(<EvidenceLayer items={[labelled]} />)
    await user.click(screen.getByRole('button', { name: 'Handprint' }))
    const dialog = screen.getByRole('dialog', { name: 'Core strengths' })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Core strengths' })).toBeInTheDocument()
  })

  it('counts a piece as a clue the first time it is opened, whatever it opens', async () => {
    clues.reset()
    const user = userEvent.setup()
    const pieces: EvidenceItem[] = [
      { id: 'c1', kind: 'clipping', placement: { x: 0, y: 0 }, text: 'A cutting', opens: 'work' },
      { id: 'n1', kind: 'note', placement: { x: 50, y: 0 }, text: 'A note' },
    ]
    render(<EvidenceLayer items={pieces} threads={[]} />)
    await user.click(screen.getByRole('button', { name: 'A cutting' }))
    expect(clues.count()).toBe(1)
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await user.click(screen.getByRole('button', { name: 'A cutting' }))
    expect(clues.count()).toBe(1)
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await user.click(screen.getByRole('button', { name: 'A note' }))
    expect(clues.count()).toBe(2)
    clues.reset()
  })

  it('opens the carousel on the file a cutting names, and elsewhere where it was left', async () => {
    const user = userEvent.setup()
    const second = selectedWork[1]!
    const clips: EvidenceItem[] = [
      {
        id: 'c1',
        kind: 'clipping',
        placement: { x: 0, y: 0 },
        text: 'Named cutting',
        opens: 'work',
        opensAt: second.id,
      },
      {
        id: 'c2',
        kind: 'clipping',
        placement: { x: 50, y: 0 },
        text: 'Plain cutting',
        opens: 'work',
      },
    ]
    render(<EvidenceLayer items={clips} threads={[]} />)
    await user.click(screen.getByRole('button', { name: 'Named cutting' }))
    expect(screen.getByRole('heading', { name: second.title })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next exhibit' }))
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    // The plain cutting picks up where the pile was left: the third file.
    await user.click(screen.getByRole('button', { name: 'Plain cutting' }))
    expect(screen.getByRole('heading', { name: selectedWork[2]!.title })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    // The named cutting always goes back to its own file.
    await user.click(screen.getByRole('button', { name: 'Named cutting' }))
    expect(screen.getByRole('heading', { name: second.title })).toBeInTheDocument()
  })

  it('opens one shared selected-work carousel from any clipping, keeping its place', async () => {
    const user = userEvent.setup()
    const clips: EvidenceItem[] = [
      {
        id: 'c1',
        kind: 'clipping',
        placement: { x: 0, y: 0 },
        text: 'First cutting',
        opens: 'work',
      },
      {
        id: 'c2',
        kind: 'clipping',
        placement: { x: 50, y: 0 },
        text: 'Second cutting',
        opens: 'work',
      },
    ]
    render(<EvidenceLayer items={clips} threads={[]} />)
    await user.click(screen.getByRole('button', { name: 'First cutting' }))
    const dialog = screen.getByRole('dialog', { name: 'Selected work' })
    expect(dialog).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next exhibit' }))
    await user.click(screen.getByRole('button', { name: 'Next exhibit' }))
    expect(
      screen.getByText(`03 / ${String(selectedWork.length).padStart(2, '0')}`),
    ).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await user.click(screen.getByRole('button', { name: 'Second cutting' }))
    expect(
      screen.getByText(`03 / ${String(selectedWork.length).padStart(2, '0')}`),
    ).toBeInTheDocument()
  })

  it('lifts a clicked note into a dialog and sends it back on Escape', async () => {
    const user = userEvent.setup()
    render(<EvidenceLayer items={items} />)
    await user.click(screen.getByRole('button', { name: 'Crumpled blue note' }))
    const dialog = screen.getByRole('dialog', { name: 'Crumpled blue note' })
    expect(dialog).toBeInTheDocument()
    // The original stays in the board, hidden; the copy lives in the dialog.
    expect(screen.getAllByRole('article', { hidden: true })).toHaveLength(4)
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('closes when the lifted note itself is clicked', async () => {
    const user = userEvent.setup()
    render(<EvidenceLayer items={items} />)
    await user.click(screen.getByRole('button', { name: 'Crumpled blue note' }))
    const dialog = screen.getByRole('dialog')
    await user.click(dialog.querySelector<HTMLElement>('.evidence__paper')!)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

describe('threads', () => {
  it('draws a shadow and a thread path for every tie', () => {
    const { container } = render(
      <EvidenceLayer
        items={items}
        threads={[
          { from: 'a', to: 'b' },
          { from: 'b', to: 'n' },
        ]}
      />,
    )
    expect(container.querySelectorAll('.threads__thread')).toHaveLength(2)
    expect(container.querySelectorAll('.threads__shadow')).toHaveLength(2)
  })

  it('renders no thread layer when there are no threads', () => {
    const { container } = render(<EvidenceLayer items={items} threads={[]} />)
    expect(container.querySelector('.threads')).toBeNull()
  })
})

describe('liftFor', () => {
  const viewport = { width: 1000, height: 800 }

  it('centres the item and scales it up to the viewport limits', () => {
    const lift = liftFor({ left: 100, top: 100, width: 100, height: 100 }, viewport)
    const frame = stageFrame(viewport.width, viewport.height)
    const scale = (620 * frame.scale) / 100 // width-bound: 620 design px wide, at this window's scale
    expect(lift.scale).toBeCloseTo(scale)
    expect(lift.dx).toBeCloseTo(500 - frame.left - 150) // the window's centre in layer px, less the item's
    expect(lift.dy).toBeCloseTo(400 - frame.top - 100 - (100 * scale) / 2)
  })

  it('never shrinks an item that is already large', () => {
    expect(liftFor({ left: 0, top: 0, width: 900, height: 700 }, viewport).scale).toBe(1)
  })
})
