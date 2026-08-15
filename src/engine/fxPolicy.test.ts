import { describe, expect, it } from "vitest";

import { shouldSpawnPlayerTrail } from "./fxPolicy";

describe("shouldSpawnPlayerTrail", () => {
  it("never leaves a trail for drag games", () => {
    expect(shouldSpawnPlayerTrail("drag_x", 0)).toBe(false);
    expect(shouldSpawnPlayerTrail("drag_x", 80)).toBe(false);
  });

  it("only trails jump/thrust players that actually moved", () => {
    expect(shouldSpawnPlayerTrail("tap_jump", 0)).toBe(false);
    expect(shouldSpawnPlayerTrail("tap_jump", 3)).toBe(false);
    expect(shouldSpawnPlayerTrail("tap_jump", 12)).toBe(true);
    expect(shouldSpawnPlayerTrail("hold_thrust", 12)).toBe(true);
  });
});
