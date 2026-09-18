import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { serverEnv } from "@/lib/env-server";

interface OnboardingResponse {
  institutionSlug: string;
  institutionName: string;
}

/**
 * Server-to-server proxy to POST /auth/oauth/onboarding — never lets the
 * browser call the backend directly (that endpoint is gated by the shared
 * upsert token, not a user credential). `userId` comes from this route's
 * own trusted session, never from the request body, so a caller can only
 * ever onboard themselves.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "institution") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    institutionName?: unknown;
  } | null;
  const institutionName =
    typeof body?.institutionName === "string"
      ? body.institutionName.trim()
      : "";
  if (!institutionName) {
    return NextResponse.json(
      { error: "institutionName is required" },
      { status: 400 },
    );
  }

  const token = serverEnv.server.authOauthUpsertToken;
  if (!token) {
    console.error(
      "[onboarding] AUTH_OAUTH_UPSERT_TOKEN not configured — refusing",
    );
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const apiUrl =
    serverEnv.server.backendInternalUrl || serverEnv.client.apiUrl || "";
  const response = await fetch(`${apiUrl}/api/v1/auth/oauth/onboarding`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-oauth-upsert-token": token,
    },
    body: JSON.stringify({ userId: session.user.id, institutionName }),
  });

  if (!response.ok) {
    const status =
      response.status === 403 || response.status === 404
        ? response.status
        : 502;
    return NextResponse.json({ error: "Onboarding failed" }, { status });
  }

  const data = (await response.json()) as OnboardingResponse;
  return NextResponse.json(data);
}
