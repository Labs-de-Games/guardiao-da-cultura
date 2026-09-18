import { ApiProperty } from "@nestjs/swagger";

export class InstitutionOnboardingResponseDto {
  @ApiProperty({ example: "escola-exemplo" })
  institutionSlug!: string;

  @ApiProperty({ example: "Escola Exemplo" })
  institutionName!: string;
}
