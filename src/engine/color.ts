const HEX = /^#([0-9A-Fa-f]{6})$/;

function parseRgb(hex: string): [number, number, number] {
  const match = HEX.exec(hex);
  if (!match) {
    throw new Error(`Expected #RRGGBB, received ${hex}`);
  }

  const value = Number.parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function toHex(r: number, g: number, b: number): string {
  const clamp = (channel: number) => Math.max(0, Math.min(255, Math.round(channel)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

export function hexToNumber(hex: string): number {
  return Number.parseInt(hex.slice(1), 16);
}

export function darkenHex(hex: string, amount: number): string {
  const [r, g, b] = parseRgb(hex);
  const keep = 1 - amount;
  return toHex(r * keep, g * keep, b * keep);
}

export function lightenHex(hex: string, amount: number): string {
  const [r, g, b] = parseRgb(hex);
  return toHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

export function stepStar(
  star: { x: number; y: number; vx: number; vy: number },
  worldW: number,
  worldH: number,
) {
  let x = star.x + star.vx;
  let y = star.y + star.vy;
  if (x < 0) x += worldW;
  if (x > worldW) x -= worldW;
  if (y < 0) y += worldH;
  if (y > worldH) y -= worldH;
  return { ...star, x, y };
}
