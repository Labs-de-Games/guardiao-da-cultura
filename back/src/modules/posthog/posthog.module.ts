import { Global, Module } from "@nestjs/common";
import { PostHogController } from "./posthog.controller";
import { PostHogService } from "./posthog.service";

@Global()
@Module({
  controllers: [PostHogController],
  providers: [PostHogService],
  exports: [PostHogService],
})
export class PostHogModule {}
