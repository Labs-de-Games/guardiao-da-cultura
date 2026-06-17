import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserInterestedController } from "./user-interested.controller";
import { UserInterested } from "./user-interested.entity";
import { UserInterestedService } from "./user-interested.service";

@Module({
  imports: [TypeOrmModule.forFeature([UserInterested])],
  controllers: [UserInterestedController],
  providers: [UserInterestedService],
  exports: [UserInterestedService],
})
export class UserInterestedModule {}
