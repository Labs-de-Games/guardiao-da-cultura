import { z } from "zod";
import { isMaintenanceModeEnabled } from "./maintenance";

const clientSchema = z.object({
  apiUrl: z.string().optional(),
  authStatusCookieName: z.string().min(1),
  env: z.enum(["development", "staging", "production"]).default("production"),
  posthogKey: z.string().optional(),
  posthogHost: z.string().url().default("https://us.i.posthog.com"),
  maintenanceMode: z.boolean().default(false),
});

const clientEnv = clientSchema.parse({
  apiUrl: process.env.NEXT_PUBLIC_API_URL,
  authStatusCookieName:
    process.env.NEXT_PUBLIC_AUTH_STATUS_COOKIE_NAME ?? "auth_status",
  env: process.env.NEXT_PUBLIC_ENV,
  posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  maintenanceMode: isMaintenanceModeEnabled(),
});

export const env = {
  client: clientEnv,
};
