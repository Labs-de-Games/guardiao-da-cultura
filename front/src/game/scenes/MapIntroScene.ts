import { Scene } from "phaser";
import { LayoutConfig } from "../constants/LayoutConfig";
import { SceneNames } from "../constants/SceneNames";

type MapMarker = {
  id: string;
  label: string;
  x: number;
  y: number;
  title: string;
  location: string;
};

type MarkerView = {
  marker: Phaser.GameObjects.Image;
};

const MARKERS: MapMarker[] = [
  {
    id: "brumadinho",
    label: "Brumadinho, MG",
    x: 0.66,
    y: 0.69,
    title: "Inhotim",
    location: "Brumadinho, Minas Gerais",
  },
  {
    id: "blumenau",
    label: "Blumenau, SC",
    x: 0.57,
    y: 0.83,
    title: "Oktoberfest",
    location: "Blumenau, Santa Catarina",
  },
  {
    id: "cuiaba",
    label: "Cuiabá, MT",
    x: 0.46,
    y: 0.53,
    title: "FIT Pantanal",
    location: "Cuiabá, Mato Grosso",
  },
  {
    id: "manaus",
    label: "Manaus, AM",
    x: 0.34,
    y: 0.28,
    title: "Teatro Amazonas",
    location: "Manaus, Amazonas",
  },
  {
    id: "recife",
    label: "Recife, PE",
    x: 0.72,
    y: 0.46,
    title: "Galo da Madrugada",
    location: "Recife, Pernambuco",
  },
  {
    id: "brasilia",
    label: "Brasília, DF",
    x: 0.59,
    y: 0.58,
    title: "Grande Centro Cultural",
    location: "Brasília, Distrito Federal",
  },
];

export class MapIntroScene extends Scene {
  private mapImage!: Phaser.GameObjects.Image;
  private pathGraphics!: Phaser.GameObjects.Graphics;
  private markerViews: Map<string, MarkerView> = new Map();
  private markerBaseScales: Map<string, number> = new Map();
  private infoBox!: Phaser.GameObjects.Container;
  private infoTitle!: Phaser.GameObjects.Text;
  private infoLocation!: Phaser.GameObjects.Text;
  private infoCta!: Phaser.GameObjects.Text;
  private activeMarkerIndex: number = 0;
  private readonly mapKey = "brazil_map";
  private readonly markerKey = "brazil_marker";
  private readonly availableMarkerTint = 0x020802;
  private readonly unavailableMarkerTint = 0x292828;

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

    MARKERS.forEach((markerData) => {
      const marker = this.add.image(0, 0, this.markerKey).setOrigin(0.5);
      marker.setTint(this.unavailableMarkerTint);
      this.markerViews.set(markerData.id, { marker });
    });

    this.createInfoBox();

    this.input.keyboard?.on("keydown-SPACE", this.beginGame, this);
    this.input.keyboard?.on("keydown-UP", this.cycleMarkerForward, this);
    this.input.keyboard?.on("keydown-LEFT", this.cycleMarkerBackward, this);
    this.input.keyboard?.on("keydown-DOWN", this.cycleMarkerBackward, this);
    this.input.keyboard?.on("keydown-RIGHT", this.cycleMarkerForward, this);
    this.input.keyboard?.on("keydown-W", this.cycleMarkerForward, this);
    this.input.keyboard?.on("keydown-A", this.cycleMarkerBackward, this);
    this.input.keyboard?.on("keydown-S", this.cycleMarkerBackward, this);
    this.input.keyboard?.on("keydown-D", this.cycleMarkerForward, this);

    this.scale.on("resize", this.handleResize); // Listens for resize events and calls the handleResize method when the game is resized.

