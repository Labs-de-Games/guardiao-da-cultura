import { Scene } from "phaser";
import { Actions } from "../constants/KeyBindings";
import { LayoutConfig } from "../constants/LayoutConfig";
import { SceneNames } from "../constants/SceneNames";
import { onKeyDown, registerScene } from "../systems/InputManager";

/**
 * Configuration for a single comic panel
 */
type PanelConfig = {
  image: string;
  duration: number;
};

/**
 * Configuration for the intro sequence
 */
type IntroConfig = {
  panels: PanelConfig[];
  revealIconMask: string;
  skipEnabled: boolean;
};

/**
 * LevelCinematic - Cinematic introduction sequence before each level
 * 
 * Displays comic-style panels that tell the story, followed by a
 * silhouette mask reveal transition to the actual level.
 * 
 * Future batches will add:
 * - Pixel-art fade-in animations
 * - Cascading exit animations
 * - Keyhole mask reveal transition
 * - Skip functionality
 */
export class LevelCinematic extends Scene {
  private levelId: string = "level_01";
  private introConfig: IntroConfig | null = null;
  private currentPanelIndex: number = 0;
  private panelImages: Phaser.GameObjects.Image[] = [];
  private allPanels: Phaser.GameObjects.Image[] = []; // Store all panels for cascading exit
  private isTransitioning: boolean = false;
  private pixelRevealGrid: Phaser.GameObjects.Rectangle[] = [];
  private revealMaskImage: Phaser.GameObjects.Image | null = null;
  private revealBackground: Phaser.GameObjects.Rectangle | null = null;
  private readonly PIXEL_SIZE = 16; // Size of each "pixel" in the reveal grid
  private readonly REVEAL_DURATION = 800; // Duration of reveal animation in ms
  private readonly CASCADE_DELAY = 150; // Delay between each panel starting to fade
  private readonly CASCADE_DURATION = 600; // Duration of each panel's fade-out
  private readonly MASK_REVEAL_DURATION = 1500; // Duration of mask expansion

  constructor() {
    super(SceneNames.LEVEL_CINEMATIC);
  }

  init(data?: { levelId: string }) {
    if (data?.levelId) {
      this.levelId = data.levelId;
    }
    this.currentPanelIndex = 0;
    this.isTransitioning = false;
    this.panelImages = [];
    this.allPanels = [];
    this.pixelRevealGrid = [];
    this.revealMaskImage = null;
    this.revealBackground = null;
  }

  preload() {
    // Load the intro configuration JSON
    this.load.json(
      "intro_config",
      `assets/data/levels/${this.levelId}/intro/intro_config.json`
    );
  }

  create() {
    this.cameras.main.setBackgroundColor(LayoutConfig.COLORS.BLACK);

    // Get the loaded config
    const configData = this.cache.json.get("intro_config") as IntroConfig;
    
    if (!configData) {
      console.warn(`LevelCinematic: No intro_config.json found for level ${this.levelId}, skipping to game`);
      this.transitionToGame();
      return;
    }

    this.introConfig = configData;

    // Setup input handling
    this.setupInput();

    // Load panel images dynamically
    this.loadPanelImages();
  }

