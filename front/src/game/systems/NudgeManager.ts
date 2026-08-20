export enum NudgeAction {
  NONE = "NONE",
  PULSE = "PULSE",
  SHOW_HINT = "SHOW_HINT",
}

const PULSE_THRESHOLD_MS = 15_000;
const HINT_THRESHOLD_MS = 15_000;
const GLOBAL_COOLDOWN_MS = 300_000;
const ATTEMPT_INTERVAL_MS = 1_000;

export interface NudgeConfig {
  pulseThresholdMs?: number;
  hintThresholdMs?: number;
  cooldownMs?: number;
}

export class NudgeManager {
  private lastInteractionTime: number = 0;
  private lastNudgeTime: number = 0;
  private lastAttemptTime: number = 0;
  private lastAction: NudgeAction = NudgeAction.NONE;
  private currentMissionId: string = "";
  private pulseThreshold: number;
  private hintThreshold: number;
  private cooldownMs: number;

  constructor(config?: NudgeConfig) {
    this.pulseThreshold = config?.pulseThresholdMs ?? PULSE_THRESHOLD_MS;
    this.hintThreshold = config?.hintThresholdMs ?? HINT_THRESHOLD_MS;
    this.cooldownMs = config?.cooldownMs ?? GLOBAL_COOLDOWN_MS;
    this.lastInteractionTime = Date.now();
  }

  evaluate(now: number, isPlayerBusy: boolean): NudgeAction {
    if (isPlayerBusy) {
      this.lastAction = NudgeAction.NONE;
      return NudgeAction.NONE;
    }

    if (!this.canHint(now)) {
      this.lastAction = NudgeAction.NONE;
      return NudgeAction.NONE;
    }

    if (now - this.lastAttemptTime < ATTEMPT_INTERVAL_MS) {
      return NudgeAction.NONE;
    }
    this.lastAttemptTime = now;

    const elapsed = now - this.lastInteractionTime;

    if (elapsed >= this.hintThreshold) {
      this.lastAction = NudgeAction.SHOW_HINT;
      return NudgeAction.SHOW_HINT;
    }

    if (elapsed >= this.pulseThreshold) {
      this.lastAction = NudgeAction.PULSE;
      return NudgeAction.PULSE;
    }

    this.lastAction = NudgeAction.NONE;
    return NudgeAction.NONE;
  }

  recordInteraction(): void {
    this.lastInteractionTime = Date.now();
    this.lastAction = NudgeAction.NONE;
  }

  recordNudge(): void {
    this.lastNudgeTime = Date.now();
  }

  reset(missionId: string): void {
    if (this.currentMissionId === missionId) return;
    this.currentMissionId = missionId;
    this.lastInteractionTime = Date.now();
    this.lastNudgeTime = 0;
    this.lastAction = NudgeAction.NONE;
  }

  private canHint(now: number): boolean {
    if (this.lastNudgeTime === 0) return true;
    return now - this.lastNudgeTime >= this.cooldownMs;
  }

  getLastAction(): NudgeAction {
    return this.lastAction;
  }

  getCurrentMissionId(): string {
    return this.currentMissionId;
  }
}
