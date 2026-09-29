import { IsNull } from "typeorm";
import { ConsentService } from "../../../src/modules/consent/consent.service";
import { ConsentType } from "../../../src/modules/consent/enums/consent-type.enum";
import type { UserConsent } from "../../../src/modules/consent/user-consent.entity";
import { INSTITUTION_TERMS_VERSION } from "../../../src/shared/consent/institution-terms";

function buildService() {
  const repository = {
    create: jest.fn((data) => data),
    save: jest.fn((entity) => Promise.resolve(entity)),
    findOne: jest.fn(),
  };
  const service = new ConsentService(
    repository as unknown as ConstructorParameters<typeof ConsentService>[0],
  );
  return { service, repository };
}

describe("ConsentService", () => {
  describe("record", () => {
    it("inserts a live row for the given user, type and version", async () => {
      const { service, repository } = buildService();

      await service.record(
        "user-1",
        ConsentType.InstitutionTerms,
        INSTITUTION_TERMS_VERSION,
      );

      expect(repository.create).toHaveBeenCalledWith({
        userId: "user-1",
        type: ConsentType.InstitutionTerms,
        version: INSTITUTION_TERMS_VERSION,
        revokedAt: null,
      });
      expect(repository.save).toHaveBeenCalled();
    });

    it("stores the version it is given rather than the current constant", async () => {
      // The caller validates; this method's job is to record what was shown,
      // so a mismatch must never be silently corrected into a false record.
      const { service, repository } = buildService();

      await service.record(
        "user-1",
        ConsentType.InstitutionTerms,
        "2020-01-01",
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ version: "2020-01-01" }),
      );
    });
  });

  describe("hasCurrentConsent", () => {
    it("is false when the account has never consented", async () => {
      const { service, repository } = buildService();
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.hasCurrentConsent("user-1", ConsentType.InstitutionTerms),
      ).resolves.toBe(false);
    });

    it("is true for a live acceptance of the current text", async () => {
      const { service, repository } = buildService();
      repository.findOne.mockResolvedValue({
        version: INSTITUTION_TERMS_VERSION,
      } as UserConsent);

      await expect(
        service.hasCurrentConsent("user-1", ConsentType.InstitutionTerms),
      ).resolves.toBe(true);
    });

    it("is false when the newest acceptance predates the reconsent threshold", async () => {
      const { service, repository } = buildService();
      repository.findOne.mockResolvedValue({
        version: "2020-01-01",
      } as UserConsent);

      await expect(
        service.hasCurrentConsent("user-1", ConsentType.InstitutionTerms),
      ).resolves.toBe(false);
    });

    it("ignores revoked rows and reads the newest first", async () => {
      const { service, repository } = buildService();
      repository.findOne.mockResolvedValue({
        version: INSTITUTION_TERMS_VERSION,
      } as UserConsent);

      await service.hasCurrentConsent("user-1", ConsentType.InstitutionTerms);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
          type: ConsentType.InstitutionTerms,
          revokedAt: IsNull(),
        },
        order: { acceptedAt: "DESC" },
      });
    });
  });
});
