import { IsString, MaxLength } from "class-validator";

export class ListCampaignLinksQueryDto {
  @IsString()
  @MaxLength(64)
  institutionSlug!: string;
}
