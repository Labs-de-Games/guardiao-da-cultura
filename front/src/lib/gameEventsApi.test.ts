import { writeConsent } from "./consent/consentStorage";

const mockApi = { count: 0 };

jest.mock("./api/client", () => ({
  apiClient: {
    post: async () => {
      mockApi.count++;
      if (mockApi.count === 1) {
        throw new Error("Network error");
      }
      return { data: {} };
    },
  },
}));

beforeEach(() => {
  process.env.NEXT_PUBLIC_API_URL = "http://localhost:3001";
  mockApi.count = 0;
  window.localStorage.clear();
  // The queue only exists for players who authorised collection (#864);
  // the refusal paths have their own cases at the bottom of this file.
  writeConsent("accepted");
});

afterEach(() => {
  window.localStorage.clear();
});

describe("gameEventsApi", () => {
  it("enqueues regular quiz event when POST fails and flushes later", async () => {
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
    expect(mockApi.count).toBe(1);

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
    expect(mockApi.count).toBe(2);
    const rawAfterFlush = window.localStorage.getItem(
      "gameplate:eventQueue:v1",
    );
    expect(rawAfterFlush).toBe("[]");
  });

  it("accepts intermediate quiz events", async () => {
    const { sendQuizOutcomeEvent } = await import("./gameEventsApi");

    await expect(
      sendQuizOutcomeEvent({
        type: "intermediate-quiz.failed",
        timestamp: "2026-01-01T00:00:00.000Z",
        metadata: {
          infoKey: "paintings_done",
          passed: false,
          missionId: "missao_curador",
        },
      }),
    ).resolves.toBeUndefined();

    expect(mockApi.count).toBe(1);
  });

  it("drops events with excessive failed attempts", async () => {
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

    expect(mockApi.count).toBe(0);
    expect(window.localStorage.getItem("gameplate:eventQueue:v1")).toBe("[]");
  });

  describe("analytics consent (#864)", () => {
    it("sends nothing when the player has not decided", async () => {
      window.localStorage.clear();
      const { sendQuizOutcomeEvent } = await import("./gameEventsApi");

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
        },
      });

      expect(mockApi.count).toBe(0);
    });

    it("does not bank the event for later when the player refuses", async () => {
      writeConsent("declined");
      const { sendQuizOutcomeEvent } = await import("./gameEventsApi");

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
        },
      });

      expect(mockApi.count).toBe(0);
      expect(window.localStorage.getItem("gameplate:eventQueue:v1")).toBeNull();
    });

    it("discards a queue banked before the decision instead of flushing it", async () => {
      // A queue left over from an older build, or from before the player
      // answered. Accepting authorises collection from that moment on — it
      // must never backfill.
      window.localStorage.setItem(
        "gameplate:eventQueue:v1",
        JSON.stringify([
          {
            id: "old-1",
            createdAt: Date.now(),
            attempts: 0,
            payload: {
              type: "quiz.completed",
              timestamp: "2026-01-01T00:00:00.000Z",
              metadata: {
                missionId: "m1",
                score: 1,
                totalQuestions: 1,
                accuracyPercent: 100,
                quartersEarned: 1,
                passed: true,
              },
            },
          },
        ]),
      );
      writeConsent("declined");

      const { flushGameEventQueue } = await import("./gameEventsApi");
      await flushGameEventQueue();

      expect(mockApi.count).toBe(0);
      expect(window.localStorage.getItem("gameplate:eventQueue:v1")).toBeNull();
    });
  });
});
