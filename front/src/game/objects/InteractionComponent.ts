import * as Phaser from "phaser";
import posthog from "posthog-js";
import { sendGameEvent } from "../../lib/analyticsApi";
import { AudioManager } from "../audio";
import { GameEvents } from "../constants/GameEvents";
import { Actions } from "../constants/KeyBindings";
import { LayoutConfig } from "../constants/LayoutConfig";
import { offKeyDown, onKeyDown } from "../systems/InputManager";
import { GameEventType } from "../types/AnalyticsTypes";
import type { IPlayerState } from "../types/EntityTypes";

export interface InteractionOptions {
  interactionDistance?: number;
  dialogText?: string;
  dialogueLines?: string[];
  infoKey?: string;
  gapX?: number;
  gapY?: number;
  onInteract?: () => void;
  onInfoCollected?: (infoKey: string) => void;

  // Hint system (placeholder animation after inactivity)
  enableHint?: boolean;
  hintDelayMs?: number;
  hintOffsetX?: number;
  hintOffsetY?: number;
  hintScale?: number;
}

export class InteractionComponent {
  private scene: Phaser.Scene;
  private parent: Phaser.GameObjects.GameObject & { x: number; y: number };
  private playerRef: Phaser.Physics.Arcade.Sprite | null = null;

  private promptContainer: Phaser.GameObjects.Container;

  public isPromptVisible: boolean = false;

  private interactionDistance: number;
  private dialogMessage: string;
  private dialogueLines: string[] | null = null;
  private infoKey: string | null = null;
  public onInteract: (() => void) | null = null;
  private onInfoCollected: ((key: string) => void) | null = null;

  private handleInteract: () => void;
  private lastInteractionTime: number = 0;
  private readonly INTERACTION_COOLDOWN: number = 250;

  private hintEnabled: boolean;
  private hintDelayMs: number;
  private hintOffsetX: number;
  private hintOffsetY: number;
  private hintScale: number;
  private hintCompleted: boolean = false;
  private hintSprite: Phaser.GameObjects.Sprite | null = null;
  private hintTimer: Phaser.Time.TimerEvent | null = null;

