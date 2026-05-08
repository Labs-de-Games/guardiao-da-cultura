import { Scene } from "phaser";
import { sendQuizOutcomeEvent } from "../../lib/gameEventsApi";
import { GameEvents } from "../constants/GameEvents";
import { LayoutConfig } from "../constants/LayoutConfig";
import { MissionIds, MissionKeys } from "../constants/MissionConstants";
import { SceneNames } from "../constants/SceneNames";
import { ScoringEvents } from "../constants/ScoringEvents";
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
import { InteractiveButton } from "../objects/InteractiveButton";
import { CarryableItem } from "../objects/interactables/CarryableItem";
import { DraggableItem } from "../objects/interactables/DraggableItem";
import type { InteractableItem } from "../objects/interactables/InteractableItem";
import { LevelManager } from "../objects/LevelManager";
import { MapManager } from "../objects/MapManager";
import { Npc } from "../objects/Npc";
import { Player } from "../objects/Player";
import { PLAYER_SPAWN } from "../objects/PlayerConfig";
import { QuestManager, QuestStatus } from "../objects/QuestManager";
import { ScoreManager } from "../objects/ScoreManager";
import { AnalyticsSystem } from "../systems/AnalyticsSystem";
import { BadgeSystem } from "../systems/BadgeSystem";
import { LabelSystem } from "../systems/LabelSystem";
import { ObjectLayerProcessor } from "../systems/ObjectLayerProcessor";
import { PlaceholderSystem } from "../systems/PlaceholderSystem";
import { type MapData, TiledMapLoader } from "../systems/TiledMapLoader";
import { GameEventType } from "../types/AnalyticsTypes";
import type { INpcEntity } from "../types/EntityTypes";
import type {
  ContentJson,
  InteractionSubmittedData,
  LabelInfoData,
  WorkData,
} from "../types/GameDataTypes";
import { InteractableType } from "../types/InteractableTypes";
import type { ScoringPayload } from "../types/ScoringTypes";
import { DataUtils } from "../utils/DataUtils";

export class Game extends Scene {
  player!: Player;
  rat!: Enemy;
  npcs: Npc[] = [];
  questManager!: QuestManager;
  private scoreManager!: ScoreManager;
  private readonly mapScale = LayoutConfig.GAME.MAP_SCALE;

  private readonly scoringFloors = {
    paintings: 0,
    sculptures: 1,
    photo: 2,
  } as const;
  stairsLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  private effects!: EffectsManager;
  private levelManager!: LevelManager;
  private isInventoryOpen: boolean = false;
  private isControlsOverlayOpen: boolean = false;
  private isChunkSelectorOpen: boolean = false;
  private isDialogueOpen: boolean = false;
  private objectLayerProcessor!: ObjectLayerProcessor;
  public placeholderSystem!: PlaceholderSystem;
  public labelSystem!: LabelSystem;
  public badgeSystem!: BadgeSystem;
  public analyticsSystem!: AnalyticsSystem;
  public mechanicsManager!: MechanicsManager;
  private draggableItems: DraggableItem[] = [];
  private carryableItems: CarryableItem[] = [];
  private itemsInteracted: Set<string> = new Set();

