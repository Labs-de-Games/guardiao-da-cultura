import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { CampaignLink } from "./campaign-link.entity";

@Injectable()
export class CampaignLinksService {
  constructor(
    @InjectRepository(CampaignLink)
    private readonly campaignLinkRepository: Repository<CampaignLink>,
  ) {}

  async list(institutionSlug: string): Promise<CampaignLink[]> {
    return this.campaignLinkRepository.find({
      where: { institutionSlug },
      order: { createdAt: "DESC" },
    });
  }

  async create(institutionSlug: string, source: string): Promise<CampaignLink> {
    const existing = await this.campaignLinkRepository.findOne({
      where: { institutionSlug, source },
    });
    if (existing) {
      throw new ConflictException(
        "A link with this group/class label already exists",
      );
    }

    return this.campaignLinkRepository.save(
      this.campaignLinkRepository.create({ institutionSlug, source }),
    );
  }

  /**
   * Deletes only when `institutionSlug` matches the row's own —
   * defense in depth on top of the front's session-derived scoping, so a
   * guessed/leaked id from another institution can never be deleted by a
   * caller who isn't that institution.
   */
  async delete(id: string, institutionSlug: string): Promise<void> {
    const link = await this.campaignLinkRepository.findOne({ where: { id } });
    if (!link) {
      throw new NotFoundException("Campaign link not found");
    }
    if (link.institutionSlug !== institutionSlug) {
      throw new ForbiddenException(
        "Campaign link does not belong to this institution",
      );
    }
    await this.campaignLinkRepository.delete({ id });
  }
}
