const FALLBACK_PATH = "/";
const MAX_REDIRECT_LENGTH = 2048;
// Browsers strip tabs/newlines while parsing URLs ("/\t/evil.com" becomes
// "//evil.com"), and treat "\" like "/", so both are rejected up front.
// biome-ignore lint/suspicious/noControlCharactersInRegex: detecting control characters is the point of this sanitizer
const UNSAFE_CHARACTERS = /[\u0000-\u001F\u007F\s\\]/;
const PLACEHOLDER_ORIGIN = "http://localhost";

/**
 * Returns `candidate` only when it resolves to a path on `origin`, otherwise
 * `fallback`. Prevents open redirects through `?next=` style query params.
 */
export function getSafeRedirectPath(
  candidate: string | null | undefined,
  fallback: string = FALLBACK_PATH,
  origin: string = getCurrentOrigin(),
): string {
  if (!candidate || candidate.length > MAX_REDIRECT_LENGTH) return fallback;
  if (!candidate.startsWith("/") || UNSAFE_CHARACTERS.test(candidate)) {
    return fallback;
  }

  let url: URL;
  try {
    url = new URL(candidate, origin);
  } catch {
    return fallback;
  }
  if (url.origin !== new URL(origin).origin) return fallback;

  return `${url.pathname}${url.search}${url.hash}`;
}

function getCurrentOrigin(): string {
  return typeof window === "undefined"
    ? PLACEHOLDER_ORIGIN
    : window.location.origin;
}

export function getCurrentPath(): string {
  if (typeof window === "undefined") return FALLBACK_PATH;
  const { pathname, search, hash } = window.location;
  return `${pathname}${search}${hash}`;
}

/** Full-page navigation. Wrapped so callers can be tested without jsdom's
 * non-configurable `window.location`. */
export function navigateTo(url: string): void {
  window.location.assign(url);
}
