import { render, screen, within } from "@testing-library/react";
import { Footer } from "./Footer";

describe("Footer", () => {
  it("renders a contentinfo landmark", () => {
    render(<Footer />);
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("renders the sponsor logos", () => {
    render(<Footer />);
    expect(screen.getByAltText("Lei Rouanet")).toBeInTheDocument();
    expect(screen.getByAltText("Galp")).toBeInTheDocument();
    expect(screen.getByAltText("Bemobi")).toBeInTheDocument();
    expect(
      screen.getByAltText("Ministério da Cultura / Governo do Brasil"),
    ).toBeInTheDocument();
  });

  it("labels the partner and producer groups", () => {
    render(<Footer />);
    expect(screen.getByText("Parceiro")).toBeInTheDocument();
    expect(screen.getByText("Realização")).toBeInTheDocument();
  });

  it("groups Galp and Bemobi under a single Parceiro label", () => {
    render(<Footer />);
    const labels = screen.getAllByText("Parceiro");
    expect(labels).toHaveLength(1);
    const group = labels[0].parentElement as HTMLElement;
    expect(within(group).getByAltText("Galp")).toBeInTheDocument();
    expect(within(group).getByAltText("Bemobi")).toBeInTheDocument();
  });
});
