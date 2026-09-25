import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { OAuthUpsertTokenGuard } from "../../../src/modules/auth/guards/oauth-upsert-token.guard";

function makeContext(headers: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as unknown as ExecutionContext;
}

describe("OAuthUpsertTokenGuard", () => {
  it("throws when AUTH_OAUTH_UPSERT_TOKEN is not configured", () => {
    const guard = new OAuthUpsertTokenGuard({
      authOauthUpsertToken: undefined,
    } as never);

    expect(() =>
      guard.canActivate(makeContext({ "x-oauth-upsert-token": "anything" })),
    ).toThrow(UnauthorizedException);
  });

  it("throws when the header is missing", () => {
    const guard = new OAuthUpsertTokenGuard({
      authOauthUpsertToken: "correct-token",
    } as never);

    expect(() => guard.canActivate(makeContext({}))).toThrow(
      UnauthorizedException,
    );
  });

  it("throws when the token is wrong", () => {
    const guard = new OAuthUpsertTokenGuard({
      authOauthUpsertToken: "correct-token",
    } as never);

    expect(() =>
      guard.canActivate(makeContext({ "x-oauth-upsert-token": "wrong" })),
    ).toThrow(UnauthorizedException);
  });

  it("throws when the token has a different length than expected", () => {
    const guard = new OAuthUpsertTokenGuard({
      authOauthUpsertToken: "correct-token",
    } as never);

    expect(() =>
      guard.canActivate(makeContext({ "x-oauth-upsert-token": "short" })),
    ).toThrow(UnauthorizedException);
  });

  it("allows the request when the token matches exactly", () => {
    const guard = new OAuthUpsertTokenGuard({
      authOauthUpsertToken: "correct-token",
    } as never);

    expect(
      guard.canActivate(
        makeContext({ "x-oauth-upsert-token": "correct-token" }),
      ),
    ).toBe(true);
  });
});
