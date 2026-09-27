import { env } from "@/lib/env";

export const API_BASE_URL = env.client.apiUrl
  ? `${env.client.apiUrl}/api/v1`
  : "/api/v1";