  private levelId: string = "level_01";
  private levelDef!: LevelDefinition;
  private contentData: ContentJson = {
    works: { PAINTINGS: {}, SCULPTURES: {}, PHOTOS: {} },
    quizzes: {},
    npcs: {},
    messages: { SYSTEM_DIALOGUES: {} },
    collectibles: { COLLECT: {}, CLUE_VILLAIN: {}, CLUE_NEXT: {} },
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

    LEVEL_ASSETS.COLLECTIBLES.forEach((asset) => {
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
    this.levelDef.data.collectibles.forEach((path, index) => {
      this.load.json(`collectibles_${index}`, path);
    });

    this.load.spritesheet("sparkle", "misc/sparkle.png", {
      frameWidth: 32,
      frameHeight: 32,
    });

    this.load.image("label", "misc/label.png");

    this.load.image("ui_star_full", "ui/stars/star_full.png");
    this.load.image("ui_star_3q", "ui/stars/star_three_quarter.png");
    this.load.image("ui_star_2q", "ui/stars/star_two_quarter.png");
    this.load.image("ui_star_1q", "ui/stars/star_one_quarter.png");
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

    this.levelDef.data.collectibles.forEach((path, i) => {
      const data = this.cache.json.get(`collectibles_${i}`);
      if (data?.collectibles) {
        DataUtils.deepMerge(
          this.contentData.collectibles as unknown as Record<string, unknown>,
          data.collectibles as unknown as Record<string, unknown>,
        );
      } else {
        console.warn(`[Game] Could not load collectibles data from: ${path}`);
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
    const tileset = map.addTilesetImage("museum", this.levelDef.map.tileset);

    if (tileset) {
      mapData = TiledMapLoader.loadMap(this, map, tileset, this.mapScale);
      this.stairsLayer = mapData.tileLayers.Stairs || null;
    }

    this.questManager = new QuestManager(MissionRequirements);
    this.scoreManager = new ScoreManager({ levelId: this.levelId });

    this.scoreManager.on(
      ScoringEvents.SCORE_UPDATED,
      (payload: ScoringPayload) => {
        console.log("[ScoreManager] payload", payload);
      },
    );

    console.log(
      "[ScoreManager] initial payload",
      this.scoreManager.getPayload(),
    );
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
    this.labelSystem = new LabelSystem(this);

    this.badgeSystem = new BadgeSystem(this);
    this.badgeSystem.initialize();

    this.registry.set("currentLevelId", this.levelId);
    this.analyticsSystem = new AnalyticsSystem(this);
    this.analyticsSystem.track(GameEventType.GAME_STARTED);
    this.analyticsSystem.setupAbandonmentTracking();

    this.registry.set("has_failed_quiz", 0);
    this.registry.set("quiz_solved_after_failure", 0);

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
        this.labelSystem.registerAllFromLayer(placeholderLayer);
      }

      this.analyticsSystem.trackLevelEvent(
        GameEventType.LEVEL_STARTED,
        this.levelId,
      );
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
    this.npcs = MapManager.createNpcs(
      this,
      mapData,
      contentJson,
      this.mapScale,
    );

    this.rat = new Enemy(this, 2000, 315, 1);

    let spawnX = PLAYER_SPAWN.X;
    let spawnY = PLAYER_SPAWN.Y;

    const spawnLayer = mapData.objectLayers.PlayerSpawn;
    if (spawnLayer?.objects) {
      const spawnPoint = spawnLayer.objects.find(
        (obj: Phaser.Types.Tilemaps.TiledObject) => obj.name === "SpawnPoint",
      );
      if (spawnPoint) {
        spawnX = (spawnPoint.x || 0) * this.mapScale;
        spawnY = (spawnPoint.y || 0) * this.mapScale;
      }
    }

    this.player = new Player(this, spawnX, spawnY, PLAYER_SPAWN.TEXTURE);
    this.player.setDepth(20);
    this.player.stairsLayer = this.stairsLayer;
    this.player.setCollisionLayers(mapData.colliders);

    const collectiblesLayer = mapData.objectLayers.collectibles;
    if (collectiblesLayer?.objects?.length) {
      for (const obj of collectiblesLayer.objects) {
        const x = (obj.x ?? 0) * this.mapScale;
        const y = (obj.y ?? 0) * this.mapScale;

        // Extract collectible_id and collectible_type from properties
        const props = (
          obj as unknown as { properties?: { name: string; value: string }[] }
        ).properties;
        const collectibleId = props?.find(
          (p) => p.name === "collectible_id",
        )?.value;
        const collectibleType = props?.find(
          (p) => p.name === "collectible_type",
        )?.value;

        // Find the collectible data from contentData and create sprite
        let sprite: Phaser.GameObjects.Sprite | null = null;
        if (collectibleId && collectibleType) {
          const typeKey = collectibleType.toUpperCase() as
            | "COLLECT"
            | "CLUE_VILLAIN"
            | "CLUE_NEXT";
          const collectibleData =
            this.contentData.collectibles[typeKey]?.[collectibleId];
          if (collectibleData) {
            const scale = collectibleData.assets.scaleOnMap ?? 2;
            sprite = this.add
              .sprite(x, y, collectibleData.assets.sprite)
              .setScale(scale)
              .setOrigin(0.5, 1)
              .setDepth(10);
          } else {
            console.warn(
              `[Game] Collectible data not found for id: ${collectibleId}, type: ${collectibleType}`,
            );
          }
        }

        const btn = new InteractiveButton(this, x, y, {
          dialogueLines: [],
          onInteract: () => {
            this.scoreManager.recordInteractible();
            if (sprite) sprite.destroy();
            btn.destroy();
          },
        });
        btn.setPlayerTracking(this.player);
      }
    }

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
      if (this.isDialogueOpen || this.isChunkSelectorOpen) return;

      const label = this.labelSystem.getNearbyLabel(
        this.player.x,
        this.player.y,
        120,
      );

      if (label) {
        const placeholder = this.placeholderSystem.getPlaceholderByInstanceId(
          label.placeholderId,
        );
        const workId = this.resolveWorkIdFromPlaceholder(placeholder?.id);
        const work = workId ? this.findWorkDataById(workId) : null;

        if (work) {
          const payload = this.buildLabelInfo(work);
          this.events.emit(GameEvents.SHOW_LABEL_REQUEST, payload);
          return;
        }
      }

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
              this.scoreManager.recordQuizResult(score, questions.length);

              const required = Math.ceil(questions.length * 0.7);
              const isSuccess = score >= required;

              console.log(
                `[Game] Quiz result: score=${score}/${questions.length}, success=${isSuccess}`,
              );

              if (isSuccess) {
                this.registry.set("quiz_perfect_score", 1);
                this.badgeSystem.checkRequirements("quiz_perfect_score", 1);

                if (this.registry.get("has_failed_quiz") === 1) {
                  this.registry.set("quiz_solved_after_failure", 1);
                  this.badgeSystem.checkRequirements(
                    "quiz_solved_after_failure",
                    1,
                  );
                }

                const payload = this.scoreManager.getPayload();
                this.analyticsSystem.trackLevelEvent(
                  GameEventType.LEVEL_COMPLETED,
                  this.levelId,
                  {
                    score: payload.totalQuarters,
                    stars: payload.totalStars,
                    rating: payload.rating,
                    missionId: missionId,
                  },
                );

                //this.levelManager.completePhase();
              } else {
                this.registry.set("has_failed_quiz", 1);
              }

              const scoringPayload = this.scoreManager.getPayload();
              void sendQuizOutcomeEvent({
                type: isSuccess ? "quiz.completed" : "quiz.failed",
                metadata: {
                  missionId,
                  score,
                  totalQuestions: questions.length,
                  accuracyPercent: scoringPayload.quiz.accuracyPercent,
                  quartersEarned: scoringPayload.quiz.quartersEarned,
                  passed: isSuccess,
                  payload: scoringPayload as unknown as Record<string, unknown>,
                },
              });

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
              } else {
                this.questManager.setStatus(
                  missionId,
                  QuestStatus.READY_FOR_QUIZ,
                );
              }

              this.events.emit(GameEvents.MISSION_STATUS_CHANGED);
              this.questManager.setPendingResult(missionId, lines);

              if (isSuccess) {
                this.levelManager.updateProgress();
              }

              this.events.emit(
                GameEvents.SHOW_DIALOGUE_REQUEST,
                [...lines],
                () => this.questManager.clearPendingResult(missionId),
              );
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
        for (const item of this.draggableItems) {
          this.physics.add.collider(item, layer);
        }
        for (const item of this.carryableItems) {
          this.physics.add.collider(item, layer);
        }
      }
    });
  }

