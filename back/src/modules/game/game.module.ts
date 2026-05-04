import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { GameController } from "./game.controller";
import { GameService } from "./game.service";

@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [GameController],
  providers: [GameService],
})
export class GameModule {}
