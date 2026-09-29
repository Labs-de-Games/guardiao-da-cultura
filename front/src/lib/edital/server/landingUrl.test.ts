/**
 * @jest-environment node
 */
jest.mock("server-only", () => ({}));

const mockServer: { authUrl?: string } = {};
jest.mock("../../env-server", () => ({
  serverEnv: {
    get server() {
      return mockServer;
    },
  },
}));

import { NextRequest } from "next/server";
import { resolveLandingBaseUrl } from "./landingUrl";

function makeRequest(url = "http://0.0.0.0:3000/api/edital/links") {
  return new NextRequest(url);
}

describe("resolveLandingBaseUrl", () => {
  beforeEach(() => {
    delete mockServer.authUrl;
  });

  it("uses AUTH_URL when set (staging/production behind the proxy)", () => {
    mockServer.authUrl = "https://staging.example.com";

    expect(resolveLandingBaseUrl(makeRequest())).toBe(
      "https://staging.example.com",
    );
  });

  it("falls back to the request origin when AUTH_URL is unset (local dev)", () => {
    expect(
      resolveLandingBaseUrl(
        makeRequest("http://localhost:3000/api/edital/links"),
      ),
    ).toBe("http://localhost:3000");
  });
});
