export interface PanelConfig {
  src: string;
  sliceWidth: number;
  sliceStart: number;
  revealMs: number;
  holdMs: number;
  shrinkMs: number;
  title?: string;
  caption?: string;
}

export interface IntroConfig {
  /**
   * Folder under `assets/data/levels/<levelId>/` holding this cinematic's art.
   *
   * Defaults to `"intro"`. The suspect identification phase also plays a
   * closing cinematic out of its own folder, so the sequence is not tied to a
   * single directory per level.
   */
  assetDir?: string;
  /** Currently unread by any component; kept for configs that declare it. */
  revealIconMask?: string;
  /** Currently unread by any component; kept for configs that declare it. */
  loadingImage?: string;
  captionImage?: string;
  skipEnabled: boolean;
  panels: PanelConfig[];
}

export type IntroPhase = "comic" | "rollout" | "mask" | "complete";

export type IntroState = {
  /** Whether the intro is currently playing */
  isOpen: boolean;
  /** Current level ID */
  levelId: string | null;
  /** Current phase of the intro */
  phase: IntroPhase;
  /** Whether skip was triggered */
  skipped: boolean;
  /** Configuration for current level */
  config: IntroConfig | null;
};
