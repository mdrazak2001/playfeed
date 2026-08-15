import type { InputMode } from "../types/gameSpec";

const TRAIL_MOVE_PX = 8;

export function shouldSpawnPlayerTrail(input: InputMode, distanceMoved: number): boolean {
  if (input === "drag_x") return false;
  return distanceMoved > TRAIL_MOVE_PX;
}
