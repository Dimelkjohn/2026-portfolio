import { Board } from '@/components/board/Board'
import { Fly } from '@/components/fly/Fly'
import { SoundControls } from '@/components/sound/SoundControls'
import { Torchlight } from '@/components/torch/Torchlight'

function App() {
  return (
    <>
      <Board />
      <Fly />
      <Torchlight />
      <SoundControls />
    </>
  )
}

export default App
