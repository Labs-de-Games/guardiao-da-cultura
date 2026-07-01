export type MapMarker = {
  id: string;
  label: string;
  x: number;
  y: number;
  title: string;
  location: string;
};

export const MAP_MARKERS: MapMarker[] = [
  {
    id: "inhotim",
    label: "Brumadinho, Minas Gerais",
    x: 0.66,
    y: 0.69,
    title: "Inhotim",
    location: "Brumadinho, Minas Gerais",
  },
  {
    id: "manaus",
    label: "Manaus, Amazonas",
    x: 0.34,
    y: 0.28,
    title: "Teatro Amazonas",
    location: "Manaus, Amazonas",
  },
  {
    id: "saojoao",
    label: "Campina Grande, Paraíba",
    x: 0.72,
    y: 0.46,
    title: "São João de Campina Grande",
    location: "Campina Grande, Paraíba",
  },
  {
    id: "guaira",
    label: "Curitiba, Paraná",
    x: 0.57,
    y: 0.83,
    title: "Teatro Guaíra",
    location: "Curitiba, Paraná",
  },
  {
    id: "itamaraty",
    label: "Brasília, Distrito Federal",
    x: 0.59,
    y: 0.58,
    title: "Palácio Itamaraty",
    location: "Brasília, Distrito Federal",
  },
];

export const DEFAULT_MAP_MARKER = {
  title: MAP_MARKERS[0].title,
  location: MAP_MARKERS[0].location,
  isAvailable: true,
};
