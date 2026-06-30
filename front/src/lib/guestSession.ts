const GUEST_SESSION_ID_KEY = "gp_fallback_guest_id";

function sanitize(id: string | null | undefined): string {
  return typeof id === "string" ? id.trim() : "";
}

function generateGuestSessionId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `guest-${Date.now()}`;
}

export function getGuestSessionId(): string | null {
  if (typeof window === "undefined") return null;

  const stored = sanitize(window.localStorage.getItem(GUEST_SESSION_ID_KEY));
  return stored || null;
}

export function setGuestSessionId(guestSessionId: string): string {
  const normalized = sanitize(guestSessionId);
  if (!normalized) return "";

  if (typeof window !== "undefined") {
    window.localStorage.setItem(GUEST_SESSION_ID_KEY, normalized);
  }

  return normalized;
}

export function getOrCreateGuestSessionId(preferredId?: string | null): string {
  const existing = getGuestSessionId();
  if (existing) return existing;

  const preferred = sanitize(preferredId);
  if (preferred) {
    return setGuestSessionId(preferred);
  }

  if (typeof window === "undefined") {
    return "guest-anonymous";
  }

  return setGuestSessionId(generateGuestSessionId());
}

export function clearGuestSessionId(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(GUEST_SESSION_ID_KEY);
}

export { GUEST_SESSION_ID_KEY };
