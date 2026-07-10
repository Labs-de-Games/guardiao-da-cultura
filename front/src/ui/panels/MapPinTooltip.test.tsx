import { render, screen } from "@testing-library/react";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { MapPinTooltip } from "./MapPinTooltip";

describe("MapPinTooltip", () => {
  beforeEach(() => {
    useGameUIStore.setState({
      gameStarted: false,
      activeMapMarker: {
        markerId: "brumadinho",
        title: "Instituto Inhotim",
        location: "Brumadinho - MG",
        isAvailable: true,
        screenX: 640,
        screenY: 480,
      },
    });
  });

  it("renders the tooltip with keycap, title, and instruction", () => {
    render(<MapPinTooltip />);

    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    expect(screen.getByText("ESPAÇO")).toBeInTheDocument();
    expect(screen.getByText("Instituto Inhotim")).toBeInTheDocument();
    expect(
      screen.getByText("Pressione ESPAÇO para entrar no mapa."),
    ).toBeInTheDocument();
  });

  it("shows unavailable message for locked locations", () => {
    useGameUIStore.setState({
      activeMapMarker: {
        markerId: "blumenau",
        title: "Oktoberfest",
        location: "Blumenau, Santa Catarina",
        isAvailable: false,
        screenX: 500,
        screenY: 400,
      },
    });

    render(<MapPinTooltip />);

    expect(screen.getByText("Este local está em reforma.")).toBeInTheDocument();
  });

  it("does not render when the game has started", () => {
    useGameUIStore.setState({ gameStarted: true });

    render(<MapPinTooltip />);

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("does not render before pin coordinates are available", () => {
    useGameUIStore.setState({
      activeMapMarker: {
        markerId: "brumadinho",
        title: "Instituto Inhotim",
        location: "Brumadinho - MG",
        isAvailable: true,
        screenX: 0,
        screenY: 0,
      },
    });

    render(<MapPinTooltip />);

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
