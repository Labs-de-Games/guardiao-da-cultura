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
      MissionKeys.SPOTLIGHTS_DONE,
      MissionKeys.STAGE_DONE,
    ],
  },
  {
    id: MissionIds.CURATOR_L3,
    requiredInfos: [
      MissionKeys.DANCE_DONE,
      MissionKeys.SWITCHES_DONE,
      MissionKeys.STAGE_DONE,
      MissionKeys.GENIUS_DONE,
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
        text: "Reorganizar as estátuas do palco",
        categoryType: InteractiveType.SCULPTURE,
      },
      {
        infoKey: MissionKeys.SPOTLIGHTS_DONE,
        text: "Acender o holofote correto",
        categoryType: InteractiveType.SPOTLIGHT,
      },
    ],
  },
  [MissionIds.CURATOR_L3]: {
    id: MissionIds.CURATOR_L3,
    title: "Festa de São João",
    steps: [
      {
        infoKey: MissionKeys.DANCE_DONE,
        text: "Remontar a sequência de passos da quadrilha",
        categoryType: InteractiveType.STEP_SEQUENCE,
      },
      {
        infoKey: MissionKeys.SWITCHES_DONE,
        text: "Consertar as luzes do palco",
      },
      {
        infoKey: MissionKeys.STAGE_DONE,
        text: "Montar a banda de forró no palco",
        categoryType: InteractiveType.BAND,
      },
      {
        infoKey: MissionKeys.GENIUS_DONE,
        text: "Afinar o acordeon",
        categoryType: InteractiveType.GENIUS_SEQUENCE,
      },
    ],
  },
};
