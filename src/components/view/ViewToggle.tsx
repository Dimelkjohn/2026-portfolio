import { Fastener } from '@/components/evidence/Fastener'

/** The marker loop drawn round the view that is on. */
const CIRCLE_URL = `${import.meta.env.BASE_URL}evidence/mark-circle-wide-red.png`
import { cn } from '@/lib/cn'
import { useView, VIEWS, viewPreference, type ViewPreference } from './viewPreference'
import './view.css'

type ViewToggleProps = {
  preference?: ViewPreference
  /** On the board it is taped to the cork, top centre, lit only by the torch; on the sheet it sits above the paper. */
  place: 'board' | 'sheet'
}

/**
 * The view switch: a typed paper tag reading BOARD | SIMPLIFIED, the current
 * view in the thread red, taped up a little askew like the notes. On the
 * board it is part of the scene, in the empty spot at the top centre, and
 * shows only where the torch falls; on the simplified sheet it sits above
 * the paper.
 */
export function ViewToggle({ preference = viewPreference, place }: ViewToggleProps) {
  const view = useView(preference)
  return (
    <fieldset className={cn('view-toggle', `view-toggle--${place}`)} aria-label="View">
      <Fastener fastener={{ kind: 'tape', corners: 'top', width: 46 }} seed="view-toggle" />
      {VIEWS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          aria-pressed={view === id}
          className={cn('view-toggle__option', view === id && 'view-toggle__option--on')}
          onClick={() => preference.set(id)}
        >
          {label}
          {view === id && (
            <img className="view-toggle__circle" src={CIRCLE_URL} alt="" draggable={false} />
          )}
        </button>
      ))}
    </fieldset>
  )
}