    // Clean up listeners when the scene is shutdown to prevent memory leaks and unintended behavior if the scene is restarted.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", this.handleResize);
      this.input.keyboard?.off("keydown-SPACE", this.beginGame, this);
      this.input.keyboard?.off("keydown-UP", this.cycleMarkerForward, this);
      this.input.keyboard?.off("keydown-DOWN", this.cycleMarkerBackward, this);
      this.input.keyboard?.off("keydown-LEFT", this.cycleMarkerBackward, this);
      this.input.keyboard?.off("keydown-RIGHT", this.cycleMarkerForward, this);
      this.input.keyboard?.off("keydown-W", this.cycleMarkerForward, this);
      this.input.keyboard?.off("keydown-A", this.cycleMarkerBackward, this);
      this.input.keyboard?.off("keydown-S", this.cycleMarkerBackward, this);
      this.input.keyboard?.off("keydown-D", this.cycleMarkerForward, this);
    });

    this.layout();
  }

  private beginGame() {
    if (this.activeMarkerIndex === 0) {
      this.scene.start(SceneNames.GAME, { levelId: "level_01" });
    }
  }

  private createInfoBox() {
    const height = this.scale.height;
    const padding = 15;

    this.infoBox = this.add.container(padding, height - padding);
    this.infoBox.setScrollFactor(0);

    const boxBackground = this.add.rectangle(
      50,
      -100,
      530,
      200,
      LayoutConfig.COLORS.MAP_BG,
      0.92,
    ); // x, y, width, height, color, alpha
    boxBackground.setOrigin(...LayoutConfig.ALIGN.BOTTOM_LEFT);

    this.infoTitle = this.add.text(65, -225, "", {
      fontFamily: LayoutConfig.FONTS.TITLE,
      fontSize: LayoutConfig.FONTS.SIZES.TITLE_LARGE,
      color: LayoutConfig.COLORS.INFO_TITLE,
    });
    this.infoTitle.setOrigin(...LayoutConfig.ALIGN.BOTTOM_LEFT);

    this.infoLocation = this.add.text(65, -180, "", {
      fontFamily: LayoutConfig.FONTS.BODY,
      fontSize: LayoutConfig.FONTS.SIZES.BODY,
      color: LayoutConfig.COLORS.INFO_BODY,
    });
    this.infoLocation.setOrigin(...LayoutConfig.ALIGN.BOTTOM_LEFT);

    this.infoCta = this.add.text(65, -130, "", {
      fontFamily: LayoutConfig.FONTS.BODY,
      fontSize: LayoutConfig.FONTS.SIZES.METADATA,
      color: LayoutConfig.COLORS.AVAILABLE_GREEN,
    });
    this.infoCta.setOrigin(...LayoutConfig.ALIGN.BOTTOM_LEFT);

    this.infoBox.add([
      boxBackground,
      this.infoTitle,
      this.infoLocation,
      this.infoCta,
    ]);
    this.updateInfoBox();
  }

  private updateInfoBox() {
    const marker = MARKERS[this.activeMarkerIndex];
    this.infoTitle.setText(marker.title);
    this.infoLocation.setText(marker.location);

    if (this.activeMarkerIndex === 0) {
      this.infoCta.setText("Aperte ESPAÇO para jogar");
      this.infoCta.setColor(LayoutConfig.COLORS.AVAILABLE_GREEN);
    } else {
      this.infoCta.setText("Em reforma");
      this.infoCta.setColor(LayoutConfig.COLORS.UNAVAILABLE_RED);
    }
  }

  private cycleMarkerForward = () => {
    this.activeMarkerIndex = (this.activeMarkerIndex + 1) % MARKERS.length;
    this.updateInfoBox();
  };

  private cycleMarkerBackward = () => {
    this.activeMarkerIndex =
      (this.activeMarkerIndex - 1 + MARKERS.length) % MARKERS.length;
    this.updateInfoBox();
  };

  update(time: number) {
    const normalizedPulse = (Math.sin(time * 0.004) + 1) * 1.1;

    MARKERS.forEach((markerData, index) => {
      const view = this.markerViews.get(markerData.id);
      const baseScale = this.markerBaseScales.get(markerData.id);

      if (!view || baseScale === undefined) {
        return;
      }

      // Only pulsate the active marker
      if (index === this.activeMarkerIndex) {
        const scale = baseScale * (1 + normalizedPulse * 0.15);
        view.marker.setScale(scale);
      } else {
        view.marker.setScale(baseScale);
      }
    });
  }

  private applyFontScaling(w: number, h: number) {
    const scale = Math.min(w / 1920, h / 1080);
    this.infoTitle.setFontSize(
      Math.round(LayoutConfig.FONTS.SIZES.TITLE_LARGE * scale),
    );
    this.infoLocation.setFontSize(
      Math.round(LayoutConfig.FONTS.SIZES.BODY * scale),
    );
    this.infoCta.setFontSize(
      Math.round(LayoutConfig.FONTS.SIZES.METADATA * scale),
    );
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
