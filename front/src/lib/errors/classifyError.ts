/**
 * What went wrong, from the user's point of view — each kind maps to one
 * dashboard error screen, so the UI never has to parse `error.message`.
 */
export type ErrorKind =
  | "network"
  | "unauthorized"
  | "notFound"
  | "badRequest"
  | "server"
  | "unknown";

const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const HTTP_SERVER_ERROR = 500;

function statusOf(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const { status, statusCode } = error as {
    status?: unknown;
    statusCode?: unknown;
  };
  if (typeof status === "number") return status;
  if (typeof statusCode === "number") return statusCode;
  return undefined;
}

export function classifyStatus(status: number): ErrorKind {
  // No separate 403 screen: either way the fix is signing in with an
  // account that has access.
  if (status === HTTP_UNAUTHORIZED || status === HTTP_FORBIDDEN) {
    return "unauthorized";
  }
  if (status === HTTP_NOT_FOUND) return "notFound";
  if (status >= HTTP_SERVER_ERROR) return "server";
  if (status >= HTTP_BAD_REQUEST) return "badRequest";
  return "unknown";
}

/**
 * Classifies by HTTP status when the error carries one (EditalApiError,
 * AuthError), and treats fetch's `TypeError` as a network failure — that
 * is what `fetch` rejects with when the server can't be reached.
 */
export function classifyError(error: unknown): ErrorKind {
  const status = statusOf(error);
  if (status !== undefined) return classifyStatus(status);
  if (error instanceof TypeError) return "network";
  return "unknown";
}
