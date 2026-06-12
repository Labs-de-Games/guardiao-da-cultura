import { Body, Controller, Headers, Post } from "@nestjs/common";
import { randomUUID } from "crypto";
import type { GameEventPayload } from "../../shared/events/game-events";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { GuestPlay } from "../auth/decorators/guest-play.decorator";
import { User } from "../users/user.entity";
import { GameService } from "./game.service";

@Controller("events")
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @GuestPlay()
  @Post()
  async receiveEvent(
    @Body() payload: GameEventPayload,
    @CurrentUser() user: User | undefined,
    @Headers("x-guest-id") guestId: string | undefined,
  ): Promise<{ success: boolean }> {
    const playerId = user?.id ?? guestId ?? randomUUID();
    await this.gameService.processEvent(payload, playerId);
    return { success: true };
  }
}
