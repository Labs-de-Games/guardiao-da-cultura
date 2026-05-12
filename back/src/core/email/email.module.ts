import { Module } from "@nestjs/common";
import { ConfigService } from "../config/config.service";
import { EMAIL_SERVICE } from "./email.constants";
import { MockEmailService } from "./services/mock-email.service";
import { NodemailerEmailService } from "./services/nodemailer-email.service";

@Module({
  providers: [
    {
      provide: EMAIL_SERVICE,
      useFactory: (config: ConfigService) => {
        if (config.emailProvider === "nodemailer") {
          return new NodemailerEmailService(config);
        }
        return new MockEmailService();
      },
      inject: [ConfigService],
    },
  ],
  exports: [EMAIL_SERVICE],
})
export class EmailModule {}
