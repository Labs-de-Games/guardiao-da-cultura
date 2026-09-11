import type {
  DateRange,
  EditalCampaignsResponse,
  EditalFunnelResponse,
  EditalReportResponse,
  EditalSummaryResponse,
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

function dateRangeToSearchParams(dateRange: DateRange): URLSearchParams {
  const params = new URLSearchParams({ dateRange: dateRange.type });
  if (dateRange.type === "custom") {
    params.set("from", dateRange.start);
    params.set("to", dateRange.end);
  }
  return params;
}

async function getJson<T>(path: string, dateRange: DateRange): Promise<T> {
  const params = dateRangeToSearchParams(dateRange);
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
): Promise<EditalSummaryResponse> {
  return getJson<EditalSummaryResponse>("/api/edital/summary", dateRange);
}

export function getFunnel(dateRange: DateRange): Promise<EditalFunnelResponse> {
  return getJson<EditalFunnelResponse>("/api/edital/funnel", dateRange);
}

export function getReport(dateRange: DateRange): Promise<EditalReportResponse> {
  return getJson<EditalReportResponse>("/api/edital/report", dateRange);
}

export function getCampaigns(
  dateRange: DateRange,
): Promise<EditalCampaignsResponse> {
  return getJson<EditalCampaignsResponse>("/api/edital/campaigns", dateRange);
}

/**
 * Downloads the CSV as a blob and triggers a browser save, per issue
 * #745: "o navegador baixa como blob (fetch -> res.blob() ->
 * URL.createObjectURL -> revokeObjectURL)". Same code path as the JSON
 * routes computed the on-screen numbers from — no separate CSV-only
 * calculation to drift from what the screen showed.
 */
export async function downloadReportCsv(dateRange: DateRange): Promise<void> {
  const params = dateRangeToSearchParams(dateRange);
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

export { EditalApiError };
