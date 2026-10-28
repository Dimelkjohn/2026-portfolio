import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { soundPreferences } from '@/audio/preferences'
import { SoundControls } from './SoundControls'

describe('SoundControls', () => {
  beforeEach(() => {
    soundPreferences.setOn('sfx', true)
    soundPreferences.setOn('fly', false)
  })

  it('shows one switch per sound with its current state', () => {
    render(<SoundControls />)
    const group = screen.getByRole('group', { name: 'Sound' })
    expect(group).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sfx/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Fly (Gus)' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('toggles a sound and reflects it', async () => {
    const user = userEvent.setup()
    render(<SoundControls />)
    const torch = screen.getByRole('button', { name: /sfx/i })
    await user.click(torch)
    expect(torch).toHaveAttribute('aria-pressed', 'false')
    expect(soundPreferences.isOn('sfx')).toBe(false)
    await user.click(torch)
    expect(torch).toHaveAttribute('aria-pressed', 'true')
    expect(soundPreferences.isOn('sfx')).toBe(true)
  })

  it('offers a music switch', () => {
    render(<SoundControls />)
    const music = screen.getByRole('button', { name: /music/i })
    expect(music).toBeEnabled()
    expect(music).not.toHaveTextContent(/soon/i)
  })
})

describe('master switch', () => {
  it('turns every sound on, then every sound off', async () => {
    const user = userEvent.setup()
    render(<SoundControls />)
    const all = screen.getByRole('button', { name: /all sound/i })
    // Fly starts off (see beforeEach), so the master reads off.
    expect(all).toHaveAttribute('aria-pressed', 'false')
    await user.click(all)
    expect(all).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Fly (Gus)' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await user.click(all)
    expect(all).toHaveAttribute('aria-pressed', 'false')
    for (const name of [/sfx/i, 'Fly (Gus)', /music/i]) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'false')
    }
  })
})
