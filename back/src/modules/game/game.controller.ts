import { Body, Controller, Headers, Post, Req } from "@nestjs/common";
import { randomUUID } from "crypto";
import type { Request } from "express";
import { readAnalyticsConsent } from "../../shared/consent/analytics-consent";
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
    // Second line of defence for the consent gate (issue #864). The client
    // already refuses to send without consent; this catches what the client
    // cannot be trusted for — a `sendBeacon` already in flight when consent
    // is revoked, a stale tab running the previous bundle, or a direct call.
    // Fails closed, and the cookie reaches us on every request including
    // beacons (which send cookies even though they cannot set headers).
    //
    // Reports success without persisting: the event was received and
    // deliberately discarded, and answering with an error would only make
    // the client log noise and retry something we will never accept.
    if (!readAnalyticsConsent(request)) {
      return { success: true };
    }

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
