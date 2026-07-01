import type { IntroConfig, PanelConfig } from "../../shared/events/game-events";

export type { IntroConfig, PanelConfig };

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
