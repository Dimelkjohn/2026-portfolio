import { useTorch, type TorchOptions } from '@/hooks/useTorch'
import './torchlight.css'

type TorchlightProps = TorchOptions

/**
 * Night-time overlay with a torch beam that follows the pointer.
 * Renders fixed siblings (hotspot, glow, darkness); see torchlight.css for why
 * they are not wrapped in a container.
 */
export function Torchlight(props: TorchlightProps) {
  useTorch(props)

  return (
    <>
      <div className="torch-glow" data-testid="torch-glow" aria-hidden="true" />
      <div className="torch-hotspot" data-testid="torch-hotspot" aria-hidden="true" />
      <div className="torch-dark" data-testid="torch-dark" aria-hidden="true" />
    </>
  )
}
