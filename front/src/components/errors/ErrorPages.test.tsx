import { act, fireEvent, render, screen } from "@testing-library/react";
import { checkBackendHealth } from "@/lib/api/health";
import {
  reportErrorPage,
  reportErrorPageOncePerSession,
} from "@/lib/errors/reportError";
import { navigateTo } from "@/lib/navigation/safeRedirect";
import {
  GameLoadErrorScreen,
  MaintenancePage,
  NotFoundPage,
  ServerErrorPage,
} from "./ErrorPages";

jest.mock("@/lib/errors/reportError", () => ({
  reportErrorPage: jest.fn(),
  reportErrorPageOncePerSession: jest.fn(),
}));
jest.mock("@/lib/api/maintenanceStatus", () => ({
  isMaintenanceActive: jest.fn().mockResolvedValue(true),
}));
jest.mock("@/lib/api/health", () => ({ checkBackendHealth: jest.fn() }));
jest.mock("@/lib/navigation/safeRedirect", () => ({
  ...jest.requireActual("@/lib/navigation/safeRedirect"),
  navigateTo: jest.fn(),
}));

const mockCheckHealth = checkBackendHealth as jest.Mock;

function setLocation(pathname: string, search = "") {
  window.history.pushState({}, "", `${pathname}${search}`);
  return navigateTo as jest.Mock;
}

describe("ErrorPages", () => {
  beforeEach(() => jest.clearAllMocks());

  it("NotFoundPage renders a heading, home link and reports", () => {
    render(<NotFoundPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Caminho não encontrado" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Voltar ao início" }),
    ).toHaveAttribute("href", "/");
    expect(reportErrorPage).toHaveBeenCalledWith(
      "not_found",
      undefined,
      undefined,
    );
  });

  it("ServerErrorPage retries, shows digest and hides the raw message", () => {
    const reset = jest.fn();
    const error = Object.assign(new Error("secret stack detail"), {
      digest: "d1g3st",
    });
    render(<ServerErrorPage error={error} reset={reset} />);

    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/d1g3st/)).toBeInTheDocument();
    expect(screen.queryByText(/secret stack detail/)).not.toBeInTheDocument();
    expect(reportErrorPage).toHaveBeenCalledWith("server_error", error, {
      digest: "d1g3st",
    });
  });

  it("ServerErrorPage focuses the primary action", () => {
    render(<ServerErrorPage error={new Error("x")} reset={jest.fn()} />);
    expect(
      screen.getByRole("button", { name: "Tentar novamente" }),
    ).toHaveFocus();
  });

  it("MaintenancePage (outage) returns to next path when backend recovers", async () => {
    const assign = setLocation("/game/maintenance", "?next=%2Fgame");
    mockCheckHealth.mockResolvedValue(true);

    await act(async () => {
      render(<MaintenancePage reason="outage" />);
    });

    expect(assign).toHaveBeenCalledWith("/game");
  });

  it("MaintenancePage (outage) stays and informs when backend is still down", async () => {
    const assign = setLocation("/game/maintenance");
    mockCheckHealth.mockResolvedValue(false);

    await act(async () => {
      render(<MaintenancePage reason="outage" />);
    });

    expect(assign).not.toHaveBeenCalled();
    expect(screen.getByText(/Nossos servidores/)).toBeInTheDocument();
    expect(screen.getByText(/Ainda indisponível/)).toBeInTheDocument();
  });

  it("MaintenancePage (scheduled) shows planned copy and reports once", async () => {
    setLocation("/");
    const { unmount } = render(<MaintenancePage reason="scheduled" />);
    unmount();
    render(<MaintenancePage reason="scheduled" />);

    expect(screen.getByText(/manutenção programada/)).toBeInTheDocument();
    expect(reportErrorPageOncePerSession).toHaveBeenCalledWith(
      "maintenance",
      "scheduled",
      { reason: "scheduled" },
    );
    expect(mockCheckHealth).not.toHaveBeenCalled();
  });

  it("GameLoadErrorScreen calls onRetry", () => {
    const onRetry = jest.fn();
    render(<GameLoadErrorScreen onRetry={onRetry} />);

    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders the shared sponsor footer outside the main landmark", () => {
    render(<NotFoundPage />);

    const footer = screen.getByRole("contentinfo");
    expect(screen.getByRole("main")).not.toContainElement(footer);
    expect(screen.getByAltText("Bemobi")).toBeInTheDocument();
  });
});
