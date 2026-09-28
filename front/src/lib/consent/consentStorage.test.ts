import {
  CONSENT_COOKIE_NAME,
  CONSENT_STORAGE_KEY,
  clearConsent,
  readConsent,
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
    writeConsent("accepted");
    expect(cookieValue(CONSENT_COOKIE_NAME)).toBe("1");

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
    expect(cookieValue(CONSENT_COOKIE_NAME)).toBe("1");

    spy.mockRestore();
  });

  it("clears both the record and the cookie", () => {
    writeConsent("accepted");
    clearConsent();

    expect(readConsent()).toBeNull();
    expect(cookieValue(CONSENT_COOKIE_NAME) ?? "").toBe("");
  });
});
