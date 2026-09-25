import { fireEvent, render, screen } from "@testing-library/react";
import { FilterBar } from "./FilterBar";

describe("FilterBar — backward compatibility (new props omitted)", () => {
  it("renders the original 3 options and no custom fields when new props are omitted", () => {
    render(
      <FilterBar dateRange="last-30-days" onDateRangeChange={jest.fn()} />,
    );

    expect(screen.getByLabelText("Período")).toBeInTheDocument();
    // No custom-range inputs rendered.
    expect(screen.queryByLabelText("De")).toBeNull();
    expect(screen.queryByLabelText("Até")).toBeNull();
  });

  it("calls onDateRangeChange with the selected value", () => {
    const onDateRangeChange = jest.fn();
    render(
      <FilterBar
        dateRange="last-30-days"
        onDateRangeChange={onDateRangeChange}
      />,
    );

    fireEvent.mouseDown(screen.getByLabelText("Período"));
    fireEvent.click(screen.getByText("Últimos 7 dias"));

    expect(onDateRangeChange).toHaveBeenCalledWith("last-7-days");
  });

  it("does not offer the 'Personalizado' option when custom handlers are omitted", () => {
    render(
      <FilterBar dateRange="last-30-days" onDateRangeChange={jest.fn()} />,
    );

    fireEvent.mouseDown(screen.getByLabelText("Período"));
    expect(screen.queryByText("Personalizado")).toBeNull();
  });
});

describe("FilterBar — custom range (new props provided)", () => {
  it("shows the 'Personalizado' option when custom handlers are provided", () => {
    render(
      <FilterBar
        dateRange="last-30-days"
        onDateRangeChange={jest.fn()}
        onCustomFromChange={jest.fn()}
        onCustomToChange={jest.fn()}
      />,
    );

    fireEvent.mouseDown(screen.getByLabelText("Período"));
    expect(screen.getByText("Personalizado")).toBeInTheDocument();
  });

  it("reveals two date fields when dateRange is custom", () => {
    render(
      <FilterBar
        dateRange="custom"
        onDateRangeChange={jest.fn()}
        customFrom="2026-01-01"
        customTo="2026-02-01"
        onCustomFromChange={jest.fn()}
        onCustomToChange={jest.fn()}
      />,
    );

    expect(screen.getByLabelText("De")).toBeInTheDocument();
    expect(screen.getByLabelText("Até")).toBeInTheDocument();
  });

  it("does not reveal date fields when dateRange is not custom, even with handlers provided", () => {
    render(
      <FilterBar
        dateRange="last-30-days"
        onDateRangeChange={jest.fn()}
        onCustomFromChange={jest.fn()}
        onCustomToChange={jest.fn()}
      />,
    );

    expect(screen.queryByLabelText("De")).toBeNull();
  });

  it("calls onCustomFromChange/onCustomToChange on input", () => {
    const onCustomFromChange = jest.fn();
    const onCustomToChange = jest.fn();
    render(
      <FilterBar
        dateRange="custom"
        onDateRangeChange={jest.fn()}
        onCustomFromChange={onCustomFromChange}
        onCustomToChange={onCustomToChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("De"), {
      target: { value: "2026-03-01" },
    });
    fireEvent.change(screen.getByLabelText("Até"), {
      target: { value: "2026-03-15" },
    });

    expect(onCustomFromChange).toHaveBeenCalledWith("2026-03-01");
    expect(onCustomToChange).toHaveBeenCalledWith("2026-03-15");
  });
});
