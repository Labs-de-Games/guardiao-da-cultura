import { create } from "zustand";

export interface QuestStep {
  text: string;
  infoKey?: string;
  done: boolean;
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
  gameStarted: boolean;
  stars: number;
  totalStars: number;
  missions: MissionProgress[];
  collectibles: CollectibleEntry[];

  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setGameStarted: (started: boolean) => void;
  setStars: (current: number, total: number) => void;
  setMissions: (missions: MissionProgress[]) => void;
  addOrUpdateMission: (
    missionId: string,
    title: string,
    collectedInfos: string[],
    totalSteps: number,
    steps?: { infoKey: string; text: string }[],
  ) => void;
  updateMissionStep: (
    missionId: string,
    stepIndex: number,
    done: boolean,
  ) => void;
  setCollectibles: (entries: CollectibleEntry[]) => void;
  collectItem: (itemId: string) => void;
}

export const useGameUIStore = create<GameUIState>()((set) => ({
  sidebarOpen: false,
  gameStarted: false,
  stars: 0,
  totalStars: 0,
  missions: [],
  collectibles: [],

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setGameStarted: (started) => set({ gameStarted: started }),
  setStars: (current, total) => set({ stars: current, totalStars: total }),
  setMissions: (missions) => set({ missions }),
  addOrUpdateMission: (missionId, title, collectedInfos, totalSteps, steps) =>
    set((s) => {
      const existing = s.missions.find((m) => m.missionId === missionId);
      if (existing) {
        return {
          missions: s.missions.map((m) =>
            m.missionId === missionId
              ? {
                  ...m,
                  steps: Array.from({ length: totalSteps }, (_, i) => ({
                    text:
                      steps?.[i]?.text || m.steps[i]?.text || `Etapa ${i + 1}`,
                    infoKey: steps?.[i]?.infoKey,
                    done: steps?.[i]?.infoKey
                      ? collectedInfos.includes(steps[i].infoKey)
                      : false,
                  })),
                }
              : m,
          ),
        };
      }
      return {
        missions: [
          ...s.missions,
          {
            missionId,
            title,
            steps: Array.from({ length: totalSteps }, (_, i) => ({
              text: steps?.[i]?.text || `Etapa ${i + 1}`,
              infoKey: steps?.[i]?.infoKey,
              done: steps?.[i]?.infoKey
                ? collectedInfos.includes(steps[i].infoKey)
                : false,
            })),
          },
        ],
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
}));

export const selectHintCollectibles = (s: GameUIState) =>
  s.collectibles.filter(
    (c) => c.category === "CLUE_VILLAIN" || c.category === "CLUE_NEXT",
  );

export const selectInventoryCollectibles = (s: GameUIState) =>
  s.collectibles.filter((c) => c.category === "COLLECT");
