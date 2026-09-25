import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildTrackingUrl, isValidOriginSlug } from "@/lib/edital/origins";
import {
  CampaignLinkApiError,
  createCampaignLink,
  listCampaignLinks,
} from "@/lib/edital/server/campaignLinks";
import { resolveScope } from "@/lib/edital/server/scope";
import type {
  EditalLinksCreateResponse,
  EditalLinksListResponse,
} from "@/lib/edital/types";

/**
 * No dateRange here — unlike summary/funnel/report/campaigns, this isn't
 * a metrics query, so it doesn't go through resolveEditalRequestContext.
 * Same session/scope discipline though: institutionSlug always comes from
 * `resolveScope(session)`, never from the request body.
 */
export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = resolveScope(session);
  if (!scope) {
    const body: EditalLinksListResponse = { linked: false, data: null };
    return NextResponse.json(body);
  }

  const records = await listCampaignLinks(scope);
  const body: EditalLinksListResponse = {
    linked: true,
    data: records.map((record) => ({
      id: record.id,
      source: record.source,
      url: buildTrackingUrl({ slug: scope.slug, source: record.source }),
      createdAt: record.createdAt,
    })),
  };
  return NextResponse.json(body);
}

export async function POST(request: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = resolveScope(session);
  if (!scope) {
    const body: EditalLinksCreateResponse = { linked: false, data: null };
    return NextResponse.json(body);
  }

  const payload = (await request.json().catch(() => null)) as {
    source?: unknown;
  } | null;
  const source = payload?.source;
  if (typeof source !== "string" || !isValidOriginSlug(source)) {
    return NextResponse.json(
      { error: "Nome de grupo/turma inválido" },
      { status: 400 },
    );
  }

  try {
    const record = await createCampaignLink(scope, source);
    const body: EditalLinksCreateResponse = {
      linked: true,
      data: {
        id: record.id,
        source: record.source,
        url: buildTrackingUrl({ slug: scope.slug, source: record.source }),
        createdAt: record.createdAt,
      },
    };
    return NextResponse.json(body);
  } catch (err) {
    if (err instanceof CampaignLinkApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro ao criar link" }, { status: 502 });
  }
}
