import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { CampaignLink } from "../../../src/modules/campaign-links/campaign-link.entity";
import { CampaignLinksService } from "../../../src/modules/campaign-links/campaign-links.service";

describe("CampaignLinksService", () => {
  let service: CampaignLinksService;
  let mockRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ id: "new-id", ...data })),
      delete: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CampaignLinksService,
        { provide: getRepositoryToken(CampaignLink), useValue: mockRepository },
      ],
    }).compile();

    service = moduleRef.get(CampaignLinksService);
  });

  it("lists links for the given institutionSlug, newest first", async () => {
    await service.list("escola-teste");

    expect(mockRepository.find).toHaveBeenCalledWith({
      where: { institutionSlug: "escola-teste" },
      order: { createdAt: "DESC" },
    });
  });

  it("creates a link when the (institutionSlug, source) pair is new", async () => {
    mockRepository.findOne.mockResolvedValue(null);

    const result = await service.create("escola-teste", "group-a");

    expect(mockRepository.save).toHaveBeenCalledWith({
      institutionSlug: "escola-teste",
      source: "group-a",
    });
    expect(result).toEqual({
      id: "new-id",
      institutionSlug: "escola-teste",
      source: "group-a",
    });
  });

  it("refuses to create a duplicate (institutionSlug, source) pair", async () => {
    mockRepository.findOne.mockResolvedValue({
      id: "existing",
      institutionSlug: "escola-teste",
      source: "group-a",
    });

    await expect(service.create("escola-teste", "group-a")).rejects.toThrow(
      ConflictException,
    );
  });

  it("deletes a link that belongs to the given institutionSlug", async () => {
    mockRepository.findOne.mockResolvedValue({
      id: "id-1",
      institutionSlug: "escola-teste",
      source: "group-a",
    });

    await service.delete("id-1", "escola-teste");

    expect(mockRepository.delete).toHaveBeenCalledWith({ id: "id-1" });
  });

  it("throws NotFoundException when the link does not exist", async () => {
    mockRepository.findOne.mockResolvedValue(null);

    await expect(service.delete("missing-id", "escola-teste")).rejects.toThrow(
      NotFoundException,
    );
    expect(mockRepository.delete).not.toHaveBeenCalled();
  });

  it("refuses to delete a link belonging to a different institution", async () => {
    mockRepository.findOne.mockResolvedValue({
      id: "id-1",
      institutionSlug: "escola-b",
      source: "group-a",
    });

    await expect(service.delete("id-1", "escola-a")).rejects.toThrow(
      ForbiddenException,
    );
    expect(mockRepository.delete).not.toHaveBeenCalled();
  });
});
