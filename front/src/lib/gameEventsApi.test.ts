import { afterEach, beforeEach, describe, expect, it } from "bun:test";

let originalFetch: typeof fetch | undefined;

beforeEach(() => {
  // Provide the env used by gameEventsApi.
  process.env.NEXT_PUBLIC_API_URL = "http://localhost:3001";
  originalFetch = globalThis.fetch;
  window.localStorage.clear();
});

afterEach(() => {
  // Restore any mocked fetch.
  if (originalFetch) {
    globalThis.fetch = originalFetch;
  }
  window.localStorage.clear();
});

describe("gameEventsApi", () => {
  it("enqueues event when POST fails and flushes later", async () => {
    let call = 0;

    // First call fails, second call succeeds.
    const mockFetch = Object.assign(
      async () => {
        call++;
        if (call === 1) {
          return new Response(null, { status: 503 });
        }
        return new Response(null, { status: 204 });
      },
      {
        // Next.js extends `fetch` with extra helpers (ex: `preconnect`).
        preconnect: (..._args: unknown[]) => {},
      },
    ) as typeof fetch;

    globalThis.fetch = mockFetch;

    const { flushGameEventQueue, sendQuizOutcomeEvent } = await import(
      "./gameEventsApi"
    );

    await sendQuizOutcomeEvent({
      type: "quiz.completed",
      timestamp: "2026-01-01T00:00:00.000Z",
      metadata: {
        missionId: "m1",
        score: 3,
        totalQuestions: 4,
        accuracyPercent: 75,
        quartersEarned: 1,
        passed: true,
        payload: { foo: "bar" },
      },
    });

    // One failed POST attempt.
    expect(call).toBe(1);

    const rawAfterEnqueue = window.localStorage.getItem(
      "gameplate:eventQueue:v1",
    );
    expect(rawAfterEnqueue).not.toBeNull();
    const parsedAfterEnqueue = JSON.parse(
      rawAfterEnqueue as string,
    ) as unknown[];
    expect(parsedAfterEnqueue.length).toBe(1);

    await flushGameEventQueue();

    // One retry that succeeds.
    expect(call).toBe(2);
    const rawAfterFlush = window.localStorage.getItem(
      "gameplate:eventQueue:v1",
    );
    expect(rawAfterFlush).toBe("[]");
  });

  it("drops events with excessive failed attempts", async () => {
    let calls = 0;

    const mockFetch = Object.assign(
      async () => {
        calls++;
        return new Response(null, { status: 204 });
      },
      {
        preconnect: (..._args: unknown[]) => {},
      },
    ) as typeof fetch;

    globalThis.fetch = mockFetch;

    window.localStorage.setItem(
      "gameplate:eventQueue:v1",
      JSON.stringify([
        {
          id: "e1",
          createdAt: 0,
          attempts: 999,
          payload: {
            type: "quiz.failed",
            timestamp: "2026-01-01T00:00:00.000Z",
            metadata: {
              missionId: "m1",
              score: 0,
              totalQuestions: 4,
              accuracyPercent: 0,
              quartersEarned: 0,
              passed: false,
            },
          },
        },
      ]),
    );

    const { flushGameEventQueue } = await import("./gameEventsApi");
    await flushGameEventQueue();

    expect(calls).toBe(0);
    expect(window.localStorage.getItem("gameplate:eventQueue:v1")).toBe("[]");
  });
});
