import { z } from "zod";
import { env } from "./env";

const serverSchema = z.object({
  responsivevoiceApiKey: z.string().min(1),
  responsivevoiceApiUrl: z
    .string()
    .url()
    .default("https://texttospeech.responsivevoice.org/v1/text:synthesize"),
});

let _serverEnv: z.infer<typeof serverSchema> | null = null;

function getServerEnv() {
  if (!_serverEnv) {
    _serverEnv = serverSchema.parse({
      responsivevoiceApiKey: process.env.RESPONSIVEVOICE_API_KEY,
      responsivevoiceApiUrl: process.env.RESPONSIVEVOICE_API_URL,
    });
  }
  return _serverEnv;
}

export function resetServerEnv(): void {
  _serverEnv = null;
}

export const serverEnv = {
  ...env,
  get server() {
    return getServerEnv();
  },
};
