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

  evaluate(now: number, isSuppressed: boolean): boolean {
    // While suppressed (busy hands, open panel/dialogue/quiz) the player is
    // engaged, not idle - keep the inactivity clock re-armed so the nudge does
    // not fire on the first frame after the suppression ends.
    if (isSuppressed) {
      this.lastInteractionTime = now;
      return false;
    }

    if (!this.canHint(now)) return false;

    if (now - this.lastAttemptTime < ATTEMPT_INTERVAL_MS) return false;
    this.lastAttemptTime = now;

    return now - this.lastInteractionTime >= this.threshold;
  }

  recordInteraction(): void {
    this.lastInteractionTime = Date.now();
  }

  /**
   * Marks raw player input (movement, jump, interact) as activity. Takes the
   * timestamp of the last input rather than `Date.now()` so a stale stamp can
   * never rewind the inactivity clock.
   */
  notifyActivity(timestamp: number): void {
    if (timestamp > this.lastInteractionTime) {
      this.lastInteractionTime = timestamp;
    }
  }

  /**
   * Called when a nudge was due but nothing could be shown (no hint or pulse
   * target in range). Re-arms the inactivity threshold so the scene stops
   * re-running the proximity scan every ATTEMPT_INTERVAL_MS, without burning
   * the global cooldown on a nudge the player never saw.
   */
  recordFailedAttempt(): void {
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
