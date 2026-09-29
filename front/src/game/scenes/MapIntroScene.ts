import Cookies from "js-cookie";
import * as Phaser from "phaser";
import { Scene } from "phaser";
import posthog from "posthog-js";
import { createGamePersistence } from "@/lib/persistence/gamePersistence";
import { EventBus } from "@/shared/events/event-bus";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { AudioManager, loadGlobalAudio } from "../audio";
import {
  AUTO_START_DELAY_MS,
  AUTO_START_REGISTRY_KEY,
  AUTO_START_TICK_INTERVAL_MS,
} from "../constants/AutoStart";
import { isLevelEnabled } from "../constants/FeatureFlags";
import { Actions } from "../constants/KeyBindings";
import { LayoutConfig } from "../constants/LayoutConfig";
import { MAP_MARKERS } from "../constants/MapMarkers";
import { SceneNames } from "../constants/SceneNames";
import { LEVEL_REGISTRY } from "../data/LevelConfig";
import { onKeyDown, registerScene } from "../systems/InputManager";
import type {
  CompletedLevelRecord,
  UserProgressState,
} from "../types/ProgressionTypes";

type MarkerView = {
  marker: Phaser.GameObjects.Image;
};

const MARKERS = MAP_MARKERS;

export class MapIntroScene extends Scene {
  private mapImage!: Phaser.GameObjects.Image;
  private pathGraphics!: Phaser.GameObjects.Graphics;
  private markerViews: Map<string, MarkerView> = new Map();
  private markerBaseScales: Map<string, number> = new Map();
  private markerScreenPositions = new Map<string, { x: number; y: number }>();
  private activeMarkerIndex: number = 0;
  private readonly mapKey = "brazil_map";
  private readonly markerKey = "brazil_marker";
  private readonly availableMarkerTint = 0x3b8c45;
  private readonly unavailableMarkerTint = 0x292828;
  private readonly selectedAvailableTint = 0xd9ad56;
  private readonly selectedUnavailableTint = 0x6b6767;
  private autoStartEvent?: Phaser.Time.TimerEvent;
  private autoStartStartMs = 0;
  private homeEnteredAtMs = 0;
  private completedLevels: Record<string, CompletedLevelRecord> = {};
  private isTransitioningToLevel = false;
  private maxUnlockedLevel: number = 1; // from cookie or progression:updated

  private readonly handleResize = () => {
    this.layout();
  };

  constructor() {
    super(SceneNames.INTRO);
  }

  preload() {
    this.load.setPath("assets/");
    this.load.image(this.mapKey, "misc/map.png");
    this.load.image(this.markerKey, "misc/marker.png");
    loadGlobalAudio(this);
  }

