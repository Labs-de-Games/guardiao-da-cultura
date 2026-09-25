/**
 * Full-page navigation (not a Next.js soft navigation). Use when the
 * server-side view of the session just changed and the client router cache
 * or SessionProvider may still hold the stale one — a real request makes
 * middleware re-read the fresh cookie. Its own module so tests can mock it
 * (jsdom's window.location.assign is not redefinable).
 */
export function hardNavigate(path: string): void {
  window.location.assign(path);
}
