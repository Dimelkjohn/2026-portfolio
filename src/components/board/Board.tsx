import type { ReactNode } from 'react'
import './board.css'

type BoardProps = {
  children?: ReactNode
}

/**
 * Full-viewport cork board. Everything pinned to the board renders as children
 * inside the evidence layer so items share one coordinate space.
 */
export function Board({ children }: BoardProps) {
  return (
    <main className="board" aria-label="Detective evidence board about John Dimelu">
      <h1 className="sr-only">
        Who is John Dimelu? Frontend and full-stack engineer, UI and UX designer.
      </h1>
      <div className="board__cork" aria-hidden="true" />
      <div className="board__layer" data-testid="board-layer">
        {children}
      </div>
      <div className="board__frame" aria-hidden="true" />
    </main>
  )
}
