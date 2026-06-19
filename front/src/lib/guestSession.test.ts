import {
  clearGuestSessionId,
  GUEST_SESSION_ID_KEY,
  getGuestSessionId,
  getOrCreateGuestSessionId,
  setGuestSessionId,
} from "./guestSession";

describe("guestSession", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("stores and retrieves guest session id", () => {
    setGuestSessionId("guest-123");

    expect(getGuestSessionId()).toBe("guest-123");
    expect(window.localStorage.getItem(GUEST_SESSION_ID_KEY)).toBe("guest-123");
  });

  it("returns existing id when already stored", () => {
    window.localStorage.setItem(GUEST_SESSION_ID_KEY, "guest-existing");

    const id = getOrCreateGuestSessionId("guest-preferred");

    expect(id).toBe("guest-existing");
  });

  it("uses preferred id when there is no stored value", () => {
    const id = getOrCreateGuestSessionId("guest-preferred");

    expect(id).toBe("guest-preferred");
    expect(getGuestSessionId()).toBe("guest-preferred");
  });

  it("generates and persists id when missing", () => {
    const id = getOrCreateGuestSessionId();

    expect(id).toBeTruthy();
    expect(getGuestSessionId()).toBe(id);
  });

  it("clears stored id", () => {
    window.localStorage.setItem(GUEST_SESSION_ID_KEY, "guest-existing");

    clearGuestSessionId();

    expect(getGuestSessionId()).toBeNull();
  });
});
