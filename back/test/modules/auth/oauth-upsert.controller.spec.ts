import { ConflictException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ConfigService } from "../../../src/core/config/config.service";
import { OAuthUpsertController } from "../../../src/modules/auth/controllers/oauth-upsert.controller";
import { Role } from "../../../src/modules/users/enums/role.enum";
import type { User } from "../../../src/modules/users/user.entity";
import { UserService } from "../../../src/modules/users/user.service";

describe("OAuthUpsertController", () => {
  let controller: OAuthUpsertController;
  let mockUserService: {
    findByEmail: jest.Mock;
    create: jest.Mock;
  };

  beforeEach(async () => {
    mockUserService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [OAuthUpsertController],
      providers: [
        { provide: UserService, useValue: mockUserService },
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
});
