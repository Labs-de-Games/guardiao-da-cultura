import { NextResponse } from "next/server";
import type { EditalHealthResponse } from "@/lib/edital/types";
import { isEditalPosthogConfigured } from "@/lib/env-server";

/**
 * No upstream PostHog call either way — this only reports whether the
 * server has enough config to make one. Lets the app boot unconfigured
 * (all four edital env-server fields are optional) and gives ops/CI a
 * cheap probe that doesn't burn Query API quota.
 */
export async function GET(): Promise<Response> {
  const body: EditalHealthResponse = {
    configured: isEditalPosthogConfigured(),
  };
  return NextResponse.json(body);
}
