import type {
  DateRange,
  EditalCampaignsResponse,
  EditalFunnelResponse,
  EditalLinksCreateResponse,
  EditalLinksListResponse,
  EditalReportResponse,
  EditalSummaryResponse,
  PublicDashboardResponse,
} from "@/lib/edital/types";

/**
 * Plain `fetch`, deliberately not `apiClient` — these routes are
 * same-origin and carry the NextAuth session cookie automatically.
 * `apiClient` injects a Bearer token and a force-logout interceptor
 * (client.ts) built for the legacy JWT flow; using it here would fight
 * the NextAuth cookie instead of just working. See issue #745's
 * "Camada de dados" section.
 */

class EditalApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "EditalApiError";
  }
}

function dateRangeToSearchParams(
  dateRange: DateRange,
  turma?: string,
): URLSearchParams {
  const params = new URLSearchParams({ dateRange: dateRange.type });
  if (dateRange.type === "custom") {
    params.set("from", dateRange.start);
    params.set("to", dateRange.end);
  }
  if (turma) params.set("turma", turma);
  return params;
}

async function getJson<T>(
  path: string,
  dateRange: DateRange,
  turma?: string,
): Promise<T> {
  const params = dateRangeToSearchParams(dateRange, turma);
  const response = await fetch(`${path}?${params.toString()}`, {
    credentials: "include",
  });

  if (response.status === 401) {
    throw new EditalApiError("Sessão expirada — faça login novamente.", 401);
  }
  if (!response.ok) {
    throw new EditalApiError(
      `Falha ao carregar dados (status ${response.status}).`,
      response.status,
    );
  }

  return (await response.json()) as T;
}

export function getSummary(
  dateRange: DateRange,
  turma?: string,
): Promise<EditalSummaryResponse> {
  return getJson<EditalSummaryResponse>(
    "/api/edital/summary",
    dateRange,
    turma,
  );
}

export function getFunnel(
  dateRange: DateRange,
  turma?: string,
): Promise<EditalFunnelResponse> {
  return getJson<EditalFunnelResponse>("/api/edital/funnel", dateRange, turma);
}

export function getReport(
  dateRange: DateRange,
  turma?: string,
): Promise<EditalReportResponse> {
  return getJson<EditalReportResponse>("/api/edital/report", dateRange, turma);
}

export function getCampaigns(
  dateRange: DateRange,
): Promise<EditalCampaignsResponse> {
  return getJson<EditalCampaignsResponse>("/api/edital/campaigns", dateRange);
}

/**
 * Issue #808 — no `credentials: "include"` needed (no session, no cookie
 * to send) and no 401 branch (this route never requires auth), unlike
 * `getJson` above. Deliberately its own small fetcher, not a reuse of
 * `getJson`, so a future change to the institution-scoped error handling
 * there can't silently start assuming a session exists here too.
 */
export async function getPublicDashboard(
  dateRange: DateRange,
): Promise<PublicDashboardResponse> {
  const params = dateRangeToSearchParams(dateRange);
  const response = await fetch(`/api/public/dashboard?${params.toString()}`);

  if (!response.ok) {
    throw new EditalApiError(
      `Falha ao carregar dados (status ${response.status}).`,
      response.status,
    );
  }

  return (await response.json()) as PublicDashboardResponse;
}

/**
 * Downloads the CSV as a blob and triggers a browser save, per issue
 * #745: "o navegador baixa como blob (fetch -> res.blob() ->
 * URL.createObjectURL -> revokeObjectURL)". Same code path as the JSON
 * routes computed the on-screen numbers from — no separate CSV-only
 * calculation to drift from what the screen showed.
 */
export async function downloadReportCsv(
  dateRange: DateRange,
  turma?: string,
): Promise<void> {
  const params = dateRangeToSearchParams(dateRange, turma);
  const response = await fetch(`/api/edital/report.csv?${params.toString()}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new EditalApiError(
      `Falha ao exportar CSV (status ${response.status}).`,
      response.status,
    );
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = "relatorio-edital.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function jsonRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: "include", ...init });

  if (response.status === 401) {
    throw new EditalApiError("Sessão expirada — faça login novamente.", 401);
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new EditalApiError(
      body?.error ?? `Falha na requisição (status ${response.status}).`,
      response.status,
    );
  }

  return (await response.json()) as T;
}

export function listCampaignLinks(): Promise<EditalLinksListResponse> {
  return jsonRequest<EditalLinksListResponse>("/api/edital/links");
}

export function createCampaignLink(
  source: string,
): Promise<EditalLinksCreateResponse> {
  return jsonRequest<EditalLinksCreateResponse>("/api/edital/links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source }),
  });
}

export function deleteCampaignLink(id: string): Promise<void> {
  return jsonRequest<{ success: true }>(
    `/api/edital/links/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  ).then(() => undefined);
}

export { EditalApiError };
