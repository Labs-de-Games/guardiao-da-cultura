import { Scene } from "phaser";
import posthog from "posthog-js";

import { EventBus } from "../../shared/events/event-bus";
import type { GameEventMap } from "../../shared/events/game-events";
import { useDialogueStore } from "../../ui/state/dialogue-store";
import { useGameUIStore } from "../../ui/state/game-ui-store";
import { AudioManager, loadGlobalAudio } from "../audio";
import { getLevelAudioManifest } from "../audio/registry";
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
import {
  CostumeMechanicHandler,
  type CostumePartType,
  type CostumeState,
} from "../mechanics/handlers/CostumeMechanicHandler";
import { PaintingMechanicHandler } from "../mechanics/handlers/PaintingMechanicHandler";
import { PhotoMechanicHandler } from "../mechanics/handlers/PhotoMechanicHandler";
import { PosterMechanicHandler } from "../mechanics/handlers/PosterMechanicHandler";
import { SculptureMechanicHandler } from "../mechanics/handlers/SculptureMechanicHandler";
import { SpotlightMechanicHandler } from "../mechanics/handlers/SpotlightMechanicHandler";
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
import { LadderCinematicSystem } from "../systems/LadderCinematicSystem";
import { NudgeManager } from "../systems/NudgeManager";
import { ObjectLayerProcessor } from "../systems/ObjectLayerProcessor";
import { PersistenceBridge } from "../systems/PersistenceBridge";
import { PlaceholderSystem } from "../systems/PlaceholderSystem";
import { QuizManager } from "../systems/QuizManager";
import { SpotlightSystem } from "../systems/SpotlightSystem";
import { type MapData, TiledMapLoader } from "../systems/TiledMapLoader";
import { TutorialSystem } from "../systems/TutorialSystem";
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

