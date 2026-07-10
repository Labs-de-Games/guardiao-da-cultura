import {
  type GameEventPayload,
  GameEventType,
} from "@/game/types/AnalyticsTypes";
import type { UserProgressState } from "@/game/types/ProgressionTypes";
import {
  type BadgeConfig,
  fetchBadges,
  fetchUserBadges,
  unlockBadgeOnServer,
} from "@/lib/badgesApi";
import { addGuestBadge, getGuestBadgeIds } from "@/lib/badgesStorage";
import {
  type IntermediateQuizEventPayload,
  type GameEventPayload as QuizEventPayload,
  type RegularQuizEventPayload,
  sendQuizOutcomeEvent,
} from "@/lib/gameEventsApi";
import { getProgression, saveProgression } from "@/lib/progressionApi";
import {
  getUserCollectibles,
  type SubmitScoreRequest,
  submitScore,
} from "@/lib/scoresApi";
import { sendGameEvent } from "../analyticsApi";
import { getOrCreateGuestSessionId } from "../guestSession";

export type PersistenceMode = "guest" | "auth";

export type PersistedCollectible = {
  collectibleId: string;
  collectibleType: "CLUE_VILLAIN";
};

export type ScorePersistencePayload = Omit<SubmitScoreRequest, "userId">;

export type QuizOutcomePayload = Omit<QuizEventPayload, "userId">;

export interface GamePersistence {
  readonly mode: PersistenceMode;
  getBadgeCatalog(): Promise<BadgeConfig[]>;
  getUnlockedBadgeIds(): Promise<string[]>;
  unlockBadge(badgeId: string): Promise<void>;
  loadCollectibles(levelId: string): Promise<PersistedCollectible[]>;
  saveScore(payload: ScorePersistencePayload): Promise<void>;
  sendQuizOutcome(payload: QuizOutcomePayload): Promise<void>;
  sendBadgeEarnedEvent(payload: {
    badgeId: string;
    badgeName: string;
  }): Promise<void>;
  loadProgress(): Promise<UserProgressState | null>;
  saveProgress(state: UserProgressState): Promise<void>;
}

type GuestSnapshot = {
  scores: Array<{
    levelId: string;
    savedAt: string;
    totalStars: number;
    totalQuarters: number;
  }>;
  collectiblesByLevel: Record<string, PersistedCollectible[]>;
  events: Array<{
    kind: "quiz" | "badge";
    at: string;
    payload: Record<string, unknown>;
  }>;
  progression?: UserProgressState | null;
};

type GuestPersistenceStore = {
  version: 1;
  guests: Record<string, GuestSnapshot>;
};

const GUEST_PERSISTENCE_KEY = "gameplate:guest:persistence:v1";
const MAX_STORED_SCORES = 30;
const MAX_STORED_EVENTS = 200;

function readGuestStore(): GuestPersistenceStore {
  if (typeof window === "undefined") {
    return { version: 1, guests: {} };
  }

  try {
    const raw = window.localStorage.getItem(GUEST_PERSISTENCE_KEY);
    if (!raw) return { version: 1, guests: {} };

    const parsed = JSON.parse(raw) as GuestPersistenceStore;
    if (parsed?.version !== 1 || typeof parsed?.guests !== "object") {
      return { version: 1, guests: {} };
    }

    return parsed;
  } catch {
    return { version: 1, guests: {} };
  }
}

function writeGuestStore(store: GuestPersistenceStore): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(GUEST_PERSISTENCE_KEY, JSON.stringify(store));
  } catch {
    // best-effort persistence
  }
}

function getOrCreateGuestSnapshot(
  store: GuestPersistenceStore,
  guestId: string,
): GuestSnapshot {
  const existing = store.guests[guestId];
  if (existing) return existing;

  const created: GuestSnapshot = {
    scores: [],
    collectiblesByLevel: {},
    events: [],
  };
  store.guests[guestId] = created;
  return created;
}

