export enum GameEventType {
  GAME_STARTED = "game.started",
  GAME_PAUSED = "game.paused",
  GAME_RESUMED = "game.resumed",
  SESSION_END = "session.end",

  LEVEL_STARTED = "level.started",
  LEVEL_COMPLETED = "level.completed",
  LEVEL_FAILED = "level.failed",
  LEVEL_RESTARTED = "level.restarted",

  STAR_COLLECTED = "star.collected",
  CLUE_USED = "clue.used",
  CLUE_UNLOCKED = "clue.unlocked",
  PROGRESSION_UPDATED = "progression.updated",

  BADGE_EARNED = "badge.earned",
  BADGE_VIEWED = "badge.viewed",

  EVENT_LOGGED = "event.logged",
}

export interface GameEventPayload {
  userId?: string;
  type: GameEventType;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface LevelEventMetadata {
  levelId: string;
  levelNumber?: number;
  score?: number;
  stars?: number;
  timeSpentMs?: number;
  attempts?: number;
}
