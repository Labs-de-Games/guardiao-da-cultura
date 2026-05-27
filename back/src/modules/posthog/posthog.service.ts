import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { PostHog } from "posthog-node";
import { ConfigService } from "../../core/config/config.service";

@Injectable()
export class PostHogService implements OnModuleDestroy {
  private client: PostHog | null = null;
  private readonly logger = new Logger(PostHogService.name);

  constructor(private config: ConfigService) {
    if (config.posthogApiKey) {
      this.client = new PostHog(config.posthogApiKey, {
        host: config.posthogHost,
      });
    } else {
      this.logger.warn(
        "POSTHOG_API_KEY not set. PostHog is disabled. Events will not be sent.",
      );
    }
  }

  getClient(): PostHog | null {
    return this.client;
  }

  capture(options: {
    event: string;
    distinctId?: string;
    properties?: Record<string, unknown>;
  }) {
    if (!this.client) {
      this.logger.debug("[PostHogStub] capture:", options);
      return;
    }
    this.client.capture({
      ...options,
      properties: {
        ...options.properties,
        environment: this.config.nodeEnv,
      },
    });
  }

  onModuleDestroy() {
    this.client?.shutdown();
  }
}
