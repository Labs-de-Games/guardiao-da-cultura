import { Test } from "@nestjs/testing";
import type { UpdateProgressionDto } from "../../../src/modules/progression/dto/update-progression.dto";
import { ProgressionController } from "../../../src/modules/progression/progression.controller";
import { ProgressionService } from "../../../src/modules/progression/progression.service";
import type { UserProgress } from "../../../src/modules/progression/user-progress.entity";

describe("ProgressionController", () => {
  let controller: ProgressionController;
  let mockService: {
    upsertProgress: jest.Mock;
    findByUserId: jest.Mock;
  };

  const USER_ID = "test-user";
  const BASE_DTO: UpdateProgressionDto = {
    currentLevel: 2,
    totalStars: 10,
  };

  beforeEach(async () => {
    mockService = {
      upsertProgress: jest.fn(),
      findByUserId: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ProgressionController],
      providers: [
        {
          provide: ProgressionService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = moduleRef.get(ProgressionController);
  });

  describe("updateProgress", () => {
    describe("auth user (no x-guest-id header)", () => {
      it("calls service.upsertProgress with userId and dto", async () => {
        await controller.updateProgress(USER_ID, BASE_DTO, undefined);
        expect(mockService.upsertProgress).toHaveBeenCalledTimes(1);
        expect(mockService.upsertProgress).toHaveBeenCalledWith(
          USER_ID,
          BASE_DTO,
        );
      });

      it("returns the UserProgress record from service", async () => {
        const expectedRecord = {
          id: "p1",
          userId: USER_ID,
          currentLevel: 2,
          totalStars: 10,
        } as UserProgress;

        mockService.upsertProgress.mockResolvedValue(expectedRecord);

        const result = await controller.updateProgress(
          USER_ID,
          BASE_DTO,
          undefined,
        );
        expect(result).toBe(expectedRecord);
      });
    });

    describe("guest (x-guest-id header present)", () => {
      it("returns { success: true, guest: true }", async () => {
        const result = await controller.updateProgress(
          USER_ID,
          BASE_DTO,
          "guest-123",
        );
        expect(result).toEqual({ success: true, guest: true });
      });

      it("does not call service.upsertProgress", async () => {
        await controller.updateProgress(USER_ID, BASE_DTO, "guest-123");
        expect(mockService.upsertProgress).not.toHaveBeenCalled();
      });
    });
  });
});
