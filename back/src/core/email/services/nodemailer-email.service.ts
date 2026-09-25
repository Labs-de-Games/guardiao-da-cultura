import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { ConfigService } from "../../config/config.service";
import type { IEmailService } from "../interfaces/email-service.interface";
import { emailTemplates } from "../templates/email-templates";

@Injectable()
export class NodemailerEmailService implements IEmailService, OnModuleInit {
  private readonly logger = new Logger(NodemailerEmailService.name);
  private transporter!: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    this.transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: this.config.gmailUser,
        pass: this.config.gmailAppPassword,
      },
    });

    try {
      await this.transporter.verify();
      this.logger.log("SMTP connection verified successfully");
    } catch (error) {
      this.logger.error("SMTP connection verification failed", error);
      throw error;
    }
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: this.config.emailFrom,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
      throw error;
    }
  }

  async sendMagicLinkEmail(email: string, magicLinkUrl: string): Promise<void> {
    const template = emailTemplates.passwordReset(
      email,
      magicLinkUrl,
      this.config.frontendUrl,
    );
    await this.send(email, template.subject, template.html);
  }

  async sendVerificationEmail(
    email: string,
    verificationUrl: string,
  ): Promise<void> {
    const template = emailTemplates.verification(
      email,
      verificationUrl,
      this.config.frontendUrl,
    );
    await this.send(email, template.subject, template.html);
  }

  async sendWelcomeEmail(email: string, nickname: string): Promise<void> {
    const template = emailTemplates.welcome(
      email,
      nickname,
      this.config.frontendUrl,
    );
    await this.send(email, template.subject, template.html);
  }

  async sendLoginNotificationEmail(email: string): Promise<void> {
    const template = emailTemplates.loginNotification(
      email,
      this.config.frontendUrl,
    );
    await this.send(email, template.subject, template.html);
  }
}
