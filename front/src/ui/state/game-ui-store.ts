import { create } from "zustand";

const MAX_VISIBLE_TOASTS = 5;
const MIN_TOAST_DURATION = 1000;
const MAX_TOAST_DURATION = 10000;

export interface ToastEntry {
  id: string;
  message: string;
  duration: number;
  iconSrc?: string;
  exiting: boolean;
}

export interface QuestStep {
  text: string;
  infoKey?: string;
  done: boolean;
  filled?: number;
  total?: number;
}

export interface MissionProgress {
  missionId: string;
  title: string;
  steps: QuestStep[];
}

export interface CollectibleEntry {
  id: string;
  name: string;
  collected: boolean;
  category: string;
}

export interface GameUIState {
  sidebarOpen: boolean;
  controlsOpen: boolean;
  gameStarted: boolean;
  stars: number;
  totalStars: number;
  missions: MissionProgress[];
  collectibles: CollectibleEntry[];
  toasts: ToastEntry[];

  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setControlsOpen: (open: boolean) => void;
  setGameStarted: (started: boolean) => void;
  setStars: (current: number, total: number) => void;
  setMissions: (missions: MissionProgress[]) => void;
  addOrUpdateMission: (
    missionId: string,
    title: string,
    collectedInfos: string[],
    totalSteps: number,
    steps?: { infoKey: string; text: string }[],
    stepProgress?: { filled: number; total: number }[],
  ) => void;
  updateMissionStep: (
    missionId: string,
    stepIndex: number,
    done: boolean,
  ) => void;
  setCollectibles: (entries: CollectibleEntry[]) => void;
  collectItem: (itemId: string) => void;
  addToast: (message: string, duration: number, iconSrc?: string) => void;
  dismissToast: (id: string) => void;
  removeToast: (id: string) => void;
}

export const useGameUIStore = create<GameUIState>()((set) => ({
  sidebarOpen: false,
  controlsOpen: false,
  gameStarted: false,
  stars: 0,
  totalStars: 0,
  missions: [],
  collectibles: [],
  toasts: [],

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setControlsOpen: (open) => set({ controlsOpen: open }),
  setGameStarted: (started) => set({ gameStarted: started }),
  setStars: (current, total) => set({ stars: current, totalStars: total }),
  setMissions: (missions) => set({ missions }),
  addOrUpdateMission: (
    missionId,
    title,
    collectedInfos,
    totalSteps,
    steps,
    stepProgress,
  ) =>
    set((s) => {
      const progress = stepProgress ?? [];
      const buildSteps = (_existing?: MissionProgress) =>
        Array.from({ length: totalSteps }, (_, i) => ({
          text:
            steps?.[i]?.text || _existing?.steps[i]?.text || `Etapa ${i + 1}`,
          infoKey: steps?.[i]?.infoKey,
          done: steps?.[i]?.infoKey
            ? collectedInfos.includes(steps[i].infoKey)
            : false,
          filled: progress[i]?.filled,
          total: progress[i]?.total,
        }));

      const existing = s.missions.find((m) => m.missionId === missionId);
      if (existing) {
        return {
          missions: s.missions.map((m) =>
            m.missionId === missionId ? { ...m, steps: buildSteps(m) } : m,
          ),
        };
      }
      return {
        missions: [...s.missions, { missionId, title, steps: buildSteps() }],
      };
    }),
  updateMissionStep: (missionId, stepIndex, done) =>
    set((s) => ({
      missions: s.missions.map((m) =>
        m.missionId === missionId
          ? {
              ...m,
              steps: m.steps.map((step, i) =>
                i === stepIndex ? { ...step, done } : step,
              ),
            }
          : m,
      ),
    })),
  setCollectibles: (collectibles) => set({ collectibles }),
  collectItem: (itemId) =>
    set((s) => ({
      collectibles: s.collectibles.map((c) =>
        c.id === itemId ? { ...c, collected: true } : c,
      ),
    })),
  addToast: (message, duration, iconSrc) =>
    set((s) => {
      const clampedDuration = Math.max(
        MIN_TOAST_DURATION,
        Math.min(duration, MAX_TOAST_DURATION),
      );
      const newEntry: ToastEntry = {
        id: crypto.randomUUID(),
        message,
        duration: clampedDuration,
        iconSrc,
        exiting: false,
      };
      return {
        toasts: [...s.toasts.slice(-(MAX_VISIBLE_TOASTS - 1)), newEntry],
      };
    }),
  dismissToast: (id) =>
    set((s) => ({
      toasts: s.toasts.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
    })),
  removeToast: (id) =>
    set((s) => ({
      toasts: s.toasts.filter((t) => t.id !== id),
    })),
}));

export const selectHintCollectibles = (s: GameUIState) =>
  s.collectibles.filter(
    (c) => c.category === "CLUE_VILLAIN" || c.category === "CLUE_NEXT",
  );

export const selectInventoryCollectibles = (s: GameUIState) =>
  s.collectibles.filter((c) => c.category === "COLLECT");
