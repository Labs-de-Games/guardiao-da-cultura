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

  QUIZ_COMPLETED = "quiz.completed",
  QUIZ_FAILED = "quiz.failed",

  INTERMEDIATE_QUIZ_COMPLETED = "intermediate-quiz.completed",
  INTERMEDIATE_QUIZ_FAILED = "intermediate-quiz.failed",

  BADGE_EARNED = "badge.earned",
  BADGE_VIEWED = "badge.viewed",

  EVENT_LOGGED = "event.logged",
}

export interface GameEventPayload {
  userId?: string;
  type: GameEventType;
  timestamp: Date;
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

export interface StarCollectedMetadata {
  levelId: string;
  starId: string;
  value?: number;
}

export interface ClueEventMetadata {
  levelId: string;
  clueId: string;
}

export interface BadgeEarnedMetadata {
  badgeId: string;
  badgeName?: string;
}
