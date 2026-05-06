import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { GameEventPayload } from "../../shared/events/game-events";

@Injectable()
export class GameService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async processEvent(payload: GameEventPayload): Promise<void> {
    console.log(`[GameService] Received event: ${payload.type}`, payload);
    const event: GameEventPayload = {
      ...payload,
      timestamp: payload.timestamp ?? new Date(),
    };

    this.eventEmitter.emit(event.type, event);

    this.eventEmitter.emit("game.event", event);
  }
}
