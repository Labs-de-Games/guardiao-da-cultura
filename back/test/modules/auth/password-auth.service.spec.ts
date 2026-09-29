import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import { MagicLinkTokenType } from "../../../src/modules/auth/enums/magic-link-token-type.enum";
import { AuthService } from "../../../src/modules/auth/services/auth.service";
import { MagicLinkService } from "../../../src/modules/auth/services/magic-link.service";
import { PasswordService } from "../../../src/modules/auth/services/password.service";
import { PasswordAuthService } from "../../../src/modules/auth/services/password-auth.service";
import { TokenService } from "../../../src/modules/auth/services/token.service";
import { ConsentService } from "../../../src/modules/consent/consent.service";
import { ConsentType } from "../../../src/modules/consent/enums/consent-type.enum";
import { Role } from "../../../src/modules/users/enums/role.enum";
import type { User } from "../../../src/modules/users/user.entity";
import { UserService } from "../../../src/modules/users/user.service";
import { INSTITUTION_TERMS_VERSION } from "../../../src/shared/consent/institution-terms";

function buildService() {
  const userService = {
    findByEmail: jest.fn(),
    findByEmailWithPasswordHash: jest.fn(),
    create: jest.fn(),
    save: jest.fn((user) => Promise.resolve(user)),
    setPasswordHash: jest.fn(),
    updateLastLoginAt: jest.fn(),
  } as unknown as jest.Mocked<UserService>;

  const passwordService = {
    hash: jest.fn().mockResolvedValue("hashed"),
    verify: jest.fn(),
  } as unknown as jest.Mocked<PasswordService>;

  const tokenService = {
    generateRefreshToken: jest.fn().mockResolvedValue("refresh-token"),
  } as unknown as jest.Mocked<TokenService>;

  const magicLinkService = {
    createMagicLink: jest.fn().mockResolvedValue({ rawToken: "raw-token" }),
    validateTokenConsumption: jest.fn(),
  } as unknown as jest.Mocked<MagicLinkService>;

  const authService = {
    setAuthCookies: jest.fn(),
  } as unknown as jest.Mocked<AuthService>;

  const configService = { frontendUrl: "https://front.example.com" } as never;
  const posthog = { capture: jest.fn() } as never;
  const consentService = {
    record: jest.fn().mockResolvedValue(undefined),
    hasCurrentConsent: jest.fn().mockResolvedValue(true),
  } as unknown as jest.Mocked<ConsentService>;
  const emailService = {
    sendMagicLinkEmail: jest.fn(),
    sendVerificationEmail: jest.fn(),
    sendWelcomeEmail: jest.fn(),
  } as never;
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as PinoLogger;

  const service = new PasswordAuthService(
    logger,
    userService,
    passwordService,
    tokenService,
    magicLinkService,
    authService,
    configService,
    posthog,
    consentService,
    emailService,
  );

  return {
    service,
    userService,
    passwordService,
    tokenService,
    magicLinkService,
    authService,
    emailService,
    posthog,
    consentService,
    logger,
  };
}

const res = {} as never;