  create() {
    posthog.capture("game_home_viewed");
    this.homeEnteredAtMs = Date.now();
    this.isTransitioningToLevel = false;
    // Back on the map: map-only UI (credits button, tooltips) may show again.
    useGameUIStore.getState().setLevelTransitionActive(false);

    // Clear music started registry keys so levels can restart music on replay
    const levelIds = Object.keys(LEVEL_REGISTRY);
    for (const levelId of levelIds) {
      this.registry.remove(`music_started:${levelId}`);
    }

    this.cameras.main.setBackgroundColor(LayoutConfig.COLORS.BLACK);
    this.cameras.main.fadeIn(350, 0, 0, 0);
    AudioManager.init(this);
    AudioManager.playMusic("music.menu", 2000);

    this.mapImage = this.add
      .image(0, 0, this.mapKey)
      .setOrigin(...LayoutConfig.ALIGN.CENTER);
    this.pathGraphics = this.add.graphics();

    MARKERS.forEach((markerData, index) => {
      const marker = this.add.image(0, 0, this.markerKey).setOrigin(0.5);
      marker.setTint(this.unavailableMarkerTint);

      marker.setInteractive({ useHandCursor: true });
      marker.on("pointerdown", () => {
        if (this.activeMarkerIndex === index) {
          this.beginGame("marker_click");
        } else {
          posthog.capture("map_pin_clicked", {
            marker_id: markerData.id,
            level_id: markerData.levelId,
            is_available: this.isMarkerAvailable(index),
          });
          this.cancelAutoStart("cycled");
          this.activeMarkerIndex = index;
          this.emitMarkerChanged();
        }
      });

      this.markerViews.set(markerData.id, { marker });
    });

    onKeyDown(this, Actions.BEGIN_GAME, () => this.beginGame("spacebar"));
    onKeyDown(this, Actions.CONFIRM, () => this.beginGame("confirm"));
    onKeyDown(this, Actions.CYCLE_FORWARD, this.cycleMarkerForward);
    onKeyDown(this, Actions.CYCLE_BACKWARD, this.cycleMarkerBackward);

    registerScene(this);

    // Under Scale.FIT, this.scale.width/height stay fixed at the base game
    // resolution — only display size/letterbox margins change — so this
    // still fires on every window resize but recomputes the same layout.
    this.scale.on("resize", this.handleResize);

    const store = useGameUIStore.getState();
    const storedProgression = store.progression;
    if (storedProgression?.completedLevels) {
      this.completedLevels = storedProgression.completedLevels;
    } else {
      const userId = this.game.registry.get("userId") as string | null;
      const isGuest = this.game.registry.get("isGuest") as boolean;
      const mode = isGuest || !userId ? "guest" : "auth";
      const actorId = userId ?? "";
      const persistence = createGamePersistence({ mode, actorId });
      void persistence.loadProgress().then((snapshot) => {
        if (snapshot?.completedLevels) {
          useGameUIStore.getState().setProgression(snapshot);
          this.completedLevels = snapshot.completedLevels;
          this.layout();
          this.emitMarkerChanged();
        }
      });
    }
    if (storedProgression?.currentLevel) {
      this.maxUnlockedLevel = storedProgression.currentLevel;
    }

    // Seed from cookie (last persisted value, available before API responds)
    const levelCookie = Cookies.get("currentLevel");
    if (levelCookie) {
      const parsed = parseInt(levelCookie, 10);
      if (!isNaN(parsed))
        this.maxUnlockedLevel = Math.max(this.maxUnlockedLevel, parsed);
    }

    if (process.env.NODE_ENV === "development") {
      try {
        const raw = localStorage.getItem("gameplate:debug:completedLevels");
        if (raw) {
          this.completedLevels = JSON.parse(raw) as Record<
            string,
            CompletedLevelRecord
          >;
        }
      } catch {
        // ignore malformed JSON
      }
    }

    const onProgression = (data: UserProgressState) => {
      this.completedLevels = data.completedLevels;
      if (data.currentLevel) {
        this.maxUnlockedLevel = Math.max(
          this.maxUnlockedLevel,
          data.currentLevel,
        );
      }
      this.layout();
      this.emitMarkerChanged();
    };
    EventBus.on("progression:updated", onProgression, this);

    const onCreditsOpen = () => this.cancelAutoStart("credits");
    EventBus.on("credits:open", onCreditsOpen, this);

    // Reading the privacy notice is a deliberate pause, not idleness: the
    // countdown must not keep running and drop the player into a level while
    // they are deciding about consent (issue #864).
    const onPrivacyOpen = () => this.cancelAutoStart("privacy");
    EventBus.on("privacy:open", onPrivacyOpen, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", this.handleResize);
      this.cancelAutoStart("shutdown");
      EventBus.off("progression:updated", onProgression, this);
      EventBus.off("credits:open", onCreditsOpen, this);
      EventBus.off("privacy:open", onPrivacyOpen, this);
      posthog.capture("game_home_dwell_time", {
        dwell_ms: Date.now() - this.homeEnteredAtMs,
      });
    });

