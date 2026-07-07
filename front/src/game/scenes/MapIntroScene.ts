import { Scene } from "phaser";
import { EventBus } from "@/shared/events/event-bus";
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

type MarkerView = {
  marker: Phaser.GameObjects.Image;
};

const MARKERS = MAP_MARKERS;

export class MapIntroScene extends Scene {
  private mapImage!: Phaser.GameObjects.Image;
  private pathGraphics!: Phaser.GameObjects.Graphics;
  private markerViews: Map<string, MarkerView> = new Map();
  private markerBaseScales: Map<string, number> = new Map();
  private activeMarkerIndex: number = 0;
  private readonly mapKey = "brazil_map";
  private readonly markerKey = "brazil_marker";
  private readonly availableMarkerTint = 0x020802;
  private readonly unavailableMarkerTint = 0x292828;
  private autoStartEvent?: Phaser.Time.TimerEvent;
  private autoStartStartMs = 0;

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
    this.cameras.main.setBackgroundColor(LayoutConfig.COLORS.BLACK);
    this.cameras.main.fadeIn(350, 0, 0, 0);

    this.mapImage = this.add
      .image(0, 0, this.mapKey)
      .setOrigin(...LayoutConfig.ALIGN.CENTER);
    this.pathGraphics = this.add.graphics();

    MARKERS.forEach((markerData, index) => {
      const marker = this.add.image(0, 0, this.markerKey).setOrigin(0.5);
      marker.setTint(this.unavailableMarkerTint);

      // Make markers interactive
      marker.setInteractive({ useHandCursor: true });
      marker.on("pointerdown", () => {
        this.activeMarkerIndex = index;
        this.emitMarkerChanged();
        if (index === 0) {
          this.beginGame();
        }
      });

      this.markerViews.set(markerData.id, { marker });
    });

    onKeyDown(this, Actions.BEGIN_GAME, () => this.beginGame());
    onKeyDown(this, Actions.CONFIRM, () => this.beginGame());
    onKeyDown(this, Actions.CYCLE_FORWARD, this.cycleMarkerForward);
    onKeyDown(this, Actions.CYCLE_BACKWARD, this.cycleMarkerBackward);

    registerScene(this);

    this.scale.on("resize", this.handleResize);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", this.handleResize);
      this.cancelAutoStart("shutdown");
    });

    this.layout();
    this.emitMarkerChanged();
    this.maybeStartAutoStart();
  }

  private beginGame() {
    this.cancelAutoStart("started");
    if (this.activeMarkerIndex === 0) {
      EventBus.emit("map:marker-changed", null);
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
          this.beginGame();
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
    if (reason === "started") {
      EventBus.emit("map:auto-start-canceled", undefined);
    }
  }

  private emitMarkerChanged() {
    const marker = MARKERS[this.activeMarkerIndex];
    EventBus.emit("map:marker-changed", {
      title: marker.title,
      location: marker.location,
      isAvailable: this.activeMarkerIndex === 0,
      image: marker.image,
    });
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
    const normalizedPulse = (Math.sin(time * 0.004) + 1) * 1.1; // Pulsating effect of the map markers.

    MARKERS.forEach((markerData, index) => {
      const view = this.markerViews.get(markerData.id);
      const baseScale = this.markerBaseScales.get(markerData.id);

      if (!view || baseScale === undefined) {
        return;
      }

      // Only pulsate the active marker
      if (index === this.activeMarkerIndex) {
        const scale = baseScale * (1 + normalizedPulse * 0.55); // Pulsating effect of the active marker.
        view.marker.setScale(scale);
      } else {
        view.marker.setScale(baseScale);
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

    // Cover mode keeps map fullscreen while preserving aspect ratio.
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

    const markerPositions = new Map<string, { x: number; y: number }>();

    MARKERS.forEach((markerData, index) => {
      const x = mapLeft + mapWidth * markerData.x;
      const y = mapTop + mapHeight * markerData.y;
      markerPositions.set(markerData.id, { x, y });

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
      const isAvailable = index === 0;

      this.markerBaseScales.set(markerData.id, markerScale);
      view.marker.setScale(markerScale);
      view.marker.setPosition(x, y);
      view.marker.setTint(
        isAvailable ? this.availableMarkerTint : this.unavailableMarkerTint,
      );
    });

    for (let i = 0; i < MARKERS.length - 1; i++) {
      const current = markerPositions.get(MARKERS[i].id);
      const next = markerPositions.get(MARKERS[i + 1].id);

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
