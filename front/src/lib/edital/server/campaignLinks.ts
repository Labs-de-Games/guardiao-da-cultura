import "server-only";
import { serverEnv } from "../../env-server";
import type { Scope } from "./scope";

export interface CampaignLinkRecord {
  id: string;
  institutionSlug: string;
  source: string;
  createdAt: string;
}

export class CampaignLinkApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "CampaignLinkApiError";
  }
}

/**
 * Same server-to-server backend URL as auth.ts's own `backendUrl` helper —
 * see that file's doc comment for why this can't just be
 * NEXT_PUBLIC_API_URL. Not shared as one function across files since
 * auth.ts's version isn't exported and this module has no other reason to
 * import from it.
 */
function backendUrl(path: string): string {
  const apiUrl =
    serverEnv.server.backendInternalUrl || serverEnv.client.apiUrl || "";
  return apiUrl ? `${apiUrl}${path}` : path;
}

function upsertTokenHeader(): Record<string, string> {
  const token = serverEnv.server.authOauthUpsertToken;
  if (!token) {
    throw new Error(
      "[campaignLinks] AUTH_OAUTH_UPSERT_TOKEN not configured — refusing to call the backend",
    );
  }
  return { "x-oauth-upsert-token": token };
}

/**
 * `scope.slug` is the only source of truth for `institutionSlug` in every
 * function below — never accept a slug from a route handler's own request
 * body/query, same discipline as the HogQL query builders in queries.ts.
 */
export async function listCampaignLinks(
  scope: Scope,
): Promise<CampaignLinkRecord[]> {
  const url = backendUrl(
    `/api/v1/campaign-links?institutionSlug=${encodeURIComponent(scope.slug)}`,
  );
  const response = await fetch(url, { headers: upsertTokenHeader() });
  if (!response.ok) {
    throw new CampaignLinkApiError(
      "Failed to list campaign links",
      response.status,
    );
  }
  return (await response.json()) as CampaignLinkRecord[];
}

export async function createCampaignLink(
  scope: Scope,
  source: string,
): Promise<CampaignLinkRecord> {
  const response = await fetch(backendUrl("/api/v1/campaign-links"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...upsertTokenHeader(),
    },
    body: JSON.stringify({ institutionSlug: scope.slug, source }),
  });
  if (!response.ok) {
    const message =
      response.status === 409
        ? "Já existe um link com este nome de grupo/turma"
        : "Failed to create campaign link";
    throw new CampaignLinkApiError(message, response.status);
  }
  return (await response.json()) as CampaignLinkRecord;
}

export async function deleteCampaignLink(
  scope: Scope,
  id: string,
): Promise<void> {
  const url = backendUrl(
    `/api/v1/campaign-links/${encodeURIComponent(id)}?institutionSlug=${encodeURIComponent(scope.slug)}`,
  );
  const response = await fetch(url, {
    method: "DELETE",
    headers: upsertTokenHeader(),
  });
  if (!response.ok) {
    const message =
      response.status === 403
        ? "Este link não pertence à sua instituição"
        : response.status === 404
          ? "Link não encontrado"
          : "Failed to delete campaign link";
    throw new CampaignLinkApiError(message, response.status);
  }
}
