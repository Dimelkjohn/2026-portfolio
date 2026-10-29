import { cn } from '@/lib/cn'
import { clues, useClueCount, type Clues } from './clues'
import './clues.css'

type ClueCounterProps = {
  store?: Clues
}

/**
 * The clue count, bottom left: how many of the board's clickable pieces have
 * been opened, out of how many there are; once every one has, CASE CLOSED is
 * stamped over the full count. Part of the page's furniture, like
 * the sound switches, not of the board: it sits above the torch layers and
 * reads the same in the dark.
 */
export function ClueCounter({ store = clues }: ClueCounterProps) {
  const count = useClueCount(store)
  const total = store.total()
  const complete = store.complete()
  return (
    <output className={cn('clues', complete && 'clues--complete')} aria-live="polite">
      <span className="clues__label">Clues found</span>
      <span className="clues__count">
        {/*
          Keyed on the count, so each new clue remounts the number and replays
          its jolt: a flash of red, a hard swell and a twist, then back to rest.
          Not on the way in at zero, which is why the class waits for the first clue.
        */}
        <span key={count} className={cn('clues__number', count > 0 && 'clues__number--jolt')}>
          {String(count).padStart(2, '0')}
        </span>{' '}
        / {String(total).padStart(2, '0')}
      </span>
      {/* The verdict, slammed down over the count once the last clue is in. */}
      {complete && <span className="clues__stamp">Case closed</span>}
    </output>
  )
}
