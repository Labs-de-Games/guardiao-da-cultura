import { Scene } from "phaser";
import { EventBus } from "../../shared/events/event-bus";
import { SceneNames } from "../constants/SceneNames";
import type { IntroConfig } from "../../ui/intro/types";

/**
 * LevelCinematic - Triggers the React-based comic cinematic introduction
 *
 * This scene is a thin wrapper that:
 * 1. Loads the intro configuration JSON
 * 2. Emits an event to React to start the IntroSequence
 * 3. Waits for the intro to complete
 * 4. Transitions to the Game scene
 *
 * All the visual rendering is handled by React components in `front/src/ui/intro/`.
 */
export class LevelCinematic extends Scene {
  private levelId: string = "level_01";
  private introConfig: IntroConfig | null = null;

  constructor() {
    super(SceneNames.LEVEL_CINEMATIC);
  }

  init(data?: { levelId: string }) {
    if (data?.levelId) {
      this.levelId = data.levelId;
    }
    this.introConfig = null;
  }

  preload() {
    // Load the intro configuration JSON
    this.load.json(
      "intro_config",
      `assets/data/levels/${this.levelId}/intro/intro_config.json`
    );
  }

  create() {
    // Get the loaded config
    const configData = this.cache.json.get("intro_config") as IntroConfig;

    if (!configData) {
      console.warn(`LevelCinematic: No intro_config.json found for level ${this.levelId}, skipping to game`);
      this.transitionToGame();
      return;
    }

    this.introConfig = configData;

    // Listen for intro completion from React
    EventBus.once("intro:complete", (data: { levelId: string }) => {
      if (data.levelId === this.levelId) {
        this.transitionToGame();
      }
    });

    // Emit event to React to start the intro
    EventBus.emit("intro:start", {
      levelId: this.levelId,
      config: this.introConfig,
    });
  }

  /**
   * Transition to the Game scene
   */
  private transitionToGame() {
    this.scene.start(SceneNames.GAME, { levelId: this.levelId });
  }

  shutdown() {
    // Clean up event listener if scene is shut down before intro completes
    EventBus.off("intro:complete");
  }
}
