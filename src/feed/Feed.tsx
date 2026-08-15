import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { GameSlide } from "./GameSlide";
import { getFeed } from "../store/gameStore";

export function Feed() {
  const [params] = useSearchParams();
  const embed = params.get("embed") === "1";
  const [games] = useState(getFeed);
  const [activeId, setActiveId] = useState(games[0]?.id ?? "");
  const [showNudge, setShowNudge] = useState(false);
  const slideRefs = useRef(new Map<string, HTMLDivElement>());
  const scrollerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = body.style.overflow;

    root.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      root.style.overflow = previousRootOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, []);

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

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    let timer = window.setTimeout(() => setShowNudge(true), 6000);
    const onScroll = () => {
      setShowNudge(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setShowNudge(true), 6000);
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      scroller.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <main
      ref={scrollerRef}
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
          embed={embed}
          showNudge={showNudge && activeId === game.id}
          spec={game}
        />
      ))}
    </main>
  );
}
