import { afterEach, describe, expect, it, vi } from "vitest";

import handler from "./generate";

async function invoke(method: string, body?: unknown) {
  let statusCode = 200;
  let jsonBody: unknown;

  await handler(
    { method, body },
    {
      status(code) {
        statusCode = code;
        return this;
      },
      json(bodyToSend) {
        jsonBody = bodyToSend;
      },
    },
  );

  return { statusCode, jsonBody };
}

afterEach(() => vi.unstubAllEnvs());

describe("generate API", () => {
  it("rejects non-POST requests", async () => {
    await expect(invoke("GET")).resolves.toEqual({
      statusCode: 405,
      jsonBody: { ok: false, error: "method_not_allowed" },
    });
  });

  it("returns an offline response without an API key", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    await expect(invoke("POST", { prompt: "jump over lava to a flag" })).resolves.toEqual({
      statusCode: 503,
      jsonBody: { ok: false, error: "llm_unavailable" },
    });
  });
});
