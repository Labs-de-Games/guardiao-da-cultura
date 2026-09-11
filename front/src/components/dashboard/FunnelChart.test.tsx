import { render, screen } from "@testing-library/react";
import { FunnelChart } from "./FunnelChart";

describe("FunnelChart — backward compatibility (count/stepConversion omitted)", () => {
  it("renders label and percentage without count/stepConversion", () => {
    render(
      <FunnelChart
        steps={[
          { label: "Passo 1", value: 1 },
          { label: "Passo 2", value: 0.5 },
        ]}
      />,
    );

    expect(screen.getByText("Passo 1")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("highlights the last step by default", () => {
    render(
      <FunnelChart
        steps={[
          { label: "Passo 1", value: 1 },
          { label: "Passo 2", value: 0.5 },
        ]}
      />,
    );

    const highlighted = screen.getByText("Passo 2");
    expect(highlighted).toHaveStyle({ fontWeight: 700 });
  });
});

describe("FunnelChart — count and stepConversion (new fields)", () => {
  it("renders the absolute count next to the label when provided", () => {
    render(
      <FunnelChart steps={[{ label: "Passo 1", value: 1, count: 5000 }]} />,
    );

    expect(screen.getByText("(5.000)")).toBeInTheDocument();
  });

  it("renders step-over-step conversion when provided", () => {
    render(
      <FunnelChart
        steps={[{ label: "Passo 2", value: 0.5, stepConversion: 0.8 }]}
      />,
    );

    expect(screen.getByText("(80% do anterior)")).toBeInTheDocument();
  });

  it("omits count/stepConversion text when not provided, even alongside steps that have them", () => {
    render(
      <FunnelChart
        steps={[
          { label: "Passo 1", value: 1, count: 100 },
          { label: "Passo 2", value: 0.5 },
        ]}
      />,
    );

    expect(screen.getByText("(100)")).toBeInTheDocument();
    expect(screen.queryByText(/do anterior/)).toBeNull();
  });
});
