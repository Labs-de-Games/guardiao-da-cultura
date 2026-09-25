import { render, screen } from "@testing-library/react";
import { RateCard } from "./RateCard";

describe("RateCard", () => {
  it("renders the rate as a rounded percentage", () => {
    render(
      <RateCard
        title="Taxa de entrada"
        rate={{ value: 0.617, numerator: 617, denominator: 1000 }}
      />,
    );
    expect(screen.getByText("62%")).toBeInTheDocument();
  });

  it("renders numerator/denominator in pt-BR as the subtitle", () => {
    render(
      <RateCard
        title="Taxa de entrada"
        rate={{ value: 0.5, numerator: 1234, denominator: 2468 }}
      />,
    );
    expect(screen.getByText("1.234 / 2.468")).toBeInTheDocument();
  });

  it("never shows a target/status chip — the onepager defines no thresholds", () => {
    render(
      <RateCard
        title="Taxa de entrada"
        rate={{ value: 1, numerator: 1, denominator: 1 }}
      />,
    );
    expect(screen.queryByText(/Meta/)).toBeNull();
  });
});
