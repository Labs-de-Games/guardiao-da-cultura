import { IsString, MaxLength } from "class-validator";

export class DeleteCampaignLinkQueryDto {
  @IsString()
  @MaxLength(64)
  institutionSlug!: string;
}
