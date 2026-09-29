import * as Phaser from "phaser";
import { Scene, WEBGL } from "phaser";
import posthog from "posthog-js";

import { chapterIdFor } from "../../lib/edital/events";
import { setChapterId } from "../../lib/posthog/eventContext";
import { EventBus } from "../../shared/events/event-bus";
import type { GameEventMap } from "../../shared/events/game-events";
import { useDialogueStore } from "../../ui/state/dialogue-store";
import { useGameUIStore } from "../../ui/state/game-ui-store";
import type { AudioKey } from "../audio";
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
import { buildStepSequenceData } from "../data/stepSequenceContent";
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
import { Phase3Parallax } from "../objects/Phase3Parallax";
import { Player } from "../objects/Player";
import { PLAYER_MOVEMENT, PLAYER_SPAWN } from "../objects/PlayerConfig";
import type { Portal } from "../objects/Portal";
import { ProgressionManager } from "../objects/ProgressionManager";
import { QuestManager, QuestStatus } from "../objects/QuestManager";
import { ScoreManager } from "../objects/ScoreManager";
import { Trampoline } from "../objects/Trampoline";
import { AnalyticsSystem } from "../systems/AnalyticsSystem";
import { BadgeSystem } from "../systems/BadgeSystem";
import { ChandelierLightSystem } from "../systems/ChandelierLightSystem";
import { CollectibleSystem } from "../systems/CollectibleSystem";
import { captureOncePerSession } from "../systems/captureOncePerSession";
import { DisappearingPlatformTracker } from "../systems/DisappearingPlatformTracker";
import { processModularData } from "../systems/GameDataLoader";
import { HintKeySystem } from "../systems/HintKeySystem";
import { LabelSystem } from "../systems/LabelSystem";
import { LadderCinematicSystem } from "../systems/LadderCinematicSystem";
import { LightBarSystem } from "../systems/LightBarSystem";
import { NudgeManager } from "../systems/NudgeManager";
import { ObjectLayerProcessor } from "../systems/ObjectLayerProcessor";
import { PersistenceBridge } from "../systems/PersistenceBridge";
import { PlaceholderSystem } from "../systems/PlaceholderSystem";
import { getInteractionConfig } from "../systems/placeholderInteraction";
import { QuizManager } from "../systems/QuizManager";
import { SpotlightSystem } from "../systems/SpotlightSystem";
import { SwitchLightCinematicSystem } from "../systems/SwitchLightCinematicSystem";
import { SwitchLightSystem } from "../systems/SwitchLightSystem";
import {
  type DisappearingPlatformLayer,
  type MapData,
  TiledMapLoader,
} from "../systems/TiledMapLoader";
import { TrampolineSystem } from "../systems/TrampolineSystem";
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
  [InteractiveType.STEP_SEQUENCE]: "nudge_hint_shown_step_sequence",
  [InteractiveType.BAND]: "nudge_hint_shown_band",
  [InteractiveType.GENIUS_SEQUENCE]: "nudge_hint_shown_genius_sequence",
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
    dance: 0,
    band: 0,
    genius: 1,
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
  private isStepSequenceOpen: boolean = false;
  private isBandPanelOpen: boolean = false;
  private isGeniusSequenceOpen: boolean = false;
  private pendingGeniusSequenceReward: string | null = null;
  private isDialogueOpen: boolean = false;
  private tutorialSetDialogueOpen: boolean = false;
  private photoChunksCollected: number = 0;
  private totalPhotoChunks: number = 0;
  private objectLayerProcessor!: ObjectLayerProcessor;
  private collectibleSystem!: CollectibleSystem;
  private ladderCinematicSystem!: LadderCinematicSystem;
  private switchLightCinematicSystem!: SwitchLightCinematicSystem;
  public placeholderSystem!: PlaceholderSystem;
  public labelSystem!: LabelSystem;
  public lightBarSystem!: LightBarSystem;
  public chandelierLightSystem!: ChandelierLightSystem;
  public spotlightSystem!: SpotlightSystem;
  public trampolineSystem!: TrampolineSystem;
  public switchLightSystem!: SwitchLightSystem;
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
  private trampolines: Trampoline[] = [];
  private disappearingPlatforms: {
    layer: Phaser.Tilemaps.TilemapLayer;
    tracker: DisappearingPlatformTracker;
  }[] = [];
  private itemsInteracted: Set<string> = new Set();
  private eventBusUnsubs: Array<() => void> = [];

  private levelId: string = "level_01";
  private levelDef!: LevelDefinition;
  private phase3Parallax?: Phase3Parallax;
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
    this.isStepSequenceOpen = false;
    this.isBandPanelOpen = false;
    this.isGeniusSequenceOpen = false;
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
    Trampoline.preload(this);
    EffectsManager.preload(this);

    // Preload global SFX assets (footsteps, climb, jump, drag, etc.)
    loadGlobalAudio(this);

    this.load.tilemapTiledJSON(this.levelDef.map.key, this.levelDef.map.json);
    this.load.image(this.levelDef.map.tileset, this.levelDef.map.tilesetImg);

    if (this.levelDef.levelNumber === Phase3Parallax.LEVEL_NUMBER) {
      Phase3Parallax.preload(this);
    }

    LEVEL_ASSETS[this.levelId as keyof typeof LEVEL_ASSETS].OTHERS.forEach(
      (asset) => {
        if ("frameWidth" in asset && "frameHeight" in asset) {
          this.load.spritesheet(asset.key, asset.path, {
            frameWidth: asset.frameWidth as number,
            frameHeight: asset.frameHeight as number,
          });
        } else {
          this.load.image(asset.key, asset.path);
        }
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
    this.switchLightCinematicSystem = new SwitchLightCinematicSystem(
      this,
      this.effects,
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
      manifest?.musicLayers?.forEach((layer) => {
        AudioManager.playMusicLayer(layer.key);
      });
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
          if (step.infoKey === MissionKeys.SWITCHES_DONE) {
            return {
              ...step,
              progressGetter: () =>
                this.switchLightSystem?.getProgress() ?? {
                  filled: 0,
                  total: 0,
                },
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
      // Issue #741: clear chapter_id when this level's scene shuts down —
      // whether that's chapter 1 ending or any other level, so a stale
      // chapter_id from a previous level never leaks onto later events.
      setChapterId(null);
    });

    // Legacy — unchanged, still fires once per level (scene restart per
    // LevelCinematic.ts).
    posthog.capture("game_started", {
      level_id: this.levelId,
      level_number: this.levelDef.levelNumber,
    });

    // Canonical funnel step — must fire exactly once per session, unlike
    // the legacy event above ("gameplay_started fires exactly once under
    // StrictMode").
    captureOncePerSession("gameplay_started", {
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
      this.setupCollisions(
        mapData.colliders,
        mapData.oneWayColliders,
        mapData.disappearingLayers,
      );

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
        this.spotlightSystem = new SpotlightSystem(this);
        this.spotlightSystem.registerAllFromLayer(spotlightLayer);
      }

      const lightBarLayer = mapData.objectLayers.LightBars;
      if (lightBarLayer) {
        this.lightBarSystem = new LightBarSystem(this);
        this.lightBarSystem.registerAllFromLayer(lightBarLayer);
      }

      const chandelierLayer = mapData.objectLayers.Chandeliers;
      if (chandelierLayer) {
        this.chandelierLightSystem = new ChandelierLightSystem(this);
        this.chandelierLightSystem.registerAllFromLayer(chandelierLayer);
      }

      const switchLightLayer = mapData.objectLayers.SwitchLight;
      if (switchLightLayer) {
        this.switchLightSystem = new SwitchLightSystem(this);
        this.switchLightSystem.registerAllFromLayer(switchLightLayer);
        this.switchLightSystem.setPlayerTracking(this.player);
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
          .filter((p) => p.type === InteractiveType.PHOTO)
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
              return !p.isFilled && !p.isLocked;
            },
            interactionDistance: 120,
          })),
        ...this.placeholderSystem
          .getAll()
          .filter((p) => p.type === InteractiveType.COSTUME)
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
              return !p.isFilled && !p.isLocked;
            },
            interactionDistance: 120,
          })),
        ...this.placeholderSystem
          .getAll()
          .filter(
            (p) => p.type === InteractiveType.GENIUS_SEQUENCE && !p.isFilled,
          )
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
        ...this.placeholderSystem
          .getAll()
          .filter((p) => p.type === InteractiveType.STEP_SEQUENCE)
          .map((p) => {
            const placeholderSystem = this.placeholderSystem;
            const config = getInteractionConfig(p.type);
            return {
              get x() {
                return placeholderSystem.getInteractionPoint(p).x;
              },
              get y() {
                return placeholderSystem.getInteractionPoint(p).y;
              },
              get interactionY() {
                return placeholderSystem.getInteractionPoint(p).y;
              },
              get displayHeight() {
                return placeholderSystem.getInteractionPoint(p).height;
              },
              get hintY() {
                return (
                  placeholderSystem.getInteractionPoint(p).y -
                  (config.hintOffsetY ?? 0)
                );
              },
              get active() {
                return !p.isFilled && !p.isLocked;
              },
              interactionDistance: config.range,
            };
          }),
        ...this.placeholderSystem
          .getAll()
          .filter((p) => p.type === InteractiveType.BAND)
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
              return p.area.top;
            },
            get active() {
              return !p.isFilled && !p.isLocked;
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
        ...(this.switchLightSystem?.getAll().map((sw) => ({
          get x() {
            return sw.sprite.x;
          },
          get y() {
            return sw.sprite.y;
          },
          get interactionY() {
            return sw.sprite.y;
          },
          get displayHeight() {
            return sw.sprite.displayHeight;
          },
          get active() {
            return !sw.isActivated;
          },
          interactionDistance: 130,
        })) || []),
      ]);

      this.analyticsSystem.trackLevelEvent(
        GameEventType.LEVEL_STARTED,
        this.levelId,
        {
          levelNumber: this.levelDef.levelNumber,
        },
      );

      // Canonical funnel step — only chapter 1 has one; other levels have
      // no corresponding canonical step (see the 7-step funnel in the
      // edital onepager, #739).
      if (this.levelDef.levelNumber === 1) {
        posthog.capture("chapter_1_started", { level_id: this.levelId });
        // Issue #741: every event after level entry should carry
        // chapter_id — this is the only producer for the singleton
        // before_send (beforeSend.ts) reads from.
        setChapterId(chapterIdFor(this.levelDef.levelNumber));
      }
    }
    this.setupCameras(map);

    // Level 3 gets a night-sky backdrop behind the Tiled world. Created after
    // the camera bounds are set, since the parallax reads them.
    if (this.levelDef.levelNumber === Phase3Parallax.LEVEL_NUMBER) {
      this.phase3Parallax = new Phase3Parallax(this);
      this.phase3Parallax.create();

      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.phase3Parallax?.destroy();
        this.phase3Parallax = undefined;
      });
    }

    this.events.on(
      GameEvents.INFO_COLLECTED,
      (payload: string | { infoKey: string; missionId?: string }) => {
        const infoKey = typeof payload === "string" ? payload : payload.infoKey;
        const missionId =
          typeof payload === "string" ? undefined : payload.missionId;
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
          if (
            infoKey === MissionKeys.STAGE_DONE &&
            missionId === MissionIds.CURATOR_L2
          ) {
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

    this.setupLighting();
  }

  private setupLighting() {
    if (this.renderer.type !== WEBGL) return;

    this.lights.enable();
    this.lights.setAmbientColor(0xd9d9d9);

    this.children.list.forEach((obj) => {
      const lightingObj = obj as unknown as {
        setLighting?: (enable: boolean) => void;
      };
      if (typeof lightingObj.setLighting === "function") {
        lightingObj.setLighting(true);
      }
    });

    // Light bars are the light source themselves — keep lighting off so
    // they render at full brightness instead of being dimmed by their
    // own ambient/cone lighting.
    this.lightBarSystem?.getAll().forEach(({ sprite }) => {
      sprite.setLighting(false);
    });

    this.spotlightSystem?.getAll().forEach(({ sprite, light }) => {
      if (light) sprite.setLighting(false);
    });

    // The parallax backdrop is atmospheric set dressing, not part of the
    // physically lit world — and its layers are viewport-sized with no
    // camera culling, so leaving lighting on them would run the multi-light
    // shader over the full screen every frame.
    this.phase3Parallax?.setLighting(false);
  }

  private setupEvents() {
    this.events.on(
      GameEvents.SWITCH_LIGHT_ACTIVATED,
      (payload: { lightBarName: string }) => {
        const lb = this.lightBarSystem?.getByInstanceId(payload.lightBarName);
        if (!lb) return;
        this.switchLightCinematicSystem.playCinematic(lb.x, lb.y, () => {
          this.lightBarSystem?.fix(payload.lightBarName);
          if (lb.placeholderId) {
            this.placeholderSystem.unlockByInstanceId(lb.placeholderId);
          }
          this.events.emit(GameEvents.MISSION_PROGRESS_CHANGED);
          if (this.switchLightSystem?.allActivated()) {
            this.events.emit(GameEvents.INFO_COLLECTED, {
              missionId: MissionIds.CURATOR_L3,
              infoKey: MissionKeys.SWITCHES_DONE,
            });
          }
        });
      },
    );

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
      // Play UI zoom-in sound only for puzzle panels
      if (source === "puzzle") {
        AudioManager.playSfx("sfx.ui.click");
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
        // Play UI zoom-out sound only for puzzle panels
        if (data?.source === "puzzle") {
          AudioManager.playSfx("sfx.ui.click");
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
    Trampoline.createAnims(this);

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

    if (!this.anims.exists("switch_light_anim")) {
      this.anims.create({
        key: "switch_light_anim",
        frames: this.anims.generateFrameNumbers("switch_light", {
          start: 0,
          end: 3,
        }),
        frameRate: 8,
        repeat: 0,
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

    const bandMusicians = ["accordion", "jam_block", "triangle", "zabumba"];
    for (const musician of bandMusicians) {
      const animKey = `band_${musician}_anim`;
      if (!this.anims.exists(animKey)) {
        this.anims.create({
          key: animKey,
          frames: this.anims.generateFrameNumbers(`band_${musician}`, {
            start: 0,
            end: 8,
          }),
          frameRate: 10,
          repeat: -1,
        });
      }
    }
    if (!this.anims.exists("accordion_open_anim")) {
      this.anims.create({
        key: "accordion_open_anim",
        frames: Array.from({ length: 9 }, (_, i) => ({
          key: `accordion_frame${String(i + 1).padStart(3, "0")}`,
        })),
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

    const trampolineLayer = mapData.objectLayers.Trampoline;
    if (trampolineLayer) {
      this.trampolineSystem = new TrampolineSystem(this);
      this.trampolineSystem.registerAllFromLayer(
        trampolineLayer,
        this.mapScale,
      );
      this.trampolines = this.trampolineSystem.getAll();
    }

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
        this.isCostumeSelectorOpen ||
        this.isBandPanelOpen ||
        this.isGeniusSequenceOpen
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
        // A label may name its own work, e.g. one label shared by several placeholders
        const workId =
          label.workId ??
          resolveWorkIdFromPlaceholder(placeholder?.id, this.contentData);
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
            this.captureMinigameStarted(this.scoringFloors.costumes);

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

      // Step sequence placeholder candidate
      const stepSequence = this.placeholderSystem.getNearbyInteractable(
        px,
        py,
        InteractiveType.STEP_SEQUENCE,
      );
      if (stepSequence) {
        const stepSequencePoint =
          this.placeholderSystem.getInteractionPoint(stepSequence);
        const stepSequenceDist = Phaser.Math.Distance.Between(
          px,
          py,
          stepSequencePoint.x,
          stepSequencePoint.y,
        );
        candidates.push({
          dist: stepSequenceDist,
          open: () => {
            // The ordered ids authored on the Tiled object are the answer.
            const data = buildStepSequenceData(
              stepSequence.instanceId,
              stepSequence.id,
              stepSequence.state?.filledSlots as (string | null)[] | undefined,
            );
            // Bail before flipping any state, so a misconfigured placeholder
            // cannot freeze the player behind a panel that never opens.
            if (!data) return;

            this.captureMinigameStarted(this.scoringFloors.dance);

            this.isStepSequenceOpen = true;
            this.events.emit(GameEvents.DIALOGUE_STARTED);
            EventBus.emit("ui:step-sequence-open", data);
            posthog.capture("step_sequence_interacted", {
              level_id: this.levelId,
            });
          },
        });
      }

      // Band placeholder candidate
      const band = this.placeholderSystem.getNearbyPlaceholder(
        this.player.x,
        this.player.y,
        INTERACT_RANGE,
        InteractiveType.BAND,
      );
      if (band) {
        const bandDist = Phaser.Math.Distance.Between(
          px,
          py,
          band.area.centerX,
          band.area.centerY,
        );
        candidates.push({
          dist: bandDist,
          open: () => {
            if (this.markFloorStarted(this.scoringFloors.band)) {
              posthog.capture("minigame_started", {
                minigame_number: this.scoringFloors.band + 1,
                level_id: this.levelId,
              });
            }
            this.isBandPanelOpen = true;
            this.events.emit(GameEvents.DIALOGUE_STARTED, "puzzle");
            EventBus.emit("ui:band-panel-open", {
              instanceId: band.instanceId,
              id: String(band.id),
              options: band.options ?? [],
            });
            posthog.capture("band_interacted", {
              level_id: this.levelId,
            });
          },
        });
      }

      // Genius sequence placeholder candidate
      const geniusSequence = this.placeholderSystem.getNearbyInteractable(
        px,
        py,
        InteractiveType.GENIUS_SEQUENCE,
      );
      if (geniusSequence) {
        const geniusPoint =
          this.placeholderSystem.getInteractionPoint(geniusSequence);
        const geniusDist = Phaser.Math.Distance.Between(
          px,
          py,
          geniusPoint.x,
          geniusPoint.y,
        );
        candidates.push({
          dist: geniusDist,
          open: () => {
            this.captureMinigameStarted(this.scoringFloors.genius);

            this.isGeniusSequenceOpen = true;
            this.events.emit(GameEvents.DIALOGUE_STARTED);
            EventBus.emit("ui:genius-sequence-open", {
              instanceId: geniusSequence.instanceId,
            });
            posthog.capture("genius_sequence_interacted", {
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
      if (floorIndex !== undefined) {
        this.captureMinigameStarted(floorIndex);
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
    this.onEventBus("ui:step-sequence-close", () => {
      this.closeStepSequence();
    });
    this.onEventBus("ui:genius-sequence-close", () => {
      this.closeGeniusSequence();

      // Sensory reward (sound/spotlight/confetti/light bar) waits for the
      // panel to actually close, not the moment the last press lands, so it
      // doesn't fire underneath the still-open celebration screen.
      if (this.pendingGeniusSequenceReward) {
        const instanceId = this.pendingGeniusSequenceReward;
        this.pendingGeniusSequenceReward = null;
        this.playPlaceholderReward(instanceId, { musicNotes: true });
      }
    });
    this.onEventBus("ui:genius-sequence-complete", (data) => {
      this.closeGeniusSequence();
      this.placeholderSystem.lockPlaceholder(data.instanceId);
      this.pendingGeniusSequenceReward = data.instanceId;

      if (
        this.placeholderSystem.checkCategoryCompletion(
          InteractiveType.GENIUS_SEQUENCE,
        )
      ) {
        this.completeFloor(this.scoringFloors.genius);
      }

      const doneKey = Game.TYPE_TO_DONE_KEY[InteractiveType.GENIUS_SEQUENCE];
      if (doneKey) {
        this.time.delayedCall(500, () => {
          this.events.emit(GameEvents.INFO_COLLECTED, {
            missionId: doneKey.missionId,
            infoKey: doneKey.infoKey,
          });
          this.events.emit(GameEvents.MISSION_PROGRESS_CHANGED);
        });
      }
    });
    // Persist each locked slot on the placeholder, so partial progress
    // survives closing and reopening the panel.
    this.onEventBus("ui:step-placed", (data) => {
      const p = this.placeholderSystem.getPlaceholderByInstanceId(
        data.instanceId,
      );
      if (!p) return;

      const filledSlots = [
        ...((p.state?.filledSlots as (string | null)[]) ?? []),
      ];
      filledSlots[data.slotIndex] = data.stepId;
      p.state = { ...p.state, filledSlots };
    });
    // One error per failed attempt, not per wrong slot, so
    // `minigame_completed.errors` reads as "failed attempts".
    this.onEventBus("ui:step-sequence-rejected", (data) => {
      this.sound.play("sfx.puzzle.failure", { volume: 0.5 });
      this.recordFloorError(this.scoringFloors.dance);
      posthog.capture("step_sequence_failed_attempt", {
        level_id: this.levelId,
        instance_id: data.instanceId,
        attempt_number: data.attemptNumber,
        wrong_count: data.wrongCount,
        correct_count: data.correctCount,
        total_slots: data.totalSlots,
      });
    });
    this.onEventBus("ui:genius-sequence-rejected", (data) => {
      this.sound.play("sfx.puzzle.failure", { volume: 0.5 });
      this.recordFloorError(this.scoringFloors.genius);
      posthog.capture("genius_sequence_failed_attempt", {
        level_id: this.levelId,
        instance_id: data.instanceId,
        attempt_number: data.attemptNumber,
        wrong_count: data.wrongCount,
        correct_count: data.correctCount,
        total_rounds: data.totalRounds,
      });
    });
    this.onEventBus("ui:step-sequence-submit", (data) => {
      this.closeStepSequence();

      this.placeholderSystem.lockPlaceholder(data.instanceId);
      this.playPlaceholderReward(data.instanceId);

      if (
        this.placeholderSystem.checkCategoryCompletion(
          InteractiveType.STEP_SEQUENCE,
        )
      ) {
        this.completeFloor(this.scoringFloors.dance);
        // Let the panel finish closing before the curator opens the quiz.
        const doneKey = Game.TYPE_TO_DONE_KEY[InteractiveType.STEP_SEQUENCE];
        if (doneKey) {
          this.time.delayedCall(500, () => {
            this.events.emit(GameEvents.INFO_COLLECTED, {
              missionId: doneKey.missionId,
              infoKey: doneKey.infoKey,
            });
            this.events.emit(GameEvents.MISSION_PROGRESS_CHANGED);
          });
        }
      }
    });
    this.onEventBus("ui:band-panel-close", () => {
      if (!this.isBandPanelOpen) return;
      this.isBandPanelOpen = false;
      this.events.emit(GameEvents.DIALOGUE_ENDED, { source: "puzzle" });
      this.checkDialogState();
    });
    this.onEventBus("ui:band-choice-rejected", () => {
      this.sound.play("sfx.puzzle.failure", { volume: 0.5 });
      this.recordFloorError(this.scoringFloors.band);
    });
    this.onEventBus("ui:band-confirm", (data) => {
      const p = this.placeholderSystem.getPlaceholderByInstanceId(
        data.instanceId,
      );
      if (!p) return;

      this.placeholderSystem.updateBandMember(
        data.instanceId,
        `band_${data.musicianId}`,
      );
      this.showSpotlightBeam();
      this.playConfettiBurst(p.area.centerX, p.area.centerY);
      this.placeholderSystem.lockPlaceholder(data.instanceId);
      this.lightBarSystem?.turnOnByPlaceholder(data.instanceId);

      const layerKey = `music.level_3.layer.${data.musicianId}` as AudioKey;
      AudioManager.unlockMusicLayer(layerKey, 400);
      if (AudioManager.isPlaying("music.level_3.main" as AudioKey)) {
        AudioManager.fadeOutMusic(400);
      }

      this.events.emit(GameEvents.MISSION_PROGRESS_CHANGED);

      if (
        this.placeholderSystem.checkCategoryCompletion(InteractiveType.BAND)
      ) {
        this.completeFloor(this.scoringFloors.band);
        this.time.delayedCall(500, () => {
          this.events.emit(GameEvents.INFO_COLLECTED, {
            missionId: MissionIds.CURATOR_L3,
            infoKey: MissionKeys.STAGE_DONE,
          });
          this.events.emit(GameEvents.MISSION_PROGRESS_CHANGED);
        });
      }
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

      this.showSpotlightBeam();
      this.playConfettiBurst(p.area.centerX, p.area.centerY);
      this.placeholderSystem.lockPlaceholder(data.instanceId);
      this.lightBarSystem?.turnOnByPlaceholder(data.instanceId);
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
      this.switchLightSystem?.destroy();
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

  private closeStepSequence() {
    if (!this.isStepSequenceOpen) return;
    this.isStepSequenceOpen = false;
    this.events.emit(GameEvents.DIALOGUE_ENDED);
    this.checkDialogState();
  }

  private closeGeniusSequence() {
    if (!this.isGeniusSequenceOpen) return;
    this.isGeniusSequenceOpen = false;
    this.events.emit(GameEvents.DIALOGUE_ENDED);
    this.checkDialogState();
  }

  private checkDialogState() {
    if (
      !this.isDialogueOpen &&
      !this.isControlsOpen &&
      !this.isChunkSelectorOpen &&
      !this.isCostumeSelectorOpen &&
      !this.isStepSequenceOpen &&
      !this.isBandPanelOpen &&
      !this.isGeniusSequenceOpen &&
      this.quizManager.getQuizMode() === "none" &&
      !this.quizManager.getIsQuizActive()
    ) {
      if (this.player) this.player.isInDialogue = false;
    }
  }

  private updateDisappearingPlatforms(time: number) {
    for (const { layer, tracker } of this.disappearingPlatforms) {
      for (const update of tracker.update(time)) {
        const [x, y] = update.key.split(",").map(Number);
        const tile = layer.getTileAt(x, y);
        if (!tile) continue;

        tile.alpha = update.alpha;
        tile.collideUp = update.collidable;
      }
    }
  }

  private setupCollisions(
    colliders: Phaser.Tilemaps.TilemapLayer[],
    oneWayColliders: Phaser.Tilemaps.TilemapLayer[] = [],
    disappearingLayers: DisappearingPlatformLayer[] = [],
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

    this.disappearingPlatforms = disappearingLayers.map(
      ({ layer, config }) => ({
        layer,
        tracker: new DisappearingPlatformTracker(config),
      }),
    );

    this.disappearingPlatforms.forEach(({ layer, tracker }) => {
      this.physics.add.collider(
        this.player,
        layer,
        // Collision callback: a tile the player is resting on top of starts its timer
        (player, tile) => {
          const playerBody = (player as Player)
            .body as Phaser.Physics.Arcade.Body;
          if (playerBody.blocked.down) {
            const t = tile as Phaser.Tilemaps.Tile;
            tracker.onStand(`${t.x},${t.y}`, this.time.now);
          }
        },
        // Process callback: same one-way behavior as oneWay platforms
        () => {
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

    // Trampolines — launch the player upward on contact from above.
    for (const trampoline of this.trampolines) {
      this.physics.add.collider(
        this.player,
        trampoline,
        (player, _trampoline) => {
          const playerBody = (player as Player)
            .body as Phaser.Physics.Arcade.Body;
          if (playerBody.blocked.down && playerBody.velocity.y >= 0) {
            (player as Player).launch(
              PLAYER_MOVEMENT.JUMP_VELOCITY_Y * trampoline.power,
            );
            trampoline.bounce();
          }
        },
        () => {
          if (this.player.isClimbingStairs) {
            return false;
          }
          return true;
        },
        this,
      );
    }
  }

  private setupCameras(map?: Phaser.Tilemaps.Tilemap) {
    this.cameras.main.setZoom(1.0);
    if (map) {
      const worldWidth = map.widthInPixels * this.mapScale;
      const worldHeight = map.heightInPixels * this.mapScale;
      this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
      // Arcade Physics defaults world bounds to the base canvas size
      // (LayoutConfig.GAME.WIDTH/HEIGHT) unless set explicitly, which is far
      // smaller than the scaled level — sync it so setCollideWorldBounds
      // actually clamps against the full level instead of a tiny top-left box.
      this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    }
    this.cameras.main.startFollow(this.player, true, 0.2, 0.2, 0, 140);
    this.levelManager.updateProgress();
  }

  update(time: number, delta: number) {
    this.updateDisappearingPlatforms(time);

    const NOMINAL_DT = 1000 / 60;
    const dtClamped = Math.min(delta, 50);
    const adjusted = 1 - (1 - 0.2) ** (dtClamped / NOMINAL_DT);
    this.cameras.main.lerp.set(adjusted, adjusted);

    this.phase3Parallax?.update(this.cameras.main);

    if (this.isDialogueOpen) {
      const cam = this.cameras.main;
      EventBus.emit("dialogue:camera-sync", {
        worldViewX: cam.worldView.x,
        worldViewY: cam.worldView.y,
        zoom: cam.zoom,
      });
    }

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
        this.isStepSequenceOpen ||
        this.isBandPanelOpen ||
        this.isGeniusSequenceOpen ||
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

      this.switchLightSystem?.update();

      this.nudgeManager?.notifyActivity(this.player.getLastInputTime());

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
        const nearbyStepSequence =
          !this.isCategoryComplete(InteractiveType.STEP_SEQUENCE) &&
          this.placeholderSystem.getNearbyPlaceholder(
            this.player.x,
            this.player.y,
            500,
            InteractiveType.STEP_SEQUENCE,
          );
        const nearbyGeniusSequence =
          !this.isCategoryComplete(InteractiveType.GENIUS_SEQUENCE) &&
          this.placeholderSystem.getNearbyPlaceholder(
            this.player.x,
            this.player.y,
            500,
            InteractiveType.GENIUS_SEQUENCE,
          );

        if (
          nearbyCostume ||
          nearbySpotlight ||
          nearbyStepSequence ||
          nearbyGeniusSequence
        ) {
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
          if (nearbyStepSequence) {
            this.placeholderSystem.pulseNearestPlaceholder(
              this.player.x,
              this.player.y,
              500,
              InteractiveType.STEP_SEQUENCE,
            );
            posthog.capture("nudge_pulse_shown_step_sequence", {
              level_id: this.levelId,
              mission_id: this.nudgeManager.getCurrentMissionId(),
            });
          }
          if (nearbyGeniusSequence) {
            this.placeholderSystem.pulseNearestPlaceholder(
              this.player.x,
              this.player.y,
              500,
              InteractiveType.GENIUS_SEQUENCE,
            );
            posthog.capture("nudge_pulse_shown_genius_sequence", {
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
          } else {
            // Nothing to show right now - wait a full inactivity window before
            // scanning again instead of retrying every ATTEMPT_INTERVAL_MS.
            this.nudgeManager.recordFailedAttempt();
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
    [InteractiveType.STEP_SEQUENCE]: {
      infoKey: MissionKeys.DANCE_DONE,
      missionId: MissionIds.CURATOR_L3,
    },
    [InteractiveType.GENIUS_SEQUENCE]: {
      infoKey: MissionKeys.GENIUS_DONE,
      missionId: MissionIds.CURATOR_L3,
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

  public showSpotlightBeam() {
    this.effects.showSpotlightBeam();
  }

  public playConfettiBurst(px: number, py: number) {
    this.effects.playConfettiBurst(px, py);
  }

  private playPlaceholderReward(
    instanceId: string,
    options: { musicNotes?: boolean } = {},
  ) {
    this.sound.play("sfx.puzzle.success", { volume: 0.7 });
    const p = this.placeholderSystem.getPlaceholderByInstanceId(instanceId);
    if (p) {
      this.showSpotlightBeam();
      this.playConfettiBurst(p.area.centerX, p.area.centerY);
      if (options.musicNotes) {
        this.effects.playMusicNotesLoop(p.area.centerX, p.area.centerY);
      }
    }
    this.lightBarSystem?.turnOnByPlaceholder(instanceId);
    this.events.emit(GameEvents.MISSION_PROGRESS_CHANGED);
  }

  private captureMinigameStarted(floorIndex: number) {
    if (this.markFloorStarted(floorIndex)) {
      posthog.capture("minigame_started", {
        minigame_number: floorIndex + 1,
        level_id: this.levelId,
      });
    }
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
      if (step.infoKey === MissionKeys.SWITCHES_DONE) {
        return this.switchLightSystem?.getProgress() || { filled: 0, total: 0 };
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
        this.showSpotlightBeam();

        if (result.placeholder) {
          this.playConfettiBurst(
            result.placeholder.area.centerX,
            result.placeholder.area.centerY,
          );
          this.lightBarSystem?.turnOnByPlaceholder(
            result.placeholder.instanceId,
          );
        }
      }
    }
  }
}
