import { env } from "./env";

type QuizEventType = "quiz.completed" | "quiz.failed";

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

export interface GameEventPayload {
  userId?: string;
  type: QuizEventType;
  timestamp: string; // ISO string
  metadata: QuizEventMetadata;
}

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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

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

function randomId(): string {
  // Prefer crypto UUID if available.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${nowMs()}_${Math.random().toString(16).slice(2)}`;
}

async function postEvent(payload: GameEventPayload): Promise<void> {
  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/v1/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    // Keep response body out of logs by default; caller decides.
    throw new Error(`Events API failed: ${res.status}`);
  }
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

export function getStoredUserId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = window.localStorage.getItem("gameplate:userId");
  if (!raw) return undefined;
  return isUuid(raw) ? raw : undefined;
}

export async function sendQuizOutcomeEvent(
  payload: Omit<GameEventPayload, "timestamp" | "userId"> & {
    userId?: string;
    timestamp?: string;
  },
): Promise<void> {
  const event: GameEventPayload = {
    userId: payload.userId ?? getStoredUserId(),
    type: payload.type,
    timestamp: payload.timestamp ?? new Date().toISOString(),
    metadata: payload.metadata,
  };

  try {
    await postEvent(event);
  } catch {
    enqueue(event);
  }
}
