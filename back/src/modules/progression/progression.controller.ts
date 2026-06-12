import { Controller, Get, Param } from "@nestjs/common";
import { GuestPlay } from "../auth/decorators/guest-play.decorator";
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
}
