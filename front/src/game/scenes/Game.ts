import { Scene } from "phaser";
import { GameEvents } from "../constants/GameEvents";
import { LayoutConfig } from "../constants/LayoutConfig";
import { SceneNames } from "../constants/SceneNames";
import { LEVEL_ASSETS, PHASE_SETTINGS } from "../data/LevelConfig";
import { LevelQuizData } from "../data/LevelQuizData";
import { MissionRegistry, MissionRequirements } from "../data/MissionRegistry";
import { EffectsManager } from "../objects/EffectsManager";
import { Enemy } from "../objects/Enemy";
import { LevelManager } from "../objects/LevelManager";
import { type MapData, MapManager } from "../objects/MapManager";
import { Npc } from "../objects/Npc";
import { NPC_ANIMS } from "../objects/NpcConfig";
import { Player } from "../objects/Player";
import { PLAYER_SPAWN } from "../objects/PlayerConfig";
import { QuestManager, QuestStatus } from "../objects/QuestManager";
import type { INpcEntity } from "../types/EntityTypes";

export class Game extends Scene {
  player!: Player;
  rat!: Enemy;
  npcs: Npc[] = [];
  questManager!: QuestManager;
  stairsLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  private effects!: EffectsManager;
  private levelManager!: LevelManager;
  private isInventoryOpen: boolean = false;
  private isControlsOverlayOpen: boolean = false;
  private isInspectTutorialOpen: boolean = false;

  constructor() {
    super(SceneNames.GAME);
  }

