import { useId, type CSSProperties } from 'react'
import type { Fastener as FastenerData, PinColor } from '@/types/evidence'
import { hash } from './torn'

const BASE = import.meta.env.BASE_URL
const TAPE_COUNT = 8

const tapeSrc = (n: number) =>
  `${BASE}props/tape/tape-${String((n % TAPE_COUNT) + 1).padStart(2, '0')}.png`

/** Highlight, body and shadowed-edge colours of each pin head. */
const PIN_PALETTE: Record<PinColor, { light: string; base: string; dark: string }> = {
  red: { light: '#ff7a6a', base: '#b8121a', dark: '#3f0405' },
  white: { light: '#ffffff', base: '#e4e1d8', dark: '#77736a' },
  yellow: { light: '#fff3b0', base: '#e2ac0f', dark: '#5e4303' },
  black: { light: '#7a7a82', base: '#26262b', dark: '#000000' },
}

type FastenerProps = {
  fastener: FastenerData
  /** Used to pick tape strips deterministically. */
  seed: string
}

/**
 * The pin or tape holding a piece of evidence. Purely decorative: images are
 * empty-alt and the whole thing is hidden from assistive tech.
 */
export function Fastener({ fastener, seed }: FastenerProps) {
  if (fastener.kind === 'none') return null
  if (fastener.kind === 'pin') {
    const color = fastener.color ?? 'red'
    const places = Array.isArray(fastener.x) ? fastener.x : [fastener.x ?? 50]
    return places.map((x) => <Pin key={x} color={color} x={x} y={fastener.y} />)
  }

  const h = hash(seed)
  const corners = fastener.corners ?? 'top'
  const strips =
    corners === 'top'
      ? (['top'] as const)
      : corners === 'diagonal'
        ? (['tl', 'br'] as const)
        : (['tl', 'tr', 'bl', 'br'] as const)

  const style = (
    fastener.width === undefined ? undefined : { '--tape-w': `${fastener.width}%` }
  ) as CSSProperties | undefined

  return (
    <span className="evidence__tape-set" style={style} aria-hidden="true">
      {strips.map((where, i) => (
        <img
          key={where}
          className={`evidence__tape evidence__tape--${where}`}
          src={tapeSrc(h + i * 3)}
          alt=""
          draggable={false}
        />
      ))}
    </span>
  )
}

/**
 * A flat-headed thumbtack seen from the front, which is how the viewer, torch
 * in hand, sees the board: a shallow disc with a bevelled rim, a small centre
 * dimple over the shank, and a tight contact shadow on the paper behind it.
 *
 * Everything is drawn lit from straight above (12 o'clock). The group is
 * rotated by --pin-angle, written per frame by pinLighting.ts, so the bright
 * rim, the glint and the shadow's offset all turn to face the torch. The
 * glint's strength is --pin-glint, which fades as the beam moves off.
 */
function Pin({ color, x, y }: { color: PinColor; x: number; y?: number }) {
  const id = useId()
  const face = `${id}-face`
  const rim = `${id}-rim`
  const blur = `${id}-blur`
  const soft = `${id}-soft`
  const { light, base, dark } = PIN_PALETTE[color]
  const style = {
    '--pin-x': `${x}%`,
    ...(y === undefined ? {} : { '--pin-y': `${y}%` }),
  } as CSSProperties
  return (
    <svg
      className="evidence__pin"
      style={style}
      viewBox="0 0 40 40"
      data-color={color}
      aria-hidden="true"
    >
      <defs>
        {/* Face: nearly flat, lighter toward the light. */}
        <linearGradient id={face} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={light} stopOpacity="0.5" />
          <stop offset="0.4" stopColor={base} />
          <stop offset="1" stopColor={dark} stopOpacity="0.8" />
        </linearGradient>
        {/* Bevelled rim: bright edge toward the light, dark edge away. */}
        <linearGradient id={rim} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="0.5" stopColor={base} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
        <filter id={blur} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
        <filter id={soft} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.5" />
        </filter>
      </defs>
      <g className="evidence__pin-turn">
        {/* Contact shadow, offset away from the light. */}
        <ellipse
          cx="20"
          cy="22.5"
          rx="14"
          ry="12.5"
          fill="rgb(0 0 0 / 0.55)"
          filter={`url(#${blur})`}
        />
        <circle cx="20" cy="20" r="13" fill={`url(#${rim})`} />
        <circle cx="20" cy="20" r="11.2" fill={base} />
        <circle cx="20" cy="20" r="11.2" fill={`url(#${face})`} />
        <circle cx="20" cy="20" r="13" fill="none" stroke="rgb(0 0 0 / 0.4)" strokeWidth="0.6" />
        {/* Centre dimple over the shank, lit on the near side. */}
        <circle cx="20" cy="20" r="2.2" fill={dark} opacity="0.7" />
        <circle cx="20" cy="19.2" r="1" fill={light} opacity="0.5" />
        {/* Specular on the rim, toward the light. */}
        <ellipse
          className="evidence__pin-glint"
          cx="20"
          cy="8.6"
          rx="4.2"
          ry="1.3"
          fill="#fff"
          filter={`url(#${soft})`}
        />
      </g>
    </svg>
  )
}
