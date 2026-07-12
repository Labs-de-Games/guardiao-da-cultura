import { Scene } from "phaser";
import { EventBus } from "../../shared/events/event-bus";
import type { IntroConfig } from "../../ui/intro/types";
import { AudioManager, loadGlobalAudio, loadLevelAudio } from "../audio";
import { SceneNames } from "../constants/SceneNames";

/**
 * LevelCinematic - Triggers the React-based comic cinematic introduction
 *
 * This scene is a thin wrapper that:
 * 1. Loads the intro configuration JSON and all level audio assets
 * 2. Emits an event to React to start the IntroSequence
 * 3. Waits for the mask reveal to start playing level music
 * 4. Waits for the intro to complete
 * 5. Transitions to the Game scene
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
    this.load.setPath("assets/");

    // Load the intro configuration JSON (relative to assets/)
    this.load.json(
      "intro_config",
      `data/levels/${this.levelId}/intro/intro_config.json`,
    );

    // Preload all audio assets during the cinematic intro
    // so they're ready when the Game scene starts
    loadGlobalAudio(this);
    loadLevelAudio(this, this.levelId);
  }

  create() {
    // Get the loaded config
    const configData = this.cache.json.get("intro_config") as IntroConfig;

    if (!configData) {
      this.transitionToGame();
      return;
    }

    this.introConfig = configData;

    // Initialize AudioManager with this scene so it can play music
    // during the mask reveal transition
    AudioManager.init(this);

    // Listen for mask reveal start from React to begin playing music
    EventBus.once("intro:music-start", (data: { levelId: string }) => {
      if (data.levelId === this.levelId) {
        // Play intro track, which will seamlessly transition to loop
        AudioManager.playMusic("music.level_1.intro", 2000);
      }
    });

    // Listen for intro completion from React
    EventBus.once("intro:complete", (data: { levelId: string }) => {
      if (data.levelId === this.levelId) {
        this.transitionToGame();
      }
    });

    // Listen for scene shutdown to clean up event listeners
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);

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
    // Clean up event listeners if scene is shut down before intro completes
    EventBus.off("intro:complete");
    EventBus.off("intro:music-start");
  }
}
