import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { PhaserPlayer } from "../engine/PhaserPlayer";
import { generateSpec } from "../lib/generate";
import { publish } from "../store/gameStore";
import type { GameSpec } from "../types/gameSpec";

const DEFAULT_PROMPT = "a one-button game where I jump over lava to a flag";

function errorMessage(error: string) {
  if (error === "llm_unavailable") {
    return "Agent offline — scroll the feed, seeds still play.";
  }

  if (error === "invalid_spec") {
    return "The agent made an invalid game. Try a shorter, simpler prompt.";
  }

  return "Couldn’t generate that game. The feed is still ready to play.";
}

export function CreateSandbox() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [draftSpec, setDraftSpec] = useState<GameSpec | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerate() {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || isGenerating) return;

    setError(null);
    setIsGenerating(true);
    const result = await generateSpec(cleanPrompt);
    setIsGenerating(false);

    if (!result.ok) {
      setError(errorMessage(result.error));
      return;
    }

    setDraftSpec(result.spec);
  }

  function handlePublish() {
    if (!draftSpec) return;

    publish({ ...draftSpec, author: "agent", prompt: prompt.trim() });
    navigate("/");
  }

  return (
    <main className="min-h-dvh bg-[#101412] px-4 py-5 text-[#F4F7EE] sm:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-bold text-white/75 transition-colors hover:bg-white/8 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D8FF46]"
          >
            ← Feed
          </Link>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D8FF46]">
            Agent sandbox
          </p>
        </header>

        {draftSpec ? (
          <section className="mt-5 overflow-hidden rounded-[28px] bg-[#18211F] shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
            <div className="flex items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#D8FF46]">
                  Draft ready
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-[-0.04em]">
                  {draftSpec.title}
                </h1>
              </div>
              <button
                type="button"
                onClick={() => setDraftSpec(null)}
                className="min-h-11 rounded-full px-4 text-sm font-bold text-white/70 transition-colors hover:bg-white/8 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D8FF46]"
              >
                Edit prompt
              </button>
            </div>

            <div className="h-[58dvh] min-h-96 border-y border-white/8">
              <PhaserPlayer spec={draftSpec} />
            </div>

            <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-white/65">Play the draft, then send it to the top of your feed.</p>
              <button
                type="button"
                onClick={handlePublish}
                className="min-h-11 rounded-full bg-[#D8FF46] px-5 text-sm font-black text-[#18211F] transition-transform duration-150 hover:bg-[#E4FF7B] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F4F7EE]"
              >
                Publish to feed
              </button>
            </div>
          </section>
        ) : (
          <section className="mt-14 rounded-[28px] bg-[#18211F] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_18px_45px_rgba(0,0,0,0.18)] sm:p-9">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D8FF46]">Describe the game</p>
            <h1 className="mt-3 max-w-xl text-balance text-4xl font-black tracking-[-0.06em] sm:text-5xl">
              Make the next swipe playable.
            </h1>
            <p className="mt-4 max-w-lg text-pretty leading-7 text-white/65">
              The agent invents a small mobile game as safe, validated JSON—then you can play it before publishing.
            </p>

            <label className="mt-8 block text-sm font-bold text-white/85" htmlFor="game-prompt">
              Your game idea
            </label>
            <textarea
              id="game-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value.slice(0, 400))}
              placeholder="a one-button game where I jump over lava to a flag"
              rows={5}
              maxLength={400}
              className="mt-3 w-full resize-none rounded-2xl bg-[#101412] px-4 py-3 text-base leading-6 text-white outline-none ring-1 ring-white/10 transition-[box-shadow] placeholder:text-white/35 focus:ring-2 focus:ring-[#D8FF46]"
            />
            <div className="mt-2 flex justify-between text-xs text-white/45">
              <span>One screen. One simple rule. About 10 seconds to play.</span>
              <span className="tabular-nums">{prompt.length}/400</span>
            </div>

            {error ? (
              <p className="mt-5 rounded-xl bg-[#FF725D]/15 px-4 py-3 text-sm font-medium text-[#FFD1C7]" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="mt-7 min-h-12 w-full rounded-2xl bg-[#D8FF46] px-5 text-sm font-black text-[#18211F] transition-transform duration-150 hover:bg-[#E4FF7B] active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-[#D8FF46]/40 disabled:text-[#18211F]/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F4F7EE]"
            >
              {isGenerating ? "Generating…" : "Generate game"}
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
