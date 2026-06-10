import { Controller, Get, Query } from "@nestjs/common";
import { randomUUID } from "crypto";
import { ConfigService } from "../../core/config/config.service";
import { CurrentUser } from "../../modules/auth/decorators/current-user.decorator";
import { Public } from "../../modules/auth/decorators/public.decorator";
import type { User } from "../../modules/users/user.entity";
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
    @Query("distinct_id") distinctIdQuery?: string,
  ): Promise<{
    distinctId: string;
    featureFlags: Record<string, string | boolean | number>;
  }> {
    const client = this.posthog.getClient();
    const distinctId = user?.id ?? distinctIdQuery ?? randomUUID();

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
