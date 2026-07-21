import { Scene } from "phaser";
import posthog from "posthog-js";

import { EventBus } from "../../shared/events/event-bus";
import { useDialogueStore } from "../../ui/state/dialogue-store";
import { useGameUIStore } from "../../ui/state/game-ui-store";
import { GameEvents } from "../constants/GameEvents";
import { LayoutConfig } from "../constants/LayoutConfig";
import {
  FLOOR_COMPLETE_KEYS,
  MissionIds,
  MissionKeys,
  NPC_FLOOR_3_POSITION,
} from "../constants/MissionConstants";
import { ProgressionEvents } from "../constants/ProgressionEvents";
import { SceneNames } from "../constants/SceneNames";
import { ScoringEvents } from "../constants/ScoringEvents";
import {
  BADGE_ASSETS,
  GLOBAL_ASSETS,
  LEVEL_ASSETS,
  LEVEL_REGISTRY,
  type LevelDefinition,
} from "../data/LevelConfig";
import { MissionRegistry, MissionRequirements } from "../data/MissionRegistry";
import { PaintingMechanicHandler } from "../mechanics/handlers/PaintingMechanicHandler";
import { PhotoMechanicHandler } from "../mechanics/handlers/PhotoMechanicHandler";
import { SculptureMechanicHandler } from "../mechanics/handlers/SculptureMechanicHandler";
import { MechanicsManager } from "../mechanics/MechanicsManager";
import { EffectsManager } from "../objects/EffectsManager";
import { Enemy } from "../objects/Enemy";
import { CarryableItem } from "../objects/interactives/CarryableItem";
import { DraggableItem } from "../objects/interactives/DraggableItem";
import { LevelManager } from "../objects/LevelManager";
import { MapManager } from "../objects/MapManager";
import type { MovingPlatform } from "../objects/MovingPlatform";
import { Npc } from "../objects/Npc";
import { Player } from "../objects/Player";
import { PLAYER_MOVEMENT, PLAYER_SPAWN } from "../objects/PlayerConfig";
import type { Portal } from "../objects/Portal";
import { ProgressionManager } from "../objects/ProgressionManager";
import { QuestManager, QuestStatus } from "../objects/QuestManager";
import { ScoreManager } from "../objects/ScoreManager";
import { AnalyticsSystem } from "../systems/AnalyticsSystem";
import { BadgeSystem } from "../systems/BadgeSystem";
import { CollectibleSystem } from "../systems/CollectibleSystem";
import { processModularData } from "../systems/GameDataLoader";
import { HintKeySystem } from "../systems/HintKeySystem";
import { LabelSystem } from "../systems/LabelSystem";
import { ObjectLayerProcessor } from "../systems/ObjectLayerProcessor";
import { PersistenceBridge } from "../systems/PersistenceBridge";
import { PlaceholderSystem } from "../systems/PlaceholderSystem";
import { QuizManager } from "../systems/QuizManager";
import { type MapData, TiledMapLoader } from "../systems/TiledMapLoader";
import { GameEventType } from "../types/AnalyticsTypes";
import type { GameDataAccessor } from "../types/GameDataAccessor";
import type {
  CollectibleData,
  ContentJson,
  MissionDef,
} from "../types/GameDataTypes";
import { InteractiveType } from "../types/InteractiveTypes";
import type { UserProgressState } from "../types/ProgressionTypes";
import type { ScoringPayload } from "../types/ScoringTypes";
import {
  buildLabelInfo,
  findWorkDataById,
  resolveWorkIdFromPlaceholder,
} from "../utils/WorkDataHelper";

export class Game extends Scene implements GameDataAccessor {
  private static readonly EMPTY_COLLECTIBLES = { CLUE_VILLAIN: {} } as const;

  player!: Player;
  rat!: Enemy;
  private hasInteractedWithRat: boolean = false;
  npcs: Npc[] = [];
  portals: Portal[] = [];
  questManager!: QuestManager;
  private scoreManager!: ScoreManager;
  private readonly mapScale = LayoutConfig.GAME.MAP_SCALE;

