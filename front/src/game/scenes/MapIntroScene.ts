import { Scene } from "phaser";
import posthog from "posthog-js";
import { EventBus } from "@/shared/events/event-bus";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import {
  AUTO_START_DELAY_MS,
  AUTO_START_REGISTRY_KEY,
  AUTO_START_TICK_INTERVAL_MS,
} from "../constants/AutoStart";
import { Actions } from "../constants/KeyBindings";
import { LayoutConfig } from "../constants/LayoutConfig";
import { MAP_MARKERS } from "../constants/MapMarkers";
import { SceneNames } from "../constants/SceneNames";
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
  }

  create() {
    posthog.capture("game_home_viewed");
    this.homeEnteredAtMs = Date.now();

    this.cameras.main.setBackgroundColor(LayoutConfig.COLORS.BLACK);
    this.cameras.main.fadeIn(350, 0, 0, 0);

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

    this.scale.on("resize", this.handleResize);

    const storedProgression = useGameUIStore.getState().progression;
    if (storedProgression?.completedLevels) {
      this.completedLevels = storedProgression.completedLevels;
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
      this.layout();
      this.emitMarkerChanged();
    };
    EventBus.on("progression:updated", onProgression, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", this.handleResize);
      this.cancelAutoStart("shutdown");
      EventBus.off("progression:updated", onProgression, this);
      posthog.capture("game_home_dwell_time", {
        dwell_ms: Date.now() - this.homeEnteredAtMs,
      });
    });

    this.layout();
    this.emitMarkerChanged();
    window.setTimeout(() => this.emitMarkerChanged(), 200);
    this.maybeStartAutoStart();
  }

  private beginGame(
    source: "spacebar" | "confirm" | "marker_click" | "auto_start",
  ) {
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

    if (marker.levelId === "level_01") {
      this.scene.start(SceneNames.LEVEL_CINEMATIC, { levelId: "level_01" });
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

  private cancelAutoStart(reason: "started" | "cycled" | "shutdown") {
    if (!this.autoStartEvent) {
      return;
    }
    this.autoStartEvent.remove();
    this.autoStartEvent = undefined;
    if (reason === "started" || reason === "cycled") {
      EventBus.emit("map:auto-start-canceled", undefined);
    }
  }

  private isMarkerAvailable(index: number): boolean {
    if (index === 0) return true;
    const prev = MARKERS[index - 1];
    return !!(prev.levelId && this.completedLevels[prev.levelId]);
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
    this.cancelAutoStart("cycled");
    this.activeMarkerIndex = (this.activeMarkerIndex + 1) % MARKERS.length;
    this.emitMarkerChanged();
  };

  private cycleMarkerBackward = () => {
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
