import { randomUUID } from "node:crypto";
import { Global, Module } from "@nestjs/common";
import { LoggerModule as PinoLoggerModule } from "nestjs-pino";
import { ConfigService } from "../config/config.service";

@Global()
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.nodeEnv === "production";
        const level = configService.logLevel;

        return {
          pinoHttp: {
            level,
            autoLogging: true,
            quietReqLogger: true,
            genReqId: (req, res) => {
              const existingId = req.headers["x-request-id"] as
                | string
                | undefined;
              const id = existingId || randomUUID();
              res.setHeader("x-request-id", id);
              return id;
            },
            redact: {
              paths: [
                "req.headers.authorization",
                "req.headers.cookie",
                "req.headers['set-cookie']",
                "req.headers['x-magic-link-token']",
                "req.headers['x-refresh-token']",
                "res.headers['set-cookie']",
              ],
              censor: "[REDACTED]",
            },
            transport: isProduction
              ? undefined
              : {
                  target: "pino-pretty",
                  options: {
                    colorize: true,
                    translateTime: "SYS:standard",
                    singleLine: false,
                  },
                },
          },
        };
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
