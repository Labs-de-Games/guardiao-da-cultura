import Cookies from "js-cookie";
import * as Phaser from "phaser";
import { Scene } from "phaser";
import posthog from "posthog-js";
import {
  createGamePersistence,
  type GamePersistence,
  type PersistedCollectible,
} from "@/lib/persistence/gamePersistence";
import { EventBus } from "@/shared/events/event-bus";
import type { IntroConfig } from "@/ui/intro/types";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { AudioManager, loadGlobalAudio } from "../audio";
import {
  INVESTIGATION_LEVEL_ID,
  INVESTIGATION_LEVEL_NUMBER,
  INVESTIGATION_MIN_CLUES,
  INVESTIGATION_MUSIC_VOLUME,
} from "../constants/Investigation";
import { SceneNames } from "../constants/SceneNames";
import { getOrderedLevelIds, LEVEL_REGISTRY } from "../data/LevelConfig";
import { ProgressionManager } from "../objects/ProgressionManager";
import type { CollectiblesJson } from "../types/GameDataTypes";
import type {
  InvestigationClue,
  InvestigationCluesJson,
  InvestigationPayload,
  SuspectsJson,
} from "../types/InvestigationTypes";
import type { UserProgressState } from "../types/ProgressionTypes";

const SUSPECTS_KEY = "investigation_suspects";
const CLUES_KEY = "investigation_clues";
const OUTRO_KEY = "investigation_outro_config";
/** The arrest cinematic keeps its art and its config in its own folder. */
const OUTRO_DIR = "suspect-arrested";
const collectiblesCacheKey = (levelId: string) =>
  `investigation_collectibles:${levelId}`;

/**
 * InvestigationScene — the suspect identification phase.
 *
 * A thin scene in the same spirit as `LevelCinematic`: it gathers the dossier
 * (which clues the player actually collected, the suspects, the clue→trait
 * correlations), hands it to React, and writes the result back to progression.
 * All rendering lives in `front/src/ui/investigation/`.
 *
 * Entry is always via `LevelCinematic` with `levelId: INVESTIGATION_LEVEL_ID`,
 * so the narrative opening plays exactly like a real phase.
 */
export class InvestigationScene extends Scene {
  private persistence!: GamePersistence;
  private progressionManager = new ProgressionManager();
  private unsubCompleted?: () => void;
  private unsubExit?: () => void;
  private unsubOutro?: () => void;
  private unsubOutroDone?: () => void;
  private unsubCreditsDone?: () => void;
  /**
   * Whether the credits are owed at the end of this run.
   *
   * Only a first completion earns them: the phase is replayable for a better
   * star score, and a player grinding for five stars should not have to sit
   * through the credits on every attempt. Read from the dossier rather than
   * from progression, because the result is written the moment the accusation
   * resolves — by the time the ending plays, progression already says the
   * phase is complete.
   */
  private creditsPending = false;

  constructor() {
    super(SceneNames.INVESTIGATION);
  }

  preload() {
    this.load.setPath("assets/");

    // Already cached by the cinematic that leads here; loading again is a cache
    // hit and keeps the scene standing on its own if it is ever entered direct.
    loadGlobalAudio(this);

    this.load.json(SUSPECTS_KEY, "data/investigation/suspects.json");
    this.load.json(CLUES_KEY, "data/investigation/clues.json");
    this.load.json(
      OUTRO_KEY,
      `data/levels/${INVESTIGATION_LEVEL_ID}/${OUTRO_DIR}/outro_config.json`,
    );

    // Every playable level's clue content, so the dossier can show clues from
    // all three phases regardless of which one the player came from.
    for (const levelId of getOrderedLevelIds()) {
      const [path] = LEVEL_REGISTRY[levelId].data.collectibles;
      if (path) {
        this.load.json(collectiblesCacheKey(levelId), path);
      }
    }
  }

