import { Module } from "@nestjs/common";
import { EMAIL_SERVICE } from "./email.constants";
import { MockEmailService } from "./services/mock-email.service";

@Module({
  providers: [
    {
      provide: EMAIL_SERVICE,
      useClass: MockEmailService,
    },
  ],
  exports: [EMAIL_SERVICE],
})
export class EmailModule {}
