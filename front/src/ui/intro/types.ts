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
  revealIconMask: string;
  loadingImage: string;
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
