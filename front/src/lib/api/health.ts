import axios from "axios";
import { API_BASE_URL } from "./baseUrl";

const HEALTH_CHECK_TIMEOUT_MS = 5000;

/**
 * Pings the backend health endpoint. Uses a bare axios call instead of
 * `apiClient` so it never goes through auth refresh or availability
 * interceptors (which would recurse on failure).
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await axios.get<{ status?: string }>(
      `${API_BASE_URL}/health`,
      { timeout: HEALTH_CHECK_TIMEOUT_MS },
    );
    return response.data?.status === "ok";
  } catch {
    return false;
  }
}
