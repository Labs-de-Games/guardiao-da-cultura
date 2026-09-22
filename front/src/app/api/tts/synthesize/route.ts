import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { serverEnv } from "@/lib/env-server";

const synthesizeSchema = z.object({
  text: z
    .string()
    .min(1, "text is required")
    .max(5000, "text must be 5000 characters or fewer"),
  voice: z.string().optional(),
  rate: z.number().min(0.1).max(3).optional(),
  pitch: z.number().min(0).max(2).optional(),
});

/** Status returned when no ResponsiveVoice key is configured. */
export const TTS_UNAVAILABLE_STATUS = 503;

/** Upper bound on how long the upstream synthesis call may take. */
const UPSTREAM_TIMEOUT_MS = 10_000;

const VOICE_TO_LANGUAGE: Record<string, string> = {
  "Brazilian Portuguese Female": "pt-BR",
  "Brazilian Portuguese Male": "pt-BR",
  "US English Female": "en-US",
  "French Female": "fr-FR",
};

export async function POST(request: NextRequest): Promise<Response> {
  const parseResult = synthesizeSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.issues[0].message },
      { status: 400 },
    );
  }
  const body = parseResult.data;

  const apiKey = serverEnv.server.responsivevoiceApiKey;
  if (!apiKey) {
    // Expected on any install without a ResponsiveVoice key. This is a
    // documented state, not an error: the client falls back to the browser's
    // built-in speech synthesis, so narration stays audible.
    return NextResponse.json(
      {
        error:
          "TTS unavailable: RESPONSIVEVOICE_API_KEY is not configured. " +
          "The client should fall back to browser speech synthesis.",
        code: "tts_unavailable",
      },
      { status: TTS_UNAVAILABLE_STATUS },
    );
  }

  const languageCode =
    VOICE_TO_LANGUAGE[body.voice ?? ""] ?? body.voice ?? "pt-BR";

  const params = new URLSearchParams({
    text: body.text,
    tl: languageCode,
    key: apiKey,
  });

  if (body.rate !== undefined) params.set("rate", String(body.rate));
  if (body.pitch !== undefined) params.set("pitch", String(body.pitch));

  const url = `${serverEnv.server.responsivevoiceApiUrl}?${params.toString()}`;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    console.error(
      `[TTS] ResponsiveVoice request ${timedOut ? "timed out" : "failed"}`,
    );
    return NextResponse.json(
      { error: "TTS synthesis failed: upstream unreachable" },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    console.error(`[TTS] ResponsiveVoice returned ${upstream.status}`);
    return NextResponse.json(
      { error: `TTS synthesis failed: ${upstream.status}` },
      { status: 502 },
    );
  }

  const arrayBuffer = await upstream.arrayBuffer();

  return new Response(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Disposition": 'inline; filename="tts.mp3"',
      "Cache-Control": "no-store",
    },
  });
}
