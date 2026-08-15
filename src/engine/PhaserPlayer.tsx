import { useEffect, useRef } from "react";
import Phaser from "phaser";

import { createSpecScene } from "./buildScene";
import type { GameSpec } from "../types/gameSpec";

interface PhaserPlayerProps {
  spec: GameSpec;
}

export function PhaserPlayer({ spec }: PhaserPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: container,
      width: Math.max(1, container.clientWidth),
      height: Math.max(1, container.clientHeight),
      physics: {
        default: "arcade",
        arcade: {
          gravity: { x: 0, y: spec.gravity },
          debug: false,
        },
      },
      scene: createSpecScene(spec),
      input: {
        activePointers: 1,
        touch: { capture: false },
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
      },
      render: {
        antialias: true,
      },
      banner: false,
    });

    const resize = () => {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      if (game.scale.width === width && game.scale.height === height) return;
      game.scale.resize(width, height);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    return () => {
      observer.disconnect();
      game.destroy(true);
    };
  }, [spec]);

  return <div ref={containerRef} className="h-full w-full" data-testid="phaser-player" />;
}
