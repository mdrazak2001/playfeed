export type BodyKind = "player" | "platform" | "hazard" | "goal" | "collectible";
export type Shape = "rect" | "circle";
export type InputMode = "tap_jump" | "hold_thrust" | "drag_x";

export type WinRule =
  | { type: "reach_goal" }
  | { type: "collect_all" }
  | { type: "survive_ms"; ms: number };

export type LoseRule =
  | { type: "touch_hazard" }
  | { type: "fall_off" }
  | { type: "timeout_ms"; ms: number };

export interface BodySpec {
  id: string;
  kind: BodyKind;
  shape: Shape;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  vx?: number;
  vy?: number;
  bounce?: number;
  immovable?: boolean;
  emoji?: string;
}

export interface GameSpec {
  id: string;
  title: string;
  author: "seed" | "agent";
  prompt?: string;
  bg: string;
  gravity: number;
  jumpVelocity: number;
  input: InputMode;
  bodies: BodySpec[];
  win: WinRule;
  lose: LoseRule[];
}

export const SPEC_LIMITS = {
  maxBodies: 16,
  maxTitle: 32,
  minSize: 2,
  maxSize: 100,
} as const;
