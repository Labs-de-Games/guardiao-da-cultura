import type { Request } from "express";

/**
 * Kept in sync with front/src/lib/edital/anonymousPlayer.ts —
 * ANONYMOUS_PLAYER_COOKIE_NAME / ANONYMOUS_PLAYER_ID_MAX_LENGTH. The same
 * durable, server-set id travels as this cookie and (where the cookie
 * can't reach — cross-origin local dev, sendBeacon calls) a validated
 * query parameter or header.
 */
export const ANONYMOUS_PLAYER_COOKIE_NAME = "gp_distinct_id";
const ANONYMOUS_PLAYER_ID_PATTERN = /^[A-Za-z0-9_-]{1,200}$/;

export function isValidAnonymousPlayerId(value: unknown): value is string {
  return typeof value === "string" && ANONYMOUS_PLAYER_ID_PATTERN.test(value);
}

/** Reads and format-validates the durable identity cookie off a request. */
export function readAnonymousPlayerCookie(
  request: Request,
): string | undefined {
  const value = request.cookies?.[ANONYMOUS_PLAYER_COOKIE_NAME];
  return isValidAnonymousPlayerId(value) ? value : undefined;
}
