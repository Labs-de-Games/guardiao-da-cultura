import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, type Repository } from "typeorm";
import { ConfigService } from "../../../core/config/config.service";
import type { User } from "../../users/user.entity";
import { RefreshToken } from "../entities/refresh-token.entity";
import { JwtTokenType } from "../enums/jwt-token-type.enum";
import type { JwtPayload } from "../interfaces/jwt-payload.interface";

@Injectable()
export class TokenService {
  private readonly blacklist = new Map<string, number>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  private hashToken(rawToken: string): string {
    return createHash("sha256").update(rawToken).digest("hex");
  }

  private generateRawToken(): string {
    return randomBytes(64).toString("base64url");
  }

  generateAccessToken(user: User): { token: string; jti: string } {
    const jti = randomUUID();
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: JwtTokenType.Access,
      jti,
      iss: this.configService.jwtIssuer,
    };

    // Cast is required because `jwtService.sign()` expects `expiresIn` to be of
    // type `StringValue` (a branded template-literal union from the `ms` package),
    // while `ConfigService.jwtExpiration` returns a plain `string`. We use
    // `Parameters<typeof this.jwtService.sign>[1]` to derive the exact options
    // type from the method signature so the cast remains valid even if the
    // library's types change in the future.
    const token = this.jwtService.sign(payload, {
      secret: this.configService.jwtSecret,
      expiresIn: this.configService.jwtExpiration,
    } as unknown as Parameters<typeof this.jwtService.sign>[1]);

    return { token, jti };
  }

  async generateRefreshToken(
    userId: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<string> {
    const rawToken = this.generateRawToken();
    const hashedToken = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const token = this.refreshTokenRepository.create({
      token: hashedToken,
      user: { id: userId },
      expiresAt,
      userAgent: userAgent ?? null,
      ipAddress: ipAddress ?? null,
    });

    await this.refreshTokenRepository.save(token);
    return rawToken;
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    const payload = this.jwtService.verify<JwtPayload>(token, {
      secret: this.configService.jwtSecret,
    });

    if (payload.type !== JwtTokenType.Access) {
      throw new UnauthorizedException("Invalid token type");
    }

    if (this.isTokenBlacklisted(payload.jti)) {
      throw new UnauthorizedException("Token has been revoked");
    }

    return payload;
  }

  async rotateRefreshToken(
    rawToken: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{ accessToken: string; refreshToken: string; jti: string }> {
    const hashedToken = this.hashToken(rawToken);
    const token = await this.refreshTokenRepository.findOne({
      where: { token: hashedToken },
      relations: ["user"],
    });

    if (!token) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (token.revokedAt) {
      await this.revokeAllUserTokens(token.user.id);
      throw new UnauthorizedException("Token reuse detected");
    }

    if (token.expiresAt < new Date()) {
      throw new UnauthorizedException("Refresh token expired");
    }

    if (!token.user.isActive || !token.user.isEmailVerified) {
      throw new UnauthorizedException("User account is inactive or unverified");
    }

    const newRawToken = await this.generateRefreshToken(
      token.user.id,
      userAgent,
      ipAddress,
    );
    const newHashedToken = this.hashToken(newRawToken);
    token.revokedAt = new Date();
    token.replacedByToken = newHashedToken;
    await this.refreshTokenRepository.save(token);

    const { token: accessToken, jti } = this.generateAccessToken(token.user);
    return { accessToken, refreshToken: newRawToken, jti };
  }

  async revokeRefreshToken(rawToken: string): Promise<void> {
    const hashedToken = this.hashToken(rawToken);
    await this.refreshTokenRepository.update(
      { token: hashedToken },
      { revokedAt: new Date() },
    );
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { user: { id: userId }, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  addToBlacklist(jti: string, exp: number): void {
    this.blacklist.set(jti, exp);
  }

  isTokenBlacklisted(jti: string): boolean {
    const exp = this.blacklist.get(jti);
    if (!exp) return false;
    if (exp < Math.floor(Date.now() / 1000)) {
      this.blacklist.delete(jti);
      return false;
    }
    return true;
  }
}
