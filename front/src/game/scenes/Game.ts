import { Scene } from "phaser";
import posthog from "posthog-js";
import { sendQuizOutcomeEvent } from "../../lib/gameEventsApi";

import { getUserCollectibles, submitScore } from "../../lib/scoresApi";

import { EventBus } from "../../shared/events/event-bus";
import { useGameUIStore } from "../../ui/state/game-ui-store";
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
} from "../data/LevelConfig";
import { MissionRegistry, MissionRequirements } from "../data/MissionRegistry";
import { PhotoMechanicHandler } from "../mechanics/handlers/PhotoMechanicHandler";
import { MechanicsManager } from "../mechanics/MechanicsManager";
import { EffectsManager } from "../objects/EffectsManager";
import { Enemy } from "../objects/Enemy";
import { CarryableItem } from "../objects/interactives/CarryableItem";
import { DraggableItem } from "../objects/interactives/DraggableItem";
import { LevelManager } from "../objects/LevelManager";
import { MapManager } from "../objects/MapManager";
import { Npc } from "../objects/Npc";
import { Player } from "../objects/Player";
import { PLAYER_SPAWN } from "../objects/PlayerConfig";
import { QuestManager, QuestStatus } from "../objects/QuestManager";
import { ScoreManager } from "../objects/ScoreManager";
import { AnalyticsSystem } from "../systems/AnalyticsSystem";
import { BadgeSystem } from "../systems/BadgeSystem";
import { CollectibleSystem } from "../systems/CollectibleSystem";
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
  MissionDef,
  WorkData,
} from "../types/GameDataTypes";
import { InteractiveType } from "../types/InteractiveTypes";
import type { ScoringPayload } from "../types/ScoringTypes";
import { DataUtils } from "../utils/DataUtils";

export class Game extends Scene {
  player!: Player;
  rat!: Enemy;
  private hasInteractedWithRat: boolean = false;
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
  private isControlsOpen: boolean = false;
  private isChunkSelectorOpen: boolean = false;
  private isDialogueOpen: boolean = false;
  private isQuizActive: boolean = false;
  private photoChunksCollected: number = 0;
  private totalPhotoChunks: number = 0;
  private objectLayerProcessor!: ObjectLayerProcessor;
  private collectibleSystem!: CollectibleSystem;
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

