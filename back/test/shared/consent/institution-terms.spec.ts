import {
  INSTITUTION_TERMS_VERSION,
  isCurrentTermsVersion,
  isTermsVersionStale,
  TERMS_RECONSENT_REQUIRED_FROM,
} from "../../../src/shared/consent/institution-terms";

describe("institution terms versioning", () => {
  describe("isCurrentTermsVersion", () => {
    it("accepts the published version", () => {
      expect(isCurrentTermsVersion(INSTITUTION_TERMS_VERSION)).toBe(true);
    });

    it("refuses any other well-formed date", () => {
      expect(isCurrentTermsVersion("2020-01-01")).toBe(false);
      expect(isCurrentTermsVersion("2099-12-31")).toBe(false);
    });

    it("refuses malformed and non-string values", () => {
      for (const value of [
        "28/09/2026",
        "2026-9-28",
        "",
        null,
        undefined,
        true,
        20260928,
        { version: INSTITUTION_TERMS_VERSION },
      ]) {
        expect(isCurrentTermsVersion(value)).toBe(false);
      }
    });
  });

  describe("isTermsVersionStale", () => {
    it("honours an acceptance of the current text", () => {
      expect(isTermsVersionStale(INSTITUTION_TERMS_VERSION)).toBe(false);
    });

    it("retires an acceptance older than the reconsent threshold", () => {
      expect(isTermsVersionStale("2020-01-01")).toBe(true);
    });

    it("honours an acceptance at the threshold itself", () => {
      expect(isTermsVersionStale(TERMS_RECONSENT_REQUIRED_FROM)).toBe(false);
    });

    it("fails closed on a version that is not a well-formed date", () => {
      // A hand-edited or corrupted value must re-ask rather than be trusted.
      expect(isTermsVersionStale("nonsense")).toBe(true);
      expect(isTermsVersionStale("")).toBe(true);
    });

    it("never demands a version newer than the one published", () => {
      // The clamp only matters if someone bumps the threshold alone; without
      // it every institution would bounce between dashboard and terms page
      // forever, since accepting stamps INSTITUTION_TERMS_VERSION.
      expect(TERMS_RECONSENT_REQUIRED_FROM <= INSTITUTION_TERMS_VERSION).toBe(
        true,
      );
      expect(isTermsVersionStale(INSTITUTION_TERMS_VERSION)).toBe(false);
    });
  });
});
