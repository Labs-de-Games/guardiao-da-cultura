import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmailModule } from "../../core/email/email.module";
import { UsersModule } from "../users/users.module";
import { AuthController } from "./controllers/auth.controller";
import { MagicLinkToken } from "./entities/magic-link-token.entity";
import { RefreshToken } from "./entities/refresh-token.entity";
import { AuthService } from "./services/auth.service";
import { MagicLinkService } from "./services/magic-link.service";
import { TokenService } from "./services/token.service";
import { JwtAccessStrategy } from "./strategies/jwt-access.strategy";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.register({}),
    TypeOrmModule.forFeature([RefreshToken, MagicLinkToken]),
    UsersModule,
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, MagicLinkService, JwtAccessStrategy],
  exports: [AuthService, TokenService, MagicLinkService],
})
export class AuthModule {}
