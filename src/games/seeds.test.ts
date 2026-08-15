import { describe, expect, it } from "vitest";

import { parseGameSpec } from "../schema/gameSpec";
import { SEED_GAMES } from "./seeds";

const byId = Object.fromEntries(SEED_GAMES.map((game) => [game.id, game]));

function body(gameId: string, bodyId: string) {
  const found = byId[gameId]?.bodies.find((entry) => entry.id === bodyId);
  if (!found) throw new Error(`Missing ${gameId}/${bodyId}`);
  return found;
}

describe("neon seed palettes", () => {
  it("keeps five valid seeds", () => {
    expect(SEED_GAMES).toHaveLength(5);
    SEED_GAMES.forEach((game) => expect(parseGameSpec(game)).toEqual(game));
  });

  it("gives Lava Leap a neon cave identity", () => {
    expect(byId["lava-leap"]?.bg).toBe("#1A1423");
    expect(body("lava-leap", "hero")).toMatchObject({
      color: "#FACC15",
      emoji: "😀",
    });
    expect(body("lava-leap", "lava")).toMatchObject({
      color: "#FF4D3D",
      emoji: "🔥",
    });
    expect(body("lava-leap", "flag")).toMatchObject({
      color: "#4ADE80",
      emoji: "🚩",
    });
    expect(body("lava-leap", "start-platform").color).toBe("#94A3B8");
    expect(body("lava-leap", "start-platform").emoji).toBeUndefined();
  });

  it("gives the other seeds distinct neon palettes and emojis", () => {
    expect(byId["moon-bounce"]?.bg).toBe("#0F1B33");
    expect(body("moon-bounce", "moon-runner")).toMatchObject({
      color: "#E0F2FE",
      emoji: "🌙",
    });
    expect(body("moon-bounce", "moon-star-one")).toMatchObject({
      color: "#FDE047",
      emoji: "⭐",
    });
    expect(body("moon-bounce", "moon-spikes-left")).toMatchObject({
      color: "#A78BFA",
      emoji: "🌵",
    });

    expect(byId["spike-rain"]?.bg).toBe("#12071F");
    expect(body("spike-rain", "paddle")).toMatchObject({
      color: "#22D3EE",
      emoji: "🛹",
    });
    expect(body("spike-rain", "spike-a")).toMatchObject({
      color: "#FB7185",
      emoji: "💀",
    });

    expect(byId["star-dash"]?.bg).toBe("#2A0E3F");
    expect(body("star-dash", "dash-orb")).toMatchObject({
      color: "#67E8F9",
      emoji: "🛸",
    });
    expect(body("star-dash", "dash-star-one")).toMatchObject({
      color: "#FDE047",
      emoji: "🪙",
    });
    expect(body("star-dash", "dash-comet")).toMatchObject({
      color: "#F472B6",
      emoji: "☄️",
    });

    expect(byId["thrust-escape"]?.bg).toBe("#030712");
    expect(body("thrust-escape", "thrust-ship")).toMatchObject({
      color: "#F97316",
      emoji: "🚀",
    });
    expect(body("thrust-escape", "thrust-lava")).toMatchObject({
      color: "#EF4444",
      emoji: "🔥",
    });
  });
});
