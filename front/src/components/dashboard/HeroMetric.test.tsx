import { render, screen } from "@testing-library/react";
import { HeroMetric } from "./HeroMetric";

describe("HeroMetric", () => {
  it("formats the value in pt-BR", () => {
    render(<HeroMetric value={12345} />);
    expect(screen.getByText("12.345")).toBeInTheDocument();
  });

  it("uses the default label", () => {
    render(<HeroMetric value={1} />);
    expect(screen.getByText("Usuários únicos em gameplay")).toBeInTheDocument();
  });

  it("renders no progress bar toward any 5,000 goal", () => {
    const { container } = render(<HeroMetric value={100} />);
    expect(container.querySelector(".MuiLinearProgress-root")).toBeNull();
    expect(screen.queryByText(/5\.000/)).toBeNull();
    expect(screen.queryByText(/5000/)).toBeNull();
  });

  it("accepts a custom label", () => {
    render(<HeroMetric value={1} label="Custom" />);
    expect(screen.getByText("Custom")).toBeInTheDocument();
  });
});
