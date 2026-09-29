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

  it("shows a friendly error with a working retry button, never the raw message", () => {
    const onRetry = jest.fn();
    render(
      <DashboardState
        loading={false}
        error="Failed to fetch"
        errorKind="network"
        onRetry={onRetry}
        linked
      >
        <div>content</div>
      </DashboardState>,
    );

    expect(screen.getByText("Sem conexão com o servidor")).toBeInTheDocument();
    expect(screen.queryByText("Failed to fetch")).toBeNull();
    fireEvent.click(screen.getByText("Tentar novamente"));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("content")).toBeNull();
  });

  it("falls back to the generic error copy when no kind is given", () => {
    render(
      <DashboardState loading={false} error="boom" onRetry={jest.fn()} linked>
        <div>content</div>
      </DashboardState>,
    );

    expect(
      screen.getByText("Não foi possível carregar os dados"),
    ).toBeInTheDocument();
  });

  it("offers a login link instead of retry when the session expired", () => {
    render(
      <DashboardState
        loading={false}
        error="Sessão expirada"
        errorKind="unauthorized"
        onRetry={jest.fn()}
        linked
      >
        <div>content</div>
      </DashboardState>,
    );

    expect(screen.getByText("Entrar novamente").closest("a")).toHaveAttribute(
      "href",
      "/login",
    );
    expect(screen.queryByText("Tentar novamente")).toBeNull();
  });

  it("shows the empty state when loaded data has nothing to show", () => {
    render(
      <DashboardState
        loading={false}
        error={null}
        onRetry={jest.fn()}
        linked
        empty
      >
        <div>content</div>
      </DashboardState>,
    );

    expect(
      screen.getByText("Ainda não há dados para este período"),
    ).toBeInTheDocument();
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
