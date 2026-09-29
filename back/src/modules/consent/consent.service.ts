import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { isTermsVersionStale } from "../../shared/consent/institution-terms";
import { ConsentType } from "./enums/consent-type.enum";
import { UserConsent } from "./user-consent.entity";

/**
 * Reads and writes the append-only consent record (issue #338).
 *
 * Every write is an insert. Nothing in here updates or deletes a row — a
 * consent that was given is a fact about the past, and the table is the
 * evidence for it.
 */
@Injectable()
export class ConsentService {
  constructor(
    @InjectRepository(UserConsent)
    private readonly consentRepository: Repository<UserConsent>,
  ) {}

  /**
   * Record an acceptance. Callers must have already checked that `version` is
   * the text currently on offer (`isCurrentTermsVersion`) — this method stores
   * what it is given, so that the row says what the user actually saw.
   */
  async record(
    userId: string,
    type: ConsentType,
    version: string,
  ): Promise<UserConsent> {
    const consent = this.consentRepository.create({
      userId,
      type,
      version,
      revokedAt: null,
    });
    return this.consentRepository.save(consent);
  }

  /**
   * Whether this account holds a live, current-enough consent of this type.
   *
   * Reads the newest non-revoked row and asks whether its version is still
   * acceptable, rather than filtering on the current version in SQL: the
   * threshold is a rule about text revisions that belongs next to the
   * constants, not duplicated into a query.
   */
  async hasCurrentConsent(userId: string, type: ConsentType): Promise<boolean> {
    const latest = await this.consentRepository.findOne({
      where: { userId, type, revokedAt: IsNull() },
      order: { acceptedAt: "DESC" },
    });
    if (!latest) return false;
    return !isTermsVersionStale(latest.version);
  }
}
