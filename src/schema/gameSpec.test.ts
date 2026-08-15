import { describe, expect, it } from "vitest";

import { GameSpecSchema, parseGameSpec } from "./gameSpec";

const validSpec = {
  id: "test-jump",
  title: "Test Jump",
  author: "seed" as const,
  bg: "#112233",
  gravity: 900,
  jumpVelocity: -420,
  input: "tap_jump" as const,
  bodies: [
    {
      id: "player",
      kind: "player" as const,
      shape: "rect" as const,
      x: 10,
      y: 70,
      w: 8,
      h: 8,
      color: "#FFFFFF",
    },
    {
      id: "goal",
      kind: "goal" as const,
      shape: "rect" as const,
      x: 80,
      y: 20,
      w: 6,
      h: 12,
      color: "#00FF00",
    },
  ],
  win: { type: "reach_goal" as const },
  lose: [{ type: "fall_off" as const }],
};

describe("GameSpecSchema", () => {
  it("parses a minimal valid spec", () => {
    expect(parseGameSpec(validSpec)).toEqual(validSpec);
  });

  it("rejects a spec without a player", () => {
    const spec = { ...validSpec, bodies: [validSpec.bodies[1]] };
    expect(GameSpecSchema.safeParse(spec).success).toBe(false);
  });

  it("rejects reach_goal without a goal", () => {
    const spec = {
      ...validSpec,
      bodies: [validSpec.bodies[0]],
    };
    expect(GameSpecSchema.safeParse(spec).success).toBe(false);
  });

  it("rejects invalid colors", () => {
    const spec = { ...validSpec, bg: "violet" };
    expect(GameSpecSchema.safeParse(spec).success).toBe(false);
  });

  it("accepts short emoji and rejects five-character emoji values", () => {
    const withEmoji = {
      ...validSpec,
      bodies: [{ ...validSpec.bodies[0], emoji: "😀" }, validSpec.bodies[1]],
    };
    const tooLong = {
      ...withEmoji,
      bodies: [
        { ...validSpec.bodies[0], emoji: "abcde" },
        validSpec.bodies[1],
      ],
    };

    expect(GameSpecSchema.safeParse(withEmoji).success).toBe(true);
    expect(GameSpecSchema.safeParse(tooLong).success).toBe(false);
  });
});