  public readonly scoringFloors = {
    paintings: 0,
    sculptures: 1,
    photo: 2,
  } as const;
  stairsLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  private effects!: EffectsManager;
  private levelManager!: LevelManager;
  private isControlsOpen: boolean = false;
  private isChunkSelectorOpen: boolean = false;
  private isDialogueOpen: boolean = false;
  private photoChunksCollected: number = 0;
  private totalPhotoChunks: number = 0;
  private objectLayerProcessor!: ObjectLayerProcessor;
  private collectibleSystem!: CollectibleSystem;
  public placeholderSystem!: PlaceholderSystem;
  public labelSystem!: LabelSystem;
  private hintKeySystem!: HintKeySystem;
  public badgeSystem!: BadgeSystem;
  public analyticsSystem!: AnalyticsSystem;
  public mechanicsManager!: MechanicsManager;
  public persistenceBridge!: PersistenceBridge;
  private progressionManager!: ProgressionManager;
  private quizManager!: QuizManager;
  private draggableItems: DraggableItem[] = [];
  private carryableItems: CarryableItem[] = [];
  private movingPlatforms: MovingPlatform[] = [];
  private itemsInteracted: Set<string> = new Set();

  private levelId: string = "level_01";
  private levelDef!: LevelDefinition;
  public contentData: ContentJson = {
    works: { PAINTINGS: {}, SCULPTURES: {}, PHOTOS: {} },
    quizzes: {},
    intermediateQuizzes: {},
    npcs: {},
    messages: { SYSTEM_DIALOGUES: {} },
    collectibles: Game.EMPTY_COLLECTIBLES,
  };

  constructor() {
    super(SceneNames.GAME);
  }

  // GameDataAccessor implementation
  public getWorks() {
    return this.contentData.works;
  }

  public getMessages() {
    return this.contentData.messages;
  }

  public getCollectibles() {
    return this.contentData.collectibles;
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

    // Reset state for scene restarts
    this.hasInteractedWithRat = false;
    this.isControlsOpen = false;
    this.isChunkSelectorOpen = false;
    this.isDialogueOpen = false;
    this.photoChunksCollected = 0;
    this.totalPhotoChunks = 0;
    this.itemsInteracted.clear();
    this.contentData = {
      works: { PAINTINGS: {}, SCULPTURES: {}, PHOTOS: {} },
      quizzes: {},
      intermediateQuizzes: {},
      npcs: {},
      messages: { SYSTEM_DIALOGUES: {} },
      collectibles: Game.EMPTY_COLLECTIBLES,
    };
  }

