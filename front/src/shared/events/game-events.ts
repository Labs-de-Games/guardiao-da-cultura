export interface StarsChangedData {
  current: number;
  total: number;
}

export interface StepProgress {
  filled: number;
  total: number;
}

export interface QuestProgressData {
  missionId: string;
  missionTitle: string;
  collectedInfos: string[];
  totalSteps: number;
  steps?: { infoKey: string; text: string }[];
  stepProgress?: StepProgress[];
}

export interface ItemCollectedData {
  itemId: string;
  itemName: string;
  category: string;
}

export interface GamePauseData {
  reason: string;
}

export interface GameResumeData {
  reason: string;
}

export interface SidebarToggleData {
  open: boolean;
}

export interface CollectiblesSyncData {
  entries: {
    id: string;
    name: string;
    category: string;
    collected: boolean;
  }[];
}

export interface GameEventMap {
  "game:ready": { userId: string };
  "game:started": undefined;
  "game:pause-requested": GamePauseData;
  "game:resume-requested": GameResumeData;
  "player:stars-changed": StarsChangedData;
  "quest:progress-changed": QuestProgressData;
  "quest:mission-status-changed": {
    missionId: string;
    status: "accepted" | "completed" | "failed";
  };
  "inventory:item-collected": ItemCollectedData;
  "inventory:collectibles-sync": CollectiblesSyncData;
  "inventory:opened": undefined;
  "inventory:closed": undefined;
  "sidebar:toggled": SidebarToggleData;
}
