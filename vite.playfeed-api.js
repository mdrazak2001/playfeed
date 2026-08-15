import { loadEnv } from "vite";

import generate from "./api/generate.ts";

function jsonResponse(res) {
  let statusCode = 200;

  return {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      res.statusCode = statusCode;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(body));
    },
  };
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function playfeedDevApi() {
  return {
    name: "playfeed-dev-api",
    configResolved(config) {
      const env = loadEnv(config.mode, process.cwd(), "");
      if (env.OPENAI_API_KEY) process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/generate")) {
          next();
          return;
        }

        try {
          await generate(
            { method: req.method, body: await readBody(req) },
            jsonResponse(res),
          );
        } catch {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: false, error: "llm_unavailable" }));
        }
      });
    },
  };
}
