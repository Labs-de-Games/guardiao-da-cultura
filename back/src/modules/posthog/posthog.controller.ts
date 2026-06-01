import { Controller, Get } from "@nestjs/common";
import { CurrentUser } from "../../modules/auth/decorators/current-user.decorator";
import type { User } from "../../modules/users/user.entity";
import { PostHogService } from "./posthog.service";

@Controller("posthog")
export class PostHogController {
  constructor(private readonly posthog: PostHogService) {}

  @Get("bootstrap")
  async bootstrap(@CurrentUser() user: User): Promise<{
    distinctId: string;
    featureFlags: Record<string, string | boolean | number>;
  }> {
    const client = this.posthog.getClient();
    const flags = client
      ? ((await client.getAllFlags(user.id)) as Record<
          string,
          string | boolean | number
        >)
      : {};

    return {
      distinctId: user.id,
      featureFlags: flags,
    };
  }
}