  private setupCameras() {
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    this.levelManager.updateProgress();
  }

  private resolveWorkIdFromPlaceholder(
    rawId?: string | string[],
  ): string | null {
    if (!rawId) return null;

    const ids = Array.isArray(rawId) ? rawId : [rawId];
    for (const id of ids) {
      if (this.findWorkDataById(id)) return id;
    }

    return ids[0] || null;
  }

  private findWorkDataById(id: string): WorkData | null {
    const groups = Object.values(this.contentData.works);
    for (const group of groups) {
      if (!group) continue;
      const match = group[id];
      if (match) return match;
    }
    return null;
  }

  private buildLabelInfo(work: WorkData): LabelInfoData {
    // Check if this work has a parent_id (for chunks that belong to a larger work)
    const workAny = work as unknown as Record<string, unknown>;
    const parentId = workAny.parent_id as string | undefined;

    // If there's a parent, use the parent's data for the label
    if (parentId) {
      const parentWork = this.findWorkDataById(parentId);
      if (parentWork) {
        return this.buildLabelInfo(parentWork);
      }
    }

    const metadata = work.metadata || {};
    // Cast to access fields from educational (actual JSON structure)
    const educational = (work.educational || {}) as Record<string, unknown>;

    // These fields are in educational in the actual works.json
    const description = (educational.description as string | undefined) || "";
    const dimensions =
      (educational.dimensions as string | undefined) || metadata.dimensions;
    const medium =
      (educational.medium as string | undefined) || metadata.medium;

    return {
      title: metadata.title || work.id,
      author: metadata.author || "",
      description,
      year: metadata.year,
      dimensions,
      medium,
      place: metadata.place,
    };
  }

  update(_time: number, _delta: number) {}

  public recordFloorError(floorIndex: number) {
    this.scoreManager.recordFloorError(floorIndex);
  }

  public completeFloor(floorIndex: number) {
    this.scoreManager.completeFloor(floorIndex);
  }

  public recordPhotoFloorError() {
    this.recordFloorError(this.scoringFloors.photo);
  }

  public completePhotoFloor() {
    this.completeFloor(this.scoringFloors.photo);
  }

  public getScoringPayload(): ScoringPayload {
    return this.scoreManager.getPayload();
  }

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
          this.completeFloor(this.scoringFloors.paintings);
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
          this.completeFloor(this.scoringFloors.sculptures);
          this.events.emit(GameEvents.INFO_COLLECTED, {
            missionId,
            infoKey: MissionKeys.SCULPTURES_DONE,
          });
          this.events.emit(GameEvents.MISSION_PROGRESS_CHANGED);
        }
      }
    } else if (result.mismatch) {
      if (item.interactableType === InteractableType.PAINTING) {
        this.recordFloorError(this.scoringFloors.paintings);
      } else if (item.interactableType === InteractableType.SCULPTURE) {
        this.recordFloorError(this.scoringFloors.sculptures);
      }

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
