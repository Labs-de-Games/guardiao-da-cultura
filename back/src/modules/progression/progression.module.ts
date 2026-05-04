import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProgressionController } from "./progression.controller";
import { ProgressionService } from "./progression.service";
import { UserProgress } from "./user-progress.entity";

@Module({
  imports: [TypeOrmModule.forFeature([UserProgress])],
  controllers: [ProgressionController],
  providers: [ProgressionService],
})
export class ProgressionModule {}
