import { MissionKeys } from "../constants/MissionConstants";
import type { LevelDefinition } from "../data/LevelConfig";
import type { ContentJson } from "../types/GameDataTypes";
import { DataUtils } from "../utils/DataUtils";

export function processModularData(
  levelDef: LevelDefinition,
  contentData: ContentJson,
  cacheGet: (key: string) => unknown,
) {
  levelDef.data.works.forEach((path, i) => {
    const data = cacheGet(`works_${i}`);
    if (data) {
      DataUtils.deepMerge(
        contentData.works as unknown as Record<string, unknown>,
        data as unknown as Record<string, unknown>,
      );
    } else {
      console.warn(`[GameDataLoader] Could not load works data from: ${path}`);
    }
  });

  levelDef.data.quizzes.forEach((path, i) => {
    const data = cacheGet(`quizzes_${i}`);
    if (data) {
      DataUtils.deepMerge(
        contentData.quizzes as unknown as Record<string, unknown>,
        data as Record<string, unknown>,
      );
    } else {
      console.warn(`[GameDataLoader] Could not load quiz data from: ${path}`);
    }
  });

  levelDef.data.intermediateQuizzes.forEach((path, i) => {
    const data = cacheGet(`intermediateQuizzes_${i}`);
    if (data) {
      DataUtils.deepMerge(
        contentData.intermediateQuizzes as unknown as Record<string, unknown>,
        data as Record<string, unknown>,
      );
    } else {
      console.warn(
        `[GameDataLoader] Could not load intermediate quiz data from: ${path}`,
      );
    }
  });

  const knownKeys = new Set<string>(Object.values(MissionKeys));
  for (const key of Object.keys(contentData.intermediateQuizzes)) {
    if (!knownKeys.has(key)) {
      console.warn(
        `[GameDataLoader] Unknown intermediate quiz key "${key}" — will never trigger. Check intermediate-quizzes.json.`,
      );
    }
  }

  levelDef.data.npcs.forEach((path, i) => {
    const data = cacheGet(`npcs_${i}`);
    if (data && typeof data === "object" && "npcs" in data) {
      DataUtils.deepMerge(
        contentData.npcs,
        (data as { npcs: Record<string, unknown> }).npcs,
      );
    } else {
      console.warn(`[GameDataLoader] Could not load NPC data from: ${path}`);
    }
  });

  levelDef.data.messages.forEach((path, i) => {
    const data = cacheGet(`messages_${i}`);
    if (data) {
      DataUtils.deepMerge(
        contentData.messages as unknown as Record<string, unknown>,
        data as unknown as Record<string, unknown>,
      );
    } else {
      console.warn(
        `[GameDataLoader] Could not load messages data from: ${path}`,
      );
    }
  });

  levelDef.data.collectibles.forEach((path, i) => {
    const data = cacheGet(`collectibles_${i}`);
    if (data && typeof data === "object" && "collectibles" in data) {
      DataUtils.deepMerge(
        contentData.collectibles as unknown as Record<string, unknown>,
        (data as { collectibles: Record<string, unknown> })
          .collectibles as Record<string, unknown>,
      );
    } else {
      console.warn(
        `[GameDataLoader] Could not load collectibles data from: ${path}`,
      );
    }
  });
}
