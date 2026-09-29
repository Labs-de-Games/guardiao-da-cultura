import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { serverEnv } from "@/lib/env-server";

/**
 * Server-to-server proxy to POST /auth/oauth/consent — the accept action for an
 * institution account that already exists and already has a slug, so neither
 * registration nor onboarding could ask it (issue #338).
 *
 * Same trust boundary as the onboarding proxy next door: `userId` comes from
 * this route's own session, never from the request body, so a caller can only
 * ever consent for themselves.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "institution") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    termsAccepted?: unknown;
    termsVersion?: unknown;
  } | null;

  if (body?.termsAccepted !== true || typeof body.termsVersion !== "string") {
    return NextResponse.json(
      { error: "termsAccepted and termsVersion are required" },
      { status: 400 },
    );
  }

  const token = serverEnv.server.authOauthUpsertToken;
  if (!token) {
    console.error("[terms] AUTH_OAUTH_UPSERT_TOKEN not configured — refusing");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const apiUrl =
    serverEnv.server.backendInternalUrl || serverEnv.client.apiUrl || "";
  const response = await fetch(`${apiUrl}/api/v1/auth/oauth/consent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-oauth-upsert-token": token,
    },
    body: JSON.stringify({
      userId: session.user.id,
      termsAccepted: true,
      termsVersion: body.termsVersion,
    }),
  });

  if (!response.ok) {
    // 400 is passed through rather than collapsed into 502: it is the stale
    // terms version, and the page reacts to it by reloading. The others carry
    // no instruction the client can act on.
    const status =
      response.status === 400 ||
      response.status === 403 ||
      response.status === 404
        ? response.status
        : 502;
    return NextResponse.json({ error: "Consent failed" }, { status });
  }

  return NextResponse.json({ termsAccepted: true });
}
