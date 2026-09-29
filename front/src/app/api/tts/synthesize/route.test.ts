/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-require-imports */

// Polyfill web globals needed by next/server before importing the route
const { TextEncoder, TextDecoder } = require("node:util");
if (typeof globalThis.TextEncoder === "undefined") {
  (globalThis as Record<string, unknown>).TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === "undefined") {
  (globalThis as Record<string, unknown>).TextDecoder = TextDecoder;
}

const mockFetch = jest.fn();
(globalThis as Record<string, unknown>).fetch = mockFetch;

// Mutable so a test can reproduce a cold-start install, where the contributor
// has no ResponsiveVoice key. The old fixture hardcoded one, which is why the
// suite stayed green while real key-less installs returned a 500.
let mockApiKey: string | undefined = "test-api-key";

jest.mock("@/lib/env-server", () => ({
  serverEnv: {
    client: {},
    get server() {
      return {
        responsivevoiceApiKey: mockApiKey,
        responsivevoiceApiUrl:
          "https://texttospeech.responsivevoice.org/v1/text:synthesize",
      };
    },
  },
}));

beforeEach(() => {
  mockFetch.mockReset();
  mockApiKey = "test-api-key";
});

jest.spyOn(console, "error").mockImplementation(() => {});

import { NextRequest } from "next/server";
import { POST } from "./route";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/tts/synthesize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/tts/synthesize", () => {
  describe("validation", () => {
    it("returns 400 when text is missing", async () => {
      const response = await POST(makeRequest({ voice: "pt-BR" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it("returns 400 when text is empty string", async () => {
      const response = await POST(makeRequest({ text: "" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("text");
    });

    it("returns 400 when text exceeds 5000 characters", async () => {
      const response = await POST(makeRequest({ text: "a".repeat(5001) }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("5000");
    });

    it("returns 400 when rate is below 0.1", async () => {
      const response = await POST(makeRequest({ text: "hello", rate: 0.05 }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain(">=0.1");
    });

    it("returns 400 when rate is above 3", async () => {
      const response = await POST(makeRequest({ text: "hello", rate: 3.5 }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("<=3");
    });

    it("returns 400 when pitch is below 0", async () => {
      const response = await POST(makeRequest({ text: "hello", pitch: -0.1 }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain(">=0");
    });

    it("returns 400 when pitch is above 2", async () => {
      const response = await POST(makeRequest({ text: "hello", pitch: 2.5 }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("<=2");
    });

    it("returns 400 when body is not valid JSON", async () => {
      const request = new NextRequest("http://localhost/api/tts/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-json",
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("accepts valid minimal body (text only)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      });

      const response = await POST(makeRequest({ text: "hello" }));

      expect(response.status).toBe(200);
    });

    it("accepts valid body with all optional fields", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      });

      const response = await POST(
        makeRequest({
          text: "hello",
          voice: "en-US",
          rate: 1.5,
          pitch: 0.8,
        }),
      );

      expect(response.status).toBe(200);
    });
  });

  describe("without an API key", () => {
    it("returns 503 instead of throwing", async () => {
      mockApiKey = undefined;

      const response = await POST(makeRequest({ text: "hello" }));
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.code).toBe("tts_unavailable");
      expect(data.error).toContain("RESPONSIVEVOICE_API_KEY");
    });

    it("never reaches the upstream service", async () => {
      mockApiKey = undefined;

      await POST(makeRequest({ text: "hello" }));

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("still rejects an invalid body with 400", async () => {
      mockApiKey = undefined;

      const response = await POST(makeRequest({ text: "" }));

      expect(response.status).toBe(400);
    });
  });

  describe("upstream proxy", () => {
    it("returns 502 when upstream API fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue("Internal error"),
      });

      const response = await POST(makeRequest({ text: "hello" }));
      const data = await response.json();

      expect(response.status).toBe(502);
      expect(data.error).toContain("failed");
    });

    it("returns 502 when the upstream call throws", async () => {
      mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

      const response = await POST(makeRequest({ text: "hello" }));
      const data = await response.json();

      expect(response.status).toBe(502);
      expect(data.error).toContain("unreachable");
    });

    it("aborts the upstream call on a timeout", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      });

      await POST(makeRequest({ text: "hello" }));

      const options = mockFetch.mock.calls[0][1] as { signal?: AbortSignal };
      expect(options.signal).toBeInstanceOf(AbortSignal);
    });

    it("returns 200 with audio/mpeg on success", async () => {
      const audioBuffer = new ArrayBuffer(8);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(audioBuffer),
      });

      const response = await POST(makeRequest({ text: "hello" }));

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("audio/mpeg");
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    });

    it("forwards text, voice, rate, pitch to upstream", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      });

      await POST(
        makeRequest({
          text: "hello",
          voice: "en-US",
          rate: 1.5,
          pitch: 0.8,
        }),
      );

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain("text=hello");
      expect(calledUrl).toContain("tl=en-US");
      expect(calledUrl).toContain("rate=1.5");
      expect(calledUrl).toContain("pitch=0.8");
      expect(calledUrl).toContain("key=test-api-key");
    });

    it("uses default voice pt-BR when not specified", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      });

      await POST(makeRequest({ text: "hello" }));

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain("tl=pt-BR");
    });

    it("maps voice name to language code", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      });

      await POST(
        makeRequest({ text: "hello", voice: "Brazilian Portuguese Female" }),
      );

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain("tl=pt-BR");
    });

    it("passes raw BCP-47 codes through unchanged", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      });

      await POST(makeRequest({ text: "hello", voice: "fr-FR" }));

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain("tl=fr-FR");
    });
  });
});
