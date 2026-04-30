import { Scene } from "phaser";
import { GameEvents } from "../constants/GameEvents";
import { LayoutConfig } from "../constants/LayoutConfig";
import { MissionIds, MissionKeys } from "../constants/MissionConstants";
import { SceneNames } from "../constants/SceneNames";
import {
  BADGE_ASSETS,
  LEVEL_ASSETS,
  LEVEL_REGISTRY,
  type LevelDefinition,
  PHASE_SETTINGS,
} from "../data/LevelConfig";
import { MissionRegistry, MissionRequirements } from "../data/MissionRegistry";
import { PictureMechanicHandler } from "../mechanics/handlers/PictureMechanicHandler";
import { MechanicsManager } from "../mechanics/MechanicsManager";
import { EffectsManager } from "../objects/EffectsManager";
import { Enemy } from "../objects/Enemy";
import { CarryableItem } from "../objects/interactables/CarryableItem";
import { DraggableItem } from "../objects/interactables/DraggableItem";
import type { InteractableItem } from "../objects/interactables/InteractableItem";
import { LevelManager } from "../objects/LevelManager";
import { MapManager } from "../objects/MapManager";
import { Npc } from "../objects/Npc";
import { NPC_ANIMS } from "../objects/NpcConfig";
import { Player } from "../objects/Player";
import { PLAYER_SPAWN } from "../objects/PlayerConfig";
import { QuestManager, QuestStatus } from "../objects/QuestManager";
import { BadgeSystem } from "../systems/BadgeSystem";
import { ObjectLayerProcessor } from "../systems/ObjectLayerProcessor";
import { PlaceholderSystem } from "../systems/PlaceholderSystem";
import { type MapData, TiledMapLoader } from "../systems/TiledMapLoader";
import type { INpcEntity } from "../types/EntityTypes";
import type {
  ContentJson,
  InteractionSubmittedData,
  WorkData,
} from "../types/GameDataTypes";
import { InteractableType } from "../types/InteractableTypes";
import { DataUtils } from "../utils/DataUtils";

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
  private isChunkSelectorOpen: boolean = false;
  private isDialogueOpen: boolean = false;
  private objectLayerProcessor!: ObjectLayerProcessor;
  public placeholderSystem!: PlaceholderSystem;
  public badgeSystem!: BadgeSystem;
  public mechanicsManager!: MechanicsManager;
  private draggableItems: DraggableItem[] = [];
  private carryableItems: CarryableItem[] = [];
  private itemsInteracted: Set<string> = new Set();

  private levelId: string = "level_01";
  private levelDef!: LevelDefinition;
  private contentData: ContentJson = {
    works: { PAINTINGS: {}, SCULPTURES: {}, PICTURES: {} },
    quizzes: {},
    npcs: {},
    messages: { SYSTEM_DIALOGUES: {} },
  };

  constructor() {
    super(SceneNames.GAME);
  }

  init(data?: { levelId: string }) {
    this.levelId = data?.levelId || "level_01";
    this.levelDef = LEVEL_REGISTRY[this.levelId];

    if (!this.levelDef) {
      console.error(
        `[Game] Level definition not found for ID: ${this.levelId}`,
      );
      this.levelDef = LEVEL_REGISTRY.level_01;
    }
  }

  preload() {
    this.load.setPath("assets/");
    Player.preload(this);
    Npc.preload(this);
    Enemy.preload(this);

    this.load.tilemapTiledJSON(this.levelDef.map.key, this.levelDef.map.json);
    this.load.image(this.levelDef.map.tileset, this.levelDef.map.tilesetImg);

    LEVEL_ASSETS.OTHERS.forEach((asset) => {
      this.load.image(asset.key, asset.path);
    });
    LEVEL_ASSETS.SCULPTURES.forEach((asset) => {
      this.load.image(asset.key, asset.path);
    });
    LEVEL_ASSETS.PAINTINGS.forEach((asset) => {
      this.load.image(asset.key, asset.path);
    });
    LEVEL_ASSETS.CHUNKS.forEach((asset) => {
      this.load.image(asset.key, asset.path);
    });

    BADGE_ASSETS.forEach((asset) => {
      this.load.image(asset.key, asset.path);
    });

    this.levelDef.data.works.forEach((path, index) => {
      this.load.json(`works_${index}`, path);
    });
    this.levelDef.data.quizzes.forEach((path, index) => {
      this.load.json(`quizzes_${index}`, path);
    });
    this.levelDef.data.npcs.forEach((path, index) => {
      this.load.json(`npcs_${index}`, path);
    });
    this.levelDef.data.messages.forEach((path, index) => {
      this.load.json(`messages_${index}`, path);
    });

    this.load.spritesheet("sparkle", "misc/sparkle.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
  }

  private processModularData() {
    this.levelDef.data.works.forEach((path, i) => {
      const data = this.cache.json.get(`works_${i}`);
      if (data) {
        DataUtils.deepMerge(
          this.contentData.works as unknown as Record<string, unknown>,
          data as unknown as Record<string, unknown>,
        );
      } else {
        console.warn(`[Game] Could not load works data from: ${path}`);
      }
    });

    this.levelDef.data.quizzes.forEach((path, i) => {
      const data = this.cache.json.get(`quizzes_${i}`);
      if (data) {
        DataUtils.deepMerge(this.contentData.quizzes, data);
      } else {
        console.warn(`[Game] Could not load quiz data from: ${path}`);
      }
    });

    this.levelDef.data.npcs.forEach((path, i) => {
      const data = this.cache.json.get(`npcs_${i}`);
      if (data?.npcs) {
        DataUtils.deepMerge(this.contentData.npcs, data.npcs);
      } else {
        console.warn(`[Game] Could not load NPC data from: ${path}`);
      }
    });

    this.levelDef.data.messages.forEach((path, i) => {
      const data = this.cache.json.get(`messages_${i}`);
      if (data) {
        DataUtils.deepMerge(
          this.contentData.messages as unknown as Record<string, unknown>,
          data as unknown as Record<string, unknown>,
        );
      } else {
        console.warn(`[Game] Could not load messages data from: ${path}`);
      }
    });
  }

  create() {
    this.processModularData();
    this.effects = new EffectsManager(this);
    this.createAnimations();

    const map = this.make.tilemap({
      key: this.levelDef.map.key,
      tileWidth: 16,
      tileHeight: 16,
    });

    let mapData: MapData | null = null;
    const tileset = map.addTilesetImage("dungeon", this.levelDef.map.tileset);

    if (tileset) {
      mapData = TiledMapLoader.loadMap(this, map, tileset, 6);
      this.stairsLayer = mapData.tileLayers.Stairs || null;
    }

    this.questManager = new QuestManager(MissionRequirements);
    this.levelManager = new LevelManager(
      this,
      this.questManager,
      this.effects,
      this.levelDef.maxStars,
    );

    this.setupEvents();

    this.scene.launch(SceneNames.UI, {
      phaseTitle: this.levelDef.title,
      missionsTotal: Object.keys(MissionRegistry).length,
      questManager: this.questManager,
      missionDefs: MissionRegistry,
    });
    this.scene.bringToTop(SceneNames.UI);

    this.objectLayerProcessor = new ObjectLayerProcessor();
    this.placeholderSystem = new PlaceholderSystem(this);

    this.badgeSystem = new BadgeSystem(this);
    this.badgeSystem.initialize();

    this.mechanicsManager = new MechanicsManager();
    this.mechanicsManager.registerHandler(new PictureMechanicHandler());

    if (mapData) {
      this.createEntities(mapData, this.contentData);
      this.setupCollisions(mapData.colliders);

      const placeholderLayer =
        mapData.objectLayers.PlaceHolder ||
        mapData.objectLayers.placeholder ||
        mapData.objectLayers.Placeholder;

      if (placeholderLayer) {
        this.placeholderSystem.registerAllFromLayer(placeholderLayer);
      }
    }
    this.setupCameras();

    if (this.isControlsOverlayOpen && this.player) {
      this.player.isInDialogue = true;
    }
    this.events.on(
      GameEvents.INFO_COLLECTED,
      (payload: string | { infoKey: string }) => {
        const infoKey = typeof payload === "string" ? payload : payload.infoKey;
        this.questManager.collectInfo(infoKey);

        // Badge: Detetive
        if (
          infoKey.toLowerCase().includes("secret") ||
          infoKey.toLowerCase().includes("pista")
        ) {
          const currentSecrets =
            this.registry.get("secret_clues_collected") || 0;
          this.registry.set("secret_clues_collected", currentSecrets + 1);
        }
      },
    );

    this.questManager.on(
      "info-collected",
      (_data: { missionId: string; infoKey: string }) => {
        this.events.emit(GameEvents.MISSION_PROGRESS_CHANGED);
      },
    );

    this.questManager.on(
      "status-changed",
      (_data: { missionId: string; status: QuestStatus }) => {
        this.events.emit(GameEvents.MISSION_STATUS_CHANGED);
      },
    );

    this.setupEvents();
  }

  private setupEvents() {
    this.events.on(GameEvents.DIALOGUE_STARTED, () => {
      this.isDialogueOpen = true;
      if (this.player) {
        this.player.isInDialogue = true;
        this.player.setVelocity(0, 0);
      }
      this.effects.setZoom(1.2, 400);
    });

    this.events.on(GameEvents.DIALOGUE_ENDED, () => {
      this.isChunkSelectorOpen = false;
      this.isDialogueOpen = false;
      this.time.delayedCall(200, () => {
        this.checkDialogState();

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

  private createEntities(mapData: MapData, contentJson?: ContentJson) {
    this.npcs = MapManager.createNpcs(this, mapData, contentJson, 6);

    this.rat = new Enemy(this, 2000, 315, 1);

    let spawnX = PLAYER_SPAWN.X;
    let spawnY = PLAYER_SPAWN.Y;

    const spawnLayer = mapData.objectLayers.PlayerSpawn;
    if (spawnLayer?.objects) {
      const spawnPoint = spawnLayer.objects.find(
        (obj: Phaser.Types.Tilemaps.TiledObject) => obj.name === "SpawnPoint",
      );
      if (spawnPoint) {
        spawnX = (spawnPoint.x || 0) * 6;
        spawnY = (spawnPoint.y || 0) * 6;
      }
    }

    this.player = new Player(this, spawnX, spawnY, PLAYER_SPAWN.TEXTURE);
    this.player.setDepth(20);
    this.player.stairsLayer = this.stairsLayer;

    for (const npc of this.npcs) {
      npc.setPlayerTracking(this.player);
      npc.setQuestManager(this.questManager);
    }

    const createdItems = this.objectLayerProcessor.process(
      this,
      mapData,
      contentJson,
      LayoutConfig.GAME.MAP_SCALE,
    );

    this.draggableItems = createdItems.filter(
      (item): item is DraggableItem => item instanceof DraggableItem,
    );
    this.carryableItems = createdItems.filter(
      (item): item is CarryableItem => item instanceof CarryableItem,
    );
    this.player.setDraggableRegistry(this.draggableItems);
    this.player.setCarryableRegistry(this.carryableItems);

    Object.values(createdItems).forEach((item) => {
      if ("setPlayerTracking" in item) {
        const trackable = item as unknown as {
          setPlayerTracking: (p: Player) => void;
        };
        trackable.setPlayerTracking(this.player);
      }
    });

    type PortalItem = InteractableItem & {
      interaction: { onInteract: (() => void) | null };
      add: (child: Phaser.GameObjects.Container) => void;
    };

    const endPhase_btn = (createdItems as InteractableItem[]).find(
      (item) =>
        item.itemId === "phase_complete_portal" ||
        item.itemName === "phase_complete_portal",
    ) as PortalItem | undefined;

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

        if (
          collected >= PHASE_SETTINGS.MAX_STARS &&
          !isEndPhaseActive &&
          endPhase_btn
        ) {
          isEndPhaseActive = true;
          this.events.emit(GameEvents.SHOW_DIALOGUE_REQUEST, [
            "O portal de restauração foi ativado! Vá até ele para concluir a fase.",
          ]);
          endPhase_btn.setVisible(true);
        }
      });
    }

    this.player.on("interact-placeholder", () => {
      const nearby = this.placeholderSystem.getNearbyPlaceholder(
        this.player.x,
        this.player.y,
        120,
        InteractableType.PICTURE,
      );

      if (nearby) {
        const filled = nearby.state?.filledSlots || [null, null, null, null];
        const availableChunks = this.player
          .getInventory()
          .filter(
            (item) => item.interactableType === InteractableType.PICTURE_CHUNK,
          );

        this.isChunkSelectorOpen = true;
        this.events.emit(GameEvents.OPEN_INTERACTION_UI_REQUEST, {
          placeholderId: nearby.id,
          instanceId: nearby.instanceId,
          type: nearby.type,
          availableItems: availableChunks.map((item) => ({
            id: item.itemId,
            name: item.itemName,
          })),
          state: nearby.state || { filledSlots: filled },
        });
      }
    });

    this.player.on("item-interacted", (item: DraggableItem | CarryableItem) => {
      if (!this.itemsInteracted.has(item.itemId)) {
        this.itemsInteracted.add(item.itemId);

        // Badge: Explorador
        const currentInspected = this.registry.get("objects_inspected") || 0;
        this.registry.set("objects_inspected", currentInspected + 1);
        const payload = item.getData("payload");
        const opinion = payload?.educational?.opinion;

        if (opinion) {
          this.events.emit(GameEvents.SHOW_DIALOGUE_REQUEST, [opinion]);
        }
      }
    });

    this.events.on(
      GameEvents.INTERACTION_SUBMITTED,
      (data: InteractionSubmittedData) => {
        this.isChunkSelectorOpen = false;
        const p = this.placeholderSystem.getPlaceholderByInstanceId(
          data.instanceId,
        );
        if (p) {
          this.mechanicsManager.handleInteraction(this, p, data);
        }
        this.checkDialogState();
      },
    );

    this.events.on("item-dropped", this.handleItemDropped, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off("item-dropped", this.handleItemDropped, this);
      this.badgeSystem.destroy();
    });

    this.setupCameras();
  }

  public startQuiz(missionId: string) {
    try {
      if (!this.questManager) {
        throw new Error("QuestManager não inicializado");
      }

      const npc = this.npcs.find((n) => {
        const ent = n as unknown as INpcEntity;
        return ent.config && ent.config.missionId === missionId;
      });

      const questions = npc?.getQuiz();

      if (!questions || questions.length === 0) {
        console.error(
          `[Game] Quiz data missing or empty for missionId: ${missionId}`,
        );
        this.events.emit(GameEvents.SHOW_DIALOGUE_REQUEST, [
          "[Erro de Sistema] Não há perguntas cadastradas para esta missão.",
        ]);
        return;
      }

      this.events.emit(
        GameEvents.SHOW_CONFIRMATION_REQUEST,
        "Pronto para iniciar o quiz?",
        () => {
          this.events.emit(
            GameEvents.SHOW_QUIZ_REQUEST,
            questions,
            (score: number) => {
              const required = Math.ceil(questions.length * 0.7);
              const isSuccess = score >= required;

              const npc = this.npcs.find((n) => {
                const ent = n as unknown as INpcEntity;
                return ent.config && ent.config.missionId === missionId;
              });
              console.log(
                `[Game] Quiz result: score=${score}/${questions.length}, success=${isSuccess}`,
              );

              // Badge: Curador
              if (isSuccess) {
                console.log(`[Game] Setting quiz_perfect_score = 1`);
                this.registry.set("quiz_perfect_score", 1);
              }

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

              const dialogues = npc.getDialogues();
              const lines = isSuccess ? dialogues.success : dialogues.failure;

              if (isSuccess) {
                this.questManager.setStatus(missionId, QuestStatus.COMPLETED);
                this.events.emit(GameEvents.MISSION_STATUS_CHANGED);

                npc.play(NPC_ANIMS.GIVING_STAR.key);

                this.questManager.setPendingResult(missionId, lines);
                this.levelManager.updateProgress();
                this.events.emit(
                  GameEvents.SHOW_DIALOGUE_REQUEST,
                  [...lines],
                  () => this.questManager.clearPendingResult(missionId),
                );
              } else {
                this.questManager.setStatus(
                  missionId,
                  QuestStatus.READY_FOR_QUIZ,
                );
                this.events.emit(GameEvents.MISSION_STATUS_CHANGED);

                this.questManager.setPendingResult(missionId, lines);
                this.events.emit(
                  GameEvents.SHOW_DIALOGUE_REQUEST,
                  [...lines],
                  () => this.questManager.clearPendingResult(missionId),
                );
              }
            },
          );
        },
        () => {
          this.questManager.setStatus(missionId, QuestStatus.READY_FOR_QUIZ);
          this.events.emit(GameEvents.MISSION_STATUS_CHANGED);
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
      !this.isInspectTutorialOpen &&
      !this.isChunkSelectorOpen &&
      !this.isDialogueOpen
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

  update(_time: number, _delta: number) { }

  private handleItemDropped(item: DraggableItem) {
    const result = this.placeholderSystem.handleDrop(item);

    const typeKey =
      item.interactableType === InteractableType.PAINTING
        ? "PAINTING"
        : "SCULPTURE";

    const sysDialogs = this.contentData.messages.SYSTEM_DIALOGUES;

    if (result.snapped) {
      // Badge: Restaurador
      const currentFlawless =
        this.registry.get("puzzles_solved_flawlessly") || 0;
      this.registry.set("puzzles_solved_flawlessly", currentFlawless + 1);

      this.events.emit(
        GameEvents.SHOW_DIALOGUE_REQUEST,
        sysDialogs[typeKey]?.SUCCESS || ["Excelente! Obra posicionada."],
      );
      const missionId = MissionIds.CURATOR;
      if (item.interactableType === InteractableType.PAINTING) {
        if (
          this.placeholderSystem.checkCategoryCompletion(
            InteractableType.PAINTING,
          )
        ) {
          this.events.emit(GameEvents.INFO_COLLECTED, {
            missionId,
            infoKey: MissionKeys.PAINTINGS_DONE,
          });
          this.events.emit(GameEvents.MISSION_PROGRESS_CHANGED);
        }
      } else if (item.interactableType === InteractableType.SCULPTURE) {
        if (
          this.placeholderSystem.checkCategoryCompletion(
            InteractableType.SCULPTURE,
          )
        ) {
          this.events.emit(GameEvents.INFO_COLLECTED, {
            missionId,
            infoKey: MissionKeys.SCULPTURES_DONE,
          });
          this.events.emit(GameEvents.MISSION_PROGRESS_CHANGED);
        }
      }
    } else if (result.mismatch) {
      const payload = result.payload as WorkData | undefined;
      const feedback = payload?.educational?.feedbackError;

      if (feedback) {
        this.events.emit(GameEvents.SHOW_DIALOGUE_REQUEST, [feedback]);
      } else {
        this.events.emit(
          GameEvents.SHOW_DIALOGUE_REQUEST,
          sysDialogs[typeKey]?.ERROR || [
            "Esta obra não pertence a este local.",
          ],
        );
      }
    }
  }
}
