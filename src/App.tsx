import { PhaserPlayer } from "./engine/PhaserPlayer";
import { SEED_GAMES } from "./games/seeds";

function App() {
  return (
    <main className="h-dvh w-full overflow-hidden bg-[#18211F]">
      <PhaserPlayer spec={SEED_GAMES[0]} />
    </main>
  )
}

export default App
