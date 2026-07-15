import { type NextRequest, NextResponse } from "next/server";

const API_URL = "https://texttospeech.responsivevoice.org/v1/text:synthesize";

interface SynthesizeBody {
  text?: string;
  voice?: string;
  rate?: number;
  pitch?: number;
}

interface ValidatedBody {
  text: string;
  voice?: string;
  rate?: number;
  pitch?: number;
}

function validate(body: SynthesizeBody): ValidatedBody | string {
  if (
    !body.text ||
    typeof body.text !== "string" ||
    body.text.trim().length === 0
  ) {
    return "text is required and must be a non-empty string";
  }
  if (body.text.length > 5000) {
    return "text must be 5000 characters or fewer";
  }
  if (
    body.rate !== undefined &&
    (typeof body.rate !== "number" || body.rate < 0.1 || body.rate > 3)
  ) {
    return "rate must be a number between 0.1 and 3";
  }
  if (
    body.pitch !== undefined &&
    (typeof body.pitch !== "number" || body.pitch < 0 || body.pitch > 2)
  ) {
    return "pitch must be a number between 0 and 2";
  }
  return {
    text: body.text,
    voice: body.voice,
    rate: body.rate,
    pitch: body.pitch,
  };
}

export async function POST(request: NextRequest): Promise<Response> {
  const apiKey = process.env["RESPONSIVEVOICE_API_KEY"];
  if (!apiKey) {
    return NextResponse.json(
      { error: "TTS service not configured" },
      { status: 503 },
    );
  }

  let body: SynthesizeBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = validate(body);
  if (typeof result === "string") {
    return NextResponse.json({ error: result }, { status: 400 });
  }

  const params = new URLSearchParams({
    text: result.text,
    tl: result.voice ?? "pt-BR",
    key: apiKey,
  });

  if (result.rate !== undefined) params.set("rate", String(result.rate));
  if (result.pitch !== undefined) params.set("pitch", String(result.pitch));

  const url = `${API_URL}?${params.toString()}`;

  const upstream = await fetch(url);

  if (!upstream.ok) {
    const text = await upstream.text();
    console.error(`ResponsiveVoice API error: ${upstream.status} — ${text}`);
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
