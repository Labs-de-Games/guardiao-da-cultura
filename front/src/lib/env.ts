import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_API_URL: z.string().optional(),
  NEXT_PUBLIC_AUTH_STATUS_COOKIE_NAME: z.string().min(1),
  NEXT_PUBLIC_ENV: z
    .enum(["development", "staging", "production"])
    .default("production"),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z
    .string()
    .url()
    .default("https://us.i.posthog.com"),
});

export const env = schema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_AUTH_STATUS_COOKIE_NAME:
    process.env.NEXT_PUBLIC_AUTH_STATUS_COOKIE_NAME ?? "auth_status",
  NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
});
