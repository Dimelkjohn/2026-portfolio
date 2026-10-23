import { useEffect, useRef } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { createFlight, type FlightOptions, type FlyPose } from './flight'
import { createFlySound } from './flySound'
import './fly.css'

const SPRITE_URL = `${import.meta.env.BASE_URL}sprites/fly.png`
/** Rendered body width in px, picked once per fly. */
const SIZE: [number, number] = [42, 56]
/** Speed (px/s) at which the body's own blur reaches full strength. */
const BLUR_SPEED = 750
/**
 * The torch is at the viewer and hits the board head-on, so the fly's shadow
 * falls straight behind it, not away from the beam centre. The fly hangs
 * nearer the viewer than the cork, so the shadow is enlarged, soft and faint.
 * A small fixed offset (the torch is held a little off the eye line) keeps
 * the shadow from hiding completely behind the fly. Values at altitude 0 and 1.
 */
const SHADOW_SCALE: [number, number] = [1.5, 2.3]
const SHADOW_OFFSET: [number, number] = [10, 26]
/**
 * The buzz. Full level with the cursor within HEAR_NEAR px of the fly,
 * falling off (squared) to the floor at HEAR_FAR px and beyond. Silent while
 * the fly is out of sight.
 */
const HEAR_NEAR = 90
const HEAR_FAR = 560
const LEVEL_FLOOR = 0.015
const LEVEL_PEAK = 0.55

type FlyProps = Pick<FlightOptions, 'rest' | 'firstRest'> & {
  /** URL of the buzz clip, or false for a silent fly. */
  sound?: string | false
}

/**
 * A housefly that crosses the board now and then, nearer the viewer than the
 * cork. Lives beneath the torch layers, so it is only seen where the beam
 * falls, and casts a large soft shadow straight behind it on the cork. Its
 * buzz gets louder as the cursor nears it. All per-frame writes go straight
 * to the DOM and the audio graph. Not rendered at all under reduced motion.
 */
export function Fly({ rest, firstRest, sound }: FlyProps) {
  const reducedMotion = useReducedMotion()
  const stage = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = stage.current
    if (!el || reducedMotion) return
    const root = document.documentElement
    const body = el.querySelector<HTMLElement>('.fly__body')!
    const shadow = el.querySelector<HTMLElement>('.fly__shadow')!

    const flight = createFlight({ rest, firstRest })
    const size = SIZE[0] + Math.random() * (SIZE[1] - SIZE[0])
    el.style.setProperty('--fly-size', `${size.toFixed(1)}px`)

    const buzz = sound === false ? null : createFlySound({ url: sound })
    void buzz?.start()
    let level = -1

    let frame = 0
    let last = 0

    const place = (target: HTMLElement, pose: FlyPose) =>
      (target.style.transform =
        `translate(${pose.x.toFixed(1)}px, ${pose.y.toFixed(1)}px) ` +
        // The sprite faces left, so flying right (dir 1) means mirrored.
        `rotate(${(pose.dir * pose.tilt).toFixed(3)}rad) scaleX(${-pose.dir})`)

    /** Where the beam (the cursor) is, if the torch has painted it. */
    const torch = () => {
      const x = Number.parseFloat(root.style.getPropertyValue('--torch-x'))
      const y = Number.parseFloat(root.style.getPropertyValue('--torch-y'))
      return Number.isNaN(x) || Number.isNaN(y) ? null : { x, y }
    }

    const hear = (pose: FlyPose) => {
      if (!pose.visible) return 0
      const light = torch()
      if (!light) return LEVEL_FLOOR
      const d = Math.hypot(pose.x - light.x, pose.y - light.y)
      const t = Math.min(1, Math.max(0, (d - HEAR_NEAR) / (HEAR_FAR - HEAR_NEAR)))
      return LEVEL_FLOOR + (LEVEL_PEAK - LEVEL_FLOOR) * (1 - t) ** 2
    }

    const step = (now: number) => {
      // Cap dt so a stalled tab does not teleport the fly on the next frame.
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016)
      last = now
      const pose = flight.step(dt, { width: window.innerWidth, height: window.innerHeight })

      el.style.visibility = pose.visible ? 'visible' : 'hidden'
      if (pose.visible) {
        place(body, pose)
        const blur = Math.min(1, pose.speed / BLUR_SPEED)
        body.style.setProperty('--fly-blur', `${(blur * 0.8).toFixed(2)}px`)

        // Shadow: straight behind the fly on the cork, bigger the higher it is.
        const a = pose.altitude
        const k = SHADOW_SCALE[0] + (SHADOW_SCALE[1] - SHADOW_SCALE[0]) * a
        const off = SHADOW_OFFSET[0] + (SHADOW_OFFSET[1] - SHADOW_OFFSET[0]) * a
        const sx = pose.x + off * 0.5
        const sy = pose.y + off
        shadow.style.transform =
          `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) ` +
          `rotate(${(pose.dir * pose.tilt).toFixed(3)}rad) ` +
          `scale(${k.toFixed(2)}) scaleX(${-pose.dir})`
        // Big, close shadows are mostly penumbra: fainter and softer the higher the fly.
        shadow.style.opacity = (0.42 - pose.altitude * 0.16).toFixed(2)
        shadow.style.setProperty('--fly-shadow-blur', `${(2.5 + pose.altitude * 1.5).toFixed(1)}px`)
      }

      if (buzz) {
        const next = hear(pose)
        if (Math.abs(next - level) > 0.002) {
          level = next
          buzz.setLevel(level)
        }
      }

      frame = requestAnimationFrame(step)
    }

    const resume = () => {
      if (frame || document.hidden) return
      last = 0
      frame = requestAnimationFrame(step)
    }
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame)
        frame = 0
      } else {
        resume()
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    resume()
    return () => {
      if (frame) cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', onVisibility)
      buzz?.stop()
    }
  }, [reducedMotion, rest, firstRest, sound])

  if (reducedMotion) return null

  return (
    <div className="fly" ref={stage} data-testid="fly" aria-hidden="true">
      <div className="fly__shadow">
        <img className="fly__flap" src={SPRITE_URL} alt="" draggable={false} />
      </div>
      <div className="fly__body">
        <div className="fly__flap">
          <img className="fly__sprite" src={SPRITE_URL} alt="" draggable={false} />
          <div className="fly__wings" />
        </div>
      </div>
    </div>
  )
}