  preload() {
    window.dispatchEvent(
      new CustomEvent("phaser-loading-start", {
        detail: { type: "level_assets", levelId: this.levelId },
      }),
    );

    this.load.on("progress", (value: number) => {
      window.dispatchEvent(
        new CustomEvent("phaser-loading-progress", {
          detail: { progress: Math.round(value * 100) },
        }),
      );
    });

    this.load.setPath("assets/");
    Player.preload(this);
    Npc.preload(this);
    Enemy.preload(this);
    EffectsManager.preload(this);

    this.load.tilemapTiledJSON(this.levelDef.map.key, this.levelDef.map.json);
    this.load.image(this.levelDef.map.tileset, this.levelDef.map.tilesetImg);

    LEVEL_ASSETS[this.levelId as keyof typeof LEVEL_ASSETS].OTHERS.forEach(
      (asset) => {
        this.load.image(asset.key, asset.path);
      },
    );
    LEVEL_ASSETS[this.levelId as keyof typeof LEVEL_ASSETS].SCULPTURES.forEach(
      (asset) => {
        this.load.image(asset.key, asset.path);
      },
    );
    LEVEL_ASSETS[this.levelId as keyof typeof LEVEL_ASSETS].PAINTINGS.forEach(
      (asset) => {
        this.load.image(asset.key, asset.path);
      },
    );
    LEVEL_ASSETS[this.levelId as keyof typeof LEVEL_ASSETS].CHUNKS.forEach(
      (asset) => {
        this.load.image(asset.key, asset.path);
      },
    );

    LEVEL_ASSETS[
      this.levelId as keyof typeof LEVEL_ASSETS
    ].COLLECTIBLES.forEach((asset) => {
      this.load.image(asset.key, asset.path);
    });

    GLOBAL_ASSETS.forEach((asset) => {
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
    this.levelDef.data.intermediateQuizzes.forEach((path, index) => {
      this.load.json(`intermediateQuizzes_${index}`, path);
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

    this.load.spritesheet("placeholder", "misc/questionmark-spritesheet.png", {
      frameWidth: 315,
      frameHeight: 574,
    });

    this.load.image("label", "misc/label.png");
  }

  private processModularData() {
    processModularData(this.levelDef, this.contentData, (key) =>
      this.cache.json.get(key),
    );
  }

  create() {
    window.dispatchEvent(new CustomEvent("phaser-loading-complete"));

    this.processModularData();
    this.effects = new EffectsManager(this);
    this.createAnimations();

    const map = this.make.tilemap({
      key: this.levelDef.map.key,
      tileWidth: 16,
      tileHeight: 16,
    });

    let mapData: MapData | null = null;
    const tileset = map.addTilesetImage(
      this.levelDef.map.tilesetName,
      this.levelDef.map.tileset,
    );

    if (tileset) {
      mapData = TiledMapLoader.loadMap(this, map, tileset, this.mapScale);
      this.stairsLayer = mapData.tileLayers.Stairs || null;
      this.portals = MapManager.createPortals(this, mapData);
    }

    this.questManager = new QuestManager(MissionRequirements);
    this.scoreManager = new ScoreManager({ levelId: this.levelId });

    this.progressionManager = new ProgressionManager();

    this.progressionManager.on(
      ProgressionEvents.PROGRESSION_UPDATED,
      (state: UserProgressState) => {
        EventBus.emit("progression:updated", state);
      },
    );

    this.registry.set("scoreManager", this.scoreManager);

    this.scoreManager.on(
      ScoringEvents.SCORE_UPDATED,
      (payload: ScoringPayload) => {
        const stars = Number.isFinite(payload.totalStars)
          ? Math.max(0, payload.totalStars)
          : 0;
        EventBus.emit("player:stars-changed", {
          current: stars,
          total: this.scoreManager.getMaxStars(),
          score: payload.totalQuarters,
        });
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

    this.objectLayerProcessor = new ObjectLayerProcessor();
    this.placeholderSystem = new PlaceholderSystem(this);

    const missionDefsWithProgress: Record<string, MissionDef> = {
      [MissionIds.CURATOR]: {
        ...MissionRegistry[MissionIds.CURATOR],
        steps: MissionRegistry[MissionIds.CURATOR].steps.map((step) => {
          if (step.infoKey === MissionKeys.PHOTO_COLLECTED) {
            return {
              ...step,
              progressGetter: () => ({
                filled: this.photoChunksCollected,
                total: this.totalPhotoChunks,
              }),
            };
          }
          return step;
        }),
      },
    };

    this.scene.launch(SceneNames.UI, {
      questManager: this.questManager,
      missionDefs: missionDefsWithProgress,
      placeholderSystem: this.placeholderSystem,
    });
    this.scene.bringToTop(SceneNames.UI);
    this.labelSystem = new LabelSystem(this);

    this.collectibleSystem = new CollectibleSystem(this, this.mapScale);

    const actorId = (this.registry.get("userId") as string | undefined) ?? null;
    const isGuest = this.registry.get("isGuest") === true;
    this.persistenceBridge = new PersistenceBridge(
      isGuest ? "guest" : "auth",
      actorId,
      this.scoreManager,
      this.progressionManager,
      this.collectibleSystem,
      this.questManager,
      this.levelId,
    );

    this.badgeSystem = new BadgeSystem(
      this,
      this.persistenceBridge.persistence,
    );
    this.badgeSystem.initialize();

    this.analyticsSystem = new AnalyticsSystem(this);
    this.analyticsSystem.track(GameEventType.GAME_STARTED);
    this.analyticsSystem.setupAbandonmentTracking();

    this.quizManager = new QuizManager(
      {
        getLevelId: () => this.levelId,
        getLevelDef: () => this.levelDef,
        getRegistry: () => this.registry,
        getNpcs: () => this.npcs,
        getPlayer: () => this.player,
        getEvents: () => this.events,
        getContentData: () => this.contentData,
      },
      this.scoreManager,
      this.questManager,
      this.progressionManager,
      this.badgeSystem,
      this.persistenceBridge,
      this.analyticsSystem,
      this.levelManager,
    );

    void this.persistenceBridge.initializeProgression();
    void this.persistenceBridge.initializeCollectibles();

    this.registry.set("currentLevelId", this.levelId);
    this.registry.set("currentLevelNumber", this.levelDef.levelNumber);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.analyticsSystem.track(GameEventType.SESSION_END, {
        reason: "scene_shutdown",
        lastScene: this.scene.key,
        levelId: this.levelId,
        levelNumber: this.levelDef.levelNumber,
      });
      this.progressionManager?.removeAllListeners(
        ProgressionEvents.PROGRESSION_UPDATED,
      );
      EventBus.off("progression:updated");
    });

    posthog.capture("game_started", {
      level_id: this.levelId,
      level_number: this.levelDef.levelNumber,
    });

    this.registry.set("has_failed_quiz", 0);
    this.registry.set("quiz_solved_after_failure", 0);
    this.registry.set("secret_clues_collected", 0);

    this.mechanicsManager = new MechanicsManager();
    this.mechanicsManager.registerHandler(new PhotoMechanicHandler());
    this.mechanicsManager.registerHandler(
      new PaintingMechanicHandler(this.scoringFloors.paintings),
    );
    this.mechanicsManager.registerHandler(
      new SculptureMechanicHandler(this.scoringFloors.sculptures),
    );

    if (mapData) {
      this.createEntities(mapData, this.contentData);
      this.setupCollisions(mapData.colliders, mapData.oneWayColliders);

      const placeholderLayer =
        mapData.objectLayers.PlaceHolder ||
        mapData.objectLayers.placeholder ||
        mapData.objectLayers.Placeholder;

      if (placeholderLayer) {
        this.placeholderSystem.registerAllFromLayer(placeholderLayer);
        this.labelSystem.registerAllFromLayer(placeholderLayer);
      }

      this.hintKeySystem = new HintKeySystem(this);
      this.hintKeySystem.registerItems([
        ...this.draggableItems.map((item) => ({
          get x() {
            return item.x;
          },
          get y() {
            return item.y;
          },
          get interactionY() {
            return item.y;
          },
          get displayHeight() {
            return item.displayHeight;
          },
          get active() {
            return (
              item.active && !item.isGrabbed && item.input?.enabled !== false
            );
          },
          interactionDistance: PLAYER_MOVEMENT.GRAB_DISTANCE,
        })),
        ...this.carryableItems.map((item) => ({
          get x() {
            return item.x;
          },
          get y() {
            return item.y;
          },
          get interactionY() {
            return item.y;
          },
          get displayHeight() {
            return item.displayHeight;
          },
          get active() {
            return (
              item.active && !item.isCarried && item.input?.enabled !== false
            );
          },
          interactionDistance: 150,
        })),
        ...this.labelSystem.getAllLabels().map((l) => ({
          get x() {
            return l.sprite.x;
          },
          get y() {
            return l.sprite.y;
          },
          get interactionY() {
            return l.sprite.y + l.sprite.displayHeight / 2;
          },
          get displayHeight() {
            return l.sprite.displayHeight;
          },
          get hintY() {
            return l.sprite.y - l.sprite.displayHeight / 2;
          },
          active: l.sprite.active,
          interactionDistance: 120,
        })),
        ...this.npcs.map((npc) => ({
          get x() {
            return npc.x;
          },
          get y() {
            return npc.y;
          },
          get interactionY() {
            return npc.y + npc.displayHeight / 2;
          },
          get displayHeight() {
            return npc.displayHeight;
          },
          get hintY() {
            return npc.y - npc.displayHeight / 2;
          },
          active: npc.active,
          interactionDistance: 130,
        })),
        ...this.collectibleSystem
          .getAllCollectibles()
          .filter((c) => c.collectibleType === "CLUE_VILLAIN")
          .map((c) => ({
            get x() {
              return c.sprite.x;
            },
            get y() {
              return c.sprite.y;
            },
            get interactionY() {
              return c.sprite.y;
            },
            get displayHeight() {
              return c.sprite.displayHeight;
            },
            get active() {
              return !c.isCollected;
            },
            interactionDistance: 130,
          })),
        ...this.portals.map((portal) => ({
          get x() {
            return portal.x;
          },
          get y() {
            return portal.y;
          },
          get interactionY() {
            return portal.y;
          },
          get displayHeight() {
            return portal.height;
          },
          get active() {
            return portal.active;
          },
          interactionDistance: 130,
        })),
      ]);

      this.analyticsSystem.trackLevelEvent(
        GameEventType.LEVEL_STARTED,
        this.levelId,
        {
          levelNumber: this.levelDef.levelNumber,
        },
      );
    }
    this.setupCameras();

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

        if (typeof payload === "object" && infoKey.startsWith("pista_")) {
          const clueId = infoKey.slice("pista_".length);
          if (clueId && this.progressionManager) {
            this.progressionManager.recordClueUnlocked(clueId, this.levelId);
          }
        }

        if (
          this.contentData.intermediateQuizzes[infoKey] &&
          !this.questManager.isIntermediateQuizDone(infoKey) &&
          this.quizManager.getQuizMode() === "none"
        ) {
          this.startIntermediateQuiz(infoKey);
        }
      },
    );

    this.events.on(GameEvents.MISSION_PROGRESS_CHANGED, () => {
      const missionId = MissionIds.CURATOR;
      const reqs = this.questManager.getRequiredInfos(missionId);
      EventBus.emit("quest:progress-changed", {
        missionId,
        missionTitle: MissionRegistry[missionId]?.title || "",
        collectedInfos: this.questManager.getCollectedInfos(missionId),
        totalSteps: reqs.length,
        steps: MissionRegistry[missionId]?.steps,
        stepProgress: this.getMissionStepProgress(missionId),
      });
    });

    this.questManager.on(
      "info-collected",
      (data: { missionId: string; infoKey: string }) => {
        this.events.emit(GameEvents.MISSION_PROGRESS_CHANGED);
        const reqs = this.questManager.getRequiredInfos(data.missionId);
        EventBus.emit("quest:progress-changed", {
          missionId: data.missionId,
          missionTitle: MissionRegistry[data.missionId]?.title || "",
          collectedInfos: this.questManager.getCollectedInfos(data.missionId),
          totalSteps: reqs.length,
          steps: MissionRegistry[data.missionId]?.steps,
          stepProgress: this.getMissionStepProgress(data.missionId),
        });
      },
    );

    this.questManager.on(
      "status-changed",
      (data: { missionId: string; status: QuestStatus }) => {
        this.events.emit(GameEvents.MISSION_STATUS_CHANGED);
        EventBus.emit("quest:mission-status-changed", {
          missionId: data.missionId,
          status:
            data.status === QuestStatus.COMPLETED
              ? "completed"
              : data.status === QuestStatus.READY_FOR_QUIZ
                ? "accepted"
                : "accepted",
        });
      },
    );

    const userId = this.registry.get("userId") as string | undefined;
    EventBus.emit("game:ready", { userId: userId || "" });

    const initialPayload = this.scoreManager.getPayload();
    const initialStars = Number.isFinite(initialPayload.totalStars)
      ? Math.max(0, initialPayload.totalStars)
      : 0;
    EventBus.emit("player:stars-changed", {
      current: initialStars,
      total: this.scoreManager.getMaxStars(),
      score: initialPayload.totalQuarters,
    });

    const allCollectibles = Object.entries(
      this.contentData.collectibles,
    ).flatMap(([category, items]) =>
      Object.entries(items as Record<string, CollectibleData>).map(
        ([id, data]) => ({
          id,
          name: data.metadata.title || id,
          category,
          collected: false,
        }),
      ),
    );
    EventBus.emit("collectible:collectibles-sync", {
      entries: allCollectibles,
    });

    EventBus.emit("game:started", undefined);
    EventBus.emit("sidebar:toggled", { open: true });
    EventBus.emit("ui:controls-overlay", { open: true });

    Object.entries(MissionRegistry).forEach(([missionId]) => {
      EventBus.emit("quest:progress-changed", {
        missionId,
        missionTitle: MissionRegistry[missionId]?.title || "",
        collectedInfos: [],
        totalSteps: MissionRegistry[missionId]?.steps.length ?? 0,
        steps: MissionRegistry[missionId]?.steps,
        stepProgress: this.getMissionStepProgress(missionId),
      });
    });

    EventBus.on("game:pause-requested", () => {
      this.scene.pause(SceneNames.GAME);
      this.scene.pause(SceneNames.UI);
    });

    EventBus.on("game:resume-requested", () => {
      this.scene.resume(SceneNames.GAME);
      this.scene.resume(SceneNames.UI);
    });

    EventBus.on("ui:label-show", () => {
      this.events.emit(GameEvents.DIALOGUE_STARTED);
    });

    EventBus.on("ui:label-hide", () => {
      this.events.emit(GameEvents.DIALOGUE_ENDED);
    });
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

    this.events.on(
      GameEvents.DIALOGUE_ENDED,
      (data?: { dismissed?: boolean }) => {
        this.isChunkSelectorOpen = false;
        this.isDialogueOpen = false;

        const isDismissed = data?.dismissed === true;
        const hasQueuedDialogue =
          useDialogueStore.getState().dialogueQueue.length > 0;

        if (isDismissed || !hasQueuedDialogue) {
          this.quizManager.triggerPendingIntermediateQuiz();
        }

        this.time.delayedCall(200, () => {
          this.checkDialogState();

          if (this.npcs) {
            for (const npc of this.npcs) {
              npc.play("npc_idle_anim", true);
            }
          }
        });

        this.effects.setZoom(1.0, 400);
      },
    );

    const unsubControls = useGameUIStore.subscribe((state, prevState) => {
      if (state.controlsOpen !== prevState.controlsOpen) {
        this.isControlsOpen = state.controlsOpen;
        if (state.controlsOpen && this.player) {
          this.player.isInDialogue = true;
        } else {
          this.checkDialogState();
        }
      }
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsubControls();
    });
  }

  private createAnimations() {
    Player.createAnims(this);
    Npc.createAnims(this);
    Enemy.createAnims(this);

    if (!this.anims.exists("placeholder_hint_anim")) {
      this.anims.create({
        key: "placeholder_hint_anim",
        frames: this.anims.generateFrameNumbers("placeholder", {
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

    this.movingPlatforms = MapManager.createMovingPlatforms(
      this,
      mapData,
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

    this.effects.initSpotlight();

    for (const npc of this.npcs) {
      npc.setPlayerTracking(this.player);
      npc.setQuestManager(this.questManager);
    }

    for (const portal of this.portals) {
      portal.setPlayerTracking(this.player);
    }

    // Teleport curator NPC when either sculptures or paintings are marked done
    this.questManager.on(
      "info-collected",
      (payload: { missionId: string; infoKey: string }) => {
        const key = payload.infoKey;
        if (FLOOR_COMPLETE_KEYS.has(key)) {
          const curator = this.npcs.find(
            (n) => n instanceof Npc && n.getMissionId() === MissionIds.CURATOR,
          ) as Npc | undefined;
          if (curator) {
            curator.teleportTo(NPC_FLOOR_3_POSITION.x, NPC_FLOOR_3_POSITION.y);
          }
        }
      },
    );

    this.collectibleSystem.registerAllFromLayer(
      mapData.objectLayers.collectibles,
      this.contentData,
      this.player,
    );

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

    this.totalPhotoChunks = this.carryableItems.filter(
      (item) => item.interactiveType === InteractiveType.PHOTO_CHUNK,
    ).length;

    Object.values(createdItems).forEach((item) => {
      if ("setPlayerTracking" in item) {
        const trackable = item as unknown as {
          setPlayerTracking: (p: Player) => void;
        };
        trackable.setPlayerTracking(this.player);
      }
    });

    this.player.on("interact-placeholder", () => {
      if (this.isDialogueOpen || this.isChunkSelectorOpen) return;

      if (this.tryInteractWithRat()) {
        return;
      }

      const label = this.labelSystem.getNearbyLabel(
        this.player.x,
        this.player.y,
        120,
      );

      if (label) {
        const placeholder = this.placeholderSystem.getPlaceholderByInstanceId(
          label.placeholderId,
        );
        const workId = resolveWorkIdFromPlaceholder(
          placeholder?.id,
          this.contentData,
        );
        const work = workId ? findWorkDataById(workId, this.contentData) : null;

        if (work) {
          const payload = buildLabelInfo(work, (id) =>
            findWorkDataById(id, this.contentData),
          );
          EventBus.emit("ui:label-show", payload);
          return;
        }
      }

      const nearby = this.placeholderSystem.getNearbyPlaceholder(
        this.player.x,
        this.player.y,
        120,
        InteractiveType.PHOTO,
      );

      if (nearby) {
        if (nearby.isFilled) return;
        const filled = Array.isArray(nearby.state?.filledSlots)
          ? (nearby.state.filledSlots as (string | null)[])
          : [null, null, null, null];
        const availableChunks = this.player
          .getInventory()
          .filter(
            (item) => item.interactiveType === InteractiveType.PHOTO_CHUNK,
          );

        this.isChunkSelectorOpen = true;
        this.events.emit(GameEvents.DIALOGUE_STARTED);
        const expectedSlots = Array.isArray(nearby.id)
          ? nearby.id
          : String(nearby.id)
              .split(",")
              .map((s) => s.trim());
        EventBus.emit("ui:chunk-selector-open", {
          instanceId: nearby.instanceId,
          availableItems: availableChunks.map((item) => ({
            id: item.itemId,
            name: item.itemName,
            levelId: this.levelId,
          })),
          filledSlots: filled,
          expectedSlots,
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

        if (item.interactiveType === InteractiveType.PHOTO_CHUNK) {
          this.photoChunksCollected++;
          this.events.emit(GameEvents.MISSION_PROGRESS_CHANGED);
          EventBus.emit("quest:progress-changed", {
            missionId: MissionIds.CURATOR,
            missionTitle: MissionRegistry[MissionIds.CURATOR]?.title || "",
            collectedInfos: this.questManager.getCollectedInfos(
              MissionIds.CURATOR,
            ),
            totalSteps: MissionRegistry[MissionIds.CURATOR]?.steps.length ?? 0,
            steps: MissionRegistry[MissionIds.CURATOR]?.steps,
            stepProgress: this.getMissionStepProgress(MissionIds.CURATOR),
          });
          if (
            this.totalPhotoChunks > 0 &&
            this.photoChunksCollected >= this.totalPhotoChunks
          ) {
            this.events.emit(GameEvents.INFO_COLLECTED, {
              missionId: MissionIds.CURATOR,
              infoKey: MissionKeys.PHOTO_COLLECTED,
            });
          }
        }
      }
    });

    const handleInteractionSubmitted = (data: {
      instanceId: string;
      placedItems: (string | null)[];
    }) => {
      this.isChunkSelectorOpen = false;
      this.events.emit(GameEvents.DIALOGUE_ENDED);
      const p = this.placeholderSystem.getPlaceholderByInstanceId(
        data.instanceId,
      );
      if (p) {
        this.mechanicsManager.handleInteraction(this, p, data);
      }
      this.checkDialogState();
    };

    this.events.on(
      GameEvents.INTERACTION_SUBMITTED,
      handleInteractionSubmitted,
    );

    EventBus.on("ui:chunk-selector-submit", handleInteractionSubmitted);
    EventBus.on("ui:chunk-slot-placed", (data) => {
      const p = this.placeholderSystem.getPlaceholderByInstanceId(
        data.instanceId,
      );
      if (!p) return;

      const handler = this.mechanicsManager.getHandler(InteractiveType.PHOTO);
      if (!(handler instanceof PhotoMechanicHandler)) return;

      handler.placeCorrectChunk(this, p, data.itemId, data.slotIndex);
      this.events.emit(GameEvents.MISSION_PROGRESS_CHANGED);
    });
    EventBus.on("ui:chunk-slot-rejected", () => {
      this.sound.play("error", { volume: 0.5 });
    });
    EventBus.on("ui:chunk-selector-close", () => {
      if (!this.isChunkSelectorOpen) return;
      this.isChunkSelectorOpen = false;
      this.events.emit(GameEvents.DIALOGUE_ENDED);
      this.checkDialogState();
    });

    this.events.on("item-dropped", this.handleItemDropped, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off("item-dropped", this.handleItemDropped, this);
      this.collectibleSystem?.destroy();
      this.hintKeySystem?.destroy();
      this.badgeSystem.destroy();
      EventBus.off("game:pause-requested");
      EventBus.off("game:resume-requested");
      EventBus.off("ui:chunk-selector-submit");
      EventBus.off("ui:chunk-slot-placed");
      EventBus.off("ui:chunk-slot-rejected");
      EventBus.off("ui:chunk-selector-close");
      EventBus.off("ui:label-hide");
    });

    this.setupCameras();
  }

  private tryInteractWithRat(): boolean {
    if (!this.player || !this.rat?.active) return false;

    const isNearRat =
      Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.rat.x,
        this.rat.y,
      ) <= 130;

    const isOverlappingRat = this.physics.world.overlap(this.player, this.rat);

    if (!isNearRat && !isOverlappingRat) return false;

    this.rat.fleeLeftAndDisappear();

    if (!this.hasInteractedWithRat) {
      this.hasInteractedWithRat = true;
      const currentInspected = this.registry.get("objects_inspected") || 0;
      this.registry.set("objects_inspected", currentInspected + 1);
    }

    return true;
  }

  public startQuiz(missionId: string) {
    this.quizManager.startQuiz(missionId);
  }

  public startIntermediateQuiz(infoKey: string) {
    this.quizManager.startIntermediateQuiz(infoKey);
  }

  private checkDialogState() {
    if (
      !this.isDialogueOpen &&
      !this.isControlsOpen &&
      !this.isChunkSelectorOpen &&
      this.quizManager.getQuizMode() === "none" &&
      !this.quizManager.getIsQuizActive()
    ) {
      if (this.player) this.player.isInDialogue = false;
    }
  }

  private setupCollisions(
    colliders: Phaser.Tilemaps.TilemapLayer[],
    oneWayColliders: Phaser.Tilemaps.TilemapLayer[] = [],
  ) {
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

    oneWayColliders.forEach((layer) => {
      if (layer) {
        this.physics.add.collider(
          this.player,
          layer,
          undefined,
          () => {
            // Allow player to pass through one-way platforms when actively climbing
            if (this.player.isClimbingStairs) {
              return false;
            }
            return true;
          },
          this,
        );

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

    // Moving platforms — one-way collision (player can jump through from below)
    for (const platform of this.movingPlatforms) {
      this.physics.add.collider(
        this.player,
        platform,
        // Collision callback: track when player is standing on platform
        (player, _platform) => {
          const playerBody = (player as Player)
            .body as Phaser.Physics.Arcade.Body;
          if (playerBody.blocked.down) {
            (player as Player).setStandingPlatform(platform as MovingPlatform);
          }
        },
        // Process callback: determine if collision should occur
        (_player, _platform) => {
          // Allow player to pass through when climbing stairs
          if (this.player.isClimbingStairs) {
            return false;
          }

          const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
          const platformBody = platform.body as Phaser.Physics.Arcade.Body;

          // With setDirectControl(true), velocity is not set explicitly.
          // Use position delta to determine the platform's actual movement.
          const platformDeltaY = platformBody.position.y - platformBody.prev.y;

          // Player must be moving downwards relative to the platform
          const relativeVelocityY =
            playerBody.velocity.y -
            platformDeltaY / (this.game.loop.delta / 1000 || 1 / 60);
          if (relativeVelocityY < -0.01) {
            return false;
          }

          // Player's feet must have been above or at the platform's top in the previous frame
          return (
            playerBody.prev.y + playerBody.height <= platformBody.prev.y + 10
          );
        },
        this,
      );
    }
  }

  private setupCameras() {
    this.cameras.main.setZoom(1.0);
    this.cameras.main.startFollow(this.player, true, 0.2, 0.2, 0, 140);
    this.levelManager.updateProgress();
  }

  update(_time: number, delta: number) {
    const NOMINAL_DT = 1000 / 60;
    const dtClamped = Math.min(delta, 50);
    const adjusted = 1 - (1 - 0.2) ** (dtClamped / NOMINAL_DT);
    this.cameras.main.lerp.set(adjusted, adjusted);

    this.effects.updateSpotlight(this.player.x, this.player.y);

    if (this.player && this.hintKeySystem) {
      const isPanelOpen =
        this.isDialogueOpen ||
        this.isControlsOpen ||
        this.isChunkSelectorOpen ||
        this.quizManager.getIsQuizActive() ||
        useGameUIStore.getState().labelData !== null;

      const isPlayerBusy = this.player.isGrabbing || this.player.isCarrying;

      this.hintKeySystem.update(
        this.player.x,
        this.player.y,
        this.player.body as Phaser.Physics.Arcade.Body,
        isPanelOpen,
        isPlayerBusy,
      );
    }
  }

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

  public showSpotlightBeam(
    duration: number = 2000,
    px: number = 0,
    py: number = 0,
  ) {
    this.effects.showSpotlightBeam(duration, 200, px, py);
  }

  public getScoringPayload(): ScoringPayload {
    return this.scoreManager.getPayload();
  }

  public getMissionStepProgress(
    missionId: string,
  ): { filled: number; total: number }[] {
    const def = MissionRegistry[missionId];
    if (!def) return [];

    return def.steps.map((step) => {
      if (step.infoKey === MissionKeys.PHOTO_COLLECTED) {
        return {
          filled: this.photoChunksCollected,
          total: this.totalPhotoChunks,
        };
      }
      if (step.categoryType) {
        return this.placeholderSystem.getCategoryProgress(step.categoryType);
      }
      return { filled: 0, total: 0 };
    });
  }

  public shakeHorizontal(duration = 400, intensity = 0.05) {
    this.effects.shakeHorizontal(duration, intensity);
  }

  private handleItemDropped(item: DraggableItem) {
    const result = this.placeholderSystem.handleDrop(item);

    if (result.snapped || result.mismatch) {
      const handler = this.mechanicsManager.getHandler(item.interactiveType);
      if (
        handler &&
        "handleDropResult" in handler &&
        typeof handler.handleDropResult === "function"
      ) {
        (
          handler as PaintingMechanicHandler | SculptureMechanicHandler
        ).handleDropResult(this, result);
      }

      if (result.snapped) {
        this.showSpotlightBeam(
          2000,
          result.placeholder?.area.centerX,
          result.placeholder?.area.centerY,
        );
      }
    }
  }
}
