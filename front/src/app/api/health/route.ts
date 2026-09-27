import { NextResponse } from "next/server";

// Container liveness for the front: only proves the Next.js server answers.
// Must not call the backend (an outage would take nginx down with it) and is
// outside the middleware matcher, so maintenance mode never affects it.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok" });
}
