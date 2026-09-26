import { act, renderHook } from "@testing-library/react";
import { checkBackendHealth } from "@/lib/api/health";
import { isMaintenanceActive } from "@/lib/api/maintenanceStatus";
import { navigateTo } from "@/lib/navigation/safeRedirect";
import { useMaintenanceRecovery } from "./useMaintenanceRecovery";

jest.mock("@/lib/api/health", () => ({ checkBackendHealth: jest.fn() }));
jest.mock("@/lib/api/maintenanceStatus", () => ({
  isMaintenanceActive: jest.fn(),
}));
jest.mock("@/lib/navigation/safeRedirect", () => ({
  ...jest.requireActual("@/lib/navigation/safeRedirect"),
  navigateTo: jest.fn(),
}));
jest.mock("@/lib/errors/retryDelay", () => ({
  nextRetryDelay: (attempt: number) => 1000 * 2 ** attempt,
}));

const mockHealth = checkBackendHealth as jest.Mock;
const mockActive = isMaintenanceActive as jest.Mock;
const mockNavigate = navigateTo as jest.Mock;

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
  await flush();
}

function setHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => hidden,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("useMaintenanceRecovery", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
    window.history.pushState({}, "", "/game/maintenance?next=%2Fgame");
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("outage: checks immediately and returns to next when healthy", async () => {
    mockHealth.mockResolvedValue(true);
    renderHook(() => useMaintenanceRecovery("outage"));
    await flush();

    expect(mockHealth).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/game");
  });

  it("outage: backs off between checks while still down", async () => {
    mockHealth.mockResolvedValue(false);
    const { result } = renderHook(() => useMaintenanceRecovery("outage"));
    await flush();
    expect(result.current.status).toBe("still_down");
    expect(mockHealth).toHaveBeenCalledTimes(1);

    await advance(1999);
    expect(mockHealth).toHaveBeenCalledTimes(1);
    await advance(1);
    expect(mockHealth).toHaveBeenCalledTimes(2);

    await advance(4000);
    expect(mockHealth).toHaveBeenCalledTimes(3);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("scheduled: never reloads while maintenance is still active", async () => {
    mockActive.mockResolvedValue(true);
    renderHook(() => useMaintenanceRecovery("scheduled"));
    await flush();
    expect(mockActive).not.toHaveBeenCalled();

    await advance(1000);
    await advance(2000);
    await advance(4000);

    expect(mockActive).toHaveBeenCalledTimes(3);
    expect(mockHealth).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("scheduled: returns once maintenance is turned off", async () => {
    mockActive.mockResolvedValueOnce(true).mockResolvedValue(false);
    renderHook(() => useMaintenanceRecovery("scheduled"));

    await advance(1000);
    expect(mockNavigate).not.toHaveBeenCalled();
    await advance(2000);
    expect(mockNavigate).toHaveBeenCalledWith("/game");
  });

  it("pauses while the tab is hidden and checks again when visible", async () => {
    mockActive.mockResolvedValue(true);
    renderHook(() => useMaintenanceRecovery("scheduled"));

    act(() => setHidden(true));
    await advance(60_000);
    expect(mockActive).not.toHaveBeenCalled();

    act(() => setHidden(false));
    await flush();
    expect(mockActive).toHaveBeenCalledTimes(1);
  });

  it("manual retry checks right away and resets the backoff", async () => {
    mockHealth.mockResolvedValue(false);
    const { result } = renderHook(() => useMaintenanceRecovery("outage"));
    await flush();
    await advance(2000);
    expect(mockHealth).toHaveBeenCalledTimes(2);

    act(() => result.current.retry());
    await flush();
    expect(mockHealth).toHaveBeenCalledTimes(3);

    await advance(1000);
    expect(mockHealth).toHaveBeenCalledTimes(3);
    await advance(1000);
    expect(mockHealth).toHaveBeenCalledTimes(4);
  });

  it("falls back to the landing page for an unsafe next", async () => {
    window.history.pushState(
      {},
      "",
      "/game/maintenance?next=%2F%09%2Fevil.com",
    );
    mockHealth.mockResolvedValue(true);
    renderHook(() => useMaintenanceRecovery("outage"));
    await flush();

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});
