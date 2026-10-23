import { Board } from '@/components/board/Board'
import { Fly } from '@/components/fly/Fly'
import { Music } from '@/components/music/Music'
import { SoundControls } from '@/components/sound/SoundControls'
import { Torchlight } from '@/components/torch/Torchlight'

function App() {
  return (
    <>
      <Board />
      <Fly />
      <Torchlight />
      <SoundControls />
      <Music />
    </>
  )
}

export default App
