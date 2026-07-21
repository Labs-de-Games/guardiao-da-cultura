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

  const languageCode =
    VOICE_TO_LANGUAGE[body.voice ?? ""] ?? body.voice ?? "pt-BR";

  const params = new URLSearchParams({
    text: body.text,
    tl: languageCode,
    key: serverEnv.server.responsivevoiceApiKey,
  });

  if (body.rate !== undefined) params.set("rate", String(body.rate));
  if (body.pitch !== undefined) params.set("pitch", String(body.pitch));

  const url = `${serverEnv.server.responsivevoiceApiUrl}?${params.toString()}`;

  const upstream = await fetch(url);

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
