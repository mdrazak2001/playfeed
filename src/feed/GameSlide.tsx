import { forwardRef } from "react";
import { Link } from "react-router-dom";

import { PhaserPlayer } from "../engine/PhaserPlayer";
import type { GameSpec } from "../types/gameSpec";

interface GameSlideProps {
  active: boolean;
  embed?: boolean;
  showNudge?: boolean;
  spec: GameSpec;
}

export const GameSlide = forwardRef<HTMLDivElement, GameSlideProps>(function GameSlide(
  { active, embed = false, showNudge = false, spec },
  ref,
) {
  const hint =
    spec.input === "drag_x" ? "Drag to dodge · swipe for next" : "Tap to play · swipe for next";

  return (
    <article
      ref={ref}
      className="relative h-dvh snap-start snap-always overflow-hidden"
      data-game-id={spec.id}
      style={{ backgroundColor: spec.bg }}
    >
      {active ? (
        <PhaserPlayer spec={spec} />
      ) : (
        <div className="h-full w-full" aria-hidden="true" />
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))] text-[#F4F7EE]">
        <div className="max-w-[72%]">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D8FF46]">
            Playfeed
          </p>
          <h1 className="mt-1 text-balance text-3xl font-black tracking-[-0.05em]">
            {spec.title}
          </h1>
        </div>
        <div className="flex flex-col items-end gap-2">
          {embed ? null : (
            <Link
              to="/create"
              className="pointer-events-auto inline-flex min-h-11 items-center rounded-full bg-[#D8FF46] px-4 text-[11px] font-black uppercase tracking-[0.12em] text-[#18211F] transition-transform duration-150 hover:bg-[#E4FF7B] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Make one
            </Link>
          )}
          <span className="rounded-full bg-black/20 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white/80">
            {active ? "Live" : "Next"}
          </span>
        </div>
      </div>

      {showNudge ? (
        <p className="pf-swipe-nudge pointer-events-none absolute left-1/2 z-10 rounded-full bg-black/45 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/80">
          swipe ↑
        </p>
      ) : null}

      <p
        className="pointer-events-none absolute inset-x-0 text-center text-[11px] font-medium text-white/60"
        style={{
          bottom: "max(14%, calc(env(safe-area-inset-bottom) + 5.5rem))",
        }}
      >
        {hint}
      </p>
    </article>
  );
});
