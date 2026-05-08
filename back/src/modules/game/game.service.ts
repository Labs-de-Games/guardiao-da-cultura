import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
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

@Injectable()
export class GameService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async processEvent(payload: GameEventPayload): Promise<void> {
    console.log(`[GameService] Received event: ${payload.type}`, payload);
    // Validate quiz events with Zod
    if (payload.type === "quiz.completed" || payload.type === "quiz.failed") {
      try {
        quizEventSchema.parse(payload);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const messages = error.issues.map(
            (issue) => `${issue.path.join(".")}: ${issue.message}`,
          );
          throw new Error(`Invalid quiz event payload: ${messages.join(", ")}`);
        }
        throw error;
      }
    }

    console.log(`[GameService] Received event: ${payload.type}`, payload);
    // Validate quiz events with Zod
    if (payload.type === "quiz.completed" || payload.type === "quiz.failed") {
      try {
        quizEventSchema.parse(payload);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const messages = error.issues.map(
            (issue) => `${issue.path.join(".")}: ${issue.message}`,
          );
          throw new Error(`Invalid quiz event payload: ${messages.join(", ")}`);
        }
        throw error;
      }
    }

    const event: GameEventPayload = {
      ...payload,
      timestamp: payload.timestamp ?? new Date(),
    };

    this.eventEmitter.emit(event.type, event);

    this.eventEmitter.emit("game.event", event);
  }
}
