export type MapMarker = {
  id: string;
  label: string;
  x: number;
  y: number;
  title: string;
  location: string;
  image?: string;
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
    id: "blumenau",
    label: "Blumenau, SC",
    x: 0.57,
    y: 0.83,
    title: "Oktoberfest",
    location: "Blumenau, Santa Catarina",
  },
  {
    id: "cuiaba",
    label: "Cuiabá, MT",
    x: 0.46,
    y: 0.53,
    title: "FIT Pantanal",
    location: "Cuiabá, Mato Grosso",
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
    id: "recife",
    label: "Recife, PE",
    x: 0.72,
    y: 0.46,
    title: "Galo da Madrugada",
    location: "Recife, Pernambuco",
  },
  {
    id: "brasilia",
    label: "Brasília, DF",
    x: 0.59,
    y: 0.58,
    title: "Grande Centro Cultural",
    location: "Brasília, Distrito Federal",
  },
];

export const DEFAULT_MAP_MARKER = {
  title: MAP_MARKERS[0].title,
  location: MAP_MARKERS[0].location,
  isAvailable: true,
  image: MAP_MARKERS[0].image,
};
