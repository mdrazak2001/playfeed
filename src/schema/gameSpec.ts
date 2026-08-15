import { z } from "zod";

import { SPEC_LIMITS, type GameSpec } from "../types/gameSpec";

const HexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use a #RRGGBB color");

const BodySchema = z.object({
  id: z.string().min(1).max(40),
  kind: z.enum(["player", "platform", "hazard", "goal", "collectible"]),
  shape: z.enum(["rect", "circle"]),
  x: z.number().finite().min(0).max(100),
  y: z.number().finite().min(0).max(100),
  w: z.number().finite().min(SPEC_LIMITS.minSize).max(SPEC_LIMITS.maxSize),
  h: z.number().finite().min(SPEC_LIMITS.minSize).max(SPEC_LIMITS.maxSize),
  color: HexColorSchema,
  vx: z.number().finite().optional(),
  vy: z.number().finite().optional(),
  bounce: z.number().finite().min(0).max(1).optional(),
  immovable: z.boolean().optional(),
  emoji: z.string().min(1).max(4).optional(),
});

const WinRuleSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("reach_goal") }),
  z.object({ type: z.literal("collect_all") }),
  z.object({ type: z.literal("survive_ms"), ms: z.number().finite().positive() }),
]);

const LoseRuleSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("touch_hazard") }),
  z.object({ type: z.literal("fall_off") }),
  z.object({ type: z.literal("timeout_ms"), ms: z.number().finite().positive() }),
]);

export const GameSpecSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{2,40}$/),
    title: z.string().min(1).max(SPEC_LIMITS.maxTitle),
    author: z.enum(["seed", "agent"]),
    prompt: z.string().max(400).optional(),
    bg: HexColorSchema,
    gravity: z.number().finite().min(0).max(2000),
    jumpVelocity: z.number().finite().min(-800).max(-80),
    input: z.enum(["tap_jump", "hold_thrust", "drag_x"]),
    bodies: z.array(BodySchema).min(1).max(SPEC_LIMITS.maxBodies),
    win: WinRuleSchema,
    lose: z.array(LoseRuleSchema).min(1),
  })
  .superRefine((spec, ctx) => {
    const players = spec.bodies.filter((body) => body.kind === "player");
    if (players.length !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["bodies"],
        message: "A game must contain exactly one player",
      });
    }

    const hasKind = (kind: (typeof spec.bodies)[number]["kind"]) =>
      spec.bodies.some((body) => body.kind === kind);

    if (spec.win.type === "reach_goal" && !hasKind("goal")) {
      ctx.addIssue({
        code: "custom",
        path: ["win"],
        message: "reach_goal requires a goal body",
      });
    }

    if (spec.win.type === "collect_all" && !hasKind("collectible")) {
      ctx.addIssue({
        code: "custom",
        path: ["win"],
        message: "collect_all requires at least one collectible body",
      });
    }

    if (
      spec.lose.some((rule) => rule.type === "touch_hazard") &&
      !hasKind("hazard")
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["lose"],
        message: "touch_hazard requires a hazard body",
      });
    }
  });

export function parseGameSpec(data: unknown): GameSpec {
  return GameSpecSchema.parse(data) as GameSpec;
}
