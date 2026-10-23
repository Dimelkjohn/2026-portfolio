import { SOUNDS, soundPreferences, type SoundId } from '@/audio/preferences'
import { useSoundOn } from '@/hooks/useSoundOn'
import { cn } from '@/lib/cn'
import './sound-controls.css'

/**
 * One on/off switch per sound, pinned to the top-right corner above the
 * torch layers so it can be found in the dark.
 */
export function SoundControls() {
  return (
    <fieldset className="sound-controls">
      <legend className="sr-only">Sound</legend>
      {SOUNDS.map((sound) => (
        <SoundSwitch key={sound.id} id={sound.id} label={sound.label} available={sound.available} />
      ))}
    </fieldset>
  )
}

type SoundSwitchProps = { id: SoundId; label: string; available: boolean }

function SoundSwitch({ id, label, available }: SoundSwitchProps) {
  const on = useSoundOn(id)
  return (
    <button
      type="button"
      className={cn('sound-switch', on && 'sound-switch--on')}
      aria-pressed={on}
      disabled={!available}
      title={available ? undefined : 'Coming soon'}
      onClick={() => soundPreferences.toggle(id)}
    >
      <span className="sound-switch__knob" aria-hidden="true" />
      <span className="sound-switch__label">{label}</span>
      {!available && <span className="sound-switch__soon">soon</span>}
    </button>
  )
}
