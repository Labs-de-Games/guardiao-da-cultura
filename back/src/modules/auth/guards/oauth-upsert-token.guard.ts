import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { timingSafeEqual } from "crypto";
import type { Request } from "express";
import { ConfigService } from "../../../core/config/config.service";

const HEADER_NAME = "x-oauth-upsert-token";

/**
 * Constant-time comparison against AUTH_OAUTH_UPSERT_TOKEN. This endpoint
 * creates institution-role users, so a timing side-channel on the token
 * check is a real privilege-escalation path, not a theoretical one.
 *
 * Refuses every request (never falls back to an insecure default) when
 * the token isn't configured at all.
 */
@Injectable()
export class OAuthUpsertTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.authOauthUpsertToken;
    if (!expected) {
      throw new UnauthorizedException("OAuth upsert is not configured");
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers[HEADER_NAME];

    if (
      typeof provided !== "string" ||
      !constantTimeEquals(provided, expected)
    ) {
      throw new UnauthorizedException("Invalid OAuth upsert token");
    }

    return true;
  }
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  // timingSafeEqual throws on length mismatch instead of returning false —
  // compare a same-length pair first so an attacker can't distinguish
  // "wrong length" from "wrong content" by timing either.
  if (bufferA.length !== bufferB.length) {
    timingSafeEqual(bufferA, bufferA);
    return false;
  }
  return timingSafeEqual(bufferA, bufferB);
}
