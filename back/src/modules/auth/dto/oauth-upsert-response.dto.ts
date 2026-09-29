import { ApiProperty } from "@nestjs/swagger";
import { Role } from "../../users/enums/role.enum";

export class OAuthUpsertResponseDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id!: string;

  @ApiProperty({ enum: Role, example: Role.Institution })
  role!: Role;

  @ApiProperty({ example: "contato@escola.exemplo" })
  email!: string;

  @ApiProperty({
    example: null,
    nullable: true,
    description:
      "null until an admin links this account via the seed/update script — no linking UI exists yet.",
  })
  institutionSlug!: string | null;

  /**
   * Whether this account holds a live acceptance of the current Terms of Use
   * (issue #338). Carried into the NextAuth JWT so middleware can gate the
   * dashboard without a backend round-trip per request. Always false for a
   * freshly-created account — onboarding is where a Google sign-up accepts.
   */
  @ApiProperty({
    example: false,
    description: "Holds a live acceptance of the current Terms of Use",
  })
  termsAccepted!: boolean;
}
