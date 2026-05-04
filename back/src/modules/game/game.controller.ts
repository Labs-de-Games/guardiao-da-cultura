import { Body, Controller, Post } from "@nestjs/common";
import type { GameEventPayload } from "../../shared/events/game-events";
import { GameService } from "./game.service";

@Controller("events")
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post()
  async receiveEvent(
    @Body() payload: GameEventPayload,
  ): Promise<{ success: boolean }> {
    await this.gameService.processEvent(payload);
    return { success: true };
  }
}
