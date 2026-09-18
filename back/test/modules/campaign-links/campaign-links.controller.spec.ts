import { Test } from "@nestjs/testing";
import { ConfigService } from "../../../src/core/config/config.service";
import type { CampaignLink } from "../../../src/modules/campaign-links/campaign-link.entity";
import { CampaignLinksController } from "../../../src/modules/campaign-links/campaign-links.controller";
import { CampaignLinksService } from "../../../src/modules/campaign-links/campaign-links.service";

describe("CampaignLinksController", () => {
  let controller: CampaignLinksController;
  let mockService: {
    list: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    mockService = {
      list: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [CampaignLinksController],
      providers: [
        { provide: CampaignLinksService, useValue: mockService },
        {
          provide: ConfigService,
          useValue: { authOauthUpsertToken: "test-token" },
        },
      ],
    }).compile();

    controller = moduleRef.get(CampaignLinksController);
  });

  it("lists links scoped to the given institutionSlug", async () => {
    const links: CampaignLink[] = [
      {
        id: "id-1",
        institutionSlug: "escola-teste",
        source: "group-a",
        createdAt: new Date(),
      },
    ];
    mockService.list.mockResolvedValue(links);

    const result = await controller.list({ institutionSlug: "escola-teste" });

    expect(mockService.list).toHaveBeenCalledWith("escola-teste");
    expect(result).toEqual(links);
  });

  it("creates a link for the given institutionSlug and source", async () => {
    const created: CampaignLink = {
      id: "id-1",
      institutionSlug: "escola-teste",
      source: "group-a",
      createdAt: new Date(),
    };
    mockService.create.mockResolvedValue(created);

    const result = await controller.create({
      institutionSlug: "escola-teste",
      source: "group-a",
    });

    expect(mockService.create).toHaveBeenCalledWith("escola-teste", "group-a");
    expect(result).toEqual(created);
  });

  it("deletes a link scoped to the given institutionSlug", async () => {
    mockService.delete.mockResolvedValue(undefined);

    const result = await controller.delete("id-1", {
      institutionSlug: "escola-teste",
    });

    expect(mockService.delete).toHaveBeenCalledWith("id-1", "escola-teste");
    expect(result).toEqual({ success: true });
  });
});
