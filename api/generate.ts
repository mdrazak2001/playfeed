import { z } from "zod";

import { GameSpecSchema } from "../src/schema/gameSpec";

type ApiRequest = {
  body?: unknown;
  method?: string;
};

type ApiResponse = {
  json: (body: unknown) => void;
  status: (statusCode: number) => ApiResponse;
};

const GenerateRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(400),
});

const SYSTEM_PROMPT = `You invent a tiny mobile game as JSON only. Match this schema exactly:
{id,title,author,prompt,bg,gravity,jumpVelocity,input,bodies,win,lose}
author must be "agent". id: 2-40 chars [a-z0-9-]. title max 32 chars.
bodies: 2-12 items, exactly one kind=player. kinds: player|platform|hazard|goal|collectible.
shape: rect|circle. x,y,w,h in 0-100. color and bg as #RRGGBB.
input: tap_jump|hold_thrust|drag_x.
win: {type:"reach_goal"} | {type:"collect_all"} | {type:"survive_ms",ms:number}.
lose: array of {type:"touch_hazard"} | {type:"fall_off"} | {type:"timeout_ms",ms:number}.
Each body may include "emoji": a single emoji that fits its kind (player face/animal, hazard fire/spikes, goal flag, collectible star/coin).
Keep it playable in 10 seconds. One screen. No text in the JSON except title/id/prompt.
Return a single JSON object, no markdown.`;

type CompletionAttempt =
  | { ok: true; spec: z.infer<typeof GameSpecSchema> }
  | { ok: false; issue: string };

function parseRequestBody(body: unknown): unknown {
  if (typeof body !== "string") return body;

  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

async function generateGame(
  apiKey: string,
  prompt: string,
): Promise<CompletionAttempt> {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!response.ok) {
      return { ok: false, issue: `OpenAI returned HTTP ${response.status}` };
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = payload.choices?.[0]?.message?.content;

    if (!content) return { ok: false, issue: "The model returned an empty response" };

    let candidate: unknown;
    try {
      candidate = JSON.parse(content);
    } catch {
      return { ok: false, issue: "The model response was not parseable JSON" };
    }

    const parsed = GameSpecSchema.safeParse(candidate);
    return parsed.success
      ? { ok: true, spec: parsed.data }
      : { ok: false, issue: parsed.error.issues.map((issue) => issue.message).join("; ") };
  } catch {
    return { ok: false, issue: "The model request failed" };
  }
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const request = GenerateRequestSchema.safeParse(parseRequestBody(req.body));
  if (!request.success) {
    return res.status(400).json({ ok: false, error: "invalid_prompt" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ ok: false, error: "llm_unavailable" });
  }

  const prompt = request.data.prompt.slice(0, 400);
  const firstAttempt = await generateGame(apiKey, prompt);
  if (firstAttempt.ok) {
    return res.status(200).json({ ok: true, spec: firstAttempt.spec });
  }

  const retryPrompt = `${prompt}\n\nYour previous response failed validation: ${firstAttempt.issue}. Return a corrected JSON object only.`;
  const retryAttempt = await generateGame(apiKey, retryPrompt);
  if (retryAttempt.ok) {
    return res.status(200).json({ ok: true, spec: retryAttempt.spec });
  }

  return res.status(400).json({ ok: false, error: "invalid_spec" });
}
