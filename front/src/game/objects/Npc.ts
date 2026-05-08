import * as Phaser from "phaser";
import { GameEvents } from "../constants/GameEvents";
import type { Game } from "../scenes/Game";
import type { NpcDialogues, QuizQuestion } from "../types/GameDataTypes";
import { InteractionComponent } from "./InteractionComponent";
import { NPC_ANIMS, NPC_ASSETS, NPC_PHYSICS } from "./NpcConfig";
import { type QuestManager, QuestStatus } from "./QuestManager";

export interface NpcConfig {
  missionId: string;
  dialogues: NpcDialogues;
  quiz?: QuizQuestion[];
  name?: string;
}

export class Npc extends Phaser.Physics.Arcade.Sprite {
  interaction: InteractionComponent;
  private questManager: QuestManager | null = null;
  private exclamationIcon: Phaser.GameObjects.Image;
  private missionAccepted: boolean = false;
  private config: NpcConfig;

  static preload(scene: Phaser.Scene) {
    scene.load.spritesheet(
      NPC_ASSETS.IDLE_SPRITESHEET.key,
      NPC_ASSETS.IDLE_SPRITESHEET.path,
      {
        frameWidth: NPC_ASSETS.IDLE_SPRITESHEET.frameWidth,
        frameHeight: NPC_ASSETS.IDLE_SPRITESHEET.frameHeight,
      },
    );
  }

  static createAnims(scene: Phaser.Scene) {
    if (!scene.anims.exists(NPC_ANIMS.IDLE.key)) {
      scene.anims.create({
        key: NPC_ANIMS.IDLE.key,
        frames: scene.anims.generateFrameNumbers(
          NPC_ANIMS.IDLE.spritesheet as string,
          { frames: NPC_ANIMS.IDLE.frames as unknown as number[] },
        ),
        frameRate: NPC_ANIMS.IDLE.frameRate,
        repeat: NPC_ANIMS.IDLE.repeat,
      });
    }
  }

  constructor(scene: Phaser.Scene, x: number, y: number, config: NpcConfig) {
    super(scene, x, y, NPC_ASSETS.IDLE_SPRITESHEET.key);
    this.config = config;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setScale(NPC_PHYSICS.SCALE);

    this.play(NPC_ANIMS.IDLE.key);

    this.interaction = new InteractionComponent(scene, this, {
      dialogueLines: [],
      onInteract: () => this.handleInteraction(),
      gapX: 0,
      gapY: NPC_PHYSICS.INTERACTION_GAP_Y,
    });

    this.exclamationIcon = scene.add
      .image(x, y + NPC_PHYSICS.EXCLAMATION_GAP_Y, "exclamation")
      .setScale(4);

    this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    this.once(
      Phaser.GameObjects.Events.DESTROY,
      () => {
        this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
      },
      this,
    );

    if (config.name) {
      this.setData("name", config.name);
    }
  }

  public getQuiz() {
    return this.config.quiz;
  }

  public getName() {
    return this.config.name || "Mentor";
  }

  public getDialogues() {
    return this.config.dialogues;
  }

  setQuestManager(qm: QuestManager) {
    this.questManager = qm;
  }

  private handleInteraction() {
    if (!this.questManager) {
      console.warn("[Npc] QuestManager not found!");
      return;
    }
    const missionId = this.config.missionId;
    const status = this.questManager.getStatus(missionId);
    const game = this.scene as Game;

    const pending = this.questManager.getPendingResult(missionId);
    if (pending) {
      this.scene.events.emit(GameEvents.SHOW_DIALOGUE_REQUEST, pending, () => {
        this.questManager?.clearPendingResult(missionId);
      });
      return;
    }

    const lines = this.getDialogueLines(status);
    if (!lines || lines.length === 0) {
      this.scene.events.emit(GameEvents.SHOW_DIALOGUE_REQUEST, [
        "Olá! No momento não tenho nada para dizer.",
      ]);
      return;
    }

    this.scene.events.emit(GameEvents.SHOW_DIALOGUE_REQUEST, lines, () => {
      this.onDialogueComplete(status, game);
    });
  }

  private getDialogueLines(status: QuestStatus): string[] {
    const d = this.config.dialogues;
    switch (status) {
      case QuestStatus.IDLE:
        return d.intro;
      case QuestStatus.COLLECTING:
        return d.collecting;
      case QuestStatus.READY_FOR_QUIZ:
        return d.ready;
      case QuestStatus.COMPLETED:
        return d.completed;
      default:
        return [];
    }
  }

  private onDialogueComplete(status: QuestStatus, game: Game) {
    const missionId = this.config.missionId;

    if (status === QuestStatus.IDLE) {
      this.questManager?.setStatus(missionId, QuestStatus.COLLECTING);
      this.scene.events.emit(GameEvents.MISSION_ACCEPTED, missionId);
      this.missionAccepted = true;
      if (this.exclamationIcon?.active) this.exclamationIcon.destroy();
    } else if (status === QuestStatus.READY_FOR_QUIZ) {
      this.questManager?.setStatus(missionId, QuestStatus.QUIZ_ACTIVE);
      game.startQuiz(missionId);
    }
  }

  setPlayerTracking(player: Phaser.Physics.Arcade.Sprite) {
    this.interaction.setPlayerTracking(player);
  }

  update(_ts: number, _dt: number) {
    this.interaction.update();

    if (
      !this.missionAccepted &&
      this.exclamationIcon &&
      this.exclamationIcon.active
    ) {
      this.exclamationIcon.setVisible(!this.interaction.isPromptVisible);
    }
  }
}
