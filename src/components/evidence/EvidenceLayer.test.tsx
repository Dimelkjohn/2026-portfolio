import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { EvidenceItem } from '@/types/evidence'
import { boardData } from '@/data/board'
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
    render(<EvidenceLayer items={[...items, labelled]} />)
    expect(screen.getByRole('button', { name: 'Crumpled blue note' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Handprint' })).toBeInTheDocument()
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
    expect(lift.scale).toBeCloseTo(4.6) // width-bound: 46% of 1000 / 100
    expect(lift.dx).toBe(350) // 500 - 150
    expect(lift.dy).toBe(400 - 100 - (100 * 4.6) / 2)
  })

  it('never shrinks an item that is already large', () => {
    expect(liftFor({ left: 0, top: 0, width: 900, height: 700 }, viewport).scale).toBe(1)
  })
})
