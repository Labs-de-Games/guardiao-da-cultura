import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { OAuthUpsertTokenGuard } from "../auth/guards/oauth-upsert-token.guard";
import type { CampaignLink } from "./campaign-link.entity";
import { CampaignLinksService } from "./campaign-links.service";
import { CampaignLinkResponseDto } from "./dto/campaign-link-response.dto";
import { CreateCampaignLinkDto } from "./dto/create-campaign-link.dto";
import { DeleteCampaignLinkQueryDto } from "./dto/delete-campaign-link-query.dto";
import { ListCampaignLinksQueryDto } from "./dto/list-campaign-links-query.dto";

/**
 * Server-to-server only, same trust boundary as OAuthUpsertController:
 * called from the front's own /api/edital/links route handlers, which
 * derive `institutionSlug` from the caller's NextAuth session
 * (front/src/lib/edital/server/scope.ts) — never from raw client input.
 * Never reachable directly from a browser.
 */
@ApiTags("Campaign links")
@Controller("campaign-links")
@Public()
@UseGuards(OAuthUpsertTokenGuard)
@ApiSecurity("oauth-upsert-token")
@ApiUnauthorizedResponse({ description: "Missing/invalid upsert token" })
export class CampaignLinksController {
  constructor(private readonly campaignLinksService: CampaignLinksService) {}

  @Get()
  @ApiOperation({ summary: "List an institution's own campaign links" })
  @ApiOkResponse({ type: CampaignLinkResponseDto, isArray: true })
  async list(
    @Query() query: ListCampaignLinksQueryDto,
  ): Promise<CampaignLink[]> {
    return this.campaignLinksService.list(query.institutionSlug);
  }

  @Post()
  @ApiOperation({ summary: "Create a campaign link for an institution" })
  @ApiOkResponse({ type: CampaignLinkResponseDto })
  async create(@Body() dto: CreateCampaignLinkDto): Promise<CampaignLink> {
    return this.campaignLinksService.create(dto.institutionSlug, dto.source);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete an institution's own campaign link" })
  @ApiNotFoundResponse({ description: "Campaign link not found" })
  @ApiForbiddenResponse({
    description: "Campaign link does not belong to this institution",
  })
  async delete(
    @Param("id") id: string,
    @Query() query: DeleteCampaignLinkQueryDto,
  ): Promise<{ success: true }> {
    await this.campaignLinksService.delete(id, query.institutionSlug);
    return { success: true };
  }
}
