import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { PostHog } from "posthog-node";
import { ConfigService } from "../../core/config/config.service";

@Injectable()
export class PostHogService implements OnModuleDestroy {
  private client: PostHog | null = null;
  private readonly logger = new Logger(PostHogService.name);
  private guestPlayCache: { value: boolean; expiresAt: number } | null = null;
  private readonly CACHE_TTL_MS = 30000;
  private readonly SERVER_DISTINCT_ID = "nestjs-server";

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

  async isGuestPlayEnabled(): Promise<boolean> {
    // In development, always enable guest play for testing
    if (this.config.nodeEnv === "development") {
      return true;
    }

    if (this.guestPlayCache && Date.now() < this.guestPlayCache.expiresAt) {
      return this.guestPlayCache.value;
    }

    if (!this.client) {
      this.guestPlayCache = {
        value: false,
        expiresAt: Date.now() + this.CACHE_TTL_MS,
      };
      return false;
    }

    try {
      const flags = await this.client.getAllFlags(this.SERVER_DISTINCT_ID);
      const value = flags.guest_play_enabled === true;
      this.guestPlayCache = {
        value,
        expiresAt: Date.now() + this.CACHE_TTL_MS,
      };
      return value;
    } catch (error) {
      this.logger.error("Failed to evaluate guest_play_enabled flag:", error);
      this.guestPlayCache = {
        value: false,
        expiresAt: Date.now() + this.CACHE_TTL_MS,
      };
      return false;
    }
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
        environment: this.config.appEnv,
      },
    });
  }

  captureException(
    error: Error,
    distinctId?: string,
    properties?: Record<string, unknown>,
  ) {
    if (!this.client) {
      this.logger.debug("[PostHogStub] captureException:", {
        error,
        distinctId,
        properties,
      });
      return;
    }
    this.client.captureException(error, distinctId, {
      ...properties,
      environment: this.config.appEnv,
    });
  }

  onModuleDestroy() {
    this.client?.shutdown();
  }
}
