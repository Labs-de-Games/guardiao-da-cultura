import {
  Body,
  ConflictException,
  Controller,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { randomUUID } from "crypto";
import { Role } from "../../users/enums/role.enum";
import { UserService } from "../../users/user.service";
import { Public } from "../decorators/public.decorator";
import { OAuthUpsertDto } from "../dto/oauth-upsert.dto";
import { OAuthUpsertResponseDto } from "../dto/oauth-upsert-response.dto";
import { OAuthUpsertTokenGuard } from "../guards/oauth-upsert-token.guard";

/**
 * `dateOfBirth` is required and unused-but-NOT-NULL on `User` for player
 * accounts; institution accounts have no meaningful birth date. Using the
 * Unix epoch as a documented sentinel rather than adding a nullable
 * column that would ripple into player registration/validation. Flagging
 * this as worth a real product decision if institution accounts grow
 * beyond a login vehicle for the dashboard — not resolved by any epic
 * #738 issue.
 */
const INSTITUTION_DATE_OF_BIRTH_SENTINEL = new Date(0);

@ApiTags("Auth — OAuth upsert")
@Controller("auth/oauth")
export class OAuthUpsertController {
  constructor(private readonly userService: UserService) {}

  /**
   * Server-to-server only: called from the front's NextAuth `signIn`
   * callback after Google has already verified the email, gated by
   * OAuthUpsertTokenGuard's constant-time shared-secret check — never
   * reachable directly from a browser. Find-or-create by email; an
   * existing non-institution account (e.g. a player who registered with
   * the same email) is refused rather than silently promoted to
   * institution — that would be a privilege escalation, not a login.
   *
   * institutionSlug is always null on the created path — assignment is a
   * separate admin seed/update script (#744's issue text is explicit that
   * this is a known manual step).
   */
  @Public()
  @UseGuards(OAuthUpsertTokenGuard)
  @Post("upsert")
  @ApiOperation({
    summary: "Find-or-create an institution-role user for NextAuth",
  })
  @ApiSecurity("oauth-upsert-token")
  @ApiOkResponse({ type: OAuthUpsertResponseDto })
  @ApiUnauthorizedResponse({ description: "Missing/invalid upsert token" })
  @ApiConflictResponse({
    description: "Email already belongs to a non-institution account",
  })
  async upsert(@Body() dto: OAuthUpsertDto): Promise<OAuthUpsertResponseDto> {
    const existing = await this.userService.findByEmail(dto.email);

    if (existing) {
      if (existing.role !== Role.Institution) {
        throw new ConflictException(
          "Email already belongs to a non-institution account",
        );
      }
      return {
        id: existing.id,
        role: existing.role,
        email: existing.email,
        institutionSlug: existing.institutionSlug,
      };
    }

    const created = await this.userService.create({
      email: dto.email,
      nickname: `inst-${randomUUID()}`,
      firstName: dto.firstName ?? "Instituição",
      lastName: dto.lastName ?? "",
      dateOfBirth: INSTITUTION_DATE_OF_BIRTH_SENTINEL,
      role: Role.Institution,
      isEmailVerified: true,
      institutionSlug: null,
    });

    return {
      id: created.id,
      role: created.role,
      email: created.email,
      institutionSlug: created.institutionSlug,
    };
  }
}
