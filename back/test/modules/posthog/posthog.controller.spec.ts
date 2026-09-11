import { Test } from "@nestjs/testing";
import type { Request } from "express";
import { ConfigService } from "../../../src/core/config/config.service";
import { PostHogController } from "../../../src/modules/posthog/posthog.controller";
import { PostHogService } from "../../../src/modules/posthog/posthog.service";
import type { User } from "../../../src/modules/users/user.entity";

function makeRequest(cookies: Record<string, string> = {}): Request {
  return { cookies } as unknown as Request;
}

describe("PostHogController — bootstrap identity precedence", () => {
  let controller: PostHogController;
  let mockPosthogService: { getClient: jest.Mock };
  let mockConfigService: { nodeEnv: string };

  beforeEach(async () => {
    mockPosthogService = {
      getClient: jest.fn().mockReturnValue(null),
    };
    mockConfigService = { nodeEnv: "test" };

    const moduleRef = await Test.createTestingModule({
      controllers: [PostHogController],
      providers: [
        { provide: PostHogService, useValue: mockPosthogService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = moduleRef.get(PostHogController);
  });

  it("prefers the authenticated user id over cookie and query", async () => {
    const result = await controller.bootstrap(
      { id: "user-1" } as User,
      { distinct_id: "query-id" },
      makeRequest({ gp_distinct_id: "cookie-id" }),
    );
    expect(result.distinctId).toBe("user-1");
  });

  it("prefers the cookie over the query parameter when no user", async () => {
    const result = await controller.bootstrap(
      undefined,
      { distinct_id: "query-id" },
      makeRequest({ gp_distinct_id: "cookie-id" }),
    );
    expect(result.distinctId).toBe("cookie-id");
  });

  it("falls back to the validated query parameter when no cookie", async () => {
    const result = await controller.bootstrap(
      undefined,
      { distinct_id: "query-id" },
      makeRequest({}),
    );
    expect(result.distinctId).toBe("query-id");
  });

  it("mints a random id when nothing else is present", async () => {
    const result = await controller.bootstrap(undefined, {}, makeRequest({}));
    expect(result.distinctId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("ignores a malformed cookie value and falls through to the query", async () => {
    const result = await controller.bootstrap(
      undefined,
      { distinct_id: "query-id" },
      makeRequest({ gp_distinct_id: "not a valid cookie value!" }),
    );
    expect(result.distinctId).toBe("query-id");
  });

  it("returns empty featureFlags when the PostHog client is unconfigured", async () => {
    const result = await controller.bootstrap(undefined, {}, makeRequest({}));
    expect(result.featureFlags).toEqual({});
  });

  it("injects guest_play_enabled in development", async () => {
    mockConfigService.nodeEnv = "development";
    const result = await controller.bootstrap(undefined, {}, makeRequest({}));
    expect(result.featureFlags.guest_play_enabled).toBe(true);
  });
});
