import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CreateUserInterestedDto } from "./dto/create-user-interested.dto";
import type { UserInterested } from "./user-interested.entity";
import { UserInterestedService } from "./user-interested.service";

@ApiTags("User Interested")
@Controller("user-interested")
export class UserInterestedController {
  constructor(private readonly userInterestedService: UserInterestedService) {}

  @Post()
  @ApiOperation({ summary: "Register user interest in future levels" })
  async registerInterest(
    @Body() dto: CreateUserInterestedDto,
  ): Promise<UserInterested> {
    return this.userInterestedService.registerInterest(
      dto.email ?? null,
      dto.is_interested,
    );
  }
}