  create() {
    // LevelCinematic.init() set this for the hand-off; the investigation screen
    // is the destination, and GameOverlay renders nothing while it is true.
    useGameUIStore.getState().setLevelTransitionActive(false);

    this.cameras.main.setBackgroundColor("#000000");

    // The React screen covers the canvas, but it still plays the game's sound
    // effects — the singleton has to point at a live scene for that to work.
    AudioManager.init(this);

    // Quieter than a level, and re-applied on every entry rather than once:
    // the phase's mute button moves this setting, and so can the player
    // between visits.
    AudioManager.setMusicVolume(INVESTIGATION_MUSIC_VOLUME);

    const userId = this.game.registry.get("userId") as string | null;
    const isGuest = this.game.registry.get("isGuest") as boolean;
    this.persistence = createGamePersistence({
      mode: isGuest || !userId ? "guest" : "auth",
      actorId: userId ?? "",
    });

    this.unsubCompleted = EventBus.on("investigation:completed", (data) => {
      void this.recordResult(data.stars, data.wrongAttempts);
    });

    this.unsubExit = EventBus.on("investigation:exit", () => {
      this.scene.start(SceneNames.INTRO);
    });

    this.unsubOutro = EventBus.on("investigation:outro", () => {
      this.playOutro();
    });

    // Both endings — the culprit named, or the curator naming him after four
    // misses — close on the same arrest cinematic.
    this.unsubOutroDone = EventBus.on("intro:complete", (data) => {
      if (data.levelId !== INVESTIGATION_LEVEL_ID) return;
      this.finishOutro();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);

    void this.buildAndEmitPayload();
  }

  private async buildAndEmitPayload() {
    const suspectsJson = this.cache.json.get(
      SUSPECTS_KEY,
    ) as SuspectsJson | null;
    const cluesJson = this.cache.json.get(
      CLUES_KEY,
    ) as InvestigationCluesJson | null;

    if (!suspectsJson?.suspects?.length || !cluesJson?.clues?.length) {
      console.error("[InvestigationScene] Missing investigation data");
      this.scene.start(SceneNames.INTRO);
      return;
    }

    const traitLabels = new Map(
      cluesJson.traits.map((trait) => [trait.id, trait.label]),
    );

    const levelIds = getOrderedLevelIds();
    const collectedByLevel = new Map<string, Set<string>>();
    const progressSnapshot = await this.loadProgressSafely();

    await Promise.all(
      levelIds.map(async (levelId) => {
        const collected = await this.loadCollectiblesSafely(levelId);
        collectedByLevel.set(
          levelId,
          new Set(collected.map((item) => item.collectibleId)),
        );
      }),
    );

    const collectedClues: InvestigationClue[] = [];
    const uncollectedClues: InvestigationClue[] = [];

    for (const link of cluesJson.clues) {
      const levelData = this.cache.json.get(
        collectiblesCacheKey(link.levelId),
      ) as { collectibles?: CollectiblesJson } | null;
      const data = levelData?.collectibles?.CLUE_VILLAIN?.[link.clueId];

      // A clue the correlation file knows about but the level content does not
      // define yet: skip rather than render an empty card.
      if (!data) continue;

      const wasCollected =
        collectedByLevel.get(link.levelId)?.has(link.clueId) ?? false;

      const clue: InvestigationClue = {
        key: `${link.levelId}:${link.clueId}`,
        levelId: link.levelId,
        clueId: link.clueId,
        title: data.metadata.title,
        metadata: data.metadata,
        educational: data.educational,
        traitId: link.traitId,
        traitLabel: traitLabels.get(link.traitId) ?? link.traitId,
        source: wasCollected ? "player" : "curator",
      };

      (wasCollected ? collectedClues : uncollectedClues).push(clue);
    }

    // The player can reach this screen having picked up almost nothing. Top the
    // dossier up from the curator's own files so the deduction stays solvable.
    const topUpCount = Math.max(
      0,
      INVESTIGATION_MIN_CLUES - collectedClues.length,
    );
    const clues = [...collectedClues, ...uncollectedClues.slice(0, topUpCount)];

    const payload: InvestigationPayload = {
      clues,
      suspects: suspectsJson.suspects,
      traits: cluesJson.traits,
      collectedCount: collectedClues.length,
      previousStars:
        progressSnapshot?.completedLevels?.[INVESTIGATION_LEVEL_ID]?.stars ?? 0,
    };

    this.creditsPending = payload.previousStars === 0;

    posthog.capture("investigation_opened", {
      collected_clues: collectedClues.length,
      shown_clues: clues.length,
      previous_stars: payload.previousStars,
    });

    EventBus.emit("investigation:start", payload);
  }

  /**
   * Hand the arrest cinematic to React.
   *
   * It is the same machinery every phase opens with — `intro:start` and the
   * `IntroSequence` that listens for it — pointed at this phase's own folder,
   * so the ending reads as a bookend to the opening rather than a new device.
   * A missing or broken config must not strand the player on the result panel,
   * so it falls through to whatever comes after the cinematic.
   */
  private playOutro() {
    const config = this.cache.json.get(OUTRO_KEY) as IntroConfig | null;
    if (!config?.panels?.length) {
      console.warn("[InvestigationScene] No outro config; skipping cinematic");
      this.finishOutro();
      return;
    }

    EventBus.emit("intro:start", {
      levelId: INVESTIGATION_LEVEL_ID,
      config,
    });
  }

  /** Credits on a first completion, then the map — which is where every run ends. */
  private finishOutro() {
    if (!this.creditsPending) {
      this.scene.start(SceneNames.INTRO);
      return;
    }
    this.creditsPending = false;

    // The credits screen closes itself; the map is what should be behind it.
    this.unsubCreditsDone = EventBus.on("credits:close", () => {
      this.unsubCreditsDone?.();
      this.unsubCreditsDone = undefined;
      this.scene.start(SceneNames.INTRO);
    });
    EventBus.emit("credits:open", undefined);
  }

  /**
   * Persist the run. `recordLevelCompleted` already keeps `max(stars)`, which is
   * exactly the "preserve the best result" rule, and bumps `currentLevel` so the
   * map keeps the phase unlocked.
   */
  private async recordResult(stars: number, wrongAttempts: number) {
    const snapshot = await this.loadProgressSafely();
    if (snapshot) {
      this.progressionManager.hydrate(snapshot);
    }

    this.progressionManager.recordLevelCompleted(
      INVESTIGATION_LEVEL_ID,
      INVESTIGATION_LEVEL_NUMBER,
      stars,
      0,
      new Date().toISOString(),
    );

    const state = this.progressionManager.getState();

    posthog.capture("investigation_completed", {
      stars,
      wrong_attempts: wrongAttempts,
      total_stars: state.totalStars,
    });

    try {
      await this.persistence.saveProgress(state);
      // Mirrors PersistenceBridge.saveProgress — MapIntroScene seeds its unlock
      // gate from this cookie before the API responds.
      Cookies.set("currentLevel", String(state.currentLevel), { expires: 365 });
    } catch (error) {
      console.error("[InvestigationScene] Failed to save progress", error);
    }

    useGameUIStore.getState().setProgression(state);
    EventBus.emit("progression:updated", state);
  }

  private async loadProgressSafely(): Promise<UserProgressState | null> {
    try {
      return await this.persistence.loadProgress();
    } catch (error) {
      console.error("[InvestigationScene] Failed to load progress", error);
      return null;
    }
  }

  private async loadCollectiblesSafely(
    levelId: string,
  ): Promise<PersistedCollectible[]> {
    try {
      return await this.persistence.loadCollectibles(levelId);
    } catch (error) {
      console.error(
        `[InvestigationScene] Failed to load collectibles for ${levelId}`,
        error,
      );
      return [];
    }
  }

  shutdown() {
    this.unsubCompleted?.();
    this.unsubCompleted = undefined;
    this.unsubExit?.();
    this.unsubExit = undefined;
    this.unsubOutro?.();
    this.unsubOutro = undefined;
    this.unsubOutroDone?.();
    this.unsubOutroDone = undefined;
    this.unsubCreditsDone?.();
    this.unsubCreditsDone = undefined;

    useGameUIStore.getState().closeInvestigation();

    for (const key of [
      SUSPECTS_KEY,
      CLUES_KEY,
      OUTRO_KEY,
      ...getOrderedLevelIds().map(collectiblesCacheKey),
    ]) {
      if (this.cache.json.exists(key)) {
        this.cache.json.remove(key);
      }
    }
  }
}
