import Phaser from "phaser";

import type { BodySpec, GameSpec } from "../types/gameSpec";

type ArcadeDisplay = (Phaser.GameObjects.Rectangle | Phaser.GameObjects.Arc) & {
  body: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody;
};

const colorValue = (color: string) => Number.parseInt(color.slice(1), 16);

export function createSpecScene(spec: GameSpec): typeof Phaser.Scene {
  return class SpecScene extends Phaser.Scene {
    private finished = false;

    constructor() {
      super({ key: `spec-${spec.id}` });
    }

    create() {
      const worldWidth = this.scale.width;
      const worldHeight = this.scale.height;
      const toX = (value: number) => (value / 100) * worldWidth;
      const toY = (value: number) => (value / 100) * worldHeight;
      const platforms: ArcadeDisplay[] = [];
      const hazards: ArcadeDisplay[] = [];
      const goals: ArcadeDisplay[] = [];
      const collectibles: ArcadeDisplay[] = [];

      this.cameras.main.setBackgroundColor(spec.bg);

      const makeBody = (bodySpec: BodySpec): ArcadeDisplay => {
        const width = toX(bodySpec.w);
        const height = bodySpec.shape === "circle" ? width : toY(bodySpec.h);
        const x = bodySpec.shape === "circle" ? toX(bodySpec.x) : toX(bodySpec.x) + width / 2;
        const y = bodySpec.shape === "circle" ? toY(bodySpec.y) : toY(bodySpec.y) + height / 2;
        const display =
          bodySpec.shape === "circle"
            ? this.add.circle(x, y, width / 2, colorValue(bodySpec.color))
            : this.add.rectangle(x, y, width, height, colorValue(bodySpec.color));

        display.setStrokeStyle(1, 0xffffff, 0.18);
        this.physics.add.existing(display, bodySpec.kind === "platform");

        const arcadeDisplay = display as ArcadeDisplay;
        const arcadeBody = arcadeDisplay.body;

        if (arcadeBody instanceof Phaser.Physics.Arcade.Body) {
          arcadeBody.setAllowGravity(bodySpec.kind === "player");
          arcadeBody.setImmovable(bodySpec.immovable ?? false);
          arcadeBody.setVelocity(bodySpec.vx ?? 0, bodySpec.vy ?? 0);

          if (bodySpec.shape === "circle") {
            arcadeBody.setCircle(width / 2);
          }
        } else {
          arcadeBody.updateFromGameObject();
        }

        return arcadeDisplay;
      };

      let player: ArcadeDisplay | undefined;

      for (const bodySpec of spec.bodies) {
        const body = makeBody(bodySpec);

        switch (bodySpec.kind) {
          case "player":
            player = body;
            break;
          case "platform":
            platforms.push(body);
            break;
          case "hazard":
            hazards.push(body);
            break;
          case "goal":
            goals.push(body);
            break;
          case "collectible":
            collectibles.push(body);
            break;
        }
      }

      if (!player || !(player.body instanceof Phaser.Physics.Arcade.Body)) {
        throw new Error("A validated game spec must create one Arcade player body.");
      }

      const playerBody = player.body;
      playerBody.setBounce(spec.bodies.find((body) => body.kind === "player")?.bounce ?? 0);
      playerBody.setCollideWorldBounds(false);

      for (const platform of platforms) {
        this.physics.add.collider(
          player,
          platform,
          undefined,
          () => playerBody.velocity.y >= 0,
        );
      }

      const finish = (message: "You win!" | "Try again") => {
        if (this.finished) return;

        this.finished = true;
        this.physics.pause();

        const veil = this.add.rectangle(
          worldWidth / 2,
          worldHeight / 2,
          worldWidth,
          worldHeight,
          0x000000,
          0.5,
        );
        veil.setDepth(10);

        const status = this.add.text(worldWidth / 2, worldHeight / 2, message, {
          fontFamily: "Arial, sans-serif",
          fontSize: Math.max(28, Math.round(worldWidth * 0.08)),
          fontStyle: "bold",
          color: "#FFFFFF",
        });
        status.setOrigin(0.5).setDepth(11);

        this.time.delayedCall(900, () => this.scene.restart());
      };

      for (const hazard of hazards) {
        this.physics.add.overlap(player, hazard, () => finish("Try again"));
      }

      for (const goal of goals) {
        this.physics.add.overlap(player, goal, () => finish("You win!"));
      }

      let collectiblesRemaining = collectibles.length;
      for (const collectible of collectibles) {
        this.physics.add.overlap(player, collectible, () => {
          if (!collectible.active || this.finished) return;

          collectible.destroy();
          collectiblesRemaining -= 1;
          if (collectiblesRemaining === 0) finish("You win!");
        });
      }

      if (spec.win.type === "survive_ms") {
        this.time.delayedCall(spec.win.ms, () => finish("You win!"));
      }

      for (const rule of spec.lose) {
        if (rule.type === "timeout_ms") {
          this.time.delayedCall(rule.ms, () => finish("Try again"));
        }
      }

      this.input.on("pointerdown", () => {
        if (
          !this.finished &&
          spec.input === "tap_jump" &&
          (playerBody.onFloor() ||
            playerBody.blocked.down ||
            playerBody.touching.down ||
            playerBody.velocity.y >= 0)
        ) {
          playerBody.setVelocityY(spec.jumpVelocity);
        }
      });

      this.events.on(Phaser.Scenes.Events.UPDATE, () => {
        if (this.finished) return;

        const pointer = this.input.activePointer;

        if (spec.input === "hold_thrust" && pointer.isDown) {
          playerBody.setVelocityY(spec.jumpVelocity * 0.55);
        }

        if (spec.input === "drag_x" && pointer.isDown) {
          const halfWidth = player.displayWidth / 2;
          player.x = Phaser.Math.Clamp(pointer.worldX, halfWidth, worldWidth - halfWidth);
          playerBody.setVelocityX(0);
          playerBody.updateFromGameObject();
        }

        if (
          spec.lose.some((rule) => rule.type === "fall_off") &&
          player.y > worldHeight + 40
        ) {
          finish("Try again");
        }
      });
    }
  };
}
