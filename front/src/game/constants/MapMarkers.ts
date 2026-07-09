export type MapMarker = {
  id: string;
  label: string;
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
    label: "Brumadinho, MG",
    x: 0.66,
    y: 0.69,
    title: "Instituto Inhotim",
    location: "Brumadinho - MG",
    image: "/assets/ui/map-cards/inhotim.png",
    levelId: "level_01",
  },
  {
    id: "curitiba",
    label: "Curitiba, PR",
    x: 0.57,
    y: 0.83,
    title: "Teatro Guaíra",
    location: "Curitiba - PR",
    image: "/assets/ui/map-cards/teatro-guaira.png",
    levelId: "level_02",
  },
  {
    id: "manaus",
    label: "Manaus, AM",
    x: 0.34,
    y: 0.28,
    title: "Teatro Amazonas",
    location: "Manaus - AM",
    image: "/assets/ui/map-cards/teatro-amazonas.png",
    levelId: "level_03",
  },
  {
    id: "campina-grande",
    label: "Campina Grande, PB",
    x: 0.72,
    y: 0.46,
    title: "Festa de São João",
    location: "Campina Grande - PB",
    image: "/assets/ui/map-cards/festa-sao-joao.png",
    levelId: "level_04",
  },
  {
    id: "brasilia",
    label: "Brasília, DF",
    x: 0.59,
    y: 0.58,
    title: "Palácio Itamaraty",
    location: "Brasília - DF",
    image: "/assets/ui/map-cards/palacio-itamaraty.png",
    levelId: "level_05",
  },
];

export const DEFAULT_MAP_MARKER = {
  title: MAP_MARKERS[0].title,
  location: MAP_MARKERS[0].location,
  isAvailable: true,
  isCompleted: false,
  image: MAP_MARKERS[0].image,
  levelId: MAP_MARKERS[0].levelId,
};
