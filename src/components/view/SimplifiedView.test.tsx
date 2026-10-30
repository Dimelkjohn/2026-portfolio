import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { contactLinks } from '@/data/contact'
import { moonlightingPhotos } from '@/data/photos'
import { selectedWork } from '@/data/work'
import { SimplifiedView } from './SimplifiedView'

describe('SimplifiedView', () => {
  it('as the whole site, drops the view switch and says the board wants a bigger screen', () => {
    render(<SimplifiedView sole />)
    expect(screen.queryByRole('group', { name: 'View' })).toBeNull()
    expect(screen.getByText(/looks a whole lot cooler on a bigger screen/i)).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: 'who is John Dimelu' }),
    ).toBeInTheDocument()
  })

  it('lays the board out as one sheet: employment, the work, the moonlighting and contact', () => {
    render(<SimplifiedView />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'who is John Dimelu' }),
    ).toBeInTheDocument()

    // The service record, read from the board data.
    const employment = screen.getByRole('region', { name: 'Known employment' })
    expect(within(employment).getByText('Nobull Solutions')).toBeInTheDocument()
    expect(within(employment).getByText('Chess Solutions')).toBeInTheDocument()
    expect(within(employment).getByText('Tier 1 Consulting')).toBeInTheDocument()

    // Every case file, with its link or its seal.
    const work = screen.getByRole('region', { name: 'Selected work' })
    for (const item of selectedWork) {
      expect(within(work).getByRole('heading', { level: 3, name: item.title })).toBeInTheDocument()
    }
    expect(within(work).getAllByRole('link', { name: 'Open the exhibit' })).toHaveLength(
      selectedWork.filter((item) => item.link).length,
    )

    // Every print, films pointing at YouTube.
    const moonlighting = screen.getByRole('region', { name: 'Creative work: design and film' })
    expect(within(moonlighting).getAllByRole('listitem')).toHaveLength(moonlightingPhotos.length)
    const film = moonlightingPhotos.find((photo) => photo.video)!
    expect(within(moonlighting).getByRole('link', { name: film.caption! })).toHaveAttribute(
      'href',
      `https://www.youtube.com/watch?v=${film.video!.youtube}`,
    )

    // The ways in.
    const contact = screen.getByRole('region', { name: 'Make contact' })
    for (const link of contactLinks) {
      expect(within(contact).getByRole('link', { name: link.label })).toHaveAttribute(
        'href',
        link.href,
      )
    }
  })
})
