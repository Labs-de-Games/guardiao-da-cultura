import { Body, Controller, Post } from "@nestjs/common";
import type { GameEventPayload } from "../../shared/events/game-events";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../users/user.entity";
import { GameService } from "./game.service";

@Controller("events")
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post()
  async receiveEvent(
    @Body() payload: GameEventPayload,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean }> {
    await this.gameService.processEvent(payload, user.id);
    return { success: true };
  }
}
