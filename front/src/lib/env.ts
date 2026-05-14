import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_API_URL: z.string().optional(),
  NEXT_PUBLIC_AUTH_STATUS_COOKIE_NAME: z.string().min(1),
});

export const env = schema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_AUTH_STATUS_COOKIE_NAME:
    process.env.NEXT_PUBLIC_AUTH_STATUS_COOKIE_NAME ?? "auth_status",
});
