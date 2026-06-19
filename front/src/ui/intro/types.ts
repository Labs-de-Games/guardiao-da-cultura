/**
 * Intro Cinematic Types
 *
 * Configuration types for the comic-style cinematic introduction.
 */

export type PanelConfig = {
  /** URL to the panel image */
  src: string;
  /** Width of the final shrunk slice in pixels */
  sliceWidth: number;
  /** X offset in source image where the slice begins */
  sliceStart: number;
  /** Duration of pixel-reveal animation in ms */
  revealMs: number;
  /** Duration to hold panel before shrinking in ms */
  holdMs: number;
  /** Duration of shrink animation in ms */
  shrinkMs: number;
  /** Optional title displayed in caption box */
  title?: string;
  /** Caption text displayed below panel */
  caption?: string;
};

export type IntroConfig = {
  /** Array of panel configurations */
  panels: PanelConfig[];
  /** Mask image filename (icon-shaped silhouette) */
  revealIconMask: string;
  /** Loading/scene image filename */
  loadingImage: string;
  /** Per-level caption background image filename */
  captionImage?: string;
  /** Whether skip is enabled */
  skipEnabled: boolean;
};

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
