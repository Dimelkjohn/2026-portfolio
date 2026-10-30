import { Board } from '@/components/board/Board'
import { ClueCounter } from '@/components/clues/ClueCounter'
import { EvidenceLayer } from '@/components/evidence/EvidenceLayer'
import { Fly } from '@/components/fly/Fly'
import { Music } from '@/components/music/Music'
import { SoundControls } from '@/components/sound/SoundControls'
import { Torchlight } from '@/components/torch/Torchlight'
import { SimplifiedView } from '@/components/view/SimplifiedView'
import { useSheetOnly } from '@/components/view/layout'
import { ViewToggle } from '@/components/view/ViewToggle'
import { useView } from '@/components/view/viewPreference'

/**
 * The site: the evidence board by default, or the same facts as a plain
 * sheet when the visitor switches to the simplified view. The view switch is
 * taped to the board in one and sits above the sheet in the other; the sound
 * switches sit over both, and the clue count over the board. On a viewport
 * too narrow for the board (a phone, a narrow window) the sheet is the whole
 * site, with no switch and no sound.
 */
function App() {
  const view = useView()
  const sheetOnly = useSheetOnly()
  if (sheetOnly) return <SimplifiedView sole />
  return (
    <>
      {view === 'board' ? (
        <>
          <Board>
            <EvidenceLayer />
            <ViewToggle place="board" />
          </Board>
          <Fly />
          <Torchlight />
          <ClueCounter />
        </>
      ) : (
        <SimplifiedView />
      )}
      <SoundControls />
      <Music />
    </>
  )
}

export default App
