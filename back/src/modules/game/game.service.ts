import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PinoLogger } from "nestjs-pino";
import { z } from "zod";
import type { GameEventPayload } from "../../shared/events/game-events";

// Zod schema for quiz event validation
const quizEventSchema = z.object({
  userId: z.string().uuid().optional(),
  type: z.enum(["quiz.completed", "quiz.failed"]),
  timestamp: z.coerce.date(),
  metadata: z.object({
    missionId: z.string(),
    score: z.number().int().min(0),
    totalQuestions: z.number().int().min(1),
    accuracyPercent: z.number().min(0).max(100),
    quartersEarned: z.number().int().min(0).max(4),
    passed: z.boolean(),
    timeSpentMs: z.number().optional(),
    attempts: z.number().optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
  }),
});

// Zod schema for intermediate quiz event validation
const intermediateQuizEventSchema = z.object({
  userId: z.string().uuid().optional(),
  type: z.enum(["intermediate-quiz.completed", "intermediate-quiz.failed"]),
  timestamp: z.coerce.date(),
  metadata: z.object({
    infoKey: z.string(),
    passed: z.boolean(),
    missionId: z.string(),
  }),
});

@Injectable()
export class GameService {
  constructor(
    private readonly logger: PinoLogger,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async processEvent(
    payload: GameEventPayload,
    userId?: string,
  ): Promise<void> {
    const finalUserId = userId ?? payload.userId;
    this.logger.info(
      { eventType: payload.type, userId: finalUserId },
      "Processing game event",
    );
    // Validate quiz events with Zod
    if (payload.type === "quiz.completed" || payload.type === "quiz.failed") {
      try {
        quizEventSchema.parse({ ...payload, userId: finalUserId });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const messages = error.issues.map(
            (issue) => `${issue.path.join(".")}: ${issue.message}`,
          );
          this.logger.error(
            { eventType: payload.type, issues: messages },
            "Invalid quiz event payload",
          );
          throw new Error(`Invalid quiz event payload: ${messages.join(", ")}`);
        }
        throw error;
      }
    }

    // Validate intermediate quiz events with Zod
    if (
      payload.type === "intermediate-quiz.completed" ||
      payload.type === "intermediate-quiz.failed"
    ) {
      try {
        intermediateQuizEventSchema.parse({
          ...payload,
          userId: finalUserId,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const messages = error.issues.map(
            (issue) => `${issue.path.join(".")}: ${issue.message}`,
          );
          this.logger.error(
            { eventType: payload.type, issues: messages },
            "Invalid intermediate quiz event payload",
          );
          throw new Error(
            `Invalid intermediate quiz event payload: ${messages.join(", ")}`,
          );
        }
        throw error;
      }
    }

    const event: GameEventPayload = {
      ...payload,
      userId: finalUserId,
      timestamp: payload.timestamp ?? new Date(),
    };

    this.eventEmitter.emit(event.type, event);

    this.eventEmitter.emit("game.event", event);
  }
}
