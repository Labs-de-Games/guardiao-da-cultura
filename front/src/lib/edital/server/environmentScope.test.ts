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

  it("filters by environment when AUTH_URL is unset (local dev)", () => {
    expect(environmentPredicate()).toBe(
      "properties.environment = {environment}",
    );
    expect(environmentValues()).toEqual({ environment: "development" });
  });

  it("filters by the deployment's own host only when AUTH_URL is set", () => {
    mockEnv.client.env = "staging";
    mockEnv.server.authUrl = "https://development-guardiaodacultura.42.rio";

    expect(environmentPredicate()).toBe("properties.$host = {host}");
    expect(environmentValues()).toEqual({
      host: "development-guardiaodacultura.42.rio",
    });
  });

  it("does not depend on the environment tag once deployed (old staging events say production)", () => {
    mockEnv.client.env = "production";
    mockEnv.server.authUrl = "https://guardiaodacultura.42.rio";

    expect(environmentPredicate()).not.toContain("environment");
    expect(environmentValues()).toEqual({ host: "guardiaodacultura.42.rio" });
  });

  it("never string-interpolates the values into the predicate", () => {
    mockEnv.server.authUrl = "https://guardiaodacultura.42.rio";

    expect(environmentPredicate()).not.toContain("guardiaodacultura");
  });
});
