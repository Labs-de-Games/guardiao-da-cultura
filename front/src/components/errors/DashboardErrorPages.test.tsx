import { fireEvent, render, screen } from "@testing-library/react";
import {
  DashboardEmptyState,
  DashboardInlineError,
  DashboardNotFoundPage,
  DashboardRouteErrorPage,
  DashboardSessionExpiredPage,
} from "./DashboardErrorPages";

jest.mock("@/lib/errors/reportError", () => ({
  reportErrorPage: jest.fn(),
}));

jest.mock("@/components/Footer", () => ({
  Footer: () => <footer>dashboard-footer</footer>,
}));

describe("DashboardNotFoundPage", () => {
  it("links back to the given dashboard home and shows the footer", () => {
    render(<DashboardNotFoundPage homeHref="/institution" />);

    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText("Voltar ao painel").closest("a")).toHaveAttribute(
      "href",
      "/institution",
    );
    expect(screen.getByText("dashboard-footer")).toBeInTheDocument();
  });

  it("uses a custom home label", () => {
    render(<DashboardNotFoundPage homeHref="/" homeLabel="Voltar ao início" />);
    expect(screen.getByText("Voltar ao início")).toBeInTheDocument();
  });

  it("omits the footer when a layout already renders it", () => {
    render(
      <DashboardNotFoundPage homeHref="/institution" withFooter={false} />,
    );
    expect(screen.queryByText("dashboard-footer")).toBeNull();
  });
});

describe("DashboardRouteErrorPage", () => {
  it("shows the server error with retry and the digest, never the raw message", () => {
    const reset = jest.fn();
    const error = Object.assign(new Error("secret stack detail"), {
      digest: "abc123",
    });
    render(
      <DashboardRouteErrorPage
        error={error}
        reset={reset}
        homeHref="/public-dashboard"
      />,
    );

    expect(screen.getByText("Algo deu errado")).toBeInTheDocument();
    expect(screen.getByText(/abc123/)).toBeInTheDocument();
    expect(screen.queryByText(/secret stack detail/)).toBeNull();
    fireEvent.click(screen.getByText("Tentar novamente"));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("shows the connection copy for a fetch TypeError", () => {
    render(
      <DashboardRouteErrorPage
        error={new TypeError("Failed to fetch")}
        reset={jest.fn()}
        homeHref="/public-dashboard"
      />,
    );

    expect(screen.getByText("Sem conexão com o servidor")).toBeInTheDocument();
    expect(screen.queryByText("500")).toBeNull();
  });
});

describe("DashboardSessionExpiredPage", () => {
  it("links to the login page", () => {
    render(<DashboardSessionExpiredPage />);
    expect(screen.getByText("Entrar novamente").closest("a")).toHaveAttribute(
      "href",
      "/login",
    );
  });
});

describe("DashboardInlineError", () => {
  it.each([
    ["network", "Sem conexão com o servidor"],
    ["notFound", "Dados não encontrados"],
    ["badRequest", "Não foi possível aplicar os filtros"],
    ["server", "Não foi possível carregar os dados"],
  ] as const)("shows %s copy with a working retry", (kind, title) => {
    const onRetry = jest.fn();
    render(<DashboardInlineError kind={kind} onRetry={onRetry} />);

    expect(screen.getByText(title)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Tentar novamente"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("never renders the footer", () => {
    render(<DashboardInlineError kind="server" onRetry={jest.fn()} />);
    expect(screen.queryByText("dashboard-footer")).toBeNull();
  });
});

describe("DashboardEmptyState", () => {
  it("renders default copy", () => {
    render(<DashboardEmptyState />);
    expect(
      screen.getByText("Ainda não há dados para este período"),
    ).toBeInTheDocument();
  });
});
