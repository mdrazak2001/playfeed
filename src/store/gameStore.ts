import { SEED_GAMES } from "../games/seeds";
import { GameSpecSchema, parseGameSpec } from "../schema/gameSpec";
import type { GameSpec } from "../types/gameSpec";

const PUBLISHED_GAMES_KEY = "playfeed.published";

function getPublishedGames(): GameSpec[] {
  if (typeof window === "undefined") return [];

  try {
    const rawGames: unknown = JSON.parse(
      window.localStorage.getItem(PUBLISHED_GAMES_KEY) ?? "[]",
    );

    if (!Array.isArray(rawGames)) return [];

    return rawGames.flatMap((game) => {
      const parsed = GameSpecSchema.safeParse(game);
      return parsed.success ? [parsed.data as GameSpec] : [];
    });
  } catch {
    return [];
  }
}

export function getFeed(): GameSpec[] {
  const seenIds = new Set<string>();

  return [...getPublishedGames(), ...SEED_GAMES].filter((game) => {
    if (seenIds.has(game.id)) return false;
    seenIds.add(game.id);
    return true;
  });
}

export function publish(spec: GameSpec): void {
  if (typeof window === "undefined") return;

  const validatedSpec = parseGameSpec(spec);
  const current = getPublishedGames().filter((game) => game.id !== validatedSpec.id);

  window.localStorage.setItem(
    PUBLISHED_GAMES_KEY,
    JSON.stringify([validatedSpec, ...current]),
  );
}
