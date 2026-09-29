import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { PostHog } from "posthog-node";
import { ConfigService } from "../../core/config/config.service";

@Injectable()
export class PostHogService implements OnModuleDestroy {
  private client: PostHog | null = null;
  private readonly logger = new Logger(PostHogService.name);
  private guestPlayCache: {
    value: boolean | undefined;
    expiresAt: number;
  } | null = null;
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

  /**
   * The `guest_play_enabled` kill switch as PostHog reports it for the
   * server id, or `undefined` when PostHog cannot say (no client, request
   * failed, flag not defined or not a boolean). Callers decide what unknown
   * means: the pre-consent bootstrap leaves it absent so PlayerGuard's
   * timeout fails open (issue #880), `isGuestPlayEnabled()` fails closed.
   */
  async getGuestPlayFlag(): Promise<boolean | undefined> {
    // In development, always enable guest play for testing
    if (this.config.nodeEnv === "development") {
      return true;
    }

    if (this.guestPlayCache && Date.now() < this.guestPlayCache.expiresAt) {
      return this.guestPlayCache.value;
    }

    let value: boolean | undefined;
    if (this.client) {
      try {
        const flag = (await this.client.getAllFlags(this.SERVER_DISTINCT_ID))
          .guest_play_enabled;
        value = typeof flag === "boolean" ? flag : undefined;
      } catch (error) {
        this.logger.error("Failed to evaluate guest_play_enabled flag:", error);
      }
    }

    this.guestPlayCache = { value, expiresAt: Date.now() + this.CACHE_TTL_MS };
    return value;
  }

  /** Fail-closed view of the kill switch for JwtAuthGuard: unknown means no. */
  async isGuestPlayEnabled(): Promise<boolean> {
    return (await this.getGuestPlayFlag()) === true;
  }

  /**
   * Send a product-analytics event.
   *
   * `consent` is the player's analytics choice for the request this event
   * belongs to (issue #864). It is required rather than optional and has no
   * default: a caller that forgets it would otherwise silently send events for
   * players who refused. Operational calls with no player attached pass
   * `true` explicitly.
   */
  capture(options: {
    event: string;
    distinctId?: string;
    properties?: Record<string, unknown>;
    consent: boolean;
  }) {
    if (!options.consent) {
      this.logger.debug(
        "[PostHog] capture suppressed — no analytics consent:",
        options.event,
      );
      return;
    }
    if (!this.client) {
      this.logger.debug("[PostHogStub] capture:", options);
      return;
    }
    // `consent` is our own gating input, not an event property.
    const { consent: _consent, ...payload } = options;
    this.client.capture({
      ...payload,
      properties: {
        ...options.properties,
        environment: this.config.appEnv,
      },
    });
  }

  captureException(
    error: Error,
    distinctId: string | undefined,
    properties: Record<string, unknown> | undefined,
    consent: boolean,
  ) {
    if (!consent) {
      this.logger.debug(
        "[PostHog] captureException suppressed — no analytics consent",
      );
      return;
    }
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
