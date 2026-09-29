import {
  CONSENT_COOKIE_NAME,
  CONSENT_STORAGE_KEY,
  type ConsentStatus,
  clearConsent,
  hasAnalyticsConsent,
  isConsentStale,
  readConsent,
  syncConsentCookie,
  writeConsent,
} from "./consentStorage";
import { PRIVACY_NOTICE_VERSION } from "./privacyNotice";

function cookieValue(name: string): string | undefined {
  return document.cookie
    .split(";")
    .map((pair) => pair.trim())
    .find((pair) => pair.startsWith(`${name}=`))
    ?.split("=")[1];
}

describe("consentStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearConsent();
  });

  it("reports no decision before the player has made one", () => {
    expect(readConsent()).toBeNull();
  });

  it("round-trips an acceptance with timestamp and notice version", () => {
    const written = writeConsent("accepted");

    expect(written.status).toBe("accepted");
    expect(written.noticeVersion).toBe(PRIVACY_NOTICE_VERSION);
    expect(Number.isNaN(Date.parse(written.decidedAt))).toBe(false);
    expect(readConsent()).toEqual(written);
  });

  it("round-trips a refusal", () => {
    writeConsent("declined");
    expect(readConsent()?.status).toBe("declined");
  });

  it("mirrors the decision to the cookie the backend reads", () => {
    // The notice version rides along so the backend can retire a stale
    // acceptance itself, without waiting for client JS to rewrite the cookie.
    writeConsent("accepted");
    expect(cookieValue(CONSENT_COOKIE_NAME)).toBe(
      `1:${PRIVACY_NOTICE_VERSION}`,
    );

    writeConsent("declined");
    expect(cookieValue(CONSENT_COOKIE_NAME)).toBe("0");
  });

  it("treats a corrupted record as no decision, so the banner asks again", () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, "{not json");
    expect(readConsent()).toBeNull();
  });

  it("rejects a well-formed record with an unknown status", () => {
    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        status: "maybe",
        decidedAt: new Date().toISOString(),
        noticeVersion: "1",
      }),
    );
    expect(readConsent()).toBeNull();
  });

  it("rejects a record missing its metadata", () => {
    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ status: "accepted" }),
    );
    expect(readConsent()).toBeNull();
  });

  it("does not throw when localStorage reads are blocked", () => {
    const spy = jest
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("private mode");
      });

    expect(() => readConsent()).not.toThrow();
    expect(readConsent()).toBeNull();

    spy.mockRestore();
  });

  it("does not throw when localStorage writes are blocked", () => {
    const spy = jest
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("private mode");
      });

    expect(() => writeConsent("accepted")).not.toThrow();
    // The cookie still carries the decision for the backend.
    expect(cookieValue(CONSENT_COOKIE_NAME)).toBe(
      `1:${PRIVACY_NOTICE_VERSION}`,
    );

    spy.mockRestore();
  });

  it("clears both the record and the cookie", () => {
    writeConsent("accepted");
    clearConsent();

    expect(readConsent()).toBeNull();
    expect(cookieValue(CONSENT_COOKIE_NAME) ?? "").toBe("");
  });
});

/**
 * Re-consent after a material revision of the privacy notice (issue #864).
 *
 * The records here are written straight to localStorage because `writeConsent`
 * always stamps the *current* version — an aged record is exactly what cannot
 * be produced through the public API.
 */
describe("consentStorage — stale decisions", () => {
  function storeRecord(status: ConsentStatus, noticeVersion: string) {
    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        status,
        decidedAt: "2020-01-01T00:00:00.000Z",
        noticeVersion,
      }),
    );
  }

  beforeEach(() => {
    window.localStorage.clear();
    clearConsent();
  });

  it("stops honouring an acceptance taken under an older notice", () => {
    storeRecord("accepted", "2020-01-01");

    expect(isConsentStale(readConsent())).toBe(true);
    // The whole point: collection stops the moment the notice is retired, not
    // when the player gets round to answering the dialog.
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("keeps honouring an acceptance under the current notice", () => {
    writeConsent("accepted");

    expect(isConsentStale(readConsent())).toBe(false);
    expect(hasAnalyticsConsent()).toBe(true);
  });

  it("never ages out a refusal", () => {
    // Nothing is being collected from them, so there is no consent to refresh.
    // Re-asking would just be nagging until they give in.
    storeRecord("declined", "2020-01-01");

    expect(isConsentStale(readConsent())).toBe(false);
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("demotes a stale acceptance's cookie to 0 when re-mirrored", () => {
    storeRecord("accepted", "2020-01-01");
    const record = readConsent();
    if (!record) throw new Error("record should be readable");

    syncConsentCookie(record);

    // This is what closes the window where the backend would still honour the
    // old cookie, on the first client render after the notice changes.
    expect(cookieValue(CONSENT_COOKIE_NAME)).toBe("0");
  });

  it("refreshes the cookie for a returning player whose record is current", () => {
    writeConsent("accepted");
    document.cookie = `${CONSENT_COOKIE_NAME}=; path=/; Max-Age=0`;
    const record = readConsent();
    if (!record) throw new Error("record should be readable");

    syncConsentCookie(record);

    expect(cookieValue(CONSENT_COOKIE_NAME)).toBe(
      `1:${PRIVACY_NOTICE_VERSION}`,
    );
  });
});
