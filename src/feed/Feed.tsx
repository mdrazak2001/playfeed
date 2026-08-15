import { useEffect, useRef, useState } from "react";

import { GameSlide } from "./GameSlide";
import { getFeed } from "../store/gameStore";

export function Feed() {
  const [games] = useState(getFeed);
  const [activeId, setActiveId] = useState(games[0]?.id ?? "");
  const slideRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const nextActive = entries.find((entry) => entry.isIntersecting);
        const nextId = nextActive?.target.getAttribute("data-game-id");
        if (nextId) setActiveId(nextId);
      },
      { threshold: 0.6 },
    );

    for (const slide of slideRefs.current.values()) observer.observe(slide);

    return () => observer.disconnect();
  }, [games]);

  return (
    <main
      className="h-dvh snap-y snap-mandatory overflow-y-scroll overscroll-none"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {games.map((game) => (
        <GameSlide
          key={game.id}
          ref={(node) => {
            if (node) slideRefs.current.set(game.id, node);
            else slideRefs.current.delete(game.id);
          }}
          active={activeId === game.id}
          spec={game}
        />
      ))}
    </main>
  );
}
