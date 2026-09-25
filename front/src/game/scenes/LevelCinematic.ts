import * as Phaser from "phaser";
import { Scene } from "phaser";
import { EventBus } from "../../shared/events/event-bus";
import type { IntroConfig } from "../../ui/intro/types";
import { useGameUIStore } from "../../ui/state/game-ui-store";
import { AudioManager, loadGlobalAudio, loadLevelAudio } from "../audio";
import { INVESTIGATION_LEVEL_ID } from "../constants/Investigation";
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
  private introConfigCacheKey: string = "";
  private unsubIntroComplete?: () => void;

  constructor() {
    super(SceneNames.LEVEL_CINEMATIC);
  }

  init(data?: { levelId: string }) {
    // Every route into a level funnels through this scene (map start and the
    // level -> level "Próxima fase" hand-off), so this is the one place that
    // can reliably hide map-only UI for the whole transition.
    useGameUIStore.getState().setLevelTransitionActive(true);

    if (data?.levelId) {
      this.levelId = data.levelId;
    }
    this.introConfig = null;
    this.introConfigCacheKey = `intro_config:${this.levelId}`;
  }

  preload() {
    // Set base path for all assets loaded in this scene
    this.load.setPath("assets/");

    // Ensure we never reuse stale config from another level.
    if (this.cache.json.exists(this.introConfigCacheKey)) {
      this.cache.json.remove(this.introConfigCacheKey);
    }

    // Load the intro configuration JSON (relative to assets/)
    this.load.json(
      this.introConfigCacheKey,
      `data/levels/${this.levelId}/intro/intro_config.json`,
    );

    // Preload all audio assets during the cinematic intro
    // so they're ready when the Game scene starts
    loadGlobalAudio(this);
    loadLevelAudio(this, this.levelId);
  }

  create() {
    // Get the loaded config
    const configData = this.cache.json.get(
      this.introConfigCacheKey,
    ) as IntroConfig | null;

    if (!configData) {
      this.transitionToGame();
      return;
    }

    this.introConfig = configData;

    // Initialize AudioManager with this scene so it can play music
    // during the mask reveal transition
    AudioManager.init(this);

    // Listen for intro completion from React
    this.unsubIntroComplete = EventBus.on("intro:complete", (data) => {
      if (data.levelId !== this.levelId) return;
      this.transitionToGame();
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
   * Transition to whatever this level's content actually is.
   *
   * The suspect identification phase is an investigation screen rather than a
   * playable level, but it still enters through this cinematic so the player
   * gets the same loading screen, comic panels and mask reveal as every other
   * phase. Only the final hop differs.
   */
  private transitionToGame() {
    if (this.levelId === INVESTIGATION_LEVEL_ID) {
      this.scene.start(SceneNames.INVESTIGATION);
      return;
    }

    this.scene.start(SceneNames.GAME, { levelId: this.levelId });
  }

  shutdown() {
    // Note: Don't call AudioManager.destroy() here - music should continue
    // into the Game scene. AudioManager.init() in Game scene will handle
    // the transition and resume any playing music and destroy it there.
    this.unsubIntroComplete?.();
    this.unsubIntroComplete = undefined;

    // Keep cache tidy across retries/hot reloads
    if (
      this.introConfigCacheKey &&
      this.cache.json.exists(this.introConfigCacheKey)
    ) {
      this.cache.json.remove(this.introConfigCacheKey);
    }
  }
}
