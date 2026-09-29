import { apiClient } from "./api/client";
import { hasAnalyticsConsent } from "./consent/consentStorage";

export type RegularQuizEventType = "quiz.completed" | "quiz.failed";
export type IntermediateQuizEventType =
  | "intermediate-quiz.completed"
  | "intermediate-quiz.failed";

export type QuizEventType = RegularQuizEventType | IntermediateQuizEventType;

export interface QuizEventMetadata {
  missionId: string;
  score: number;
  totalQuestions: number;
  accuracyPercent: number;
  quartersEarned: number;
  passed: boolean;
  timeSpentMs?: number;
  attempts?: number;
  payload?: Record<string, unknown>;
}

export interface IntermediateQuizEventMetadata {
  infoKey: string;
  passed: boolean;
  score: number;
  totalQuestions: number;
  missionId: string;
}

export interface RegularQuizEventPayload {
  userId?: string;
  type: RegularQuizEventType;
  timestamp: string;
  metadata: QuizEventMetadata;
}

export interface IntermediateQuizEventPayload {
  userId?: string;
  type: IntermediateQuizEventType;
  timestamp: string;
  metadata: IntermediateQuizEventMetadata;
}

export type GameEventPayload =
  | RegularQuizEventPayload
  | IntermediateQuizEventPayload;

type QueuedEvent = {
  id: string;
  createdAt: number;
  attempts: number;
  payload: GameEventPayload;
};

const STORAGE_KEY = "gameplate:eventQueue:v1";

// Prevent unbounded localStorage growth if the backend stays unavailable.
const MAX_QUEUE_SIZE = 200;
const MAX_ATTEMPTS = 25;
const MAX_EVENT_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function nowMs(): number {
  return Date.now();
}

function getQueue(): QueuedEvent[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as QueuedEvent[];
  } catch {
    return [];
  }
}

function setQueue(queue: QueuedEvent[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

function clearQueue(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Blocked store — there was nothing readable to flush anyway.
  }
}

function randomId(): string {
  // Prefer crypto UUID if available.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${nowMs()}_${Math.random().toString(16).slice(2)}`;
}

async function postEvent(payload: GameEventPayload): Promise<void> {
  await apiClient.post("/events", payload);
}

function enqueue(payload: GameEventPayload): void {
  const queue = getQueue();
  queue.push({
    id: randomId(),
    createdAt: nowMs(),
    attempts: 0,
    payload,
  });

  // Drop oldest items if the queue grows too large.
  while (queue.length > MAX_QUEUE_SIZE) {
    queue.shift();
  }

  setQueue(queue);
}

let flushInFlight = false;

export async function flushGameEventQueue(): Promise<void> {
  if (typeof window === "undefined") return;

  // Without consent the queue is not merely held back, it is discarded
  // (issue #864): "não armazenar eventos para envio retroativo". Anything
  // banked before the player decided must never reach the server once they
  // do — accepting authorises collection from that moment on, not backfill.
  if (!hasAnalyticsConsent()) {
    clearQueue();
    return;
  }

  if (flushInFlight) return;
  flushInFlight = true;

  try {
    const queue = getQueue();
    if (queue.length === 0) return;

    const remaining: QueuedEvent[] = [];
    for (const item of queue) {
      // Drop events that are unlikely to ever succeed.
      const ageMs = nowMs() - item.createdAt;
      if (item.attempts >= MAX_ATTEMPTS) continue;
      if (ageMs > MAX_EVENT_AGE_MS) continue;

      try {
        await postEvent(item.payload);
      } catch {
        remaining.push({ ...item, attempts: item.attempts + 1 });
      }
    }

    setQueue(remaining);
  } finally {
    flushInFlight = false;
  }
}

let initDone = false;
let _flushTimer: number | null = null;

export function initGameEventQueue(): void {
  if (typeof window === "undefined") return;
  if (initDone) return;
  initDone = true;

  const onOnline = () => {
    void flushGameEventQueue();
  };
  window.addEventListener("online", onOnline);

  // Best-effort periodic retry.
  _flushTimer = window.setInterval(() => {
    void flushGameEventQueue();
  }, 10_000);

  // Initial flush.
  void flushGameEventQueue();
}

/**
 * Send a quiz outcome to the Postgres pipeline, queueing it for retry if the
 * request fails.
 *
 * Gated on consent (issue #864). The guard has to sit ahead of the queue as
 * well as the request: enqueueing without consent would bank the event on
 * disk and deliver it the moment the player accepted, which is exactly the
 * retroactive collection the acceptance criteria forbid.
 */
export async function sendQuizOutcomeEvent(
  payload: GameEventPayload,
): Promise<void> {
  if (!hasAnalyticsConsent()) return;

  try {
    await postEvent(payload);
  } catch {
    enqueue(payload);
  }
}
