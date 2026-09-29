import type { INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { ThrottlerModule } from "@nestjs/throttler";
import { PasswordAuthController } from "../../../src/modules/auth/controllers/password-auth.controller";
import { EmailThrottlerGuard } from "../../../src/modules/auth/guards/email-throttler.guard";
import { PasswordAuthService } from "../../../src/modules/auth/services/password-auth.service";

/**
 * Real integration test for issue #747's acceptance criterion "Tentativas
 * de login são limitadas por taxa e a limitação é testada" — not just a
 * unit test asserting the decorator is present, an actual HTTP round
 * trip proving the 6th rapid attempt for the same email gets a 429.
 *
 * ThrottlerGuard is NOT registered globally (app.module.ts) — only
 * EmailThrottlerGuard, applied per-route via @ThrottleByEmail. This test
 * exists specifically to prove that wiring actually rate-limits requests,
 * not just that the decorator is present in the source.
 */
describe("PasswordAuthController — login rate limiting (e2e)", () => {
  let app: INestApplication;
  let url: string;

  const mockPasswordAuthService = {
    login: jest.fn().mockRejectedValue(new Error("Invalid email or password")),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 100 }],
        }),
      ],
      controllers: [PasswordAuthController],
      providers: [
        { provide: PasswordAuthService, useValue: mockPasswordAuthService },
        EmailThrottlerGuard,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    await app.listen(0);
    const address = app.getHttpServer().address();
    url = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it("allows the first 5 login attempts for the same email, then 429s the 6th", async () => {
    const email = "throttle-test@example.com";
    const results: number[] = [];

    for (let i = 0; i < 6; i++) {
      const response = await fetch(`${url}/auth/password/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "wrong-password" }),
      });
      results.push(response.status);
    }

    // First 5 reach the controller (and fail with the service's generic
    // 401/500 mock error, not what's under test here) — the 6th is
    // stopped by the guard before the controller even runs.
    expect(results.slice(0, 5)).not.toContain(429);
    expect(results[5]).toBe(429);
  });

  it("does not rate-limit a different email after the first is exhausted", async () => {
    const otherEmail = "different-throttle-test@example.com";

    const response = await fetch(`${url}/auth/password/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: otherEmail, password: "wrong-password" }),
    });

    expect(response.status).not.toBe(429);
  });
});
