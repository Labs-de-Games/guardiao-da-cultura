import { env } from "./env";

const STORAGE_KEY = "@gameplate:guest_user_id";

type GuestRegisterPayload = {
  username: string;
  email: string;
  password: string;
};

type UserRegisterResponse = {
  id?: string;
};

const isBrowser = () => typeof window !== "undefined";

let pendingRegistration: Promise<string> | null = null;

const safeRandomId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
};

const createGuestPayload = (): GuestRegisterPayload => {
  const uuid = safeRandomId();
  const shortId = uuid.split("-")[0] ?? uuid;

  return {
    email: `guest_${uuid}@temp.local`,
    username: `Guest_${shortId}`,
    password: "temp123",
  };
};

const getStoredUserId = (): string | null => {
  if (!isBrowser()) return null;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return stored;

  return null;
};

const setStoredUserId = (userId: string) => {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, userId);
};

export async function getCurrentUserId(): Promise<string> {
  if (!isBrowser()) return "";

  const existing = getStoredUserId();
  if (existing) return existing;

  if (pendingRegistration) return pendingRegistration;

  pendingRegistration = (async () => {
    try {
      const payload = createGuestPayload();

      const endpoint = `${env.NEXT_PUBLIC_API_URL}/api/v1/users/register`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(
          `[session] Failed to register guest user: ${response.status} ${errorBody}`,
        );
      }

      const data = (await response.json()) as UserRegisterResponse;

      if (!data.id) {
        throw new Error(
          "[session] Guest registration response missing user id",
        );
      }

      setStoredUserId(data.id);
      return data.id;
    } finally {
      pendingRegistration = null;
    }
  })();

  return pendingRegistration;
}