  /**
   * Setup keyboard and click input for advancing panels
   */
  private setupInput() {
    // Register scene with input manager
    registerScene(this);

    // Keyboard input: SPACE, E, ESC, ENTER to advance
    onKeyDown(this, Actions.CONFIRM, () => this.advancePanel());
    onKeyDown(this, Actions.INTERACT, () => this.advancePanel());
    onKeyDown(this, Actions.CLOSE, () => this.advancePanel());

    // Click/tap input to advance
    this.input.on("pointerdown", this.handlePointerDown, this);

    // Cleanup on scene shutdown
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanupInput();
    });
  }

  /**
   * Handle pointer/click input
   */
  private handlePointerDown = () => {
    this.advancePanel();
  };

  /**
   * Clean up input listeners and reveal grid
   */
  private cleanupInput() {
    this.input.off("pointerdown", this.handlePointerDown, this);
    
    // Clean up any remaining reveal grid
    this.pixelRevealGrid.forEach(rect => rect.destroy());
    this.pixelRevealGrid = [];
    
    // Clean up all panels
    this.allPanels.forEach(img => img.destroy());
    this.allPanels = [];
    
    // Clean up reveal mask elements
    if (this.revealMaskImage) {
      this.revealMaskImage.destroy();
      this.revealMaskImage = null;
    }
    if (this.revealBackground) {
      this.revealBackground.destroy();
      this.revealBackground = null;
    }
  }

  /**
   * Load all panel images and the reveal mask
   */
  private loadPanelImages() {
    if (!this.introConfig) return;

    // Load each panel image
    this.introConfig.panels.forEach((panel, index) => {
      const assetKey = `intro_panel_${index}`;
      this.load.image(assetKey, `assets/data/levels/${this.levelId}/intro/${panel.image}`);
    });

    // Load the reveal mask
    this.load.image(
      "intro_reveal_mask",
      `assets/data/levels/${this.levelId}/intro/${this.introConfig.revealIconMask}`
    );

    // Start loading and show first panel when complete
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      this.showCurrentPanel();
    });

    this.load.start();
  }

  /**
   * Display the current panel with pixel-art reveal animation
   */
  private showCurrentPanel() {
    if (!this.introConfig) return;

    // Clear only the reveal grid (keep all panels for cascading exit)
    this.pixelRevealGrid.forEach(rect => rect.destroy());
    this.pixelRevealGrid = [];

    // Create the panel image centered on screen
    const panelKey = `intro_panel_${this.currentPanelIndex}`;
    const panelImage = this.add.image(
      this.scale.width / 2,
      this.scale.height / 2,
      panelKey
    );
    
    // Scale to fit screen while maintaining aspect ratio
    this.scaleImageToFit(panelImage);
    
    // Initially hide the panel
    panelImage.setAlpha(0);
    this.panelImages.push(panelImage);
    this.allPanels.push(panelImage); // Store for cascading exit

    // Create pixel reveal effect
    this.createPixelRevealEffect(panelImage);
  }

  /**
   * Create a pixel-art reveal effect using a grid of rectangles
   * that fade out to reveal the image underneath
   */
  private createPixelRevealEffect(image: Phaser.GameObjects.Image) {
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;
    
    // Calculate grid dimensions
    const cols = Math.ceil(screenWidth / this.PIXEL_SIZE);
    const rows = Math.ceil(screenHeight / this.PIXEL_SIZE);
    
    // Create a container for the reveal grid
    const gridContainer = this.add.container(0, 0);
    
    // Create grid of rectangles covering the screen
    const cells: { row: number; col: number; delay: number }[] = [];
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * this.PIXEL_SIZE;
        const y = row * this.PIXEL_SIZE;
        
        const rect = this.add.rectangle(
          x + this.PIXEL_SIZE / 2,
          y + this.PIXEL_SIZE / 2,
          this.PIXEL_SIZE,
          this.PIXEL_SIZE,
          LayoutConfig.COLORS.BLACK_HEX
        );
        
        gridContainer.add(rect);
        this.pixelRevealGrid.push(rect);
        
        // Calculate delay based on distance from center (spiral-like effect)
        const centerX = cols / 2;
        const centerY = rows / 2;
        const distance = Math.sqrt(
          Math.pow(col - centerX, 2) + Math.pow(row - centerY, 2)
        );
        
        // Add some randomness for more organic feel
        const randomOffset = Math.random() * 0.3;
        const delay = (distance * 20) + (randomOffset * 100);
        
        cells.push({ row, col, delay });
      }
    }
    
    // Shuffle cells for random reveal order
    this.shuffleArray(cells);
    
    // Animate each cell fading out
    const totalDuration = this.REVEAL_DURATION;
    const maxDelay = Math.max(...cells.map(c => c.delay));
    
    cells.forEach((cell, index) => {
      const rect = this.pixelRevealGrid[cell.row * cols + cell.col];
      const normalizedDelay = cell.delay / maxDelay;
      const actualDelay = normalizedDelay * (totalDuration * 0.7);
      
      this.tweens.add({
        targets: rect,
        alpha: 0,
        duration: 150,
        delay: actualDelay,
        ease: "Power2",
        onComplete: () => {
          rect.destroy();
        }
      });
    });
    
    // Fade in the image as pixels reveal
    this.tweens.add({
      targets: image,
      alpha: 1,
      duration: totalDuration * 0.5,
      ease: "Power2"
    });
    
    // Clean up container after animation
    this.time.delayedCall(totalDuration + 200, () => {
      gridContainer.destroy();
    });
  }

  /**
   * Shuffle an array in place (Fisher-Yates algorithm)
   */
  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Scale an image to fit the screen while maintaining aspect ratio
   */
  private scaleImageToFit(image: Phaser.GameObjects.Image) {
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;
    
    const scaleX = screenWidth / image.width;
    const scaleY = screenHeight / image.height;
    const scale = Math.min(scaleX, scaleY);
    
    image.setScale(scale);
  }

  /**
   * Advance to the next panel or start cascading exit
   */
  private advancePanel() {
    if (this.isTransitioning || !this.introConfig) return;

    this.currentPanelIndex++;

    if (this.currentPanelIndex >= this.introConfig.panels.length) {
      // All panels shown - start cascading exit
      this.startCascadingExit();
    } else {
      this.showCurrentPanel();
    }
  }

  /**
   * Start cascading pixel-art fade-out for all panels
   * Each panel starts fading before the previous one finishes
   */
  private startCascadingExit() {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    // Create pixel grid for each panel for the fade-out effect
    this.allPanels.forEach((panel, index) => {
      const delay = index * this.CASCADE_DELAY;
      
      // Create pixel grid overlay for this panel
      this.createPixelFadeOutEffect(panel, delay, index);
    });

    // After all cascading animations complete, start reveal mask transition
    const totalDuration = (this.allPanels.length * this.CASCADE_DELAY) + this.CASCADE_DURATION + 200;
    
    this.time.delayedCall(totalDuration, () => {
      this.startRevealMaskTransition();
    });
  }

  /**
   * Create pixel-art fade-out effect for a single panel
   */
  private createPixelFadeOutEffect(image: Phaser.GameObjects.Image, delay: number, panelIndex: number) {
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;
    
    // Calculate grid dimensions
    const cols = Math.ceil(screenWidth / this.PIXEL_SIZE);
    const rows = Math.ceil(screenHeight / this.PIXEL_SIZE);
    
    // Create cells array for random reveal
    const cells: { row: number; col: number }[] = [];
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        cells.push({ row, col });
      }
    }
    
    // Shuffle for random fade order
    this.shuffleArray(cells);
    
    // Create black rectangles that will cover the image
    const fadeRects: Phaser.GameObjects.Rectangle[] = [];
    
    cells.forEach((cell, cellIndex) => {
      const x = cell.col * this.PIXEL_SIZE;
      const y = cell.row * this.PIXEL_SIZE;
      
      const rect = this.add.rectangle(
        x + this.PIXEL_SIZE / 2,
        y + this.PIXEL_SIZE / 2,
        this.PIXEL_SIZE,
        this.PIXEL_SIZE,
        LayoutConfig.COLORS.BLACK_HEX
      );
      rect.setAlpha(0); // Start invisible
      
      fadeRects.push(rect);
    });
    
    // Animate rectangles fading in (covering the image)
    const cellDelay = this.CASCADE_DURATION / cells.length;
    
    cells.forEach((cell, cellIndex) => {
      const rect = fadeRects[cellIndex];
      const actualDelay = delay + (cellIndex * cellDelay * 0.1);
      
      this.tweens.add({
        targets: rect,
        alpha: 1,
        duration: 100,
        delay: actualDelay,
        ease: "Power2"
      });
    });
    
    // Fade out the image as pixels cover it
    this.tweens.add({
      targets: image,
      alpha: 0,
      duration: this.CASCADE_DURATION,
      delay: delay,
      ease: "Power2",
      onComplete: () => {
        // Clean up this panel and its rectangles
        image.destroy();
        fadeRects.forEach(rect => rect.destroy());
      }
    });
  }

  /**
   * Start the reveal mask transition
   * The silhouette icon expands from center to reveal the level
   * 
   * How it works:
   * 1. Launch the game scene in the background
   * 2. Wait for game scene to finish loading assets
   * 3. Create a black overlay on top
   * 4. Use the PNG as a mask on the black overlay (inverted)
   * 5. PNG's opaque areas = black overlay HIDDEN (reveals game)
   * 6. PNG's transparent areas = black overlay VISIBLE (hides game)
   * 7. As mask scales up, more black is hidden, revealing more game
   */
  private startRevealMaskTransition() {
    if (!this.introConfig) {
      this.transitionToGame();
      return;
    }

    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;
    const centerX = screenWidth / 2;
    const centerY = screenHeight / 2;

    // First, launch the game scene in the background
    // Using launch() instead of start() so this scene stays active
    this.scene.launch(SceneNames.GAME, { levelId: this.levelId });
    
    // Get reference to the game scene
    const gameScene = this.scene.get(SceneNames.GAME);
    
    // Wait for the game scene to finish loading its assets
    // The game scene has a preload method that loads tilemaps, images, etc.
    const checkGameSceneReady = () => {
      // Check if the game scene is active and has finished loading
      if (gameScene.scene.isActive() && !gameScene.load.isLoading) {
        // Game scene is ready - start the mask reveal
        this.createMaskRevealEffect(screenWidth, screenHeight, centerX, centerY);
      } else {
        // Game scene still loading - check again in 100ms
        this.time.delayedCall(100, checkGameSceneReady);
      }
    };
    
    // Start checking after a short delay
    this.time.delayedCall(100, checkGameSceneReady);
  }

  /**
   * Create and animate the mask reveal effect
   */
  private createMaskRevealEffect(
    screenWidth: number,
    screenHeight: number,
    centerX: number,
    centerY: number
  ) {
    // Get reference to the game scene
    const gameScene = this.scene.get(SceneNames.GAME) as Phaser.Scene;
    
    // Wait for the game scene to render at least one frame
    this.time.delayedCall(300, () => {
      // Take a snapshot of the game scene
      // This captures the current rendered state as an image
      gameScene.game.renderer.snapshot((snapshot: HTMLImageElement | Phaser.Display.Color) => {
        // Check if it's an image (not a Color object)
        if (snapshot instanceof HTMLImageElement) {
          // Add the snapshot as a texture
          const textureKey = "game_snapshot";
          this.textures.addImage(textureKey, snapshot);
          
          // Create an image from the snapshot
          const gameSnapshot = this.add.image(centerX, centerY, textureKey);
          gameSnapshot.setDepth(99); // Behind the black overlay
          
          // Now create the mask effect
          this.createMaskWithSnapshot(screenWidth, screenHeight, centerX, centerY);
        }
      });
    });
  }

  /**
   * Create the mask effect using the game snapshot
   */
  private createMaskWithSnapshot(
    screenWidth: number,
    screenHeight: number,
    centerX: number,
    centerY: number
  ) {
    // Create a full-screen black overlay
    // This covers the game snapshot
    this.revealBackground = this.add.rectangle(
      centerX,
      centerY,
      screenWidth * 2,
      screenHeight * 2,
      LayoutConfig.COLORS.BLACK_HEX
    );
    this.revealBackground.setDepth(100);

    // Create the mask image
    const maskImage = this.make.image({
      x: centerX,
      y: centerY,
      key: "intro_reveal_mask",
      add: false
    });

    // Start small - the "hole" is tiny
    const startScale = 0.1;
    maskImage.setScale(startScale);

    // Create bitmap mask
    const bitmapMask = new Phaser.Display.Masks.BitmapMask(this, maskImage);
    
    // Invert the mask so that:
    // - PNG's opaque areas = black overlay HIDDEN (reveals game snapshot) ✓
    // - PNG's transparent areas = black overlay VISIBLE (hides game) ✓
    bitmapMask.invertAlpha = true;
    
    // Apply mask to black overlay
    this.revealBackground.setMask(bitmapMask);

    // Calculate target scale to fill screen
    const maskWidth = maskImage.width;
    const maskHeight = maskImage.height;
    const targetScaleX = screenWidth / maskWidth;
    const targetScaleY = screenHeight / maskHeight;
    const targetScale = Math.max(targetScaleX, targetScaleY) * 1.5;

    // Animate the mask expanding
    this.tweens.add({
      targets: maskImage,
      scaleX: targetScale,
      scaleY: targetScale,
      duration: this.MASK_REVEAL_DURATION,
      ease: "Sine.easeOut",
      onUpdate: () => {
        bitmapMask.bitmapMask = maskImage;
      },
      onComplete: () => {
        // Mask fully expanded - clean up and finish transition
        maskImage.destroy();
        this.finishTransition();
      }
    });
  }

  /**
   * Finish the transition by stopping this scene
   * The game scene is already running underneath
   */
  private finishTransition() {
    // Clean up mask elements
    if (this.revealBackground) {
      this.revealBackground.destroy();
      this.revealBackground = null;
    }
    
    // Stop this scene - game scene takes over
    this.scene.stop(SceneNames.LEVEL_CINEMATIC);
  }

  /**
   * Transition to the game scene
   */
  private transitionToGame() {
    // Clean up any remaining panels
    this.panelImages.forEach(img => img.destroy());
    this.panelImages = [];
    this.allPanels = [];
    
    // Clean up any remaining reveal grid
    this.pixelRevealGrid.forEach(rect => rect.destroy());
    this.pixelRevealGrid = [];
    
    // Clean up reveal mask elements
    if (this.revealMaskImage) {
      this.revealMaskImage.destroy();
      this.revealMaskImage = null;
    }
    if (this.revealBackground) {
      this.revealBackground.destroy();
      this.revealBackground = null;
    }

    // Start the game scene
    this.scene.start(SceneNames.GAME, { levelId: this.levelId });
  }
}
