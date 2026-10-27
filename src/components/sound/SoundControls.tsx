import { SOUNDS, soundPreferences, type SoundId } from '@/audio/preferences'
import { useMasterSoundOn, useSoundOn } from '@/hooks/useSoundOn'
import { cn } from '@/lib/cn'
import './sound-controls.css'

/**
 * A master switch and one on/off switch per sound, pinned to the top-right
 * corner above the torch layers so they can be found in the dark. The master
 * reads on when every sound is on, and sets all of them at once.
 */
export function SoundControls() {
  const masterOn = useMasterSoundOn()
  return (
    <fieldset className="sound-controls">
      <legend className="sr-only">Sound</legend>
      <Switch
        className="sound-switch--master"
        on={masterOn}
        label="All sound"
        onToggle={() => soundPreferences.toggleMaster()}
      />
      <div className="sound-controls__rule" aria-hidden="true" />
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
    <Switch
      on={on}
      label={label}
      available={available}
      onToggle={() => soundPreferences.toggle(id)}
    />
  )
}

type SwitchProps = {
  on: boolean
  label: string
  available?: boolean
  className?: string
  onToggle: () => void
}

function Switch({ on, label, available = true, className, onToggle }: SwitchProps) {
  return (
    <button
      type="button"
      className={cn('sound-switch', on && 'sound-switch--on', className)}
      aria-pressed={on}
      disabled={!available}
      title={available ? undefined : 'Coming soon'}
      onClick={onToggle}
    >
      <span className="sound-switch__knob" aria-hidden="true" />
      <span className="sound-switch__label">{label}</span>
      {!available && <span className="sound-switch__soon">soon</span>}
    </button>
  )
}
