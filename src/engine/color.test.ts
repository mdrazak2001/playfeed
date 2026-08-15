import { describe, expect, it } from "vitest";

import { darkenHex, hexToNumber, lightenHex, stepStar } from "./color";

describe("color helpers", () => {
  it("converts hex to a Phaser color number", () => {
    expect(hexToNumber("#FACC15")).toBe(0xfacc15);
  });

  it("darkens a hex color by 45%", () => {
    expect(darkenHex("#1A1423", 0.45)).toBe("#0E0B13");
  });

  it("lightens a hex color by 30%", () => {
    expect(lightenHex("#FF4D3D", 0.3)).toBe("#FF8277");
  });

  it("wraps drifting background stars around world edges", () => {
    expect(stepStar({ x: 98, y: 10, vx: 5, vy: 0 }, 100, 200)).toEqual({
      x: 3,
      y: 10,
      vx: 5,
      vy: 0,
    });
    expect(stepStar({ x: 2, y: 1, vx: 0, vy: -4 }, 100, 200)).toEqual({
      x: 2,
      y: 197,
      vx: 0,
      vy: -4,
    });
  });
});
