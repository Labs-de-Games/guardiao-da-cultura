import { Body, Controller, Header, Post, StreamableFile } from "@nestjs/common";
import { GuestPlay } from "../auth/decorators/guest-play.decorator";
import { SynthesizeDto } from "./dto/synthesize.dto";
import { TtsService } from "./tts.service";

@Controller("tts")
export class TtsController {
  constructor(private readonly ttsService: TtsService) {}

  @GuestPlay()
  @Post("synthesize")
  @Header("Content-Type", "audio/mpeg")
  @Header("Content-Disposition", 'inline; filename="tts.mp3"')
  async synthesize(@Body() dto: SynthesizeDto): Promise<StreamableFile> {
    const buffer = await this.ttsService.synthesize(dto);
    return new StreamableFile(buffer);
  }
}
