import Phaser from "phaser";

import { darkenHex, hexToNumber, lightenHex, stepStar } from "./color";
import type { BodySpec, GameSpec } from "../types/gameSpec";

type ArcadeDisplay = Phaser.GameObjects.Shape & {
  body: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody;
};

type FxRoot = Phaser.GameObjects.Container;

interface RuntimeBody {
  spec: BodySpec;
  physics: ArcadeDisplay;
  shell: Phaser.GameObjects.Container;
  fxRoot: FxRoot;
  visual: Phaser.GameObjects.GameObject;
  emoji?: Phaser.GameObjects.Text;
}

export const MAX_GLOWS = 8;
export const MAX_PARTICLES = 60;
export const STARFIELD_COUNT = 25;

const CONFETTI = [0xfacc15, 0xfb7185, 0x67e8f9, 0x4ade80, 0xf472b6];
const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

export function createSpecScene(spec: GameSpec): typeof Phaser.Scene {
  return class SpecScene extends Phaser.Scene {
    private finished = false;
    private feelLockUntil = 0;
    private trailFrame = 0;
    private wasGrounded = true;
    private glowBudget = { left: MAX_GLOWS };
    private particles: Phaser.GameObjects.Arc[] = [];
    private particleCursor = 0;
    private stars: Array<{
      visual: Phaser.GameObjects.Arc;
      vx: number;
      vy: number;
    }> = [];
    private runtimes: RuntimeBody[] = [];
    private player?: ArcadeDisplay;
    private playerRuntime?: RuntimeBody;
    private breath?: Phaser.Tweens.Tween;
    private collectHud?: Phaser.GameObjects.Text;
    private surviveLabel?: Phaser.GameObjects.Text;
    private survivePill?: Phaser.GameObjects.Container;
    private surviveEndsAt = 0;
    private worldW = 0;
    private worldH = 0;

    constructor() {
      super({ key: `spec-${spec.id}` });
    }

    create() {
      this.finished = false;
      this.feelLockUntil = 0;
      this.trailFrame = 0;
      this.wasGrounded = true;
      this.glowBudget = { left: MAX_GLOWS };
      this.runtimes = [];
      this.worldW = this.scale.width;
      this.worldH = this.scale.height;
      const worldWidth = this.worldW;
      const worldHeight = this.worldH;
      const toX = (value: number) => (value / 100) * worldWidth;
      const toY = (value: number) => (value / 100) * worldHeight;

      this.cameras.main.setBackgroundColor(spec.bg);
      this.paintBackdrop(worldWidth, worldHeight);
      this.particles = this.makeParticlePool();

      const platforms: ArcadeDisplay[] = [];
      const hazards: ArcadeDisplay[] = [];
      const goals: ArcadeDisplay[] = [];
      const collectibles: ArcadeDisplay[] = [];
      const runtimeByPhysics = new Map<ArcadeDisplay, RuntimeBody>();

      const makeBody = (bodySpec: BodySpec): ArcadeDisplay => {
        const width = toX(bodySpec.w);
        const height = bodySpec.shape === "circle" ? width : toY(bodySpec.h);
        const x =
          bodySpec.shape === "circle" ? toX(bodySpec.x) : toX(bodySpec.x) + width / 2;
        const y =
          bodySpec.shape === "circle" ? toY(bodySpec.y) : toY(bodySpec.y) + height / 2;
        const display =
          bodySpec.shape === "circle"
            ? this.add.circle(x, y, width / 2, hexToNumber(bodySpec.color))
            : this.add.rectangle(x, y, width, height, hexToNumber(bodySpec.color));

        this.physics.add.existing(display, bodySpec.kind === "platform");
        display.setVisible(false);

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

      for (const bodySpec of spec.bodies) {
        const physics = makeBody(bodySpec);
        const runtime = this.decorateBody(bodySpec, physics, toX, toY);
        this.runtimes.push(runtime);
        runtimeByPhysics.set(physics, runtime);

        switch (bodySpec.kind) {
          case "player":
            this.player = physics;
            this.playerRuntime = runtime;
            break;
          case "platform":
            platforms.push(physics);
            break;
          case "hazard":
            hazards.push(physics);
            break;
          case "goal":
            goals.push(physics);
            break;
          case "collectible":
            collectibles.push(physics);
            break;
        }
      }

      if (!this.player || !(this.player.body instanceof Phaser.Physics.Arcade.Body)) {
        throw new Error("A validated game spec must create one Arcade player body.");
      }

      const player = this.player;
      const playerBody = this.player.body;
      playerBody.setBounce(spec.bodies.find((body) => body.kind === "player")?.bounce ?? 0);
      playerBody.setCollideWorldBounds(false);

      if (this.playerRuntime) {
        this.breath = this.tweens.add({
          targets: this.playerRuntime.fxRoot,
          scale: 1.04,
          duration: 700,
          yoyo: true,
          repeat: -1,
          paused: true,
        });
      }

      for (const platform of platforms) {
        this.physics.add.collider(player, platform, undefined, () => playerBody.velocity.y >= 0);
      }

      for (const hazard of hazards) {
        this.physics.add.overlap(player, hazard, () => this.endPlay(false));
      }

      for (const goal of goals) {
        this.physics.add.overlap(player, goal, () => this.endPlay(true));
      }

      let collectiblesRemaining = collectibles.length;
      const collectTotal = collectibles.length;

      if (spec.win.type === "collect_all") {
        this.collectHud = this.add
          .text(worldWidth / 2, 64, `0/${collectTotal}`, {
            fontFamily: "Inter, ui-sans-serif, sans-serif",
            fontSize: "22px",
            fontStyle: "bold",
            color: "#FDE047",
          })
          .setOrigin(0.5)
          .setDepth(80)
          .setShadow(0, 0, "#FDE047", 12);
      }

      for (const collectible of collectibles) {
        this.physics.add.overlap(player, collectible, () => {
          if (!collectible.active || this.finished) return;

          collectible.active = false;
          if (collectible.body instanceof Phaser.Physics.Arcade.Body) {
            collectible.body.enable = false;
          }

          const runtime = runtimeByPhysics.get(collectible);
          this.burst(collectible.x, collectible.y, [0xfde047], 8, 54, 280);
          if (runtime) {
            this.tweens.killTweensOf(runtime.fxRoot);
            this.tweens.add({
              targets: runtime.fxRoot,
              scale: 1.6,
              duration: 90,
              onComplete: () => {
                this.tweens.add({
                  targets: runtime.fxRoot,
                  scale: 0,
                  alpha: 0,
                  duration: 120,
                  onComplete: () => runtime.shell.destroy(true),
                });
              },
            });
          } else {
            collectible.destroy();
          }

          collectiblesRemaining -= 1;
          if (this.collectHud) {
            this.collectHud.setText(`${collectTotal - collectiblesRemaining}/${collectTotal}`);
            this.collectHud.setScale(1.3);
            this.tweens.add({
              targets: this.collectHud,
              scale: 1,
              duration: 180,
              ease: "Back.easeOut",
            });
          }
          if (collectiblesRemaining === 0) this.endPlay(true);
        });
      }

      if (spec.win.type === "survive_ms") {
        this.surviveEndsAt = this.time.now + spec.win.ms;
        this.survivePill = this.makeTimerPill(worldWidth);
        this.time.delayedCall(spec.win.ms, () => this.endPlay(true));
      }

      for (const rule of spec.lose) {
        if (rule.type === "timeout_ms") {
          this.time.delayedCall(rule.ms, () => this.endPlay(false));
        }
      }

      this.input.on("pointerdown", () => {
        if (this.finished) {
          this.scene.restart();
          return;
        }

        if (
          spec.input === "tap_jump" &&
          (playerBody.onFloor() ||
            playerBody.blocked.down ||
            playerBody.touching.down ||
            playerBody.velocity.y >= 0)
        ) {
          playerBody.setVelocityY(spec.jumpVelocity);
          this.squashStretch(0.75, 1.3);
        }
      });
    }

    update() {
      const worldWidth = this.worldW;
      const worldHeight = this.worldH;

      for (const star of this.stars) {
        const next = stepStar(
          { x: star.visual.x, y: star.visual.y, vx: star.vx, vy: star.vy },
          worldWidth,
          worldHeight,
        );
        star.visual.setPosition(next.x, next.y);
      }

      if (!this.player || !(this.player.body instanceof Phaser.Physics.Arcade.Body)) return;

      const player = this.player;
      const playerBody = this.player.body;
      const pointer = this.input.activePointer;

      this.syncShells();

      if (this.finished) return;

      if (spec.input === "hold_thrust" && pointer.isDown) {
        playerBody.setVelocityY(spec.jumpVelocity * 0.55);
      }

      if (spec.input === "drag_x" && pointer.isDown) {
        const halfWidth = player.displayWidth / 2;
        player.x = Phaser.Math.Clamp(pointer.worldX, halfWidth, worldWidth - halfWidth);
        playerBody.setVelocityX(0);
        playerBody.updateFromGameObject();
      }

      const grounded =
        playerBody.onFloor() || playerBody.blocked.down || playerBody.touching.down;

      if (grounded && !this.wasGrounded) {
        this.squashStretch(1.25, 0.7);
        this.burst(
          player.x,
          player.y + player.displayHeight / 2,
          [0xcbd5e1],
          4,
          28,
          220,
        );
      }
      this.wasGrounded = grounded;

      if (this.breath && this.playerRuntime) {
        const locked = this.time.now < this.feelLockUntil;
        if (grounded && !locked) this.breath.resume();
        else this.breath.pause();
      }

      this.trailFrame += 1;
      if (this.trailFrame % 3 === 0 && this.playerRuntime) {
        this.spawnTrail(player.x, player.y, hexToNumber(this.playerRuntime.spec.color));
      }

      if (this.surviveLabel && spec.win.type === "survive_ms") {
        const left = Math.max(0, this.surviveEndsAt - this.time.now);
        const seconds = Math.ceil(left / 1000);
        this.surviveLabel.setText(`${seconds}s`);
        if (left <= 3000) {
          this.surviveLabel.setColor("#FDE047");
          this.survivePill?.setScale(1 + Math.sin(this.time.now / 120) * 0.06);
        }
      }

      if (spec.lose.some((rule) => rule.type === "fall_off") && player.y > worldHeight + 40) {
        this.endPlay(false);
      }
    }

    private endPlay(didWin: boolean) {
      if (this.finished || !this.player) return;
      this.finished = true;
      this.physics.pause();
      this.breath?.pause();

      if (didWin) {
        this.cameras.main.flash(250, 255, 255, 255);
        this.burst(
          this.player.x,
          this.player.y,
          CONFETTI,
          35,
          Math.min(this.worldW, this.worldH) * 0.28,
          520,
        );
        this.showResultOverlay(true);
      } else {
        const hazardColor = hexToNumber(
          spec.bodies.find((body) => body.kind === "hazard")?.color ?? "#FF4D3D",
        );
        this.cameras.main.shake(220, 0.014);
        this.flashTint(0xff2a2a, 0.35, 200);
        this.burst(this.player.x, this.player.y, [hazardColor], 14, 90, 340);
        navigator.vibrate?.(50);
        this.showResultOverlay(false);
      }

      this.time.delayedCall(1400, () => this.scene.restart());
    }

    private syncShells() {
      for (const runtime of this.runtimes) {
        if (!runtime.physics.active) continue;
        runtime.shell.setPosition(runtime.physics.x, runtime.physics.y);
      }
    }

    private decorateBody(
      bodySpec: BodySpec,
      physics: ArcadeDisplay,
      toX: (value: number) => number,
      toY: (value: number) => number,
    ): RuntimeBody {
      const width = toX(bodySpec.w);
      const height = bodySpec.shape === "circle" ? width : toY(bodySpec.h);
      const fill = hexToNumber(bodySpec.color);
      const stroke = hexToNumber(lightenHex(bodySpec.color, 0.3));
      const hideShape = Boolean(bodySpec.emoji) && bodySpec.w < 50 && bodySpec.h < 50;

      const shell = this.add.container(physics.x, physics.y);
      shell.setName("pf-shell");
      shell.setData("physics", physics);
      shell.setDepth(bodySpec.kind === "platform" ? 8 : 12);

      const fxRoot = this.add.container(0, 0);
      shell.add(fxRoot);

      let visual: Phaser.GameObjects.GameObject;
      if (bodySpec.shape === "circle") {
        const circle = this.add.circle(0, 0, width / 2, fill);
        circle.setStrokeStyle(2, stroke, 1);
        visual = circle;
      } else {
        const key = `pf-round-${spec.id}-${bodySpec.id}-${Math.round(width)}x${Math.round(height)}`;
        this.ensureRoundedTexture(key, width, height, fill, stroke);
        visual = this.add.image(0, 0, key);
      }

      if (hideShape) {
        (visual as Phaser.GameObjects.Image).setAlpha(0);
      }
      fxRoot.add(visual);

      let emoji: Phaser.GameObjects.Text | undefined;
      if (bodySpec.emoji && bodySpec.kind !== "platform") {
        emoji = this.add
          .text(0, 0, bodySpec.emoji, {
            fontFamily: EMOJI_FONT,
            fontSize: `${Math.max(18, Math.round(height * 1.1))}px`,
          })
          .setOrigin(0.5);
        fxRoot.add(emoji);
      }

      const glowTarget = hideShape ? emoji : visual;
      if (bodySpec.kind !== "platform" && glowTarget) {
        this.tryAddGlow(glowTarget, fill);
      }

      if (bodySpec.kind === "hazard") {
        this.tweens.add({
          targets: fxRoot,
          scale: 1.12,
          duration: 500,
          yoyo: true,
          repeat: -1,
        });
      }

      if (bodySpec.kind === "collectible") {
        this.tweens.add({
          targets: fxRoot,
          y: -6,
          duration: 900,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
        this.tweens.add({
          targets: fxRoot,
          angle: 360,
          duration: 7000,
          repeat: -1,
        });
      }

      if (bodySpec.kind === "goal") {
        this.tweens.add({
          targets: fxRoot,
          y: -5,
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
        const glow = getGlow(glowTarget);
        if (glow) {
          this.tweens.add({
            targets: glow,
            outerStrength: 8,
            duration: 700,
            yoyo: true,
            repeat: -1,
          });
        }
      }

      return { spec: bodySpec, physics, shell, fxRoot, visual, emoji };
    }

    private ensureRoundedTexture(
      key: string,
      width: number,
      height: number,
      fill: number,
      stroke: number,
    ) {
      const w = Math.max(2, Math.round(width));
      const h = Math.max(2, Math.round(height));
      if (this.textures.exists(key)) this.textures.remove(key);

      const radius = Math.max(4, Math.min(w, h) * 0.2);
      const g = this.add.graphics();
      g.setVisible(false);
      g.fillStyle(fill, 1);
      g.fillRoundedRect(0, 0, w, h, radius);
      g.lineStyle(2, stroke, 1);
      g.strokeRoundedRect(1, 1, Math.max(2, w - 2), Math.max(2, h - 2), radius);
      g.generateTexture(key, w, h);
      g.destroy();
    }

    private paintBackdrop(worldWidth: number, worldHeight: number) {
      const bg = this.add.graphics().setDepth(0);
      const top = hexToNumber(spec.bg);
      const bottom = hexToNumber(darkenHex(spec.bg, 0.45));
      bg.fillGradientStyle(top, top, bottom, bottom, 1, 1, 1, 1);
      bg.fillRect(0, 0, worldWidth, worldHeight);

      this.stars = [];
      for (let i = 0; i < STARFIELD_COUNT; i += 1) {
        const radius = 1.1 + Math.random() * 2.6;
        const visual = this.add
          .circle(
            Math.random() * worldWidth,
            Math.random() * worldHeight,
            radius,
            0xffffff,
            0.15 + Math.random() * 0.15,
          )
          .setDepth(1);
        this.stars.push({
          visual,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.14,
        });
      }

      const vigKey = `pf-vig-${spec.id}`;
      if (this.textures.exists(vigKey)) this.textures.remove(vigKey);
      const vignette = this.textures.createCanvas(vigKey, worldWidth, worldHeight);
      if (vignette) {
        const ctx = vignette.getContext();
        const gradient = ctx.createRadialGradient(
          worldWidth / 2,
          worldHeight / 2,
          Math.min(worldWidth, worldHeight) * 0.28,
          worldWidth / 2,
          worldHeight / 2,
          Math.max(worldWidth, worldHeight) * 0.72,
        );
        gradient.addColorStop(0, "rgba(0,0,0,0)");
        gradient.addColorStop(1, "rgba(0,0,0,0.5)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, worldWidth, worldHeight);
        vignette.refresh();
        this.add.image(worldWidth / 2, worldHeight / 2, vigKey).setDepth(2);
      }
    }

    private makeParticlePool() {
      return Array.from({ length: MAX_PARTICLES }, () =>
        this.add.circle(0, 0, 4, 0xffffff).setVisible(false).setDepth(40),
      );
    }

    private nextParticle() {
      const dot = this.particles[this.particleCursor % this.particles.length];
      this.particleCursor += 1;
      this.tweens.killTweensOf(dot);
      return dot;
    }

    private burst(
      x: number,
      y: number,
      colors: number[],
      count: number,
      distance: number,
      duration: number,
    ) {
      for (let i = 0; i < count; i += 1) {
        const dot = this.nextParticle();
        const angle = Math.random() * Math.PI * 2;
        const dist = distance * (0.3 + Math.random() * 0.7);
        const color = colors[i % colors.length];
        dot
          .setPosition(x, y)
          .setFillStyle(color, 1)
          .setRadius(2.5 + Math.random() * 3.5)
          .setScale(0.8 + Math.random() * 0.7)
          .setAlpha(1)
          .setVisible(true);
        this.tweens.add({
          targets: dot,
          x: x + Math.cos(angle) * dist,
          y: y + Math.sin(angle) * dist,
          alpha: 0,
          scale: 0.3,
          duration,
          onComplete: () => dot.setVisible(false),
        });
      }
    }

    private spawnTrail(x: number, y: number, color: number) {
      const dot = this.nextParticle();
      dot.setPosition(x, y).setFillStyle(color, 0.7).setRadius(7).setScale(1).setAlpha(0.55).setVisible(true);
      this.tweens.add({
        targets: dot,
        alpha: 0,
        scale: 0.3,
        duration: 250,
        onComplete: () => dot.setVisible(false),
      });
    }

    private squashStretch(scaleX: number, scaleY: number) {
      if (!this.playerRuntime) return;
      this.feelLockUntil = this.time.now + 180;
      this.breath?.pause();
      this.playerRuntime.fxRoot.setScale(scaleX, scaleY);
      this.tweens.add({
        targets: this.playerRuntime.fxRoot,
        scaleX: 1,
        scaleY: 1,
        duration: 90,
      });
    }

    private tryAddGlow(obj: Phaser.GameObjects.GameObject, color: number) {
      if (this.glowBudget.left <= 0) return;
      const fx = (obj as Phaser.GameObjects.Sprite).postFX;
      if (!fx) return;
      try {
        fx.addGlow(color, 4, 0, false, 0.1, 12);
        this.glowBudget.left -= 1;
      } catch {
        // Canvas renderer has no postFX pipeline.
      }
    }

    private flashTint(color: number, alpha: number, duration: number) {
      const veil = this.add
        .rectangle(this.worldW / 2, this.worldH / 2, this.worldW, this.worldH, color, alpha)
        .setDepth(90);
      this.tweens.add({
        targets: veil,
        alpha: 0,
        duration,
        onComplete: () => veil.destroy(),
      });
    }

    private showResultOverlay(didWin: boolean) {
      const panelW = this.worldW * 0.7;
      const panelH = Math.min(220, this.worldH * 0.28);
      const panel = this.add.container(this.worldW / 2, this.worldH / 2).setDepth(120).setScale(0.6);

      const card = this.add.graphics();
      card.fillStyle(0x000000, 0.65);
      card.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 24);
      card.lineStyle(2, didWin ? 0x4ade80 : 0xfb7185, 0.55);
      card.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 24);

      const emoji = this.add
        .text(0, -36, didWin ? "🏆" : "💀", {
          fontFamily: EMOJI_FONT,
          fontSize: "42px",
        })
        .setOrigin(0.5);
      const title = this.add
        .text(0, 18, didWin ? "YOU WIN" : "SO CLOSE", {
          fontFamily: "Inter, ui-sans-serif, sans-serif",
          fontSize: `${Math.max(22, Math.round(this.worldW * 0.055))}px`,
          fontStyle: "bold",
          color: "#FFFFFF",
        })
        .setOrigin(0.5);
      const hint = this.add
        .text(0, 58, "tap to retry", {
          fontFamily: "Inter, ui-sans-serif, sans-serif",
          fontSize: "14px",
          color: "#FFFFFF99",
        })
        .setOrigin(0.5);

      panel.add([card, emoji, title, hint]);
      this.tweens.add({
        targets: panel,
        scale: 1,
        duration: 250,
        ease: "Back.easeOut",
      });
    }

    private makeTimerPill(worldWidth: number) {
      const pill = this.add.container(worldWidth / 2, 58).setDepth(80);
      const bg = this.add.graphics();
      bg.fillStyle(0x000000, 0.55);
      bg.fillRoundedRect(-48, -18, 96, 36, 18);
      this.surviveLabel = this.add
        .text(0, 0, "10s", {
          fontFamily: "Inter, ui-sans-serif, sans-serif",
          fontSize: "16px",
          fontStyle: "bold",
          color: "#F8FAFC",
        })
        .setOrigin(0.5);
      pill.add([bg, this.surviveLabel]);
      return pill;
    }
  };
}

function getGlow(obj?: Phaser.GameObjects.GameObject) {
  const list = (obj as Phaser.GameObjects.Sprite | undefined)?.postFX?.list;
  return list?.find((fx) => "outerStrength" in fx) as { outerStrength: number } | undefined;
}
