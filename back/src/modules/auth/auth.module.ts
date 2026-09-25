import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmailModule } from "../../core/email/email.module";
import { UsersModule } from "../users/users.module";
import { OAuthUpsertController } from "./controllers/oauth-upsert.controller";
import { PasswordAuthController } from "./controllers/password-auth.controller";
import { MagicLinkToken } from "./entities/magic-link-token.entity";
import { RefreshToken } from "./entities/refresh-token.entity";
import { OAuthUpsertTokenGuard } from "./guards/oauth-upsert-token.guard";
import { AuthService } from "./services/auth.service";
import { MagicLinkService } from "./services/magic-link.service";
import { PasswordService } from "./services/password.service";
import { PasswordAuthService } from "./services/password-auth.service";
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
  controllers: [OAuthUpsertController, PasswordAuthController],
  providers: [
    AuthService,
    TokenService,
    MagicLinkService,
    JwtAccessStrategy,
    OAuthUpsertTokenGuard,
    PasswordService,
    PasswordAuthService,
  ],
  exports: [AuthService, TokenService, MagicLinkService, PasswordService],
})
export class AuthModule {}
