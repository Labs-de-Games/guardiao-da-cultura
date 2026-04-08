import type { MissionDef } from "../types/GameDataTypes";

/**
 * Definições de requisitos das missões para o QuestManager.
 */
export const MissionRequirements = [
  { id: "obras_famosas", requiredInfos: ["statue_info", "painting_info"] },
  {
    id: "reliquias_antigas",
    requiredInfos: ["sarcophagus_info", "fossil_info"],
  },
];

/**
 * Registro de Metadados de Missões (Títulos e Passos) para a UI.
 */
export const MissionRegistry: Record<string, MissionDef> = {
  obras_famosas: {
    id: "obras_famosas",
    title: "Obras famosas",
    steps: [
      { infoKey: "statue_info", text: "Verifique a estátua do herói" },
      { infoKey: "painting_info", text: "Verifique a pintura famosa" },
    ],
  },
  reliquias_antigas: {
    id: "reliquias_antigas",
    title: "Relíquias antigas",
    steps: [
      { infoKey: "sarcophagus_info", text: "Verifique o sarcófago" },
      { infoKey: "fossil_info", text: "Verifique o fóssil" },
    ],
  },
};
