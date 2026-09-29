import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OAuthUpsertTokenGuard } from "../auth/guards/oauth-upsert-token.guard";
import { CampaignLink } from "./campaign-link.entity";
import { CampaignLinksController } from "./campaign-links.controller";
import { CampaignLinksService } from "./campaign-links.service";

@Module({
  imports: [TypeOrmModule.forFeature([CampaignLink])],
  controllers: [CampaignLinksController],
  providers: [CampaignLinksService, OAuthUpsertTokenGuard],
})
export class CampaignLinksModule {}
