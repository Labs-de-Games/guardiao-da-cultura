import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "../../core/config/config.service";
import { SynthesizeDto } from "./dto/synthesize.dto";

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);
  private readonly apiUrl = "https://texttospeech.responsivevoice.org/v1";

  constructor(private config: ConfigService) {
    if (!config.responsiveVoiceApiKey) {
      this.logger.warn(
        "RESPONSIVEVOICE_API_KEY not set. TTS via ResponsiveVoice is disabled.",
      );
    }
  }

  async synthesize(dto: SynthesizeDto): Promise<Buffer> {
    if (!this.config.responsiveVoiceApiKey) {
      throw new Error("TTS service not configured");
    }

    const params = new URLSearchParams({
      text: dto.text,
      tl: dto.voice ?? "pt-BR",
      key: this.config.responsiveVoiceApiKey,
    });

    if (dto.rate !== undefined) params.set("rate", String(dto.rate));
    if (dto.pitch !== undefined) params.set("pitch", String(dto.pitch));

    const url = `${this.apiUrl}/text:synthesize?${params.toString()}`;
    this.logger.debug(`Calling ResponsiveVoice v1: ${url.slice(0, 120)}...`);

    const response = await fetch(url);

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(
        `ResponsiveVoice API error: ${response.status} — ${body}`,
      );
      throw new Error(`TTS synthesis failed: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
