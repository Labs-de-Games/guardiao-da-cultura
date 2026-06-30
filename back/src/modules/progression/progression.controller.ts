import { Body, Controller, Get, Headers, Param, Put } from "@nestjs/common";
import { GuestPlay } from "../auth/decorators/guest-play.decorator";
import { UpdateProgressionDto } from "./dto/update-progression.dto";
import { ProgressionService } from "./progression.service";
import type { UserProgress } from "./user-progress.entity";

@Controller("progression")
export class ProgressionController {
  constructor(private readonly progressionService: ProgressionService) {}

  @GuestPlay()
  @Get(":userId")
  async getProgress(
    @Param("userId") userId: string,
  ): Promise<UserProgress | null> {
    return this.progressionService.findByUserId(userId);
  }

  @GuestPlay()
  @Put(":userId")
  async updateProgress(
    @Param("userId") userId: string,
    @Body() dto: UpdateProgressionDto,
    @Headers("x-guest-id") guestId: string | undefined,
  ): Promise<UserProgress | { success: true; guest: true }> {
    if (guestId) {
      return { success: true, guest: true };
    }
    return this.progressionService.upsertProgress(userId, dto);
  }
}
