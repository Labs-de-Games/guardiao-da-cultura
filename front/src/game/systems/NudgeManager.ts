const NUDGE_THRESHOLD_MS = 15_000;
const GLOBAL_COOLDOWN_MS = 300_000;
const ATTEMPT_INTERVAL_MS = 1_000;

export interface NudgeConfig {
  thresholdMs?: number;
  cooldownMs?: number;
}

export class NudgeManager {
  private lastInteractionTime: number = 0;
  private lastNudgeTime: number = 0;
  private lastAttemptTime: number = 0;
  private currentMissionId: string = "";
  private threshold: number;
  private cooldownMs: number;

  constructor(config?: NudgeConfig) {
    this.threshold = config?.thresholdMs ?? NUDGE_THRESHOLD_MS;
    this.cooldownMs = config?.cooldownMs ?? GLOBAL_COOLDOWN_MS;
    this.lastInteractionTime = Date.now();
  }

  evaluate(now: number, isPlayerBusy: boolean): boolean {
    if (isPlayerBusy) return false;

    if (!this.canHint(now)) return false;

    if (now - this.lastAttemptTime < ATTEMPT_INTERVAL_MS) return false;
    this.lastAttemptTime = now;

    return now - this.lastInteractionTime >= this.threshold;
  }

  recordInteraction(): void {
    this.lastInteractionTime = Date.now();
  }

  recordNudge(): void {
    this.lastNudgeTime = Date.now();
  }

  reset(missionId: string): void {
    if (this.currentMissionId === missionId) return;
    this.currentMissionId = missionId;
    this.lastInteractionTime = Date.now();
    this.lastNudgeTime = 0;
  }

  private canHint(now: number): boolean {
    if (this.lastNudgeTime === 0) return true;
    return now - this.lastNudgeTime >= this.cooldownMs;
  }

  getCurrentMissionId(): string {
    return this.currentMissionId;
  }
}
