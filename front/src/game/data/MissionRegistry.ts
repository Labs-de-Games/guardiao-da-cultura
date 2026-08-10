import { MissionIds, MissionKeys } from "../constants/MissionConstants";
import type { MissionDef } from "../types/GameDataTypes";
import { InteractiveType } from "../types/InteractiveTypes";

export const MissionRequirements = [
  {
    id: MissionIds.CURATOR,
    requiredInfos: [
      MissionKeys.SCULPTURES_DONE,
      MissionKeys.PAINTINGS_DONE,
      MissionKeys.PHOTO_COLLECTED,
      MissionKeys.PHOTO_DONE,
    ],
  },
  {
    id: MissionIds.CURATOR_L2,
    requiredInfos: [
      MissionKeys.COSTUMES_DONE,
      MissionKeys.POSTERS_DONE,
      MissionKeys.SCULPTURES_DONE,
    ],
  },
];

export const MissionRegistry: Record<string, MissionDef> = {
  [MissionIds.CURATOR]: {
    id: MissionIds.CURATOR,
    title: "Sala de restauração",
    steps: [
      {
        infoKey: MissionKeys.SCULPTURES_DONE,
        text: "Reorganizar todas as esculturas",
        categoryType: InteractiveType.SCULPTURE,
      },
      {
        infoKey: MissionKeys.PAINTINGS_DONE,
        text: "Reorganizar todas as pinturas",
        categoryType: InteractiveType.PAINTING,
      },
      {
        infoKey: MissionKeys.PHOTO_COLLECTED,
        text: "Encontrar os pedaços da fotografia",
      },
      {
        infoKey: MissionKeys.PHOTO_DONE,
        text: "Remontar a fotografia",
        categoryType: InteractiveType.PHOTO,
      },
    ],
  },
  [MissionIds.CURATOR_L2]: {
    id: MissionIds.CURATOR_L2,
    title: "Galeria de cartazes",
    steps: [
      {
        infoKey: MissionKeys.COSTUMES_DONE,
        text: "Vestir todos os figurinos",
        categoryType: InteractiveType.COSTUME,
      },
      {
        infoKey: MissionKeys.POSTERS_DONE,
        text: "Pendurar todos os cartazes",
        categoryType: InteractiveType.POSTER,
      },
      {
        infoKey: MissionKeys.SCULPTURES_DONE,
        text: "Reorganizar as esculturas do palco",
        categoryType: InteractiveType.SCULPTURE,
      },
    ],
  },
};
