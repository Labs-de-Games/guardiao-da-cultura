import { INVESTIGATION_LEVEL_ID } from "./Investigation";

export type MapMarker = {
  id: string;
  shortlocation: string;
  x: number;
  y: number;
  title: string;
  location: string;
  image?: string;
  levelId?: string;
};

export const MAP_MARKERS: MapMarker[] = [
  {
    id: "brumadinho",
    shortlocation: "Brumadinho, MG",
    x: 0.66,
    y: 0.67,
    title: "Inhotim",
    location: "Brumadinho, Minas Gerais",
    image: "/assets/ui/map-cards/inhotim.png",
    levelId: "level_01",
  },
  {
    id: "manaus",
    shortlocation: "Manaus, AM",
    x: 0.42,
    y: 0.265,
    title: "Teatro Amazonas",
    location: "Manaus, Amazonas",
    image: "/assets/ui/map-cards/teatro-amazonas.png",
    levelId: "level_02",
  },
  {
    id: "campina-grande",
    shortlocation: "Campina Grande, PB",
    x: 0.75,
    y: 0.37,
    title: "São João de Campina Grande",
    location: "Campina Grande, Paraíba",
    image: "/assets/ui/map-cards/festa-sao-joao.png",
    levelId: "level_03",
  },
  {
    // Final phase: the suspect identification screen, not a playable level.
    // TODO(art): placeholder position and card image — needs a dedicated pin
    // location and artwork for the curator's investigation room.
    id: "sala-de-investigacao",
    shortlocation: "Sala de Investigação",
    x: 0.62,
    y: 0.52,
    title: "Identificação do Suspeito",
    location: "Sala de Investigação",
    image: "/assets/ui/map-cards/investigation-room.png",
    levelId: INVESTIGATION_LEVEL_ID,
  },
];

export const DEFAULT_MAP_MARKER = {
  markerId: MAP_MARKERS[0].id,
  title: MAP_MARKERS[0].title,
  shortlocation: MAP_MARKERS[0].shortlocation,
  location: MAP_MARKERS[0].location,
  isAvailable: true,
  isCompleted: false,
  image: MAP_MARKERS[0].image,
  levelId: MAP_MARKERS[0].levelId,
  screenX: 0,
  screenY: 0,
};
