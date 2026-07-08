export type MapMarker = {
  id: string;
  label: string;
  x: number;
  y: number;
  title: string;
  location: string;
  image: string;
};

export const MAP_MARKERS: MapMarker[] = [
  {
    id: "brumadinho",
    label: "Brumadinho, MG",
    x: 0.66,
    y: 0.69,
    title: "Instituto Inhotim",
    location: "Brumadinho, Minas Gerais",
    image: "/assets/ui/map-cards/inhotim.png",
  },
  {
    id: "manaus",
    label: "Manaus, AM",
    x: 0.34,
    y: 0.28,
    title: "Teatro Amazonas",
    location: "Manaus, Amazonas",
    image: "/assets/ui/map-cards/teatro-amazonas.png",
  },
  {
    id: "brasilia",
    label: "Brasília, DF",
    x: 0.59,
    y: 0.58,
    title: "Palácio Itamaraty",
    location: "Brasília, Distrito Federal",
    image: "/assets/ui/map-cards/palacio-itamaraty.png",
  },
  {
    id: "curitiba",
    label: "Curitiba, PR",
    x: 0.57,
    y: 0.8,
    title: "Teatro Guaíra",
    location: "Curitiba, Paraná",
    image: "/assets/ui/map-cards/teatro-guaira.png",
  },
  {
    id: "campina-grande",
    label: "Campina Grande, PB",
    x: 0.7,
    y: 0.41,
    title: "Festa de São João",
    location: "Campina Grande, Paraíba",
    image: "/assets/ui/map-cards/festa-sao-joao.png",
  },
];

export const DEFAULT_MAP_MARKER = {
  title: MAP_MARKERS[0].title,
  location: MAP_MARKERS[0].location,
  isAvailable: true,
  image: MAP_MARKERS[0].image,
};
