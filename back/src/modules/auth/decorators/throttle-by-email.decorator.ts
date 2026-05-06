import { applyDecorators, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { EmailThrottlerGuard } from "../guards/email-throttler.guard";

export function ThrottleByEmail(limit: number, ttlMs: number) {
  return applyDecorators(
    UseGuards(EmailThrottlerGuard),
    Throttle({ default: { limit, ttl: ttlMs } }),
  );
}
