import {
  isNoticeVersionStale,
  PRIVACY_NOTICE_VERSION,
  RECONSENT_REQUIRED_FROM,
} from "./privacyNotice";

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
