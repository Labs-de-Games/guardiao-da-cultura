import { randomUUID } from "node:crypto";
import {
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  NotFoundException,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Role } from "../../users/enums/role.enum";
import { UserService } from "../../users/user.service";
import { Public } from "../decorators/public.decorator";
import { InstitutionOnboardingDto } from "../dto/institution-onboarding.dto";
import { InstitutionOnboardingResponseDto } from "../dto/institution-onboarding-response.dto";
import { OAuthUpsertDto } from "../dto/oauth-upsert.dto";
import { OAuthUpsertResponseDto } from "../dto/oauth-upsert-response.dto";
import { OAuthUpsertTokenGuard } from "../guards/oauth-upsert-token.guard";
import { slugify } from "../utils/slugify";

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

  /**
   * Self-serve replacement for the admin seed/update script #744 assumed
   * (there is no admin role/workflow in this project). Called
   * server-to-server from the front's own onboarding route handler, which
   * derives `userId` from its own trusted NextAuth session — the slug is
   * always server-derived from `institutionName`, never taken as raw
   * client input, and collisions are disambiguated here rather than left
   * to the caller.
   */
  @Public()
  @UseGuards(OAuthUpsertTokenGuard)
  @Post("onboarding")
  @ApiOperation({
    summary: "Set institution name/slug once, on first login",
  })
  @ApiSecurity("oauth-upsert-token")
  @ApiOkResponse({ type: InstitutionOnboardingResponseDto })
  @ApiUnauthorizedResponse({ description: "Missing/invalid upsert token" })
  @ApiNotFoundResponse({ description: "User not found" })
  @ApiForbiddenResponse({
    description: "Not an institution account, or already onboarded",
  })
  async onboarding(
    @Body() dto: InstitutionOnboardingDto,
  ): Promise<InstitutionOnboardingResponseDto> {
    const user = await this.userService.findById(dto.userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }
    if (user.role !== Role.Institution) {
      throw new ForbiddenException("Not an institution account");
    }
    if (user.institutionSlug) {
      throw new ForbiddenException("Institution already onboarded");
    }

    const base = slugify(dto.institutionName);
    const institutionSlug = await this.uniqueSlug(base);

    await this.userService.setInstitutionOnboarding(
      user.id,
      dto.institutionName,
      institutionSlug,
    );

    return { institutionSlug, institutionName: dto.institutionName };
  }

  private async uniqueSlug(base: string): Promise<string> {
    let candidate = base;
    let attempt = 0;
    while (await this.userService.findByInstitutionSlug(candidate)) {
      attempt += 1;
      candidate = `${base}-${randomUUID().slice(0, 4)}`;
      if (attempt > 10) {
        throw new ConflictException(
          "Could not generate a unique institution slug",
        );
      }
    }
    return candidate;
  }
}