    // Reset state for scene restarts
    this.hasInteractedWithRat = false;
    this.isControlsOpen = false;
    this.isChunkSelectorOpen = false;
    this.isDialogueOpen = false;
    this.isQuizActive = false;
    this.photoChunksCollected = 0;
    this.totalPhotoChunks = 0;
    this.itemsInteracted.clear();
    this.contentData = {
      works: { PAINTINGS: {}, SCULPTURES: {}, PHOTOS: {} },
      quizzes: {},
      npcs: {},
      messages: { SYSTEM_DIALOGUES: {} },
      collectibles: { COLLECT: {}, CLUE_VILLAIN: {}, CLUE_NEXT: {} },
    };
  }

  preload() {
    window.dispatchEvent(
      new CustomEvent("phaser-loading-start", {
        detail: { type: "level_assets" },
      }),
    );

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

    this.load.spritesheet("placeholder", "misc/questionmark-spritesheet.png", {
      frameWidth: 315,
      frameHeight: 574,
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
    const tileset = map.addTilesetImage("museum", this.levelDef.map.tileset);

    if (tileset) {
      mapData = TiledMapLoader.loadMap(this, map, tileset, this.mapScale);
      this.stairsLayer = mapData.tileLayers.Stairs || null;
    }

    this.questManager = new QuestManager(MissionRequirements);
    this.scoreManager = new ScoreManager({ levelId: this.levelId });

    this.registry.set("scoreManager", this.scoreManager);

    this.scoreManager.on(
      ScoringEvents.SCORE_UPDATED,
      (payload: ScoringPayload) => {
        const stars = Number.isFinite(payload.totalStars)
          ? Math.max(0, Math.floor(payload.totalStars))
          : 0;
        EventBus.emit("player:stars-changed", {
          current: stars,
          total: Math.ceil(payload.totalQuarters / 4),
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

    this.badgeSystem = new BadgeSystem(this);
    this.badgeSystem.initialize();

    this.collectibleSystem = new CollectibleSystem(
      this,
      this.scoreManager,
      this.mapScale,
    );

    this.registry.set("currentLevelId", this.levelId);
    this.registry.set("currentLevelNumber", this.levelDef.levelNumber);
    this.analyticsSystem = new AnalyticsSystem(this);
    this.analyticsSystem.track(GameEventType.GAME_STARTED);
    this.analyticsSystem.setupAbandonmentTracking();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.analyticsSystem.track(GameEventType.SESSION_END, {
        reason: "scene_shutdown",
        lastScene: this.scene.key,
        levelId: this.levelId,
        levelNumber: this.levelDef.levelNumber,
      });
    });

    posthog.capture("game_started", {
      level_id: this.levelId,
      level_number: this.levelDef.levelNumber,
    });

    this.registry.set("has_failed_quiz", 0);
    this.registry.set("quiz_solved_after_failure", 0);

    this.mechanicsManager = new MechanicsManager();
    this.mechanicsManager.registerHandler(new PhotoMechanicHandler());

    if (mapData) {
      this.createEntities(mapData, this.contentData);
      void this.initializeCollectibles();
      this.setupCollisions(mapData.colliders, mapData.oneWayColliders);

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
      ? Math.max(0, Math.floor(initialPayload.totalStars))
      : 0;
    EventBus.emit("player:stars-changed", {
      current: initialStars,
      total: Math.ceil(initialPayload.totalQuarters / 4),
    });

    const allCollectibles = Object.entries(
      this.contentData.collectibles,
    ).flatMap(([category, items]) =>
      Object.entries(
        items as Record<string, { metadata: { title?: string } }>,
      ).map(([id, data]) => ({
        id,
        name: data.metadata.title || id,
        category,
        collected: false,
      })),
    );
    EventBus.emit("inventory:collectibles-sync", { entries: allCollectibles });

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

  private async initializeCollectibles(): Promise<void> {
    const userId = this.registry.get("userId") as string | undefined;
    let collected: Array<{
      collectibleId: string;
      collectibleType: "COLLECT" | "CLUE_VILLAIN" | "CLUE_NEXT";
    }> = [];

    if (userId) {
      try {
        const records = await getUserCollectibles(userId, {
          levelId: this.levelId,
        });
        collected = records.map((record) => ({
          collectibleId: record.collectibleId,
          collectibleType: record.collectibleType,
        }));

        this.collectibleSystem.applyCollectedCollectibles(collected);

        for (const record of collected) {
          if (record.collectibleType === "CLUE_VILLAIN") {
            this.questManager.collectInfo(`pista_${record.collectibleId}`);
          }
        }
      } catch (err) {
        console.warn("[Game] Failed to load user collectibles:", err);
      }
    }
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

    for (const npc of this.npcs) {
      npc.setPlayerTracking(this.player);
      npc.setQuestManager(this.questManager);
    }

    // Teleport curator NPC when either sculptures or paintings are marked done
    this.questManager.on(
      "info-collected",
      (payload: { missionId: string; infoKey: string }) => {
        const key = payload.infoKey;
        if (
          key === MissionKeys.PAINTINGS_DONE ||
          key === MissionKeys.SCULPTURES_DONE
        ) {
          const curator = this.npcs.find((n) => {
            const ent = n as unknown as INpcEntity;
            return ent.config && ent.config.missionId === MissionIds.CURATOR;
          });
          if (curator) {
            (curator as unknown as Npc).teleportTo(2100, 400);
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
        const workId = this.resolveWorkIdFromPlaceholder(placeholder?.id);
        const work = workId ? this.findWorkDataById(workId) : null;

        if (work) {
          const payload = this.buildLabelInfo(work);
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
        const filled = nearby.state?.filledSlots || [null, null, null, null];
        const availableChunks = this.player
          .getInventory()
          .filter(
            (item) => item.interactiveType === InteractiveType.PHOTO_CHUNK,
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
      this.collectibleSystem?.destroy();
      this.badgeSystem.destroy();
      EventBus.off("game:pause-requested");
      EventBus.off("game:resume-requested");
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
        "Pronto para iniciar o teste?",
        () => {
          this.isQuizActive = true;
          this.events.emit(
            GameEvents.SHOW_QUIZ_REQUEST,
            questions,
            this.scoreManager,
            (score: number) => {
              this.scoreManager.recordQuizResult(score, questions.length);
              const required = Math.ceil(questions.length * 0.7);
              const isSuccess = score >= required;
              console.log(
                `[Game] Quiz result: score=${score}/${questions.length}, success=${isSuccess}`,
              );

              if (isSuccess) {
                if (score === questions.length) {
                  this.registry.set("quiz_perfect_score", 1);
                  this.badgeSystem.checkRequirements("quiz_perfect_score", 1);
                }

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
                    levelNumber: this.levelDef.levelNumber,
                    score: payload.totalQuarters,
                    stars: payload.totalStars,
                    rating: payload.rating,
                    missionId: missionId,
                  },
                );

                posthog.capture("level_completed", {
                  level_id: this.levelId,
                  level_number: this.levelDef.levelNumber,
                  score: payload.totalQuarters,
                  stars: payload.totalStars,
                  rating: payload.rating,
                  mission_id: missionId,
                  time_spent_ms:
                    Date.now() - new Date(payload.startedAt).getTime(),
                  attempts: this.registry.get("has_failed_quiz") || 0,
                });

                void this.submitScoreToBackend();
              } else {
                this.registry.set("has_failed_quiz", 1);
                posthog.capture("level_failed", {
                  level_id: this.levelId,
                  level_number: this.levelDef.levelNumber,
                  mission_id: missionId,
                  score,
                  total_questions: questions.length,
                });
                void this.submitScoreToBackend();
              }

              const scoringPayload = this.scoreManager.getPayload();
              posthog.capture("quiz_completed", {
                level_id: this.levelId,
                mission_id: missionId,
                score,
                correct_answers: scoringPayload.quiz.correctAnswers,
                total_questions: questions.length,
                accuracy_percent: scoringPayload.quiz.accuracyPercent,
                passed: isSuccess,
              });

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

              this.isQuizActive = false;
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
      !this.isDialogueOpen &&
      !this.isControlsOpen &&
      !this.isChunkSelectorOpen &&
      !this.isQuizActive
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
  }

  private setupCameras() {
    this.cameras.main.setZoom(1.0);
    this.cameras.main.startFollow(this.player, true, 0.2, 0.2, 0, 140);
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

  update(_time: number, delta: number) {
    const NOMINAL_DT = 1000 / 60;
    const dtClamped = Math.min(delta, 50);
    const adjusted = 1 - (1 - 0.2) ** (dtClamped / NOMINAL_DT);
    this.cameras.main.lerp.set(adjusted, adjusted);
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

  public getScoringPayload(): ScoringPayload {
    return this.scoreManager.getPayload();
  }

  private getMissionStepProgress(
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

  private async submitScoreToBackend() {
    try {
      const userId = this.registry.get("userId");
      if (!userId) return;

      const payload = this.scoreManager.getPayload();

      await submitScore({
        userId,
        levelId: payload.levelId,
        totalQuarters: payload.totalQuarters,
        totalStars: payload.totalStars,
        rating: payload.rating,
        floors: payload.floors.map((f) => ({
          floorIndex: f.floorIndex,
          errors: f.errors,
          quartersEarned: f.quartersEarned,
        })),
        quiz: {
          totalQuestions: payload.quiz.totalQuestions,
          correctAnswers: payload.quiz.correctAnswers,
          accuracyPercent: payload.quiz.accuracyPercent,
          quartersEarned: payload.quiz.quartersEarned,
        },
        collectibles: {
          total: payload.collectibles.total,
          interactionsCount: payload.collectibles.interactionsCount,
          quartersEarned: payload.collectibles.quartersEarned,
        },
        collectedCollectibles: payload.collectibles.interactions.map(
          (interaction) => ({
            collectibleId: interaction.collectible_id,
            collectibleType: interaction.collectible_type as
              | "COLLECT"
              | "CLUE_VILLAIN"
              | "CLUE_NEXT",
            levelId: payload.levelId,
          }),
        ),
      });
    } catch (err) {
      console.error("[Game] Failed to submit score:", err);
    }
  }

  private handleItemDropped(item: DraggableItem) {
    const result = this.placeholderSystem.handleDrop(item);

    const typeKey =
      item.interactiveType === InteractiveType.PAINTING
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

      // Always emit progress on every successful drop
      this.events.emit(GameEvents.MISSION_PROGRESS_CHANGED);
      const reqs = this.questManager.getRequiredInfos(missionId);
      EventBus.emit("quest:progress-changed", {
        missionId,
        missionTitle: MissionRegistry[missionId]?.title || "",
        collectedInfos: this.questManager.getCollectedInfos(missionId),
        totalSteps: reqs.length,
        steps: MissionRegistry[missionId]?.steps,
        stepProgress: this.getMissionStepProgress(missionId),
      });

      if (item.interactiveType === InteractiveType.PAINTING) {
        if (
          this.placeholderSystem.checkCategoryCompletion(
            InteractiveType.PAINTING,
          )
        ) {
          this.completeFloor(this.scoringFloors.paintings);
          // Two-phase: show 3/3 first, then [✓] after delay
          this.time.delayedCall(500, () => {
            this.events.emit(GameEvents.INFO_COLLECTED, {
              missionId,
              infoKey: MissionKeys.PAINTINGS_DONE,
            });
            this.events.emit(GameEvents.MISSION_PROGRESS_CHANGED);
            const reqs2 = this.questManager.getRequiredInfos(missionId);
            EventBus.emit("quest:progress-changed", {
              missionId,
              missionTitle: MissionRegistry[missionId]?.title || "",
              collectedInfos: this.questManager.getCollectedInfos(missionId),
              totalSteps: reqs2.length,
              steps: MissionRegistry[missionId]?.steps,
              stepProgress: this.getMissionStepProgress(missionId),
            });
          });
        }
      } else if (item.interactiveType === InteractiveType.SCULPTURE) {
        if (
          this.placeholderSystem.checkCategoryCompletion(
            InteractiveType.SCULPTURE,
          )
        ) {
          this.completeFloor(this.scoringFloors.sculptures);
          // Two-phase: show 3/3 first, then [✓] after delay
          this.time.delayedCall(500, () => {
            this.events.emit(GameEvents.INFO_COLLECTED, {
              missionId,
              infoKey: MissionKeys.SCULPTURES_DONE,
            });
            this.events.emit(GameEvents.MISSION_PROGRESS_CHANGED);
            const reqs2 = this.questManager.getRequiredInfos(missionId);
            EventBus.emit("quest:progress-changed", {
              missionId,
              missionTitle: MissionRegistry[missionId]?.title || "",
              collectedInfos: this.questManager.getCollectedInfos(missionId),
              totalSteps: reqs2.length,
              steps: MissionRegistry[missionId]?.steps,
              stepProgress: this.getMissionStepProgress(missionId),
            });
          });
        }
      }
    } else if (result.mismatch) {
      if (item.interactiveType === InteractiveType.PAINTING) {
        this.recordFloorError(this.scoringFloors.paintings);
      } else if (item.interactiveType === InteractiveType.SCULPTURE) {
        this.recordFloorError(this.scoringFloors.sculptures);
      }

      const placeholderWorkId = result.placeholder
        ? this.resolveWorkIdFromPlaceholder(result.placeholder.id)
        : null;
      const placeholderWork = placeholderWorkId
        ? this.findWorkDataById(placeholderWorkId)
        : null;
      const feedback = placeholderWork?.educational?.feedbackError;

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
