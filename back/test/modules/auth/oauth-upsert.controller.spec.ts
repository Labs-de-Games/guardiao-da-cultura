import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PinoLogger } from "nestjs-pino";
import { ConfigService } from "../../../src/core/config/config.service";
import { EMAIL_SERVICE } from "../../../src/core/email/email.constants";
import { OAuthUpsertController } from "../../../src/modules/auth/controllers/oauth-upsert.controller";
import { Role } from "../../../src/modules/users/enums/role.enum";
import type { User } from "../../../src/modules/users/user.entity";
import { UserService } from "../../../src/modules/users/user.service";

/** Lets the controller's fire-and-forget email promise settle. */
const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe("OAuthUpsertController", () => {
  let controller: OAuthUpsertController;
  let mockUserService: {
    findByEmail: jest.Mock;
    create: jest.Mock;
    findById: jest.Mock;
    findByInstitutionSlug: jest.Mock;
    setInstitutionOnboarding: jest.Mock;
  };
  let mockEmailService: { sendWelcomeEmail: jest.Mock };
  let mockLogger: { error: jest.Mock };

  beforeEach(async () => {
    mockUserService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findByInstitutionSlug: jest.fn().mockResolvedValue(null),
      setInstitutionOnboarding: jest.fn().mockResolvedValue(undefined),
    };
    mockEmailService = {
      sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    };
    mockLogger = { error: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [OAuthUpsertController],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: EMAIL_SERVICE, useValue: mockEmailService },
        { provide: PinoLogger, useValue: mockLogger },
        {
          provide: ConfigService,
          useValue: { authOauthUpsertToken: "test-token" },
        },
      ],
    }).compile();

    controller = moduleRef.get(OAuthUpsertController);
  });

  it("creates a new institution user when the email doesn't exist", async () => {
    mockUserService.findByEmail.mockResolvedValue(null);
    mockUserService.create.mockResolvedValue({
      id: "new-id",
      role: Role.Institution,
      email: "escola@example.com",
      institutionSlug: null,
    } as User);

    const result = await controller.upsert({
      email: "escola@example.com",
      firstName: "Escola",
    });

    expect(mockUserService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "escola@example.com",
        role: Role.Institution,
        institutionSlug: null,
        isEmailVerified: true,
      }),
    );
    expect(result).toEqual({
      id: "new-id",
      role: Role.Institution,
      email: "escola@example.com",
      institutionSlug: null,
    });
  });

  it("returns the existing institution user without creating a new one", async () => {
    mockUserService.findByEmail.mockResolvedValue({
      id: "existing-id",
      role: Role.Institution,
      email: "escola@example.com",
      institutionSlug: "escola-teste",
    } as User);

    const result = await controller.upsert({ email: "escola@example.com" });

    expect(mockUserService.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      id: "existing-id",
      role: Role.Institution,
      email: "escola@example.com",
      institutionSlug: "escola-teste",
    });
  });

  it("refuses to promote an existing non-institution account", async () => {
    mockUserService.findByEmail.mockResolvedValue({
      id: "player-id",
      role: Role.Player,
      email: "jogador@example.com",
      institutionSlug: null,
    } as User);

    await expect(
      controller.upsert({ email: "jogador@example.com" }),
    ).rejects.toThrow(ConflictException);
    expect(mockUserService.create).not.toHaveBeenCalled();
  });

  it("generates a unique nickname prefixed with inst- for created users", async () => {
    mockUserService.findByEmail.mockResolvedValue(null);
    mockUserService.create.mockResolvedValue({
      id: "new-id",
      role: Role.Institution,
      email: "escola@example.com",
      institutionSlug: null,
    } as User);

    await controller.upsert({ email: "escola@example.com" });

    const createArg = mockUserService.create.mock.calls[0][0];
    expect(createArg.nickname).toMatch(/^inst-/);
  });

  describe("onboarding", () => {
    const institutionUser = {
      id: "inst-id",
      email: "escola@example.com",
      role: Role.Institution,
      institutionSlug: null,
    } as User;

    it("saves the slug and sends the welcome email once, after saving", async () => {
      mockUserService.findById.mockResolvedValue(institutionUser);

      const result = await controller.onboarding({
        userId: "inst-id",
        institutionName: "Escola Teste",
      });

      expect(result).toEqual({
        institutionSlug: "escola-teste",
        institutionName: "Escola Teste",
      });
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledTimes(1);
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith(
        "escola@example.com",
        "Escola Teste",
      );
      expect(
        mockUserService.setInstitutionOnboarding.mock.invocationCallOrder[0],
      ).toBeLessThan(
        mockEmailService.sendWelcomeEmail.mock.invocationCallOrder[0],
      );
    });

    it("still completes onboarding when the welcome email fails", async () => {
      mockUserService.findById.mockResolvedValue(institutionUser);
      mockEmailService.sendWelcomeEmail.mockRejectedValue(new Error("smtp"));

      const result = await controller.onboarding({
        userId: "inst-id",
        institutionName: "Escola Teste",
      });
      await flushPromises();

      expect(result.institutionSlug).toBe("escola-teste");
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "inst-id" }),
        "Welcome email failed",
      );
    });

    it("does not wait for the welcome email before responding", async () => {
      mockUserService.findById.mockResolvedValue(institutionUser);
      mockEmailService.sendWelcomeEmail.mockReturnValue(new Promise(() => {}));

      const result = await controller.onboarding({
        userId: "inst-id",
        institutionName: "Escola Teste",
      });

      expect(result.institutionSlug).toBe("escola-teste");
    });

    it("is idempotent when already onboarded: returns the existing slug, no email", async () => {
      mockUserService.findById.mockResolvedValue({
        ...institutionUser,
        institutionSlug: "escola-original",
        institutionName: "Escola Original",
      });

      const result = await controller.onboarding({
        userId: "inst-id",
        institutionName: "Outro Nome",
      });

      expect(result).toEqual({
        institutionSlug: "escola-original",
        institutionName: "Escola Original",
      });
      expect(mockUserService.setInstitutionOnboarding).not.toHaveBeenCalled();
      expect(mockEmailService.sendWelcomeEmail).not.toHaveBeenCalled();
    });

    it("rejects a non-institution account without sending email", async () => {
      mockUserService.findById.mockResolvedValue({
        ...institutionUser,
        role: Role.Player,
      });

      await expect(
        controller.onboarding({ userId: "inst-id", institutionName: "X" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockEmailService.sendWelcomeEmail).not.toHaveBeenCalled();
    });

    it("does not send the welcome email when the user does not exist", async () => {
      mockUserService.findById.mockResolvedValue(null);

      await expect(
        controller.onboarding({ userId: "missing", institutionName: "X" }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockEmailService.sendWelcomeEmail).not.toHaveBeenCalled();
    });
  });
});
