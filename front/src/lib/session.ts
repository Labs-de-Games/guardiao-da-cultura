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

  console.log(
    "[session debug] Verificando se já existe um guest user salvo...",
  );
  const existing = getStoredUserId();
  if (existing) {
    console.log("[session debug] Usuário já existe! ID:", existing);
    return existing;
  }

  console.log(
    "[session debug] Nenhum usuário encontrado. Gerando dados fictícios...",
  );
  const payload = createGuestPayload();
  console.log("[session debug] Dados gerados:", payload);

  const endpoint = `${env.NEXT_PUBLIC_API_URL}/api/v1/users/register`;
  console.log(`[session debug] Enviando request para ${endpoint}...`);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    console.error(
      `[session debug] Falha na requisição: ${response.status}`,
      errorBody,
    );
    throw new Error(
      `[session] Failed to register guest user: ${response.status} ${errorBody}`,
    );
  }

  const data = (await response.json()) as UserRegisterResponse;
  console.log("[session debug] Sucesso! Resposta do backend:", data);

  if (!data.id) {
    console.error("[session debug] Backend não retornou um ID válido!");
    throw new Error("[session] Guest registration response missing user id");
  }

  console.log("[session debug] Salvando novo ID no localStorage:", data.id);
  setStoredUserId(data.id);
  return data.id;
}
