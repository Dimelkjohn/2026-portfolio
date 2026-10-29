import { Board } from '@/components/board/Board'
import { EvidenceLayer } from '@/components/evidence/EvidenceLayer'
import { Fly } from '@/components/fly/Fly'
import { Music } from '@/components/music/Music'
import { SoundControls } from '@/components/sound/SoundControls'
import { Torchlight } from '@/components/torch/Torchlight'
import { SimplifiedView } from '@/components/view/SimplifiedView'
import { ViewToggle } from '@/components/view/ViewToggle'
import { useView } from '@/components/view/viewPreference'

/**
 * The site: the evidence board by default, or the same facts as a plain
 * sheet when the visitor switches to the simplified view. The view switch is
 * taped to the board in one and sits above the sheet in the other; the sound
 * switches sit over both.
 */
function App() {
  const view = useView()
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
