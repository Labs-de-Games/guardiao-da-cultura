import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "../../core/config/config.service";
import { CurrentUser } from "../../modules/auth/decorators/current-user.decorator";
import type { User } from "../../modules/users/user.entity";

interface PostHogDecideResponse {
  featureFlags: Record<string, string | boolean | number>;
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  errorsWhileComputingFlags?: boolean | unknown;
}

@Controller("posthog")
export class PostHogController {
  constructor(private config: ConfigService) {}

  @Get("bootstrap")
  async bootstrap(@CurrentUser() user: User): Promise<{
    distinctId: string;
    featureFlags: Record<string, string | boolean | number>;
  }> {
    const flags = await this.fetchPostHogFlags(user.id);
    return {
      distinctId: user.id,
      featureFlags: flags,
    };
  }

  private async fetchPostHogFlags(
    distinctId: string,
  ): Promise<Record<string, string | boolean | number>> {
    const apiKey = this.config.posthogApiKey;
    const host = this.config.posthogHost;

    if (!apiKey) {
      return {};
    }

    try {
      const response = await fetch(`${host}/decide?v=3`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: apiKey,
          distinct_id: distinctId,
        }),
      });

      if (!response.ok) {
        return {};
      }

      const data = (await response.json()) as PostHogDecideResponse;
      return data.featureFlags ?? {};
    } catch {
      return {};
    }
  }
}
