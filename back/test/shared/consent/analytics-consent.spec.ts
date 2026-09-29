import {
  isAnalyticsConsentGranted,
  PRIVACY_NOTICE_VERSION,
  RECONSENT_REQUIRED_FROM,
} from "../../../src/shared/consent/analytics-consent";

/**
 * The backend reads the notice version out of the cookie so it can retire a
 * stale acceptance on the very next request, instead of waiting for client JS
 * to notice and rewrite it (issue #864).
 */
describe("isAnalyticsConsentGranted", () => {
  it("grants on the current notice version", () => {
    expect(isAnalyticsConsentGranted(`1:${RECONSENT_REQUIRED_FROM}`)).toBe(
      true,
    );
  });

  it("grants on a version newer than the required one", () => {
    expect(isAnalyticsConsentGranted("1:2099-01-01")).toBe(true);
  });

  it("refuses an acceptance taken under an older notice", () => {
    expect(isAnalyticsConsentGranted("1:2020-01-01")).toBe(false);
  });

  it("honours the version the frontend stamps today", () => {
    // The two sides clamp the threshold identically. Without that, a threshold
    // bumped past the published notice would leave the frontend sending (it
    // clamps, so it considers the player consented) and this side discarding —
    // every event vanishing with no error anywhere.
    expect(isAnalyticsConsentGranted(`1:${PRIVACY_NOTICE_VERSION}`)).toBe(true);
  });

  it("refuses the legacy unversioned format", () => {
    // Written before the version was mirrored into the cookie. It predates the
    // notice the player would be shown today, so re-asking is correct.
    expect(isAnalyticsConsentGranted("1")).toBe(false);
  });

  it("refuses a refusal", () => {
    expect(isAnalyticsConsentGranted("0")).toBe(false);
    expect(isAnalyticsConsentGranted(`0:${RECONSENT_REQUIRED_FROM}`)).toBe(
      false,
    );
  });

  it("fails closed on anything malformed", () => {
    for (const value of [
      undefined,
      null,
      "",
      "1:",
      "1:not-a-date",
      "1:2026-9-8",
      ":2026-09-28",
      "true",
      1,
      { status: "accepted" },
    ]) {
      expect(isAnalyticsConsentGranted(value)).toBe(false);
    }
  });
});