  constructor(
    scene: Phaser.Scene,
    parent: Phaser.GameObjects.GameObject & { x: number; y: number },
    options?: InteractionOptions,
  ) {
    this.scene = scene;
    this.parent = parent;
    this.interactionDistance = options?.interactionDistance ?? 130;
    this.dialogMessage = options?.dialogText ?? "Interação!";
    this.dialogueLines = options?.dialogueLines ?? null;
    this.infoKey = options?.infoKey ?? null;
    this.onInteract = options?.onInteract ?? null;
    this.onInfoCollected = options?.onInfoCollected ?? null;

    this.hintEnabled = options?.enableHint ?? false;
    this.hintDelayMs = options?.hintDelayMs ?? 15000;
    this.hintOffsetX = options?.hintOffsetX ?? 0;
    this.hintOffsetY = options?.hintOffsetY ?? -90;
    this.hintScale = options?.hintScale ?? 3;

    this.armHint();

    // Prompt UI disabled intentionally; interaction still works via spacebar.
    this.promptContainer = scene.add.container(parent.x, parent.y - 30);
    this.promptContainer.setVisible(false);
    // const promptBg = scene.add
    //   .rectangle(options?.gapX ?? 0, options?.gapY ?? 0, 30, 30, 0x000000, 0.8)
    //   .setStrokeStyle(2, 0xffffff);
    // const promptText = scene.add
    //   .text(options?.gapX ?? 0, options?.gapY ?? 0, "ESPAÇO", {
    //     fontSize: "20px",
    //     color: LayoutConfig.COLORS.WHITE,
    //     fontStyle: "bold",
    //   })
    //   .setOrigin(0.5);
    // this.promptContainer.add([promptBg, promptText]);

    // Setup Key Listener
    this.handleInteract = () => {
      const player = this.playerRef as unknown as IPlayerState;
      if (player?.isInDialogue) return;

      const now = Date.now();
      if (now - this.lastInteractionTime < this.INTERACTION_COOLDOWN) return;

      if (this.isPromptVisible) {
        this.lastInteractionTime = now;
        this.markInteracted();

        const metadata: Record<string, unknown> = {
          eventName: "object.inspected",
          inspectable: true,
          levelId: this.scene.registry.get("currentLevelId"),
          levelNumber: this.scene.registry.get("currentLevelNumber"),
        };

        if (this.infoKey) {
          metadata.infoKey = this.infoKey;
        }

        const parentWithName = this.parent as Phaser.GameObjects.GameObject & {
          name?: string;
        };

        if (parentWithName.name) {
          metadata.objectId = parentWithName.name;
        }

        if ("texture" in this.parent) {
          const textureKey = (this.parent as Phaser.GameObjects.Sprite).texture
            ?.key;
          if (textureKey) {
            metadata.objectType = textureKey;
          }
        }

        sendGameEvent({
          type: GameEventType.EVENT_LOGGED,
          timestamp: new Date().toISOString(),
          metadata,
        }).catch((err) => {
          console.error(
            "[InteractionComponent] Failed to log interaction:",
            err,
          );
        });

        // Play interaction sound (random variation from pool)
        AudioManager.playSfx("sfx.clue.inspect");

        if (this.dialogueLines) {
          if (this.onInteract) this.onInteract();
        } else {
          this.showDialog();
          if (this.infoKey && this.onInfoCollected) {
            this.onInfoCollected(this.infoKey);
          }
          if (this.onInteract) this.onInteract();
        }
      }
    };
    onKeyDown(scene, Actions.INTERACT, this.handleInteract);

    parent.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.destroy();
    });
  }

  setPlayerTracking(player: Phaser.Physics.Arcade.Sprite) {
    this.playerRef = player;
  }

  setDialogMessage(message: string) {
    this.dialogMessage = message;
  }

  update() {
    this.promptContainer.setPosition(this.parent.x, this.parent.y - 40);

    if (this.hintSprite) {
      this.hintSprite.setPosition(
        this.parent.x + this.hintOffsetX,
        this.parent.y + this.hintOffsetY,
      );
    }

    if (!this.playerRef) return;

    const dist = Phaser.Math.Distance.Between(
      this.parent.x,
      this.parent.y,
      this.playerRef.x,
      this.playerRef.y,
    );

    if (dist <= this.interactionDistance && !this.isPromptVisible) {
      this.isPromptVisible = true;
      this.promptContainer.setVisible(true);
      this.scene.events.emit(GameEvents.INTERACTION_PROMPT_SHOWN, this.parent);
    } else if (dist > this.interactionDistance && this.isPromptVisible) {
      this.isPromptVisible = false;
      this.promptContainer.setVisible(false);
      this.scene.events.emit(GameEvents.INTERACTION_PROMPT_HIDDEN, this.parent);
    }
  }

  private armHint() {
    if (!this.hintEnabled) return;
    if (this.hintCompleted) return;
    if (this.hintTimer) return;

    this.hintTimer = this.scene.time.delayedCall(this.hintDelayMs, () => {
      this.hintTimer = null;
      if (this.hintCompleted) return;
      this.showHint();
    });
  }

  private disarmHint() {
    if (this.hintTimer) {
      this.hintTimer.remove(false);
      this.hintTimer = null;
    }
    this.hideHint();
  }

  private showHint() {
    if (!this.hintEnabled) return;
    if (this.hintCompleted) return;

    // Play clue inspect sound (random variation from pool)
    AudioManager.playSfx("sfx.clue.inspect");

    posthog.capture("clue_used", {
      level_id: this.scene.registry.get("currentLevelId"),
      clue_index: this.parent.name || "unknown",
    });

    if (!this.hintSprite) {
      this.hintSprite = this.scene.add.sprite(
        this.parent.x + this.hintOffsetX,
        this.parent.y + this.hintOffsetY,
        "placeholder",
        0,
      );
      this.hintSprite.setOrigin(...LayoutConfig.ALIGN.CENTER);
      this.hintSprite.setScale(this.hintScale);
      this.hintSprite.setDepth(50);

      this.hintSprite.once(Phaser.GameObjects.Events.DESTROY, () => {
        this.hintSprite = null;
      });
    }

    this.hintSprite.setVisible(true);
    if (this.scene.anims.exists("placeholder_hint_anim")) {
      this.hintSprite.play("placeholder_hint_anim", true);
    }
  }

  private hideHint() {
    if (!this.hintSprite) return;
    this.hintSprite.setVisible(false);
    this.hintSprite.stop();
  }

  private markInteracted() {
    if (this.hintCompleted) return;
    this.hintCompleted = true;
    this.disarmHint();
    if (this.hintSprite) {
      this.hintSprite.destroy();
      this.hintSprite = null;
    }
  }

  private showDialog() {
    this.scene.events.emit(GameEvents.SHOW_DIALOGUE_REQUEST, [
      this.dialogMessage,
    ]);
  }

  destroy() {
    if (this.isPromptVisible) {
      this.scene.events.emit(GameEvents.INTERACTION_PROMPT_HIDDEN, this.parent);
    }
    offKeyDown(this.scene, Actions.INTERACT, this.handleInteract);
    this.promptContainer.destroy();

    this.disarmHint();
    if (this.hintSprite) {
      this.hintSprite.destroy();
      this.hintSprite = null;
    }
  }
}
