import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { Sidebar } from "./Sidebar";

jest.mock("./AudioSubpanel", () => ({ AudioSubpanel: () => null }));
jest.mock("./ControlsSubpanel", () => ({ ControlsSubpanel: () => null }));
jest.mock("./HintCard", () => ({
  HintCard: () => <div data-testid="sidebar-content" />,
}));
jest.mock("./ObjectiveList", () => ({ ObjectiveList: () => null }));
jest.mock("./PhaseInfoCard", () => ({ PhaseInfoCard: () => null }));

describe("Sidebar", () => {
  beforeEach(() => {
    useGameUIStore.setState({ sidebarOpen: false });
  });

  it("shows only the expand tab when closed", () => {
    render(<Sidebar />);

    expect(screen.queryByTestId("sidebar-content")).toBeNull();
    const toggle = screen.getByRole("button", { name: "Abrir painel" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("shows the panel and the collapse tab when open", () => {
    useGameUIStore.setState({ sidebarOpen: true });
    render(<Sidebar />);

    expect(screen.getByTestId("sidebar-content")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Fechar painel" }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("toggles the sidebar through the store when the tab is clicked", async () => {
    render(<Sidebar />);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Abrir painel" }));
    });
    expect(useGameUIStore.getState().sidebarOpen).toBe(true);
    expect(screen.getByTestId("sidebar-content")).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Fechar painel" }));
    });
    expect(useGameUIStore.getState().sidebarOpen).toBe(false);
    await waitFor(() =>
      expect(screen.queryByTestId("sidebar-content")).toBeNull(),
    );
  });
});
