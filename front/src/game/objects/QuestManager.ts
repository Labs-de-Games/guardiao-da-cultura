export enum QuestStatus {
  IDLE = "IDLE",
  INTRO_DIALOGUE = "INTRO_DIALOGUE",
  COLLECTING = "COLLECTING",
  READY_FOR_QUIZ = "READY_FOR_QUIZ",
  QUIZ_ACTIVE = "QUIZ_ACTIVE",
  COMPLETED = "COMPLETED",
}

export interface QuestData {
  id: string;
  requiredInfos: string[];
  collectedInfos: Set<string>;
  status: QuestStatus;
}

export class QuestManager {
  private quests: Map<string, QuestData> = new Map();
  private pendingResultLines: Map<string, string[]> = new Map();

  constructor(initialQuests: { id: string; requiredInfos: string[] }[]) {
    for (const q of initialQuests) {
      this.quests.set(q.id, {
        id: q.id,
        requiredInfos: q.requiredInfos,
        collectedInfos: new Set<string>(),
        status: QuestStatus.IDLE,
      });
    }
  }

  getStatus(missionId: string): QuestStatus {
    return this.quests.get(missionId)?.status || QuestStatus.IDLE;
  }

  setStatus(missionId: string, status: QuestStatus) {
    const q = this.quests.get(missionId);
    if (q) {
      q.status = status;
    }
  }

  collectInfo(infoKey: string): boolean {
    let changedAny = false;

    for (const [id, q] of this.quests.entries()) {
      if (q.status !== QuestStatus.COLLECTING) continue;

      // Only collect if the quest actually requires this infoKey
      if (q.requiredInfos.includes(infoKey)) {
        const before = q.collectedInfos.size;
        q.collectedInfos.add(infoKey);
        const changed = q.collectedInfos.size !== before;

        if (changed) {
          changedAny = true;
          if (this.hasCollectedAll(id)) {
            this.setStatus(id, QuestStatus.READY_FOR_QUIZ);
          }
        }
      }
    }

    return changedAny;
  }

  getRequiredInfos(missionId: string): string[] {
    return [...(this.quests.get(missionId)?.requiredInfos || [])];
  }

  getCollectedInfos(missionId: string): string[] {
    const q = this.quests.get(missionId);
    if (!q) return [];
    return Array.from(q.collectedInfos);
  }

  hasInfo(missionId: string, infoKey: string): boolean {
    return this.quests.get(missionId)?.collectedInfos.has(infoKey) || false;
  }

  getRequiredCount(missionId: string): number {
    return this.quests.get(missionId)?.requiredInfos.length || 0;
  }

  getCollectedCount(missionId: string): number {
    return this.quests.get(missionId)?.collectedInfos.size || 0;
  }

  getTotalRequiredCount(): number {
    let total = 0;
    for (const q of this.quests.values()) {
      // Only count if mission is accepted (i.e. not IDLE)
      if (q.status !== QuestStatus.IDLE) {
        total += q.requiredInfos.length;
      }
    }
    return total;
  }

  getTotalCollectedCount(): number {
    let total = 0;
    for (const q of this.quests.values()) {
      if (q.status !== QuestStatus.IDLE) {
        total += q.collectedInfos.size;
      }
    }
    return total;
  }

  getTotalCompletedMissions(): number {
    let total = 0;
    for (const q of this.quests.values()) {
      if (q.status === QuestStatus.COMPLETED) {
        total++;
      }
    }
    return total;
  }

  setPendingResult(missionId: string, lines: string[] | null) {
    if (lines) {
      this.pendingResultLines.set(missionId, lines);
    } else {
      this.pendingResultLines.delete(missionId);
    }
  }

  getPendingResult(missionId: string): string[] | null {
    const lines = this.pendingResultLines.get(missionId);
    return lines ? [...lines] : null;
  }

  clearPendingResult(missionId: string) {
    this.pendingResultLines.delete(missionId);
  }

  hasCollectedAll(missionId: string): boolean {
    const q = this.quests.get(missionId);
    if (!q) return false;
    return q.requiredInfos.every((info) => q.collectedInfos.has(info));
  }

  reset(missionId: string) {
    const q = this.quests.get(missionId);
    if (q) {
      q.collectedInfos.clear();
      q.status = QuestStatus.IDLE;
    }
    this.pendingResultLines.delete(missionId);
  }
}
