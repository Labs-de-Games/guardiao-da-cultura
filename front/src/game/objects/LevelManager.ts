import * as Phaser from "phaser";
import { GameEvents } from "../constants/GameEvents";
import { SceneNames } from "../constants/SceneNames";
import type { UIScene } from "../scenes/UIScene";
import type { EffectsManager } from "./EffectsManager";
import type { QuestManager } from "./QuestManager";

export class LevelManager {
  private scene: Phaser.Scene;
  private questManager: QuestManager;
  private effects: EffectsManager;
  private maxMissions: number;
  private initialGrayscale: number = 0.82;

  constructor(
    scene: Phaser.Scene,
    questManager: QuestManager,
    effects: EffectsManager,
    maxMissions: number = 4,
  ) {
    this.scene = scene;
    this.questManager = questManager;
    this.effects = effects;
    this.maxMissions = maxMissions;

    this.setupEvents();
  }

  private setupEvents() {
    this.scene.events.on(
      GameEvents.MISSION_STATUS_CHANGED,
      this.updateProgress,
      this,
    );
  }

  public updateProgress() {
    const completed = this.questManager.getTotalCompletedMissions();
    const progress = completed / this.maxMissions;

    const grayscaleValue = Phaser.Math.Linear(
      this.initialGrayscale,
      0.0,
      progress,
    );
    this.effects.setGrayscale(grayscaleValue);
  }

  public completePhase() {
    const collected = this.questManager.getTotalCompletedMissions();
    const uiScene = this.scene.scene.get(SceneNames.UI) as UIScene;

    if (uiScene) {
      uiScene.showPhaseCompleteUI(collected, this.maxMissions);
    }
  }

  public cleanup() {
    this.scene.events.off(
      GameEvents.MISSION_STATUS_CHANGED,
      this.updateProgress,
      this,
    );
  }
}
