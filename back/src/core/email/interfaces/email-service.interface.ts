export interface IEmailService {
  sendMagicLinkEmail(email: string, magicLinkUrl: string): Promise<void>;
  sendVerificationEmail(email: string, verificationUrl: string): Promise<void>;
  sendWelcomeEmail(email: string, nickname: string): Promise<void>;
  sendLoginNotificationEmail(email: string): Promise<void>;
}
