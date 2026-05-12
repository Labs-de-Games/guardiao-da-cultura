import { createHash, randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, type Repository } from "typeorm";
import { MagicLinkToken } from "../entities/magic-link-token.entity";
import type { MagicLinkTokenType } from "../enums/magic-link-token-type.enum";

@Injectable()
export class MagicLinkService {
  constructor(
    @InjectRepository(MagicLinkToken)
    private readonly magicLinkTokenRepository: Repository<MagicLinkToken>,
  ) {}

  private hashToken(rawToken: string): string {
    return createHash("sha256").update(rawToken).digest("hex");
  }

  private generateRawToken(): string {
    return randomBytes(64).toString("base64url");
  }

  async createMagicLink(
    userId: string,
    type: MagicLinkTokenType,
    deviceNonce?: string,
    expiresInMinutes = 15,
  ): Promise<{ rawToken: string }> {
    const rawToken = this.generateRawToken();
    const hashedToken = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    const token = this.magicLinkTokenRepository.create({
      token: hashedToken,
      type,
      user: { id: userId },
      deviceNonce: deviceNonce ?? null,
      expiresAt,
    });

    await this.magicLinkTokenRepository.save(token);
    return { rawToken };
  }

  async validateTokenPreview(
    rawToken: string,
    type: MagicLinkTokenType,
  ): Promise<MagicLinkToken | null> {
    const hashedToken = this.hashToken(rawToken);
    const token = await this.magicLinkTokenRepository.findOne({
      where: { token: hashedToken, type },
      relations: ["user"],
    });

    if (!token) return null;
    if (token.usedAt) return null;
    if (token.expiresAt < new Date()) return null;

    return token;
  }

  async validateTokenConsumption(
    rawToken: string,
    type: MagicLinkTokenType,
  ): Promise<MagicLinkToken | null> {
    const token = await this.validateTokenPreview(rawToken, type);
    if (!token) return null;

    token.usedAt = new Date();
    await this.magicLinkTokenRepository.save(token);
    return token;
  }

  async revokeToken(rawToken: string): Promise<void> {
    const hashedToken = this.hashToken(rawToken);
    await this.magicLinkTokenRepository.update(
      { token: hashedToken },
      { usedAt: new Date() },
    );
  }

  async cleanupExpired(): Promise<void> {
    await this.magicLinkTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });
  }
}
