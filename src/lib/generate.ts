import { z } from "zod";

import { GameSpecSchema } from "../schema/gameSpec";
import type { GameSpec } from "../types/gameSpec";

const GenerateResponseSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), spec: GameSpecSchema }),
  z.object({ ok: z.literal(false), error: z.string() }),
]);

export type GenerateResult =
  | { ok: true; spec: GameSpec }
  | { ok: false; error: string };

export async function generateSpec(prompt: string): Promise<GenerateResult> {
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const parsed = GenerateResponseSchema.safeParse(await response.json());

    if (!parsed.success) return { ok: false, error: "invalid_response" };
    if (!parsed.data.ok) return { ok: false, error: parsed.data.error };

    return { ok: true, spec: parsed.data.spec as GameSpec };
  } catch {
    return { ok: false, error: "llm_unavailable" };
  }
}
