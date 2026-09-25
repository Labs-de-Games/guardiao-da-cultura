/**
 * @jest-environment node
 */
jest.mock("server-only", () => ({}));

const mockEnv: { client: { env: string }; server: { authUrl?: string } } = {
  client: { env: "development" },
  server: {},
};
jest.mock("../../env-server", () => ({
  serverEnv: {
    get client() {
      return mockEnv.client;
    },
    get server() {
      return mockEnv.server;
    },
  },
}));

import { environmentPredicate, environmentValues } from "./environmentScope";

describe("environmentScope", () => {
  beforeEach(() => {
    mockEnv.client.env = "development";
    delete mockEnv.server.authUrl;
  });

  it("filters by environment only when AUTH_URL is unset (local dev)", () => {
    expect(environmentPredicate()).toBe(
      "properties.environment = {environment}",
    );
    expect(environmentValues()).toEqual({ environment: "development" });
  });

  it("also filters by the deployment's own host when AUTH_URL is set", () => {
    mockEnv.client.env = "staging";
    mockEnv.server.authUrl = "https://development-guardiaodacultura.42.rio";

    expect(environmentPredicate()).toBe(
      "properties.environment = {environment} AND properties.$host = {host}",
    );
    expect(environmentValues()).toEqual({
      environment: "staging",
      host: "development-guardiaodacultura.42.rio",
    });
  });

  it("keeps old staging plays (tagged production) out of production via the host", () => {
    mockEnv.client.env = "production";
    mockEnv.server.authUrl = "https://guardiaodacultura.42.rio";

    expect(environmentValues()).toEqual({
      environment: "production",
      host: "guardiaodacultura.42.rio",
    });
  });

  it("never string-interpolates the values into the predicate", () => {
    mockEnv.client.env = "production";
    mockEnv.server.authUrl = "https://guardiaodacultura.42.rio";

    const predicate = environmentPredicate();
    expect(predicate).not.toContain("production");
    expect(predicate).not.toContain("guardiaodacultura");
  });
});