    this.layout();
    this.emitMarkerChanged();
    window.setTimeout(() => this.emitMarkerChanged(), 200);
    this.maybeStartAutoStart();
  }

  /**
   * The credits crawl and the privacy panel are full-screen React overlays,
   * but Phaser's keyboard listeners are document-level, so map keys still fire
   * behind them. Treat either one as modal and ignore map input while it is up
   * — including the auto-start countdown, which would otherwise hand the
   * player a level they are still reading a consent notice over, with the
   * panel left holding focus so they cannot move.
   */
  private isModalOpen(): boolean {
    const { creditsOpen, privacyOpen } = useGameUIStore.getState();
    return creditsOpen || privacyOpen;
  }

  private beginGame(
    source: "spacebar" | "confirm" | "marker_click" | "auto_start",
  ) {
    if (this.isTransitioningToLevel || this.isModalOpen()) {
      return;
    }

    this.cancelAutoStart("started");
    const marker = MARKERS[this.activeMarkerIndex];
    if (!this.isMarkerAvailable(this.activeMarkerIndex) || !marker.levelId) {
      return;
    }

    if (source === "spacebar") {
      posthog.capture("game_started_with_spacebar", {
        marker_id: marker.id,
        level_id: marker.levelId,
      });
    }

    if (marker.levelId) {
      this.isTransitioningToLevel = true;
      // Hide map-only UI for the whole hand-off: fade, cinematic asset load,
      // comic intro and the Game scene load, until the map is entered again.
      useGameUIStore.getState().setLevelTransitionActive(true);
      // Save level info for PhaseInfoCard before clearing map UI state
      const marker = MARKERS[this.activeMarkerIndex];
      useGameUIStore.getState().setLevelInfo({
        title: marker.title,
        location: marker.location,
        shortlocation: marker.shortlocation,
      });
      // Clear map UI state immediately when transitioning
      // This ensures MapInfoBox and MapPinTooltip disappear with the map
      useGameUIStore.getState().setActiveMapMarker(null);
      const camera = this.cameras?.main;
      if (!camera) {
        this.scene.start(SceneNames.LEVEL_CINEMATIC, {
          levelId: marker.levelId,
        });
        return;
      }

      camera.once("camerafadeoutcomplete", () => {
        this.scene.start(SceneNames.LEVEL_CINEMATIC, {
          levelId: marker.levelId,
        });
      });
      camera.fadeOut(350, 0, 0, 0);
    }
  }

  private maybeStartAutoStart() {
    const hasAutoStarted = this.registry.get(AUTO_START_REGISTRY_KEY) === true;
    if (hasAutoStarted || this.activeMarkerIndex !== 0) {
      return;
    }

    this.registry.set(AUTO_START_REGISTRY_KEY, true);
    this.autoStartStartMs = this.time.now;

    this.autoStartEvent = this.time.addEvent({
      delay: AUTO_START_TICK_INTERVAL_MS,
      loop: true,
      callback: () => {
        const elapsed = this.time.now - this.autoStartStartMs;
        const remainingMs = Math.max(0, AUTO_START_DELAY_MS - elapsed);
        EventBus.emit("map:auto-start-tick", {
          remainingMs,
          totalMs: AUTO_START_DELAY_MS,
        });

        if (remainingMs <= 0) {
          const event = this.autoStartEvent;
          this.autoStartEvent = undefined;
          event?.remove();
          EventBus.emit("map:auto-start-completed", undefined);
          this.beginGame("auto_start");
        }
      },
    });
  }

  private cancelAutoStart(
    reason: "started" | "cycled" | "shutdown" | "credits" | "privacy",
  ) {
    if (!this.autoStartEvent) {
      return;
    }
    this.autoStartEvent.remove();
    this.autoStartEvent = undefined;
    // "shutdown" is the exception: the scene is going away and the React
    // overlay is unmounting with it, so there is no progress bar left to
    // clear and no player to inform.
    if (reason !== "shutdown") {
      EventBus.emit("map:auto-start-canceled", undefined);
    }
  }

  private isMarkerAvailable(index: number): boolean {
    const marker = MARKERS[index];
    // Feature-gate levels still in development so they don't appear
    // unlocked on the map before they're ready to ship.
    if (marker?.levelId && !isLevelEnabled(marker.levelId)) {
      return false;
    }

    // index is 0-based; maxUnlockedLevel is 1-based (level number)
    // e.g. maxUnlockedLevel=1 → only index 0 (level_01) is available
    //      maxUnlockedLevel=2 → index 0 and 1 are available
    return index < this.maxUnlockedLevel;
  }

  private emitMarkerChanged() {
    const marker = MARKERS[this.activeMarkerIndex];
    const position = this.markerScreenPositions.get(marker.id);
    const isAvailable = this.isMarkerAvailable(this.activeMarkerIndex);
    const isCompleted = !!(
      marker.levelId && this.completedLevels[marker.levelId]
    );
    const data = {
      markerId: marker.id,
      title: marker.title,
      shortlocation: marker.shortlocation,
      location: marker.location,
      isAvailable,
      isCompleted,
      image: marker.image,
      levelId: marker.levelId,
      screenX: position?.x ?? 0,
      screenY: position?.y ?? 0,
    };
    EventBus.emit("map:marker-changed", data);
    useGameUIStore.getState().setActiveMapMarker(data);
  }

  private cycleMarkerForward = () => {
    if (this.isModalOpen()) {
      return;
    }
    this.cancelAutoStart("cycled");
    this.activeMarkerIndex = (this.activeMarkerIndex + 1) % MARKERS.length;
    this.emitMarkerChanged();
  };

  private cycleMarkerBackward = () => {
    if (this.isModalOpen()) {
      return;
    }
    this.cancelAutoStart("cycled");
    this.activeMarkerIndex =
      (this.activeMarkerIndex - 1 + MARKERS.length) % MARKERS.length;
    this.emitMarkerChanged();
  };

  update(time: number) {
    const normalizedPulse = (Math.sin(time * 0.004) + 1) * 1.1;

    MARKERS.forEach((markerData, index) => {
      const view = this.markerViews.get(markerData.id);
      const baseScale = this.markerBaseScales.get(markerData.id);

      if (!view || baseScale === undefined) {
        return;
      }

      const isActive = index === this.activeMarkerIndex;
      const isAvailable = this.isMarkerAvailable(index);

      if (isActive) {
        const scale = baseScale * (1 + normalizedPulse * 0.55);
        view.marker.setScale(scale);
        view.marker.setTint(
          isAvailable
            ? this.selectedAvailableTint
            : this.selectedUnavailableTint,
        );
      } else {
        view.marker.setScale(baseScale * 0.85);
        view.marker.setTint(
          isAvailable ? this.availableMarkerTint : this.unavailableMarkerTint,
        );
      }
    });
  }

  private applyFontScaling(_w: number, _h: number) {
    // Font scaling is now handled by React/MUI in MapInfoBox component
  }

  private layout() {
    const { width, height } = this.scale;
    this.cameras.main.setSize(width, height);
    this.applyFontScaling(width, height);

    const source = this.textures.get(this.mapKey).getSourceImage() as {
      width: number;
      height: number;
    };

    const mapScale = Math.max(width / source.width, height / source.height);

    const mapWidth = source.width * mapScale;
    const mapHeight = source.height * mapScale;
    const centerX = width / 2;
    const centerY = height / 2;
    const mapLeft = centerX - mapWidth / 2;
    const mapTop = centerY - mapHeight / 2;

    this.mapImage.setPosition(centerX, centerY);
    this.mapImage.setDisplaySize(mapWidth, mapHeight);

    this.pathGraphics.clear();
    this.pathGraphics.lineStyle(3, LayoutConfig.COLORS.BLACK_HEX, 0.95);

    MARKERS.forEach((markerData, index) => {
      const x = mapLeft + mapWidth * markerData.x;
      const y = mapTop + mapHeight * markerData.y;
      this.markerScreenPositions.set(markerData.id, { x, y });

      const view = this.markerViews.get(markerData.id);
      if (!view) {
        return;
      }

      const markerSource = this.textures
        .get(this.markerKey)
        .getSourceImage() as {
        width: number;
        height: number;
      };
      const markerTargetSize = Phaser.Math.Clamp(
        Math.min(width, height) * 0.035,
        22,
        42,
      );
      const markerScale = markerTargetSize / markerSource.width;
      const isActive = index === this.activeMarkerIndex;
      const isAvailable = this.isMarkerAvailable(index);

      this.markerBaseScales.set(markerData.id, markerScale);
      view.marker.setScale(isActive ? markerScale : markerScale * 0.85);
      view.marker.setPosition(x, y);
      view.marker.setTint(
        isActive
          ? isAvailable
            ? this.selectedAvailableTint
            : this.selectedUnavailableTint
          : isAvailable
            ? this.availableMarkerTint
            : this.unavailableMarkerTint,
      );
    });

    this.emitMarkerChanged();

    for (let i = 0; i < MARKERS.length - 1; i++) {
      const current = this.markerScreenPositions.get(MARKERS[i].id);
      const next = this.markerScreenPositions.get(MARKERS[i + 1].id);

      if (current && next) {
        this.drawDottedLine(current.x, current.y, next.x, next.y);
      }
    }
  }

  private drawDottedLine(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const distance = Math.hypot(dx, dy);

    if (distance === 0) {
      return;
    }

    const dashLength = 14;
    const gapLength = 10;
    const stepX = dx / distance;
    const stepY = dy / distance;

    for (let offset = 0; offset < distance; offset += dashLength + gapLength) {
      const start = offset;
      const end = Math.min(offset + dashLength, distance);

      const line = new Phaser.Geom.Line(
        fromX + stepX * start,
        fromY + stepY * start,
        fromX + stepX * end,
        fromY + stepY * end,
      );

      this.pathGraphics.strokeLineShape(line);
    }
  }
}
