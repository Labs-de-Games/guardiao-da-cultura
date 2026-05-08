import { Injectable } from "@nestjs/common";
import type { IEmailService } from "../interfaces/email-service.interface";

@Injectable()
export class MockEmailService implements IEmailService {
  async sendMagicLinkEmail(email: string, magicLinkUrl: string): Promise<void> {
    console.log(`[MockEmail] Magic link to ${email}: ${magicLinkUrl}`);
  }

  async sendVerificationEmail(
    email: string,
    verificationUrl: string,
  ): Promise<void> {
    console.log(`[MockEmail] Verification to ${email}: ${verificationUrl}`);
  }

  async sendWelcomeEmail(email: string, nickname: string): Promise<void> {
    console.log(`[MockEmail] Welcome to ${email} (${nickname})`);
  }

  async sendLoginNotificationEmail(email: string): Promise<void> {
    console.log(`[MockEmail] Login notification to ${email}`);
  }
}
