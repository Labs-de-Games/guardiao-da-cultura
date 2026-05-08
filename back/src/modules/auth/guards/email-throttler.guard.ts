import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { Request } from "express";

@Injectable()
export class EmailThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(request: Request): Promise<string> {
    const email = request.body?.email;
    if (typeof email === "string" && email.length > 0) {
      return email.toLowerCase().trim();
    }
    // Fallback to IP if no email in body
    return request.ip ?? "unknown";
  }
}