  preload() {
    this.load.setPath("assets/");
    Player.preload(this);
    Npc.preload(this);
    Enemy.preload(this);

    // Assets dinâmicos do nível (Task 40)
    this.load.tilemapTiledJSON(LEVEL_ASSETS.MAP.key, LEVEL_ASSETS.MAP.json);
    this.load.image(LEVEL_ASSETS.MAP.tileset, LEVEL_ASSETS.MAP.tilesetImg);

    LEVEL_ASSETS.RELICS.forEach((asset) =>
      this.load.image(asset.key, asset.path),
    );
    LEVEL_ASSETS.OTHERS.forEach((asset) =>
      this.load.image(asset.key, asset.path),
    );

    this.load.spritesheet("sparkle", "sparkle.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
  }

  create() {
    this.effects = new EffectsManager(this);
    this.createAnimations();

    const map = this.make.tilemap({
      key: LEVEL_ASSETS.MAP.key,
      tileWidth: 16,
      tileHeight: 16,
    });

    let mapData: MapData | null = null;
    const tileset = map.addTilesetImage("dungeon", LEVEL_ASSETS.MAP.tileset);

    if (tileset) {
      mapData = MapManager.setupMap(this, map, tileset, 6);

      this.stairsLayer = mapData.tileLayers["Stairs"] || null;
    }

    // Initialize Systems
    this.questManager = new QuestManager(MissionRequirements);
    this.levelManager = new LevelManager(
      this,
      this.questManager,
      this.effects,
      PHASE_SETTINGS.MAX_STARS,
    );

    this.setupEvents();

    this.scene.launch(SceneNames.UI, {
      phaseTitle: PHASE_SETTINGS.TITLE,
      missionsTotal: Object.keys(MissionRegistry).length,
      questManager: this.questManager,
      missionDefs: MissionRegistry,
    });
    this.scene.bringToTop(SceneNames.UI);

    if (mapData) {
      this.createEntities(mapData);
      this.setupCollisions(mapData.colliders);
    }
    this.setupCameras();

    if (this.isControlsOverlayOpen && this.player) {
      this.player.isInDialogue = true;
    }
  }

  private setupEvents() {
    this.events.on(GameEvents.DIALOGUE_STARTED, () => {
      if (this.player) this.player.isInDialogue = true;
      this.effects.setZoom(1.2, 400);
    });

    this.events.on(GameEvents.DIALOGUE_ENDED, () => {
      this.time.delayedCall(200, () => {
        if (this.player) this.player.isInDialogue = false;

        if (this.npcs) {
          for (const npc of this.npcs) {
            npc.play("npc_idle_anim", true);
          }
        }
      });

      this.effects.setZoom(1.0, 400);
    });

    this.events.on(GameEvents.INVENTORY_OPENED, () => {
      this.isInventoryOpen = true;
      if (this.player) this.player.isInDialogue = true;
    });

    this.events.on(GameEvents.INVENTORY_CLOSED, () => {
      this.isInventoryOpen = false;
      this.checkDialogState();
    });

    this.events.on(GameEvents.CONTROLS_OVERLAY_OPENED, () => {
      this.isControlsOverlayOpen = true;
      if (this.player) this.player.isInDialogue = true;
    });

    this.events.on(GameEvents.CONTROLS_OVERLAY_CLOSED, () => {
      this.isControlsOverlayOpen = false;
      this.checkDialogState();
    });

    this.events.on(GameEvents.INSPECT_TUTORIAL_OPENED, () => {
      this.isInspectTutorialOpen = true;
      if (this.player) this.player.isInDialogue = true;
    });

    this.events.on(GameEvents.INSPECT_TUTORIAL_CLOSED, () => {
      this.isInspectTutorialOpen = false;
      this.checkDialogState();
    });

    this.events.on("inspect-mode-toggled", (isInspecting: boolean) => {
      this.effects.setZoom(isInspecting ? 1.8 : 1.0, 500);
      if (this.effects.vignetteEffect) {
        this.effects.setVignette(
          this.effects.vignetteEffect,
          isInspecting ? 0.6 : 0.9,
          500,
        );
      }
    });
  }

  private createAnimations() {
    Player.createAnims(this);
    Npc.createAnims(this);
    Enemy.createAnims(this);

    if (!this.anims.exists("sparkle_hint_anim")) {
      this.anims.create({
        key: "sparkle_hint_anim",
        frames: this.anims.generateFrameNumbers("sparkle", {
          start: 0,
          end: 5,
        }),
        frameRate: 8,
        repeat: -1,
      });
    }
  }

  private createEntities(mapData: MapData) {
    this.npcs = MapManager.createNpcs(this, mapData, 6);

    // 2. Static placements (Rat could be in Tiled too, but keeping one example for now)
    this.rat = new Enemy(this, 2000, 315, 1);

    // 3. Player Spawn
    let spawnX = PLAYER_SPAWN.X;
    let spawnY = PLAYER_SPAWN.Y;

    const spawnLayer = mapData.objectLayers["PlayerSpawn"];
    if (spawnLayer && spawnLayer.objects) {
      const spawnPoint = spawnLayer.objects.find(
        (obj: any) => obj.name === "SpawnPoint",
      );
      if (spawnPoint) {
        spawnX = (spawnPoint.x || 0) * 6;
        spawnY = (spawnPoint.y || 0) * 6;
      }
    }

    this.player = new Player(this, spawnX, spawnY, PLAYER_SPAWN.TEXTURE);
    this.player.stairsLayer = this.stairsLayer;

    for (const npc of this.npcs) {
      npc.setPlayerTracking(this.player);
      npc.setQuestManager(this.questManager);
    }

    // 4. Interactive Items (Task 38 - Data-Driven)
    const interactiveItems = MapManager.createInteractiveObjects(
      this,
      mapData,
      6,
      (key) => {
        const changed = this.questManager.collectInfo(key);
        if (changed) this.events.emit(GameEvents.MISSION_PROGRESS_CHANGED);
      },
    );

    // Track items globally
    Object.values(interactiveItems).forEach((item) =>
      item.setPlayerTracking(this.player),
    );

    // 5. Phase Complete Decoration (Special behavior for portal)
    const endPhase_btn = interactiveItems["phase_complete_portal"];

    if (endPhase_btn) {
      endPhase_btn.interaction.onInteract = () => {
        this.levelManager.completePhase();
      };

      const endPhase_container = this.add.container(0, -60);
      const floatStar = this.add.image(-10, 0, "star").setScale(2.5);
      const endPhase_floatText = this.add
        .text(6, 0, `0/${PHASE_SETTINGS.MAX_STARS}`, {
          fontSize: "22px",
          color: LayoutConfig.COLORS.STAR_YELLOW,
          fontStyle: "bold",
          stroke: LayoutConfig.COLORS.BLACK,
          strokeThickness: 4,
        })
        .setOrigin(0, 0.5);

      endPhase_container.add([floatStar, endPhase_floatText]);
      endPhase_btn.add(endPhase_container);

      let isEndPhaseActive = false;
      this.events.on(GameEvents.MISSION_STATUS_CHANGED, () => {
        const collected = this.questManager.getTotalCompletedMissions();
        endPhase_floatText.setText(`${collected}/${PHASE_SETTINGS.MAX_STARS}`);

        if (collected >= PHASE_SETTINGS.MAX_STARS && !isEndPhaseActive) {
          isEndPhaseActive = true;
        }
      });
    }
  }

  public startQuiz(missionId: string) {
    try {
      const questions = LevelQuizData[missionId];
      if (!questions || questions.length === 0) {
        console.error(
          `[Game] Quiz data missing or empty for missionId: ${missionId}`,
        );
        this.events.emit(GameEvents.SHOW_DIALOGUE_REQUEST, [
          "[Erro de Sistema] Não há perguntas cadastradas para esta missão.",
        ]);
        return;
      }

      if (!this.questManager) {
        throw new Error("QuestManager não inicializado");
      }

      this.events.emit(
        GameEvents.SHOW_QUIZ_REQUEST,
        questions,
        (score: number) => {
          const isSuccess = score >= questions.length;

          const npc = this.npcs.find((n) => {
            const ent = n as unknown as INpcEntity;
            return ent.config && ent.config.missionId === missionId;
          });

          if (!npc) {
            console.error(
              `[Game] NPC não encontrado para a missão: ${missionId}`,
            );
            return;
          }

          // Obtém diálogos dinamicamente da config do NPC (Task 37)
          const dialogues = npc.getDialogues();
          const lines = isSuccess ? dialogues.success : dialogues.failure;

          if (isSuccess) {
            this.questManager.setStatus(missionId, QuestStatus.COMPLETED);
            this.events.emit(GameEvents.MISSION_STATUS_CHANGED);

            npc.play(NPC_ANIMS.GIVING_STAR.key);

            this.questManager.setPendingResult(missionId, lines);
            this.levelManager.updateProgress();
            this.events.emit(GameEvents.SHOW_DIALOGUE_REQUEST, [...lines], () =>
              this.questManager.clearPendingResult(missionId),
            );
          } else {
            this.questManager.setStatus(missionId, QuestStatus.READY_FOR_QUIZ);
            this.events.emit(GameEvents.MISSION_STATUS_CHANGED);

            this.questManager.setPendingResult(missionId, lines);
            this.events.emit(GameEvents.SHOW_DIALOGUE_REQUEST, [...lines], () =>
              this.questManager.clearPendingResult(missionId),
            );
          }
        },
      );
    } catch (error) {
      console.error("[Game] Erro fatal ao iniciar Quiz:", error);
      this.events.emit(GameEvents.SHOW_DIALOGUE_REQUEST, [
        "Ocorreu um erro ao carregar o desafio.",
      ]);
    }
  }

  private checkDialogState() {
    if (
      !this.isInventoryOpen &&
      !this.isControlsOverlayOpen &&
      !this.isInspectTutorialOpen
    ) {
      if (this.player) this.player.isInDialogue = false;
    }
  }

  private setupCollisions(colliders: Phaser.Tilemaps.TilemapLayer[]) {
    colliders.forEach((layer) => {
      if (layer) {
        this.physics.add.collider(this.player, layer);
        this.physics.add.collider(this.rat, layer);
        for (const npc of this.npcs) {
          this.physics.add.collider(npc, layer);
        }
      }
    });
  }

  private setupCameras() {
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    this.levelManager.updateProgress();
  }

  update(_time: number, _delta: number) {}
}