describe("PasswordAuthService", () => {
  describe("register", () => {
    it("returns the generic message and does not create a user when the email already exists", async () => {
      const { service, userService } = buildService();
      userService.findByEmail.mockResolvedValue({ id: "existing" } as User);

      const result = await service.register({
        email: "dup@example.com",
        password: "password123456",
        institutionSlug: "escola-teste",
        nickname: "Escola Teste",
        termsAccepted: true,
        termsVersion: INSTITUTION_TERMS_VERSION,
      });

      expect(result).toEqual({ message: "Check your email" });
      expect(userService.create).not.toHaveBeenCalled();
    });

    it("creates an unverified institution account with a hashed password for a new email", async () => {
      const { service, userService, passwordService } = buildService();
      userService.findByEmail.mockResolvedValue(null);
      userService.create.mockResolvedValue({
        id: "new-id",
        email: "nova@example.com",
      } as User);

      await service.register({
        email: "nova@example.com",
        password: "password123456",
        institutionSlug: "escola-nova",
        nickname: "Escola Nova",
        termsAccepted: true,
        termsVersion: INSTITUTION_TERMS_VERSION,
      });

      expect(passwordService.hash).toHaveBeenCalledWith("password123456");
      expect(userService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "nova@example.com",
          role: Role.Institution,
          institutionSlug: "escola-nova",
          passwordHash: "hashed",
          isEmailVerified: false,
        }),
      );
    });

    it("sends a verification email on registration", async () => {
      const { service, userService, magicLinkService, emailService } =
        buildService();
      userService.findByEmail.mockResolvedValue(null);
      userService.create.mockResolvedValue({
        id: "new-id",
        email: "nova@example.com",
      } as User);

      await service.register({
        email: "nova@example.com",
        password: "password123456",
        institutionSlug: "escola-nova",
        nickname: "Escola Nova",
        termsAccepted: true,
        termsVersion: INSTITUTION_TERMS_VERSION,
      });

      expect(magicLinkService.createMagicLink).toHaveBeenCalledWith(
        "new-id",
        MagicLinkTokenType.Verification,
      );
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        "nova@example.com",
        expect.stringContaining("/confirm-verification?token=raw-token"),
      );
    });

    it("records the terms acceptance against the new account (issue #338)", async () => {
      const { service, userService, consentService } = buildService();
      userService.findByEmail.mockResolvedValue(null);
      userService.create.mockResolvedValue({
        id: "new-id",
        email: "nova@example.com",
      } as User);

      await service.register({
        email: "nova@example.com",
        password: "password123456",
        institutionSlug: "escola-nova",
        nickname: "Escola Nova",
        termsAccepted: true,
        termsVersion: INSTITUTION_TERMS_VERSION,
      });

      expect(consentService.record).toHaveBeenCalledWith(
        "new-id",
        ConsentType.InstitutionTerms,
        INSTITUTION_TERMS_VERSION,
      );
    });

    it("refuses a stale terms version without creating the account", async () => {
      const { service, userService, consentService } = buildService();
      userService.findByEmail.mockResolvedValue(null);

      await expect(
        service.register({
          email: "nova@example.com",
          password: "password123456",
          institutionSlug: "escola-nova",
          nickname: "Escola Nova",
          termsAccepted: true,
          termsVersion: "2020-01-01",
        }),
      ).rejects.toThrow(BadRequestException);

      // The whole point of refusing: no account may exist without a consent
      // row, so neither may be written when the version cannot be honoured.
      expect(userService.create).not.toHaveBeenCalled();
      expect(consentService.record).not.toHaveBeenCalled();
    });

    it("refuses a stale terms version even for an already-registered email", async () => {
      // The version check runs before the anti-enumeration short-circuit, so
      // a stale tab gets a real error it can act on (reload) rather than the
      // "Check your email" that would leave it stuck retrying forever.
      const { service, userService } = buildService();
      userService.findByEmail.mockResolvedValue({ id: "existing" } as User);

      await expect(
        service.register({
          email: "dup@example.com",
          password: "password123456",
          institutionSlug: "escola-teste",
          nickname: "Escola Teste",
          termsAccepted: true,
          termsVersion: "2020-01-01",
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("login", () => {
    it("rejects a non-institution account with a generic error", async () => {
      const { service, userService } = buildService();
      userService.findByEmailWithPasswordHash.mockResolvedValue({
        id: "player-id",
        role: Role.Player,
        isActive: true,
        passwordHash: "hashed",
      } as User);

      await expect(
        service.login({ email: "p@example.com", password: "x" }, res),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("rejects an institution account with no password set", async () => {
      const { service, userService } = buildService();
      userService.findByEmailWithPasswordHash.mockResolvedValue({
        id: "inst-id",
        role: Role.Institution,
        isActive: true,
        isEmailVerified: true,
        passwordHash: null,
      } as User);

      await expect(
        service.login({ email: "i@example.com", password: "x" }, res),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("rejects an unverified institution account, even with the right password", async () => {
      const { service, userService, passwordService } = buildService();
      userService.findByEmailWithPasswordHash.mockResolvedValue({
        id: "inst-id",
        role: Role.Institution,
        isActive: true,
        isEmailVerified: false,
        passwordHash: "hashed",
      } as User);
      passwordService.verify.mockResolvedValue(true);

      await expect(
        service.login({ email: "i@example.com", password: "correct" }, res),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("rejects a wrong password without revealing which check failed", async () => {
      const { service, userService, passwordService } = buildService();
      userService.findByEmailWithPasswordHash.mockResolvedValue({
        id: "inst-id",
        role: Role.Institution,
        isActive: true,
        isEmailVerified: true,
        passwordHash: "hashed",
      } as User);
      passwordService.verify.mockResolvedValue(false);

      await expect(
        service.login({ email: "i@example.com", password: "wrong" }, res),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("sets auth cookies and returns /institution on success", async () => {
      const { service, userService, passwordService, authService } =
        buildService();
      userService.findByEmailWithPasswordHash.mockResolvedValue({
        id: "inst-id",
        email: "i@example.com",
        role: Role.Institution,
        isActive: true,
        isEmailVerified: true,
        passwordHash: "hashed",
        institutionSlug: "escola-teste",
      } as User);
      passwordService.verify.mockResolvedValue(true);

      const result = await service.login(
        { email: "i@example.com", password: "correct" },
        res,
      );

      expect(authService.setAuthCookies).toHaveBeenCalledWith(
        res,
        "refresh-token",
      );
      expect(result).toEqual({
        redirectTo: "/institution",
        user: {
          id: "inst-id",
          email: "i@example.com",
          role: Role.Institution,
          institutionSlug: "escola-teste",
          termsAccepted: true,
        },
      });
    });
  });

  describe("confirmVerifyEmail", () => {
    it("rejects an invalid or expired verification token", async () => {
      const { service, magicLinkService } = buildService();
      magicLinkService.validateTokenConsumption.mockResolvedValue(null);

      await expect(service.confirmVerifyEmail("bad-token")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("marks the account verified and returns /institution on a valid token", async () => {
      const { service, userService, magicLinkService, emailService, posthog } =
        buildService();
      const user = {
        id: "inst-id",
        email: "i@example.com",
        role: Role.Institution,
        institutionSlug: "escola-teste",
        nickname: "Escola Teste",
        isEmailVerified: false,
      } as User;
      magicLinkService.validateTokenConsumption.mockResolvedValue({
        user,
      } as never);

      const result = await service.confirmVerifyEmail("good-token");

      expect(magicLinkService.validateTokenConsumption).toHaveBeenCalledWith(
        "good-token",
        MagicLinkTokenType.Verification,
      );
      expect(user.isEmailVerified).toBe(true);
      expect(userService.save).toHaveBeenCalledWith(user);
      expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith(
        "i@example.com",
        "Escola Teste",
      );
      expect(posthog.capture).toHaveBeenCalledWith(
        expect.objectContaining({ event: "user_verified" }),
      );
      expect(result).toEqual({
        redirectTo: "/institution",
        user: {
          id: "inst-id",
          email: "i@example.com",
          role: Role.Institution,
          institutionSlug: "escola-teste",
          termsAccepted: true,
        },
      });
    });
  });

  describe("password reset", () => {
    it("does not reveal whether the account exists on request", async () => {
      const { service, userService, magicLinkService } = buildService();
      userService.findByEmail.mockResolvedValue(null);

      const result = await service.requestPasswordReset("nobody@example.com");

      expect(result).toEqual({ message: "Check your email" });
      expect(magicLinkService.createMagicLink).not.toHaveBeenCalled();
    });

    it("sends a reset link for an existing institution account", async () => {
      const { service, userService, magicLinkService, emailService } =
        buildService();
      userService.findByEmail.mockResolvedValue({
        id: "inst-id",
        role: Role.Institution,
        email: "i@example.com",
      } as User);

      await service.requestPasswordReset("i@example.com");

      expect(magicLinkService.createMagicLink).toHaveBeenCalledWith(
        "inst-id",
        MagicLinkTokenType.PasswordReset,
      );
      expect(emailService.sendMagicLinkEmail).toHaveBeenCalled();
    });

    it("rejects an invalid or expired reset token", async () => {
      const { service, magicLinkService } = buildService();
      magicLinkService.validateTokenConsumption.mockResolvedValue(null);

      await expect(
        service.confirmPasswordReset("bad-token", "new-password-12345"),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("updates the password hash on a valid reset token", async () => {
      const { service, userService, magicLinkService, passwordService } =
        buildService();
      magicLinkService.validateTokenConsumption.mockResolvedValue({
        user: { id: "inst-id" },
      } as never);

      const result = await service.confirmPasswordReset(
        "good-token",
        "new-password-12345",
      );

      expect(passwordService.hash).toHaveBeenCalledWith("new-password-12345");
      expect(userService.setPasswordHash).toHaveBeenCalledWith(
        "inst-id",
        "hashed",
      );
      expect(result).toEqual({ message: "Password updated" });
    });
  });

  describe("password never leaks (issue #747 acceptance criterion)", () => {
    const RAW_PASSWORD = "super-secret-raw-password-12345";

    function assertNoLeak(mocks: {
      logger: PinoLogger;
      posthog: { capture: jest.Mock };
    }) {
      const loggerMock = mocks.logger as unknown as {
        info: jest.Mock;
        warn: jest.Mock;
        error: jest.Mock;
      };
      const allCallArgs = [
        ...loggerMock.info.mock.calls,
        ...loggerMock.warn.mock.calls,
        ...loggerMock.error.mock.calls,
        ...mocks.posthog.capture.mock.calls,
      ].flat();

      for (const arg of allCallArgs) {
        expect(JSON.stringify(arg)).not.toContain(RAW_PASSWORD);
      }
    }

    it("never logs or captures the raw password on a failed login", async () => {
      const { service, userService, passwordService, logger, posthog } =
        buildService();
      userService.findByEmailWithPasswordHash.mockResolvedValue({
        id: "inst-id",
        role: Role.Institution,
        isActive: true,
        isEmailVerified: true,
        passwordHash: "hashed",
      } as User);
      passwordService.verify.mockResolvedValue(false);

      await expect(
        service.login({ email: "i@example.com", password: RAW_PASSWORD }, res),
      ).rejects.toThrow(UnauthorizedException);

      assertNoLeak({ logger, posthog });
    });

    it("never logs or captures the raw password on a successful login", async () => {
      const { service, userService, passwordService, logger, posthog } =
        buildService();
      userService.findByEmailWithPasswordHash.mockResolvedValue({
        id: "inst-id",
        email: "i@example.com",
        role: Role.Institution,
        isActive: true,
        isEmailVerified: true,
        passwordHash: "hashed",
        institutionSlug: "escola-teste",
      } as User);
      passwordService.verify.mockResolvedValue(true);

      await service.login(
        { email: "i@example.com", password: RAW_PASSWORD },
        res,
      );

      assertNoLeak({ logger, posthog });
    });

    it("never logs or captures the raw password on registration", async () => {
      const { service, userService, logger, posthog } = buildService();
      userService.findByEmail.mockResolvedValue(null);
      userService.create.mockResolvedValue({ id: "new-id" } as User);

      await service.register({
        email: "nova@example.com",
        password: RAW_PASSWORD,
        institutionSlug: "escola-nova",
        nickname: "Escola Nova",
        termsAccepted: true,
        termsVersion: INSTITUTION_TERMS_VERSION,
      });

      assertNoLeak({ logger, posthog });
    });

    it("never logs or captures the raw new password on reset confirmation", async () => {
      const { service, magicLinkService, logger, posthog } = buildService();
      magicLinkService.validateTokenConsumption.mockResolvedValue({
        user: { id: "inst-id" },
      } as never);

      await service.confirmPasswordReset("good-token", RAW_PASSWORD);

      assertNoLeak({ logger, posthog });
    });
  });
});