const NUDGE_HINT_EVENT_BY_TYPE: Record<InteractiveType, string> = {
  [InteractiveType.SCULPTURE]: "nudge_hint_shown_sculpture",
  [InteractiveType.PAINTING]: "nudge_hint_shown_painting",
  [InteractiveType.POSTER]: "nudge_hint_shown_poster",
  [InteractiveType.PHOTO]: "nudge_hint_shown_photo",
  [InteractiveType.PHOTO_CHUNK]: "nudge_hint_shown_photo",
  [InteractiveType.COSTUME]: "nudge_hint_shown_costume",
  [InteractiveType.SPOTLIGHT]: "nudge_hint_shown_spotlight",
};

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
    sculptures: 0,
    paintings: 1,
    costumes: 1,
    photo: 2,
    posters: 3,
    spotlights: 0,
  } as const;
  private startedFloors: Set<number> = new Set();
  stairsLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  pendingStairsLayers: Phaser.Tilemaps.TilemapLayer[] = [];
  colliders: Phaser.Tilemaps.TilemapLayer[] = [];
  ladderSprites: Record<string, Phaser.GameObjects.Sprite> = {};
  private effects!: EffectsManager;
  private levelManager!: LevelManager;
  private isControlsOpen: boolean = false;
  private isChunkSelectorOpen: boolean = false;
  private isCostumeSelectorOpen: boolean = false;
  private isDialogueOpen: boolean = false;
  private tutorialSetDialogueOpen: boolean = false;
  private photoChunksCollected: number = 0;
  private totalPhotoChunks: number = 0;
  private objectLayerProcessor!: ObjectLayerProcessor;
  private collectibleSystem!: CollectibleSystem;
  private ladderCinematicSystem!: LadderCinematicSystem;
  public placeholderSystem!: PlaceholderSystem;
  public labelSystem!: LabelSystem;
  public spotlightSystem!: SpotlightSystem;
  private hintKeySystem!: HintKeySystem;
  private tutorialSystem!: TutorialSystem;
  private nudgeManager!: NudgeManager;
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
  private eventBusUnsubs: Array<() => void> = [];

  private levelId: string = "level_01";
  private levelDef!: LevelDefinition;
  public contentData: ContentJson = {
    works: { PAINTINGS: {}, SCULPTURES: {}, PHOTOS: {}, POSTERS: {} },
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
    this.isCostumeSelectorOpen = false;
    this.isDialogueOpen = false;
    this.photoChunksCollected = 0;
    this.totalPhotoChunks = 0;
    this.itemsInteracted.clear();
    this.unsubscribeFromEventBus();
    this.contentData = {
      works: { PAINTINGS: {}, SCULPTURES: {}, PHOTOS: {}, POSTERS: {} },
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

    this.load.on("loaderror", (file: Phaser.Loader.File) => {
      window.dispatchEvent(
        new CustomEvent("phaser-loading-error", {
          detail: { stage: "asset_load", key: file.key },
        }),
      );
    });

    this.load.setPath("assets/");
    Player.preload(this);
    Npc.preload(this);
    Enemy.preload(this);
    EffectsManager.preload(this);

    // Preload global SFX assets (footsteps, climb, jump, drag, etc.)
    loadGlobalAudio(this);

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
      if ("frameWidth" in asset && "frameHeight" in asset) {
        this.load.spritesheet(asset.key, asset.path, {
          frameWidth: asset.frameWidth as number,
          frameHeight: asset.frameHeight as number,
        });
      } else {
        this.load.image(asset.key, asset.path);
      }
    });

    BADGE_ASSETS.forEach((asset) => {
      this.load.image(asset.key, asset.path);
    });

    this.levelDef.data.works.forEach((path, index) => {
      this.load.json(`${this.levelId}__works_${index}`, path);
    });
    this.levelDef.data.quizzes.forEach((path, index) => {
      this.load.json(`${this.levelId}__quizzes_${index}`, path);
    });
    this.levelDef.data.intermediateQuizzes.forEach((path, index) => {
      this.load.json(`${this.levelId}__intermediateQuizzes_${index}`, path);
    });
    this.levelDef.data.npcs.forEach((path, index) => {
      this.load.json(`${this.levelId}__npcs_${index}`, path);
    });
    this.levelDef.data.messages.forEach((path, index) => {
      this.load.json(`${this.levelId}__messages_${index}`, path);
    });
    this.levelDef.data.collectibles.forEach((path, index) => {
      this.load.json(`${this.levelId}__collectibles_${index}`, path);
    });

    // Load other levels' collectibles for global evidence board
    Object.entries(LEVEL_REGISTRY).forEach(([id, def]) => {
      if (id !== this.levelId) {
        def.data.collectibles.forEach((path, index) => {
          this.load.json(`${id}__collectibles_${index}`, path);
        });
      }
    });

    this.load.spritesheet("placeholder", "misc/questionmark-spritesheet.png", {
      frameWidth: 315,
      frameHeight: 574,
    });

    this.load.image("label", "misc/label.png");

    // Audio assets are preloaded by LevelCinematic scene
    // during the cinematic intro to avoid loading delays
  }

  private processModularData() {
    processModularData(this.levelDef, this.contentData, (key) =>
      this.cache.json.get(`${this.levelId}__${key}`),
    );
  }

  create() {
    window.dispatchEvent(new CustomEvent("phaser-loading-complete"));

    this.processModularData();
    this.effects = new EffectsManager(this);
    this.ladderCinematicSystem = new LadderCinematicSystem(
      this,
      this.effects,
      this.mapScale,
    );
    this.createAnimations();

    // Initialize audio manager with this scene
    AudioManager.init(this);

    // Start level music if not already playing
    // Check registry to avoid restarting music on scene transitions within the same level
    const musicStartedKey = `music_started:${this.levelId}`;
    if (!this.registry.get(musicStartedKey)) {
      const manifest = getLevelAudioManifest(this.levelId);
      const musicKey =
        manifest?.musicIntroLoop?.intro.key ?? manifest?.music?.key;
      if (musicKey) {
        AudioManager.playMusic(musicKey);
        this.registry.set(musicStartedKey, true);
      }
    }

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

      const stairsLayersToAssign: Phaser.Tilemaps.TilemapLayer[] = [];
      if (this.stairsLayer) {
        stairsLayersToAssign.push(this.stairsLayer);
      }

      const ladder1 = mapData.tileLayers.ladder_floor1;
      if (ladder1) {
        ladder1.setVisible(false);
        stairsLayersToAssign.push(ladder1);
      }

      const ladder2 = mapData.tileLayers.ladder_floor2;
      if (ladder2) {
        ladder2.setVisible(false);
        stairsLayersToAssign.push(ladder2);
      }

      this.pendingStairsLayers = stairsLayersToAssign;

      // Spawn ladder images at their Tiled positions from the start
      this.ladderSprites = {};
      for (const objLayerKey of ["Ladder1", "Ladder2"]) {
        const objLayer = mapData.objectLayers[objLayerKey];
        const ladderObj = objLayer?.objects?.find(
          (o: any) => o.name === "ladder_image" || o.type === "ladder_image",
        );
        if (ladderObj) {
          const sprite = this.add.sprite(
            (ladderObj.x ?? 0) * this.mapScale,
            (ladderObj.y ?? 0) * this.mapScale,
            "ladder_image",
          );
          sprite.setScale(this.mapScale);
          sprite.setDepth(10);
          this.ladderSprites[objLayerKey] = sprite;
        }
      }

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

    let lastTotalQuarters = this.scoreManager.getPayload().totalQuarters || 0;

    this.scoreManager.on(
      ScoringEvents.SCORE_UPDATED,
      (payload: ScoringPayload) => {
        const previousStars = Math.floor(lastTotalQuarters / 4);
        const currentStars = Math.floor(payload.totalQuarters / 4);

        if (payload.totalQuarters > lastTotalQuarters) {
          posthog.capture("player_scored", {
            level_id: this.levelId,
            total_quarters: payload.totalQuarters,
            total_stars: currentStars,
            quarters_earned: payload.totalQuarters - lastTotalQuarters,
          });
        }

        if (currentStars > previousStars) {
          this.effects.playScoreFeedback(this.player.x, this.player.y);
          posthog.capture("star_collected", {
            level_id: this.levelId,
            total_stars: currentStars,
            previous_stars: previousStars,
            total_quarters: payload.totalQuarters,
          });
        }
        lastTotalQuarters = payload.totalQuarters;

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

    this.scoreManager.on(
      ScoringEvents.INTERMEDIATE_QUIZ_COMPLETED,
      (payload: any) => {
        let targetLayerName: string | null = null;
        if (payload.infoKey === "sculptures_done") {
          targetLayerName = "ladder_floor1";
        } else if (payload.infoKey === "paintings_done") {
          targetLayerName = "ladder_floor2";
        }

        if (targetLayerName && mapData) {
          const targetLayer = mapData.tileLayers[targetLayerName];
          if (targetLayer) {
            const floorNum = targetLayerName.match(/(\d+)$/)?.[1];
            const objLayerKey = `Ladder${floorNum}`;
            const sprite = this.ladderSprites[objLayerKey];
            if (sprite) {
              this.time.delayedCall(4000, () => {
                this.ladderCinematicSystem.playCinematic(sprite, targetLayer);
              });
            }
          }
        }
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

    const missionDefsWithProgress: Record<string, MissionDef> = {};
    for (const missionId of this.levelDef.activeMissions || []) {
      const baseDef = MissionRegistry[missionId];
      if (!baseDef) continue;

      missionDefsWithProgress[missionId] = {
        ...baseDef,
        steps: baseDef.steps.map((step) => {
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
      };
    }

    this.scene.launch(SceneNames.UI, {
      questManager: this.questManager,
      missionDefs: missionDefsWithProgress,
      placeholderSystem: this.placeholderSystem,
    });
    this.scene.bringToTop(SceneNames.UI);
    this.labelSystem = new LabelSystem(this);

    this.collectibleSystem = new CollectibleSystem(
      this,
      this.mapScale,
      this.effects,
    );

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
    void this.persistenceBridge.initializeCollectibles().then(async () => {
      const collectedIds = new Set(
        this.collectibleSystem
          .getCollectedCollectibles()
          .map((c) => c.collectibleId),
      );

      const allCollectibles: Array<{
        id: string;
        name: string;
        category: string;
        collected: boolean;
        board?: {
          position: { x: number; y: number; rotation: number };
          connectedTo: string[];
        };
        educational?: {
          description: string;
          medium?: string;
          opinion?: string;
        };
        metadata?: {
          title: string;
          author?: string;
          year?: string;
          place?: string;
        };
      }> = [];

      // Current level's collectibles
      for (const [category, items] of Object.entries(
        this.contentData.collectibles,
      )) {
        for (const [id, data] of Object.entries(
          items as Record<string, CollectibleData>,
        )) {
          allCollectibles.push({
            id,
            name: data.metadata.title || id,
            category,
            collected: collectedIds.has(id),
            board: data.board,
            educational: data.educational,
            metadata: data.metadata,
          });
        }
      }

      // Other levels' collectibles (global board)
      for (const [levelId, levelDef] of Object.entries(LEVEL_REGISTRY)) {
        if (levelId === this.levelId) continue;

        let otherCollected: Set<string> = new Set();
        try {
          const records =
            await this.persistenceBridge.persistence.loadCollectibles(levelId);
          otherCollected = new Set(records.map((c) => c.collectibleId));
        } catch {
          // Ignore — will show as uncollected
        }

        for (let i = 0; i < levelDef.data.collectibles.length; i++) {
          const data = this.cache.json.get(`${levelId}__collectibles_${i}`);
          if (data && typeof data === "object" && "collectibles" in data) {
            for (const [category, items] of Object.entries(
              (data as { collectibles: Record<string, unknown> }).collectibles,
            )) {
              for (const [id, itemData] of Object.entries(
                items as Record<string, CollectibleData>,
              )) {
                allCollectibles.push({
                  id,
                  name: itemData.metadata?.title || id,
                  category,
                  collected: otherCollected.has(id),
                  board: itemData.board,
                  educational: itemData.educational,
                  metadata: itemData.metadata,
                });
              }
            }
          }
        }
      }

      EventBus.emit("collectible:collectibles-sync", {
        entries: allCollectibles,
      });
    });

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
    this.mechanicsManager.registerHandler(
      new PosterMechanicHandler(this.scoringFloors.posters),
    );
    this.mechanicsManager.registerHandler(
      new SpotlightMechanicHandler(this.scoringFloors.spotlights),
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

      const spotlightLayer =
        mapData.objectLayers.Spotlights || mapData.objectLayers.Spotlight;
      if (spotlightLayer) {
        this.spotlightSystem = new SpotlightSystem(this, this.effects);
        this.spotlightSystem.registerAllFromLayer(spotlightLayer);
      }

      this.hintKeySystem = new HintKeySystem(this);

      this.tutorialSystem = new TutorialSystem(this);
      const tutorialLayer =
        mapData.objectLayers.Tutorial || mapData.objectLayers.tutorial;
      if (tutorialLayer) {
        this.tutorialSystem.registerFromLayer(tutorialLayer, this.mapScale);
      }

      this.nudgeManager = new NudgeManager();
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
        ...this.placeholderSystem
          .getAll()
          .filter((p) => p.type === InteractiveType.PHOTO && !p.isFilled)
          .map((p) => ({
            get x() {
              return p.area.centerX;
            },
            get y() {
              return p.area.centerY;
            },
            get interactionY() {
              return p.area.centerY + 100;
            },
            get displayHeight() {
              return p.area.height;
            },
            get hintY() {
              return p.area.top;
            },
            get active() {
              return !p.isFilled;
            },
            interactionDistance: 120,
          })),
        ...this.placeholderSystem
          .getAll()
          .filter((p) => p.type === InteractiveType.COSTUME && !p.isFilled)
          .map((p) => ({
            get x() {
              return p.area.centerX;
            },
            get y() {
              return p.area.centerY;
            },
            get interactionY() {
              return p.area.centerY;
            },
            get displayHeight() {
              return p.area.height;
            },
            get hintY() {
              return p.area.top - 115;
            },
            get active() {
              return !p.isFilled;
            },
            interactionDistance: 120,
          })),
        ...(this.spotlightSystem?.getAll().map((s) => ({
          get x() {
            return s.sprite.x;
          },
          get y() {
            return s.sprite.y;
          },
          get interactionY() {
            return s.sprite.y;
          },
          get displayHeight() {
            return s.sprite.displayHeight;
          },
          get active() {
            return !s.isLocked;
          },
          interactionDistance: 170,
        })) || []),
      ]);

      this.analyticsSystem.trackLevelEvent(
        GameEventType.LEVEL_STARTED,
        this.levelId,
        {
          levelNumber: this.levelDef.levelNumber,
        },
      );
    }
    this.setupCameras(map);

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
          void this.persistenceBridge.saveCollectibles();
        }

        if (
          infoKey === MissionKeys.SCULPTURES_DONE ||
          infoKey === MissionKeys.SPOTLIGHTS_DONE
        ) {
          const collected = this.questManager.getCollectedInfos(
            MissionIds.CURATOR_L2,
          );
          if (
            collected.includes(MissionKeys.SCULPTURES_DONE) &&
            collected.includes(MissionKeys.SPOTLIGHTS_DONE) &&
            !collected.includes(MissionKeys.STAGE_DONE)
          ) {
            this.events.emit(GameEvents.INFO_COLLECTED, {
              missionId: MissionIds.CURATOR_L2,
              infoKey: MissionKeys.STAGE_DONE,
            });
          }
        }

        if (
          this.contentData.intermediateQuizzes[infoKey] &&
          !this.questManager.isIntermediateQuizDone(infoKey) &&
          this.quizManager.getQuizMode() === "none"
        ) {
          if (infoKey === MissionKeys.STAGE_DONE) {
            const collected = this.questManager.getCollectedInfos(
              MissionIds.CURATOR_L2,
            );
            if (
              collected.includes(MissionKeys.SCULPTURES_DONE) &&
              collected.includes(MissionKeys.SPOTLIGHTS_DONE)
            ) {
              this.startIntermediateQuiz(infoKey);
            }
          } else {
            this.startIntermediateQuiz(infoKey);
          }
        }
      },
    );

    this.events.on(GameEvents.MISSION_PROGRESS_CHANGED, () => {
      for (const missionId of this.levelDef.activeMissions || []) {
        if (!MissionRegistry[missionId]) continue;
        const steps = MissionRegistry[missionId]?.steps || [];
        EventBus.emit("quest:progress-changed", {
          missionId,
          missionTitle: MissionRegistry[missionId]?.title || "",
          collectedInfos: this.questManager.getCollectedInfos(missionId),
          totalSteps: steps.length,
          steps,
          stepProgress: this.getMissionStepProgress(missionId),
        });
      }
    });

    this.questManager.on(
      "info-collected",
      (data: { missionId: string; infoKey: string }) => {
        this.events.emit(GameEvents.MISSION_PROGRESS_CHANGED);
      },
    );

    this.questManager.on(
      "status-changed",
      (data: { missionId: string; status: QuestStatus }) => {
        this.events.emit(GameEvents.MISSION_STATUS_CHANGED);

        if (data.status === QuestStatus.COLLECTING) {
          this.nudgeManager?.reset(data.missionId);
        }

        if (this.levelDef.activeMissions?.includes(data.missionId)) {
          EventBus.emit("quest:mission-status-changed", {
            missionId: data.missionId,
            status:
              data.status === QuestStatus.COMPLETED
                ? "completed"
                : data.status === QuestStatus.READY_FOR_QUIZ
                  ? "accepted"
                  : "accepted",
          });
        }
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

    const allCollectibles: Array<{
      id: string;
      name: string;
      category: string;
      collected: boolean;
      board?: {
        position: { x: number; y: number; rotation: number };
        connectedTo: string[];
      };
      educational?: { description: string; medium?: string; opinion?: string };
      metadata?: {
        title: string;
        author?: string;
        year?: string;
        place?: string;
      };
    }> = [];

    // Current level's collectibles
    for (const [category, items] of Object.entries(
      this.contentData.collectibles,
    )) {
      for (const [id, data] of Object.entries(
        items as Record<string, CollectibleData>,
      )) {
        allCollectibles.push({
          id,
          name: data.metadata.title || id,
          category,
          collected: false,
          board: data.board,
          educational: data.educational,
          metadata: data.metadata,
        });
      }
    }

    // Other levels' collectibles (global board)
    for (const [levelId, levelDef] of Object.entries(LEVEL_REGISTRY)) {
      if (levelId === this.levelId) continue;

      for (let i = 0; i < levelDef.data.collectibles.length; i++) {
        const data = this.cache.json.get(`${levelId}__collectibles_${i}`);
        if (data && typeof data === "object" && "collectibles" in data) {
          for (const [category, items] of Object.entries(
            (data as { collectibles: Record<string, unknown> }).collectibles,
          )) {
            for (const [id, itemData] of Object.entries(
              items as Record<string, CollectibleData>,
            )) {
              allCollectibles.push({
                id,
                name: itemData.metadata?.title || id,
                category,
                collected: false,
                board: itemData.board,
                educational: itemData.educational,
                metadata: itemData.metadata,
              });
            }
          }
        }
      }
    }

    EventBus.emit("collectible:collectibles-sync", {
      entries: allCollectibles,
    });

    EventBus.emit("game:started", undefined);
    EventBus.emit("sidebar:toggled", { open: true });
    EventBus.emit("ui:controls-overlay", { open: true });

    (this.levelDef.activeMissions || []).forEach((missionId) => {
      EventBus.emit("quest:progress-changed", {
        missionId,
        missionTitle: MissionRegistry[missionId]?.title || "",
        collectedInfos: [],
        totalSteps: MissionRegistry[missionId]?.steps.length ?? 0,
        steps: MissionRegistry[missionId]?.steps,
        stepProgress: this.getMissionStepProgress(missionId),
      });
    });

    this.onEventBus("game:pause-requested", () => {
      this.scene.pause(SceneNames.GAME);
      this.scene.pause(SceneNames.UI);
    });

    this.onEventBus("game:resume-requested", () => {
      this.scene.resume(SceneNames.GAME);
      this.scene.resume(SceneNames.UI);
    });

    this.onEventBus("ui:label-show", () => {
      this.events.emit(GameEvents.DIALOGUE_STARTED);
    });

    this.onEventBus("ui:label-hide", () => {
      this.events.emit(GameEvents.DIALOGUE_ENDED);
    });

    this.events.on(
      GameEvents.TUTORIAL_SHOWN,
      (data: { tutorialId: string; blockMovement: boolean }) => {
        this.isDialogueOpen = data.blockMovement;
        this.tutorialSetDialogueOpen = data.blockMovement;
        if (this.player) {
          this.player.isInDialogue = data.blockMovement;
          this.player.isTutorialActive = true;
          if (data.blockMovement) {
            this.player.setVelocity(0, 0);
          }
        }
      },
    );

    this.events.on(
      GameEvents.TUTORIAL_DISMISSED,
      (_data: { tutorialId: string }) => {
        if (this.tutorialSetDialogueOpen) {
          this.isDialogueOpen = false;
          this.tutorialSetDialogueOpen = false;
        }
        if (this.player) {
          this.player.isTutorialActive = false;
          this.checkDialogState();
        }
      },
    );

    this.onEventBus("ui:label-show", () => {
      this.tutorialSystem?.completeTutorial("tutorial_read_label");
      this.nudgeManager?.recordInteraction();
    });
  }

  private setupEvents() {
    this.events.on(GameEvents.DIALOGUE_STARTED, (source?: string) => {
      this.isDialogueOpen = true;
      this.tutorialSetDialogueOpen = false;
      if (this.player) {
        this.player.isInDialogue = true;
        this.player.setVelocity(0, 0);
      }
      this.effects.setZoom(
        LayoutConfig.GAME.CAMERA.DIALOGUE_ZOOM,
        LayoutConfig.GAME.CAMERA.DIALOGUE_ZOOM_DURATION,
      );
      // Play magnifying glass zoom-in sound only for quiz/puzzle panels
      if (source === "quiz" || source === "puzzle") {
        AudioManager.playSfx("sfx.magnifying.up");
      }
      this.effects.setZoom(1.2, 400);
    });

    this.events.on(
      GameEvents.DIALOGUE_ENDED,
      (data?: { dismissed?: boolean; source?: string }) => {
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

        this.effects.setZoom(
          1.0,
          LayoutConfig.GAME.CAMERA.DIALOGUE_ZOOM_DURATION,
        );
        // Play magnifying glass zoom-out sound only for quiz/puzzle panels
        if (data?.source === "quiz" || data?.source === "puzzle") {
          AudioManager.playSfx("sfx.magnifying.down");
        }
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

    if (!this.anims.exists("star_anim")) {
      this.anims.create({
        key: "star_anim",
        frames: this.anims.generateFrameNumbers("star", {
          start: 0,
          end: 31,
        }),
        frameRate: 10,
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
    // We push individual stairsLayers instead of just this.stairsLayer now.
    // this.player.stairsLayer is deprecated in Player, we use stairsLayers
    for (const layer of this.pendingStairsLayers) {
      this.player.stairsLayers.push(layer);
    }
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
            (n) => n instanceof Npc && n.getMissionId() === payload.missionId,
          ) as Npc | undefined;
          if (curator) {
            const finalPos = curator.getFinalPosition() ?? NPC_FLOOR_3_POSITION;
            curator.teleportTo(finalPos.x, finalPos.y);
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
      if (
        (this.isDialogueOpen && !this.player?.isTutorialActive) ||
        this.isChunkSelectorOpen ||
        this.isCostumeSelectorOpen
      )
        return;

      if (this.tryInteractWithRat()) {
        return;
      }

      const INTERACT_RANGE = 120;
      const px = this.player.x;
      const playerBody = this.player.body as Phaser.Physics.Arcade.Body | null;
      const py = playerBody ? playerBody.bottom : this.player.y;

      const candidates: Array<{ dist: number; open: () => void }> = [];

      // Label candidate
      const label = this.labelSystem.getNearbyLabel(
        this.player.x,
        this.player.y,
        INTERACT_RANGE,
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
          const labelDist = Phaser.Math.Distance.Between(
            px,
            py,
            label.sprite.x,
            label.sprite.y + label.sprite.displayHeight / 2,
          );
          candidates.push({
            dist: labelDist,
            open: () => {
              // Play inspect sound for label interaction
              AudioManager.playSfx("sfx.clue.inspect");
              const payload = buildLabelInfo(work, (id) =>
                findWorkDataById(id, this.contentData),
              );
              EventBus.emit("ui:label-show", payload);
              posthog.capture("label_interacted", {
                label_title: payload.title,
                label_author: payload.author,
              });
            },
          });
        }
      }

      // Photo placeholder candidate
      const photo = this.placeholderSystem.getNearbyPlaceholder(
        this.player.x,
        this.player.y,
        INTERACT_RANGE,
        InteractiveType.PHOTO,
      );
      if (photo && !photo.isFilled) {
        const photoInteractionY = photo.area.centerY + 100;
        const photoDist = Phaser.Math.Distance.Between(
          px,
          py,
          photo.area.centerX,
          photoInteractionY,
        );
        candidates.push({
          dist: photoDist,
          open: () => {
            const filled = Array.isArray(photo.state?.filledSlots)
              ? (photo.state.filledSlots as (string | null)[])
              : [null, null, null, null];
            const availableChunks = this.player
              .getInventory()
              .filter(
                (item) => item.interactiveType === InteractiveType.PHOTO_CHUNK,
              );

            this.isChunkSelectorOpen = true;
            this.tutorialSystem?.completeTutorial("tutorial_photo_placeholder");
            this.nudgeManager?.recordInteraction();
            this.events.emit(GameEvents.DIALOGUE_STARTED, "puzzle");
            const expectedSlots = Array.isArray(photo.id)
              ? photo.id
              : String(photo.id)
                  .split(",")
                  .map((s) => s.trim());
            EventBus.emit("ui:chunk-selector-open", {
              instanceId: photo.instanceId,
              availableItems: availableChunks.map((item) => ({
                id: item.itemId,
                name: item.itemName,
                levelId: this.levelId,
              })),
              filledSlots: filled,
              expectedSlots,
            });
          },
        });
      }

      // Costume placeholder candidate
      const costume = this.placeholderSystem.getNearbyPlaceholder(
        this.player.x,
        this.player.y,
        INTERACT_RANGE,
        InteractiveType.COSTUME,
      );
      if (costume) {
        const costumeDist = Phaser.Math.Distance.Between(
          px,
          py,
          costume.area.centerX,
          costume.area.centerY,
        );
        candidates.push({
          dist: costumeDist,
          open: () => {
            if (this.markFloorStarted(this.scoringFloors.costumes)) {
              posthog.capture("minigame_started", {
                minigame_number: this.scoringFloors.costumes + 1,
                level_id: this.levelId,
              });
            }

            const ids = Array.isArray(costume.id)
              ? (costume.id as string[])
              : String(costume.id)
                  .split(",")
                  .map((s) => s.trim());
            const correctCostume =
              CostumeMechanicHandler.deriveCorrectCostume(ids);

            const initialCostumeState =
              CostumeMechanicHandler.createInitialState();
            const costumeState = costume.state as
              | Partial<CostumeState>
              | undefined;
            const equippedParts = {
              ...initialCostumeState.equippedParts,
              ...costumeState?.equippedParts,
            };
            const lockedParts = {
              ...initialCostumeState.lockedParts,
              ...costumeState?.lockedParts,
            };

            this.isCostumeSelectorOpen = true;
            this.events.emit(GameEvents.DIALOGUE_STARTED);
            EventBus.emit("ui:costume-selector-open", {
              instanceId: costume.instanceId,
              correctCostume,
              equippedParts,
              lockedParts,
            });
            posthog.capture("costume_interacted", {
              level_id: this.levelId,
            });
          },
        });
      }

      // Spotlight candidate
      if (this.spotlightSystem) {
        const spotlight = this.spotlightSystem.getNearbySpotlight(
          this.player.x,
          this.player.y,
          INTERACT_RANGE,
        );
        if (spotlight) {
          const spotlightDist = Phaser.Math.Distance.Between(
            px,
            py,
            spotlight.sprite.x,
            spotlight.sprite.y,
          );
          candidates.push({
            dist: spotlightDist,
            open: () => {
              this.handleSpotlightInteraction(spotlight);
            },
          });
        }
      }

      if (candidates.length === 0) return;
      candidates.sort((a, b) => a.dist - b.dist);
      candidates[0].open();
    });

    this.player.on("item-interacted", (item: DraggableItem | CarryableItem) => {
      const typeEventMap: Partial<Record<InteractiveType, string>> = {
        [InteractiveType.PAINTING]: "painting_interacted",
        [InteractiveType.SCULPTURE]: "sculpture_interacted",
        [InteractiveType.POSTER]: "poster_interacted",
        [InteractiveType.PHOTO_CHUNK]: "photo_chunk_collected",
      };
      const eventName = typeEventMap[item.interactiveType];
      if (eventName) {
        posthog.capture(eventName, {
          item_id: item.itemId,
          item_name: item.itemName,
          level_id: this.levelId,
        });
      }

      const floorForType: Partial<Record<InteractiveType, number>> = {
        [InteractiveType.SCULPTURE]: this.scoringFloors.sculptures,
        [InteractiveType.PAINTING]: this.scoringFloors.paintings,
        [InteractiveType.PHOTO_CHUNK]: this.scoringFloors.photo,
      };
      const floorIndex = floorForType[item.interactiveType];
      if (floorIndex !== undefined && this.markFloorStarted(floorIndex)) {
        posthog.capture("minigame_started", {
          minigame_number: floorIndex + 1,
          level_id: this.levelId,
        });
      }

      if (!this.itemsInteracted.has(item.itemId)) {
        this.itemsInteracted.add(item.itemId);
        this.nudgeManager?.recordInteraction();

        const currentInspected = this.registry.get("objects_inspected") || 0;
        this.registry.set("objects_inspected", currentInspected + 1);
        const payload = item.getData("payload");
        const opinion = payload?.educational?.opinion;

        if (opinion) {
          this.events.emit(GameEvents.SHOW_DIALOGUE_REQUEST, [opinion]);
        }

        this.tutorialSystem?.completeTutorial("tutorial_drag_sculpture");

        if (item.interactiveType === InteractiveType.PHOTO_CHUNK) {
          this.photoChunksCollected++;
          this.events.emit(GameEvents.MISSION_PROGRESS_CHANGED);
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
      this.events.emit(GameEvents.DIALOGUE_ENDED, { source: "puzzle" });
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

    this.onEventBus("ui:chunk-selector-submit", handleInteractionSubmitted);
    this.onEventBus("ui:chunk-slot-placed", (data) => {
      const p = this.placeholderSystem.getPlaceholderByInstanceId(
        data.instanceId,
      );
      if (!p) return;

      const handler = this.mechanicsManager.getHandler(InteractiveType.PHOTO);
      if (!(handler instanceof PhotoMechanicHandler)) return;

      handler.placeCorrectChunk(this, p, data.itemId, data.slotIndex);
      this.events.emit(GameEvents.MISSION_PROGRESS_CHANGED);
    });
    this.onEventBus("ui:chunk-slot-rejected", () => {
      this.sound.play("sfx.puzzle.failure", { volume: 0.5 });
    });
    this.onEventBus("ui:chunk-selector-close", () => {
      if (!this.isChunkSelectorOpen) return;
      this.isChunkSelectorOpen = false;
      this.events.emit(GameEvents.DIALOGUE_ENDED, { source: "puzzle" });
      this.checkDialogState();
    });
    this.onEventBus("ui:costume-selector-close", () => {
      if (!this.isCostumeSelectorOpen) return;
      this.isCostumeSelectorOpen = false;
      this.events.emit(GameEvents.DIALOGUE_ENDED);
      this.checkDialogState();
    });
    this.onEventBus("ui:costume-part-selected", (data) => {
      const p = this.placeholderSystem.getPlaceholderByInstanceId(
        data.instanceId,
      );
      if (!p) return;

      const initialCostumeState = CostumeMechanicHandler.createInitialState();
      const equipped = {
        ...initialCostumeState.equippedParts,
        ...(p.state?.equippedParts as CostumeState["equippedParts"]),
      };
      const locked = {
        ...initialCostumeState.lockedParts,
        ...(p.state?.lockedParts as CostumeState["lockedParts"]),
      };
      const partType = data.partType as CostumePartType;
      equipped[partType] = data.partId;
      locked[partType] = true;
      p.state = { ...p.state, equippedParts: equipped, lockedParts: locked };

      this.placeholderSystem.updateCostumePart(
        data.instanceId,
        data.partType as "head" | "torso" | "feet",
        data.partId,
      );
    });
    this.onEventBus("ui:costume-part-rejected", () => {
      this.sound.play("sfx.puzzle.failure", { volume: 0.5 });
      this.recordFloorError(this.scoringFloors.costumes);
    });
    this.onEventBus("ui:costume-confirm", (data) => {
      const p = this.placeholderSystem.getPlaceholderByInstanceId(
        data.instanceId,
      );
      if (!p) return;

      this.showSpotlightBeam(2000, p.area.centerX, p.area.centerY);
      this.playConfettiBurst(p.area.centerX, p.area.centerY);
      this.placeholderSystem.lockPlaceholder(data.instanceId);
      this.events.emit(GameEvents.MISSION_PROGRESS_CHANGED);

      if (
        this.placeholderSystem.checkCategoryCompletion(InteractiveType.COSTUME)
      ) {
        this.completeFloor(this.scoringFloors.costumes);
        this.time.delayedCall(500, () => {
          this.events.emit(GameEvents.INFO_COLLECTED, {
            missionId: MissionIds.CURATOR_L2,
            infoKey: MissionKeys.COSTUMES_DONE,
          });
          this.events.emit(GameEvents.MISSION_PROGRESS_CHANGED);
        });
      }
    });

    this.events.on("item-dropped", this.handleItemDropped, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off("item-dropped", this.handleItemDropped, this);
      this.collectibleSystem?.destroy();
      this.hintKeySystem?.destroy();
      this.tutorialSystem?.destroy();
      this.badgeSystem.destroy();
      AudioManager.destroy();
      this.unsubscribeFromEventBus();
    });
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

    posthog.capture("rat_interacted", {
      level_id: this.levelId,
    });

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

  // Subscribes to a global EventBus event for the lifetime of this scene instance.
  // The unsubscriber is tracked so SHUTDOWN removes only the listener this scene
  // registered. EventBus.off(event) without a handler would wipe every listener for
  // that event, including the ones React owns (e.g. GameOverlay's "ui:label-show").
  private onEventBus<K extends keyof GameEventMap>(
    event: K,
    fn: (data: GameEventMap[K]) => void,
  ) {
    this.eventBusUnsubs.push(EventBus.on(event, fn));
  }

  private unsubscribeFromEventBus() {
    for (const unsubscribe of this.eventBusUnsubs) {
      unsubscribe();
    }
    this.eventBusUnsubs = [];
  }

  private checkDialogState() {
    if (
      !this.isDialogueOpen &&
      !this.isControlsOpen &&
      !this.isChunkSelectorOpen &&
      !this.isCostumeSelectorOpen &&
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
    this.colliders = colliders;
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

  private setupCameras(map?: Phaser.Tilemaps.Tilemap) {
    this.cameras.main.setZoom(1.0);
    if (map) {
      this.cameras.main.setBounds(
        0,
        0,
        map.widthInPixels * this.mapScale,
        map.heightInPixels * this.mapScale,
      );
    }
    this.cameras.main.startFollow(this.player, true, 0.2, 0.2, 0, 140);
    this.levelManager.updateProgress();
  }

  update(_time: number, delta: number) {
    const NOMINAL_DT = 1000 / 60;
    const dtClamped = Math.min(delta, 50);
    const adjusted = 1 - (1 - 0.2) ** (dtClamped / NOMINAL_DT);
    this.cameras.main.lerp.set(adjusted, adjusted);

    if (this.isDialogueOpen) {
      const cam = this.cameras.main;
      EventBus.emit("dialogue:camera-sync", {
        worldViewX: cam.worldView.x,
        worldViewY: cam.worldView.y,
        zoom: cam.zoom,
      });
    }

    this.effects.updateSpotlight(this.player.x, this.player.y);
    this.effects.updateScoreFeedback(
      this.player.x,
      this.player.y,
      this.player.displayHeight,
    );

    if (this.player && this.hintKeySystem) {
      const isPanelOpen =
        this.isDialogueOpen ||
        this.isControlsOpen ||
        this.isChunkSelectorOpen ||
        this.isCostumeSelectorOpen ||
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

      if (this.tutorialSystem) {
        this.tutorialSystem.update(this.player.x, this.player.y, isPlayerBusy);
      }

      if (
        this.nudgeManager?.evaluate(Date.now(), isPlayerBusy || isPanelOpen)
      ) {
        const nearbyCostume =
          !this.isCategoryComplete(InteractiveType.COSTUME) &&
          this.placeholderSystem.getNearbyPlaceholder(
            this.player.x,
            this.player.y,
            500,
            InteractiveType.COSTUME,
          );
        const nearbySpotlight =
          !this.isCategoryComplete(InteractiveType.SPOTLIGHT) &&
          this.spotlightSystem?.getNearestIncomplete(
            this.player.x,
            this.player.y,
            500,
          );

        if (nearbyCostume || nearbySpotlight) {
          if (nearbyCostume) {
            this.placeholderSystem.pulseNearestPlaceholder(
              this.player.x,
              this.player.y,
              500,
              InteractiveType.COSTUME,
            );
            posthog.capture("nudge_pulse_shown_costume", {
              level_id: this.levelId,
              mission_id: this.nudgeManager.getCurrentMissionId(),
            });
          }
          if (nearbySpotlight) {
            this.spotlightSystem?.pulseNearestSpotlight(
              this.player.x,
              this.player.y,
              500,
            );
            posthog.capture("nudge_pulse_shown_spotlight", {
              level_id: this.levelId,
              mission_id: this.nudgeManager.getCurrentMissionId(),
            });
          }
          this.nudgeManager.recordNudge();
        } else {
          const hintResult = this.findNearestHint();
          if (hintResult) {
            this.nudgeManager.recordNudge();
            EventBus.emit("ui:toast-show", {
              message: hintResult.message,
              duration: 5000,
            });
            posthog.capture(NUDGE_HINT_EVENT_BY_TYPE[hintResult.category], {
              level_id: this.levelId,
              mission_id: this.nudgeManager.getCurrentMissionId(),
              hint_message: hintResult.message,
            });
          }
        }
      }
    }
  }

  public getLevelId(): string {
    return this.levelId;
  }

  private static readonly TYPE_TO_DONE_KEY: Partial<
    Record<InteractiveType, { infoKey: string; missionId: string }>
  > = {
    [InteractiveType.SCULPTURE]: {
      infoKey: MissionKeys.SCULPTURES_DONE,
      missionId: MissionIds.CURATOR,
    },
    [InteractiveType.PAINTING]: {
      infoKey: MissionKeys.PAINTINGS_DONE,
      missionId: MissionIds.CURATOR,
    },
    [InteractiveType.PHOTO_CHUNK]: {
      infoKey: MissionKeys.PHOTO_COLLECTED,
      missionId: MissionIds.CURATOR,
    },
    [InteractiveType.PHOTO]: {
      infoKey: MissionKeys.PHOTO_COLLECTED,
      missionId: MissionIds.CURATOR,
    },
    [InteractiveType.COSTUME]: {
      infoKey: MissionKeys.COSTUMES_DONE,
      missionId: MissionIds.CURATOR_L2,
    },
    [InteractiveType.POSTER]: {
      infoKey: MissionKeys.POSTERS_DONE,
      missionId: MissionIds.CURATOR_L2,
    },
    [InteractiveType.SPOTLIGHT]: {
      infoKey: MissionKeys.SPOTLIGHTS_DONE,
      missionId: MissionIds.CURATOR_L2,
    },
  };

  private isCategoryComplete(type: InteractiveType): boolean {
    const entry = Game.TYPE_TO_DONE_KEY[type];
    if (!entry) return false;
    return this.questManager.hasInfo(entry.missionId, entry.infoKey);
  }

  private findNearestHint(): {
    message: string;
    category: InteractiveType;
  } | null {
    const px = this.player.x;
    const py = this.player.y;
    const candidates: {
      dist: number;
      hint: string;
      category: InteractiveType;
    }[] = [];
    const NUDGE_RADIUS = 500;

    for (const item of this.draggableItems) {
      if (!item.active || item.isGrabbed || item.input?.enabled === false)
        continue;
      if (this.isCategoryComplete(item.interactiveType)) continue;
      const work = findWorkDataById(item.itemId, this.contentData);
      const hint = work?.educational?.hint;
      if (hint && hint !== "XXXXX" && hint !== "") {
        const dist = Phaser.Math.Distance.Between(px, py, item.x, item.y);
        if (dist <= NUDGE_RADIUS) {
          candidates.push({ dist, hint, category: item.interactiveType });
        }
      }
    }

    for (const item of this.carryableItems) {
      if (!item.active || item.isCarried || item.input?.enabled === false)
        continue;
      if (this.isCategoryComplete(item.interactiveType)) continue;
      const work = findWorkDataById(item.itemId, this.contentData);
      const hint = work?.educational?.hint;
      if (hint && hint !== "XXXXX" && hint !== "") {
        const dist = Phaser.Math.Distance.Between(px, py, item.x, item.y);
        if (dist <= NUDGE_RADIUS) {
          candidates.push({ dist, hint, category: item.interactiveType });
        }
      }
    }

    const photo = this.placeholderSystem.getNearbyPlaceholder(
      px,
      py,
      NUDGE_RADIUS,
      InteractiveType.PHOTO,
    );
    if (photo && !this.isCategoryComplete(InteractiveType.PHOTO)) {
      const workId = resolveWorkIdFromPlaceholder(photo.id, this.contentData);
      if (workId) {
        const work = findWorkDataById(workId, this.contentData);
        const hint = work?.educational?.hint;
        if (hint && hint !== "XXXXX" && hint !== "") {
          const dist = Phaser.Math.Distance.Between(
            px,
            py,
            photo.area.centerX,
            photo.area.centerY,
          );
          candidates.push({ dist, hint, category: InteractiveType.PHOTO });
        }
      }
    }

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => a.dist - b.dist);
    return { message: candidates[0].hint, category: candidates[0].category };
  }

  public markFloorStarted(floorIndex: number): boolean {
    if (this.startedFloors.has(floorIndex)) return false;
    this.startedFloors.add(floorIndex);
    return true;
  }

  public recordFloorError(floorIndex: number) {
    this.scoreManager.recordFloorError(floorIndex);
  }

  public completeFloor(floorIndex: number) {
    const alreadyCompleted =
      !!this.scoreManager.getPayload().floors[floorIndex]?.completedAt;
    this.scoreManager.completeFloor(floorIndex);
    if (!alreadyCompleted) {
      const floor = this.scoreManager.getPayload().floors[floorIndex];
      posthog.capture("minigame_completed", {
        minigame_number: floorIndex + 1,
        level_id: this.levelId,
        errors: floor.errors,
        quarters_earned: floor.quartersEarned,
      });
    }
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

  public playConfettiBurst(px: number, py: number) {
    this.effects.playConfettiBurst(px, py);
  }

  public handleSpotlightInteraction(
    spotlight: import("../systems/SpotlightSystem").SpotlightInstance,
  ) {
    const handler = this.mechanicsManager.getHandler(InteractiveType.SPOTLIGHT);
    if (handler && "handleActivation" in handler) {
      const wasActivated = this.spotlightSystem.activateSpotlight(spotlight);
      if (wasActivated) {
        (
          handler as import("../mechanics/handlers/SpotlightMechanicHandler").SpotlightMechanicHandler
        ).handleActivation(this, spotlight);
      }
    }
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
      if (step.categoryType === InteractiveType.SPOTLIGHT) {
        return (
          this.spotlightSystem?.getCategoryProgress() || {
            filled: 0,
            total: 1,
          }
        );
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
          handler as
            | PaintingMechanicHandler
            | SculptureMechanicHandler
            | PosterMechanicHandler
        ).handleDropResult(this, result);
      }

      if (result.snapped) {
        this.showSpotlightBeam(
          2000,
          result.placeholder?.area.centerX,
          result.placeholder?.area.centerY,
        );
        if (result.placeholder) {
          this.playConfettiBurst(
            result.placeholder.area.centerX,
            result.placeholder.area.centerY,
          );
        }
      }
    }
  }
}
