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

export interface ControlsOverlayData {
  open: boolean;
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

export interface ToastShowData {
  message: string;
  duration: number;
  iconSrc?: string;
}

export interface DialogueShowData {
  lines: string[];
  callbackId: string;
}

export interface DialogueConfirmData {
  message: string;
  callbackId: string;
}

export interface DialogueCompletedData {
  callbackId: string;
  confirmed?: boolean;
}

export interface GameEventMap {
  "game:ready": { userId: string };
  "game:started": undefined;
  "game:ended": undefined;
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
  "ui:controls-overlay": ControlsOverlayData;
  "inventory:opened": undefined;
  "inventory:closed": undefined;
  "sidebar:toggled": SidebarToggleData;
  "ui:toast-show": ToastShowData;
  "dialogue:show": DialogueShowData;
  "dialogue:confirm": DialogueConfirmData;
  "dialogue:dismissed": { callbackId: string };
  "dialogue:completed": DialogueCompletedData;
  "dialogue:dequeue-started": undefined;
  "dialogue:queue-cleared": undefined;
}
