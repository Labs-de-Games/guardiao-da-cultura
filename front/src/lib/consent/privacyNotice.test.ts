import {
  formatNoticeVersion,
  isNoticeVersionStale,
  PRIVACY_NOTICE_VERSION,
  RECONSENT_REQUIRED_FROM,
} from "./privacyNotice";

describe("formatNoticeVersion", () => {
  it("renders an ISO version in Brazilian order", () => {
    expect(formatNoticeVersion("2026-09-29")).toBe("29/09/2026");
  });

  /**
   * The reason this does not go through `Date`: a bare `YYYY-MM-DD` parses as
   * UTC midnight, so every Brazilian timezone (UTC-3) would render the day
   * before — the notice version shown to the player would be off by one, and
   * would disagree with the same constant printed on /privacidade.
   */
  it("does not shift the day in a negative UTC offset", () => {
    expect(formatNoticeVersion("2026-01-01")).toBe("01/01/2026");
    expect(formatNoticeVersion("2026-03-01")).toBe("01/03/2026");
  });

  it("keeps the padding of single-digit days and months", () => {
    expect(formatNoticeVersion("2026-01-05")).toBe("05/01/2026");
  });

  it("returns a malformed version untouched", () => {
    // Showing the stored value is the honest option; such a record has
    // already been ruled out as consent by isNoticeVersionStale.
    for (const value of ["", "v1", "2026-9-8", "2026/09/28", "latest"]) {
      expect(formatNoticeVersion(value)).toBe(value);
    }
  });

  it("formats the shipped constant", () => {
    expect(formatNoticeVersion(PRIVACY_NOTICE_VERSION)).toMatch(
      /^\d{2}\/\d{2}\/\d{4}$/,
    );
  });
});

describe("isNoticeVersionStale", () => {
  it("accepts a decision taken under the current notice", () => {
    expect(isNoticeVersionStale(PRIVACY_NOTICE_VERSION)).toBe(false);
  });

  it("accepts a decision at exactly the re-consent threshold", () => {
    // The threshold is the oldest version that still counts, not the first
    // one that fails — an off-by-one here would re-prompt the whole player
    // base for nothing.
    expect(isNoticeVersionStale(RECONSENT_REQUIRED_FROM)).toBe(false);
  });

  it("retires a decision taken under an older notice", () => {
    expect(isNoticeVersionStale("2020-01-01")).toBe(true);
  });

  it("accepts a version newer than the threshold", () => {
    expect(isNoticeVersionStale("2099-12-31")).toBe(false);
  });

  it("fails closed on a malformed version", () => {
    // Hand-edited, corrupted, or written by a build that predates the ISO
    // convention. Asking again is the safe direction; assuming consent is not.
    for (const value of ["", "v1", "2026-9-8", "2026/09/28", "latest"]) {
      expect(isNoticeVersionStale(value)).toBe(true);
    }
  });

  /**
   * The gate must always be answerable.
   *
   * A threshold bumped past the published notice has no valid answer:
   * accepting stamps `PRIVACY_NOTICE_VERSION`, which would still fall short,
   * so the record is born stale, the dialog re-renders unchanged, and the
   * accept button looks dead while the game stays unmountable. The clamp in
   * `reconsentThreshold()` downgrades that misconfiguration to a no-op.
   *
   * Asserted against the live constants rather than a mocked pair, because it
   * is the shipped configuration that has to be answerable — this fails the
   * build if someone bumps the threshold alone.
   */
  it("never leaves a freshly stamped acceptance stale", () => {
    expect(isNoticeVersionStale(PRIVACY_NOTICE_VERSION)).toBe(false);
  });

  it("keeps the threshold no newer than the published notice", () => {
    // The displayed version may run ahead of the threshold (a typo fix that
    // did not warrant re-asking). It must never fall behind it — that is the
    // unanswerable case the clamp exists to absorb.
    const clamped =
      RECONSENT_REQUIRED_FROM <= PRIVACY_NOTICE_VERSION
        ? RECONSENT_REQUIRED_FROM
        : PRIVACY_NOTICE_VERSION;

    expect(isNoticeVersionStale(clamped)).toBe(false);
  });
});
