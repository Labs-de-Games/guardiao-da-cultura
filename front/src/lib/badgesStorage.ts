const STORAGE_KEY = "gameplate:badges:v1";
const SCHEMA_VERSION = 1;

interface GuestBadgeData {
  version: number;
  guestId: string;
  badgeIds: string[];
}

function readStorage(): GuestBadgeData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as GuestBadgeData;
    if (data.version !== SCHEMA_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

function writeStorage(data: GuestBadgeData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

export function getGuestBadgeIds(guestId: string): string[] {
  if (!guestId) return [];
  const data = readStorage();
  if (!data || data.guestId !== guestId) return [];
  return data.badgeIds;
}

export function addGuestBadge(guestId: string, badgeId: string): void {
  if (!guestId || !badgeId) return;
  const existing = readStorage();
  if (existing && existing.guestId === guestId) {
    if (existing.badgeIds.includes(badgeId)) return;
    writeStorage({
      version: SCHEMA_VERSION,
      guestId,
      badgeIds: [...existing.badgeIds, badgeId],
    });
  } else {
    writeStorage({
      version: SCHEMA_VERSION,
      guestId,
      badgeIds: [badgeId],
    });
  }
}

export function getAllGuestBadgeIds(): string[] {
  const data = readStorage();
  if (!data) return [];
  return data.badgeIds;
}

export function getStoredGuestId(): string | null {
  const data = readStorage();
  return data?.guestId ?? null;
}

export function setGuestBadgeIds(guestId: string, badgeIds: string[]): void {
  if (!guestId || badgeIds.length === 0) return;
  writeStorage({
    version: SCHEMA_VERSION,
    guestId,
    badgeIds,
  });
}

export function clearGuestBadges(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silently fail
  }
}
