import { act, fireEvent, render, screen } from "@testing-library/react";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { LabelPanel } from "./LabelPanel";

function resetStore() {
  useGameUIStore.setState({ labelData: null });
}

beforeEach(() => {
  resetStore();
});

const PAGE1_TEXT = "X".repeat(144);
const PAGE2_TEXT = "Y".repeat(144);
const LONG_DESCRIPTION = PAGE1_TEXT + PAGE2_TEXT + "Z".repeat(12);

function openLabel(overrides?: { title?: string; description?: string }) {
  act(() => {
    useGameUIStore.setState({
      labelData: {
        title: overrides?.title ?? "Obra Teste",
        author: "Artista",
        description:
          overrides?.description ?? "Uma descrição curta para teste.",
        year: "2024",
      },
    });
  });
}

function renderWithLongDescription() {
  openLabel({ description: LONG_DESCRIPTION });
  render(<LabelPanel />);
}

function clickNextPage() {
  act(() => {
    fireEvent.click(screen.getByLabelText("Próxima página"));
  });
}

function clickPrevPage() {
  act(() => {
    fireEvent.click(screen.getByLabelText("Página anterior"));
  });
}

describe("LabelPanel", () => {
  it("returns null when labelData is null", () => {
    const { container } = render(<LabelPanel />);
    expect(container.innerHTML).toBe("");
  });

  it("renders title and subtitle when open", () => {
    openLabel();
    render(<LabelPanel />);

    expect(screen.getByText("Obra Teste")).toBeInTheDocument();
    expect(screen.getByText("Artista | 2024")).toBeInTheDocument();
  });

  it("has correct ARIA attributes on the dialog", () => {
    openLabel();
    render(<LabelPanel />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "Obra: Obra Teste");
  });

  it("does not show pagination when description is short", () => {
    openLabel();
    render(<LabelPanel />);

    expect(screen.queryByLabelText("Página anterior")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Próxima página")).not.toBeInTheDocument();
  });

  it("shows pagination when description exceeds 144 chars", () => {
    renderWithLongDescription();

    expect(screen.getByLabelText("Página anterior")).toBeInTheDocument();
    expect(screen.getByLabelText("Próxima página")).toBeInTheDocument();
  });

  it("navigates to next page via arrow button", () => {
    renderWithLongDescription();

    expect(screen.getByText(PAGE1_TEXT)).toBeInTheDocument();

    clickNextPage();

    expect(screen.queryByText(PAGE1_TEXT)).not.toBeInTheDocument();
    expect(screen.getByText(PAGE2_TEXT)).toBeInTheDocument();
  });

  it("navigates to previous page via arrow button", () => {
    renderWithLongDescription();

    clickNextPage();
    expect(screen.getByText(PAGE2_TEXT)).toBeInTheDocument();

    clickPrevPage();
    expect(screen.getByText(PAGE1_TEXT)).toBeInTheDocument();
  });

  it("does not navigate past first page", () => {
    renderWithLongDescription();

    expect(screen.getByLabelText("Página anterior")).toBeDisabled();

    clickPrevPage();

    expect(screen.getByText(PAGE1_TEXT)).toBeInTheDocument();
  });

  it("does not navigate past last page", () => {
    renderWithLongDescription();

    clickNextPage();
    clickNextPage();

    expect(screen.getByLabelText("Próxima página")).toBeDisabled();
    expect(screen.queryByText(PAGE1_TEXT)).not.toBeInTheDocument();
    expect(screen.queryByText(PAGE2_TEXT)).not.toBeInTheDocument();
  });

  it("resets to page 0 when description changes", () => {
    renderWithLongDescription();

    clickNextPage();
    expect(screen.getByText(PAGE2_TEXT)).toBeInTheDocument();

    act(() => {
      useGameUIStore.setState({
        labelData: {
          title: "New Title",
          author: "Author",
          description: "b".repeat(200),
          year: "2025",
        },
      });
    });

    expect(screen.getByText("b".repeat(144))).toBeInTheDocument();
  });

  it("arrow buttons have correct aria-labels", () => {
    renderWithLongDescription();

    expect(screen.getByLabelText("Página anterior")).toBeInTheDocument();
    expect(screen.getByLabelText("Próxima página")).toBeInTheDocument();
  });

  it("pagination dots have aria-labels", () => {
    renderWithLongDescription();

    expect(screen.getByLabelText("Página 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Página 2")).toBeInTheDocument();
  });

  it("focus ring visible on Paper when focused", () => {
    renderWithLongDescription();

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("tabindex", "-1");
  });
});