function buildGuestPersistence(guestId: string): GamePersistence {
  return {
    mode: "guest",

    async getBadgeCatalog() {
      return fetchBadges({ source: "guest" });
    },

    async getUnlockedBadgeIds() {
      return getGuestBadgeIds(guestId);
    },

    async unlockBadge(badgeId: string) {
      addGuestBadge(guestId, badgeId);
    },

    async loadCollectibles(levelId: string) {
      const store = readGuestStore();
      const snapshot = getOrCreateGuestSnapshot(store, guestId);
      return snapshot.collectiblesByLevel[levelId] ?? [];
    },

    async saveScore(payload: ScorePersistencePayload) {
      const store = readGuestStore();
      const snapshot = getOrCreateGuestSnapshot(store, guestId);

      snapshot.collectiblesByLevel[payload.levelId] =
        payload.collectedCollectibles.map((item) => ({
          collectibleId: item.collectibleId,
          collectibleType: item.collectibleType,
        }));

      snapshot.scores.push({
        levelId: payload.levelId,
        savedAt: new Date().toISOString(),
        totalStars: payload.totalStars,
        totalQuarters: payload.totalQuarters,
      });

      if (snapshot.scores.length > MAX_STORED_SCORES) {
        snapshot.scores = snapshot.scores.slice(-MAX_STORED_SCORES);
      }

      writeGuestStore(store);
    },

    async sendQuizOutcome(payload: QuizOutcomePayload) {
      const store = readGuestStore();
      const snapshot = getOrCreateGuestSnapshot(store, guestId);

      snapshot.events.push({
        kind: "quiz",
        at: new Date().toISOString(),
        payload: payload as unknown as Record<string, unknown>,
      });

      if (snapshot.events.length > MAX_STORED_EVENTS) {
        snapshot.events = snapshot.events.slice(-MAX_STORED_EVENTS);
      }

      writeGuestStore(store);
    },

    async sendBadgeEarnedEvent(payload: {
      badgeId: string;
      badgeName: string;
    }) {
      const store = readGuestStore();
      const snapshot = getOrCreateGuestSnapshot(store, guestId);

      snapshot.events.push({
        kind: "badge",
        at: new Date().toISOString(),
        payload,
      });

      if (snapshot.events.length > MAX_STORED_EVENTS) {
        snapshot.events = snapshot.events.slice(-MAX_STORED_EVENTS);
      }

      writeGuestStore(store);
    },

    async loadProgress() {
      const store = readGuestStore();
      const snapshot = getOrCreateGuestSnapshot(store, guestId);
      return snapshot.progression ?? null;
    },

    async saveProgress(state: UserProgressState) {
      const store = readGuestStore();
      const snapshot = getOrCreateGuestSnapshot(store, guestId);
      snapshot.progression = state;
      writeGuestStore(store);
    },
  };
}

function buildAuthPersistence(userId: string): GamePersistence {
  return {
    mode: "auth",

    async getBadgeCatalog() {
      return fetchBadges({ source: "auth" });
    },

    async getUnlockedBadgeIds() {
      const userBadges = await fetchUserBadges();
      return userBadges.map((badge) => badge.badgeId);
    },

    async unlockBadge(badgeId: string) {
      await unlockBadgeOnServer(badgeId);
    },

    async loadCollectibles(levelId: string) {
      const records = await getUserCollectibles(userId, { levelId });
      return records.map((record) => ({
        collectibleId: record.collectibleId,
        collectibleType: record.collectibleType,
      }));
    },

    async saveScore(payload: ScorePersistencePayload) {
      await submitScore({
        userId,
        ...payload,
      });
    },

    async sendQuizOutcome(payload: QuizOutcomePayload) {
      if (payload.type === "quiz.completed" || payload.type === "quiz.failed") {
        const metadata =
          payload.metadata as RegularQuizEventPayload["metadata"];
        const event: RegularQuizEventPayload = {
          userId,
          type: payload.type,
          timestamp: payload.timestamp,
          metadata,
        };
        await sendQuizOutcomeEvent(event);
        return;
      }

      const metadata =
        payload.metadata as IntermediateQuizEventPayload["metadata"];
      const event: IntermediateQuizEventPayload = {
        userId,
        type: payload.type,
        timestamp: payload.timestamp,
        metadata,
      };
      await sendQuizOutcomeEvent(event);
    },

    async sendBadgeEarnedEvent(payload: {
      badgeId: string;
      badgeName: string;
    }) {
      const eventPayload: GameEventPayload = {
        userId,
        type: GameEventType.BADGE_EARNED,
        timestamp: new Date().toISOString(),
        metadata: {
          badgeId: payload.badgeId,
          badgeName: payload.badgeName,
        },
      };

      await sendGameEvent(eventPayload);
    },

    async loadProgress() {
      return getProgression(userId);
    },

    async saveProgress(state: UserProgressState) {
      await saveProgression(userId, state);
    },
  };
}

export function createGamePersistence(params: {
  mode: PersistenceMode;
  actorId: string | null;
}): GamePersistence {
  const actorId = params.actorId?.trim() || "";

  if (params.mode === "auth" && actorId) {
    return buildAuthPersistence(actorId);
  }

  // In guest mode or when auth id is unavailable, always fallback to local guest persistence.
  const guestId = actorId || getOrCreateGuestSessionId();
  return buildGuestPersistence(guestId || "guest-anonymous");
}
