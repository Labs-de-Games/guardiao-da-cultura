import { Controller, Get, Query, Req } from "@nestjs/common";
import { randomUUID } from "crypto";
import type { Request } from "express";
import { ConfigService } from "../../core/config/config.service";
import { CurrentUser } from "../../modules/auth/decorators/current-user.decorator";
import { Public } from "../../modules/auth/decorators/public.decorator";
import type { User } from "../../modules/users/user.entity";
import { readAnonymousPlayerCookie } from "../../shared/edital/anonymous-player-cookie";
import { PostHogBootstrapQueryDto } from "./dto/posthog-bootstrap-query.dto";
import { PostHogService } from "./posthog.service";

@Controller("posthog")
export class PostHogController {
  constructor(
    private readonly posthog: PostHogService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get("bootstrap")
  async bootstrap(
    @CurrentUser() user: User | undefined,
    @Query() query: PostHogBootstrapQueryDto,
    @Req() request: Request,
  ): Promise<{
    distinctId: string;
    featureFlags: Record<string, string | boolean | number>;
  }> {
    const client = this.posthog.getClient();
    // Precedence: authenticated user > the durable, server-set cookie >
    // the validated query parameter (needed for the cross-origin local-dev
    // gap the cookie can't cross, and for sendBeacon calls that can't set
    // headers but do send cookies) > a fresh random id as the last resort.
    const cookieDistinctId = readAnonymousPlayerCookie(request);
    const distinctId =
      user?.id ?? cookieDistinctId ?? query.distinct_id ?? randomUUID();

    const flags = client
      ? ((await client.getAllFlags(distinctId)) as Record<
          string,
          string | boolean | number
        >)
      : {};

    // In development, inject guest_play_enabled so the frontend can test
    // without creating the flag in PostHog.
    if (this.config.nodeEnv === "development") {
      flags.guest_play_enabled = true;
    }

    return {
      distinctId,
      featureFlags: flags,
    };
  }
}
