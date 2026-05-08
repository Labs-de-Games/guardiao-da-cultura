import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import type { GameEventPayload } from "../../shared/events/game-events";
import { GameEvent } from "./game-event.entity";

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(GameEvent)
    private readonly eventRepository: Repository<GameEvent>,
  ) {}

  @OnEvent("game.event")
  async handleGameEvent(payload: GameEventPayload): Promise<void> {
    const event = this.eventRepository.create({
      userId: payload.userId,
      type: payload.type,
      metadata: payload.metadata ?? {},
      timestamp: payload.timestamp,
    });

    await this.eventRepository.save(event);
  }
}
