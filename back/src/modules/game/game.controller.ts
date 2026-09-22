import { Body, Controller, Headers, Post, Req } from "@nestjs/common";
import { randomUUID } from "crypto";
import type { Request } from "express";
import { readAnonymousPlayerCookie } from "../../shared/edital/anonymous-player-cookie";
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
    @Req() request: Request,
  ): Promise<{ success: boolean }> {
    // `x-guest-id` is client-settable and `sendBeacon` (used for
    // `session.end`) cannot set headers at all — every beacon-delivered
    // event used to fall straight to a fresh randomUUID(), corrupting
    // attribution and the legacy averageSessionTime metric. The durable
    // cookie (also sent by sendBeacon) is now a required fallback, not a
    // "cheap bonus".
    const playerId =
      user?.id ?? guestId ?? readAnonymousPlayerCookie(request) ?? randomUUID();
    await this.gameService.processEvent(payload, playerId);
    return { success: true };
  }
}
