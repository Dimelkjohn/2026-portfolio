import { useEffect, useLayoutEffect, useState } from 'react'
import { useTorch, type TorchOptions } from '@/hooks/useTorch'
import { createTorchSound } from './torchSound'
import './torchlight.css'

type TorchlightProps = Omit<TorchOptions, 'lit'> & {
  /**
   * URL of the torch sound clip, or false for a silent torch that is on from
   * the start. With a clip the page opens as the darkened board with no beam;
   * the beam comes on in sync with the switch-on sound and the ambience loops
   * from then on.
   */
  sound?: string | false
}

/**
 * Night-time overlay with a torch beam that follows the pointer.
 * Renders fixed siblings (hotspot, glow, darkness); see torchlight.css for why
 * they are not wrapped in a container.
 */
export function Torchlight({ sound, ...torch }: TorchlightProps) {
  const [lit, setLit] = useState(sound === false)
  const [needsGesture, setNeedsGesture] = useState(false)
  useTorch({ ...torch, lit })

  // The page's furniture (sound switches, clue count) reads this to stay out
  // of sight until the board is lit; gone with the torch, so the simplified
  // view shows it from the start. Written before the first paint, so the
  // panels are never seen before they hide.
  useLayoutEffect(() => {
    document.documentElement.dataset.torch = lit ? 'lit' : 'unlit'
    return () => {
      delete document.documentElement.dataset.torch
    }
  }, [lit])

  useEffect(() => {
    if (sound === false) return
    let cancelled = false
    const torchSound = createTorchSound({
      url: sound,
      onNeedsGesture: () => {
        if (!cancelled) setNeedsGesture(true)
      },
    })
    torchSound.start().then(() => {
      if (!cancelled) setLit(true)
    })
    return () => {
      cancelled = true
      torchSound.stop()
    }
  }, [sound])

  return (
    <>
      <div className="torch-glow" data-testid="torch-glow" aria-hidden="true" />
      <div className="torch-hotspot" data-testid="torch-hotspot" aria-hidden="true" />
      <div className="torch-dark" data-testid="torch-dark" aria-hidden="true" />
      {!lit && (
        // Nothing on the board can be hovered or clicked in the dark; the
        // first gesture lands here and reaches the unlock listeners on window.
        <div className="torch-shield" data-testid="torch-shield">
          {needsGesture && (
            <output className="torch-prompt">
              Click anywhere to begin the <span className="torch-prompt__word">investigation</span>
            </output>
          )}
        </div>
      )}
    </>
  )
}
