import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "../../../core/config/config.service";
import type { User } from "../../users/user.entity";
import { UserService } from "../../users/user.service";
import type { JwtPayload } from "../interfaces/jwt-payload.interface";
import { TokenService } from "../services/token.service";

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    if (this.tokenService.isTokenBlacklisted(payload.jti)) {
      throw new UnauthorizedException("Token has been revoked");
    }

    const user = await this.userService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    if (!user.isActive) {
      throw new UnauthorizedException("User account is inactive");
    }

    // Attach jti to user for logout/logout-all endpoints
    (user as User & { jti: string }).jti = payload.jti;
    return user;
  }
}
