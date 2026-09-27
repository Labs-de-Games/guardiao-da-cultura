import { AxiosError, AxiosHeaders, CanceledError } from "axios";
import { navigateTo } from "@/lib/navigation/safeRedirect";
import {
  handleBackendUnavailable,
  isBackendUnavailableError,
} from "./backendAvailability";
import { checkBackendHealth } from "./health";

jest.mock("./health", () => ({ checkBackendHealth: jest.fn() }));
jest.mock("@/lib/navigation/safeRedirect", () => ({
  ...jest.requireActual("@/lib/navigation/safeRedirect"),
  navigateTo: jest.fn(),
}));

const mockCheckHealth = checkBackendHealth as jest.Mock;

function axiosErrorWithStatus(status?: number): AxiosError {
  const error = new AxiosError("request failed");
  if (status !== undefined) {
    error.response = {
      status,
      statusText: "",
      data: {},
      headers: {},
      config: { headers: new AxiosHeaders() },
    };
  }
  return error;
}

describe("isBackendUnavailableError", () => {
  it.each([502, 503, 504])("flags %i responses", (status) => {
    expect(isBackendUnavailableError(axiosErrorWithStatus(status))).toBe(true);
  });

  it("flags network errors without a response", () => {
    expect(isBackendUnavailableError(axiosErrorWithStatus())).toBe(true);
  });

  it.each([400, 401, 403, 404, 500])("ignores %i responses", (status) => {
    expect(isBackendUnavailableError(axiosErrorWithStatus(status))).toBe(false);
  });

  it("ignores cancelled requests", () => {
    expect(isBackendUnavailableError(new CanceledError())).toBe(false);
  });
});

describe("handleBackendUnavailable", () => {
  const assign = navigateTo as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    window.history.pushState({}, "", "/game?a=1");
  });

  it("redirects to maintenance when health check fails", async () => {
    mockCheckHealth.mockResolvedValue(false);
    await handleBackendUnavailable();
    expect(assign).toHaveBeenCalledWith(
      `/game/maintenance?next=${encodeURIComponent("/game?a=1")}`,
    );
  });

  it("stays on the page when backend is healthy", async () => {
    mockCheckHealth.mockResolvedValue(true);
    await handleBackendUnavailable();
    expect(assign).not.toHaveBeenCalled();
  });

  it("shares one health check across concurrent failures", async () => {
    mockCheckHealth.mockResolvedValue(false);
    await Promise.all([
      handleBackendUnavailable(),
      handleBackendUnavailable(),
      handleBackendUnavailable(),
    ]);
    expect(mockCheckHealth).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledTimes(1);
  });

  it("does nothing when already on the maintenance page", async () => {
    window.history.pushState({}, "", "/game/maintenance");
    await handleBackendUnavailable();
    expect(mockCheckHealth).not.toHaveBeenCalled();
  });

  it.each([
    "/login",
    "/institution",
  ])("does nothing outside game routes (%s)", async (path) => {
    window.history.pushState({}, "", path);
    mockCheckHealth.mockResolvedValue(false);
    await handleBackendUnavailable();
    expect(mockCheckHealth).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it("does not redirect when the player is offline", async () => {
    const onLine = jest.spyOn(window.navigator, "onLine", "get");
    onLine.mockReturnValue(false);
    mockCheckHealth.mockResolvedValue(false);

    await handleBackendUnavailable();

    expect(mockCheckHealth).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
    onLine.mockRestore();
  });
});
