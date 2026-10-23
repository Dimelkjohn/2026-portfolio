import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { soundPreferences } from '@/audio/preferences'
import { SoundControls } from './SoundControls'

describe('SoundControls', () => {
  beforeEach(() => {
    soundPreferences.setOn('torch', true)
    soundPreferences.setOn('fly', false)
  })

  it('shows one switch per sound with its current state', () => {
    render(<SoundControls />)
    const group = screen.getByRole('group', { name: 'Sound' })
    expect(group).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /flashlight/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Fly (Gus)' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('toggles a sound and reflects it', async () => {
    const user = userEvent.setup()
    render(<SoundControls />)
    const torch = screen.getByRole('button', { name: /flashlight/i })
    await user.click(torch)
    expect(torch).toHaveAttribute('aria-pressed', 'false')
    expect(soundPreferences.isOn('torch')).toBe(false)
    await user.click(torch)
    expect(torch).toHaveAttribute('aria-pressed', 'true')
    expect(soundPreferences.isOn('torch')).toBe(true)
  })

  it('offers music as a switch that is not wired up yet', () => {
    render(<SoundControls />)
    const music = screen.getByRole('button', { name: /music/i })
    expect(music).toBeDisabled()
    expect(music).toHaveTextContent(/soon/i)
  })
})
