/**
 * Clearing PostHog's own browser storage on revocation (issue #864).
 *
 * `posthog-js` cannot be un-initialized, so revoking is a three-part move:
 * stop it capturing, drop the identity it persisted, then remove the keys it
 * wrote. The caller reloads afterwards — that is what actually guarantees the
 * ~60 modules importing the `posthog-js` singleton directly stop capturing on
 * the current page.
 *
 * Key names verified against the `posthog-js` 1.390.2 dist. `persistence` is
 * not configured anywhere in this app, so the default (`localStorage+cookie`)
 * applies and the main key exists in *both* stores.
 */

/**
 * Every storage key `posthog-js` derives from the project token.
 *
 * `__ph_opt_in_out_<token>` is deliberately included even though
 * `opt_out_capturing()` has just written it: the acceptance criteria require
 * clearing PostHog's identifiers, our own record in
 * `gameplate:analytics-consent:v1` is what actually governs from here, and
 * after the reload `init()` never runs again — so there is nothing left for
 * that flag to protect.
 */
export function posthogStorageKeys(token: string): string[] {
  return [
    `ph_${token}_posthog`,
    `ph_${token}_window_id`,
    `ph_${token}_primary_window_exists`,
    `__ph_opt_in_out_${token}`,
  ];
}

/**
 * Full page reload, as its own function so the revocation flow has a seam
 * tests can observe — jsdom makes `window.location` non-redefinable.
 */
export function reloadPage(): void {
  window.location.reload();
}

function deleteCookie(name: string): void {
  // Cleared on the current host and on the registrable domain, because
  // posthog-js sets its cookie with a cross-subdomain domain by default.
  const { hostname } = window.location;
  const parts = hostname.split(".");
  const domains = [
    undefined,
    hostname,
    parts.length > 1 ? `.${parts.slice(-2).join(".")}` : undefined,
  ];

  for (const domain of domains) {
    document.cookie =
      `${name}=; path=/; Max-Age=0` + (domain ? `; domain=${domain}` : "");
  }
}

/**
 * Remove PostHog's localStorage, sessionStorage and cookie entries.
 *
 * Never throws: revocation must complete even in a browser that blocks
 * storage, since the authoritative record is written separately.
 */
export function clearPostHogStorage(token: string | undefined): void {
  if (!token) return;

  for (const key of posthogStorageKeys(token)) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Blocked store — nothing to remove that we could have read anyway.
    }
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // Same.
    }
    try {
      deleteCookie(key);
    } catch {
      // Same.
    }
  }
}
