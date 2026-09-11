import { fireEvent, render, screen } from "@testing-library/react";
import { DashboardState } from "./DashboardState";

describe("DashboardState", () => {
  it("shows a spinner while loading", () => {
    const { container } = render(
      <DashboardState loading error={null} onRetry={jest.fn()} linked>
        <div>content</div>
      </DashboardState>,
    );
    expect(container.querySelector(".MuiCircularProgress-root")).toBeTruthy();
    expect(screen.queryByText("content")).toBeNull();
  });

  it("shows the error message and a working retry button", () => {
    const onRetry = jest.fn();
    render(
      <DashboardState
        loading={false}
        error="Falha ao carregar"
        onRetry={onRetry}
        linked
      >
        <div>content</div>
      </DashboardState>,
    );

    expect(screen.getByText("Falha ao carregar")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Tentar novamente"));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("content")).toBeNull();
  });

  it("shows the awaiting-linkage empty state when not linked", () => {
    render(
      <DashboardState
        loading={false}
        error={null}
        onRetry={jest.fn()}
        linked={false}
      >
        <div>content</div>
      </DashboardState>,
    );

    expect(
      screen.getByText("Instituição ainda não vinculada"),
    ).toBeInTheDocument();
    expect(screen.queryByText("content")).toBeNull();
  });

  it("renders children when loaded, unerrored, and linked", () => {
    render(
      <DashboardState loading={false} error={null} onRetry={jest.fn()} linked>
        <div>content</div>
      </DashboardState>,
    );

    expect(screen.getByText("content")).toBeInTheDocument();
  });
});
