import { clearPostHogStorage, posthogStorageKeys } from "./posthogTeardown";

const TOKEN = "phc_test_key";

describe("posthogTeardown", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("names every key posthog-js derives from the project token", () => {
    expect(posthogStorageKeys(TOKEN)).toEqual([
      `ph_${TOKEN}_posthog`,
      `ph_${TOKEN}_window_id`,
      `ph_${TOKEN}_primary_window_exists`,
      `__ph_opt_in_out_${TOKEN}`,
    ]);
  });

  it("removes the persisted identity from localStorage", () => {
    window.localStorage.setItem(`ph_${TOKEN}_posthog`, '{"distinct_id":"abc"}');
    window.localStorage.setItem(`__ph_opt_in_out_${TOKEN}`, "1");

    clearPostHogStorage(TOKEN);

    expect(window.localStorage.getItem(`ph_${TOKEN}_posthog`)).toBeNull();
    expect(window.localStorage.getItem(`__ph_opt_in_out_${TOKEN}`)).toBeNull();
  });

  it("removes the session-scoped window keys too", () => {
    window.sessionStorage.setItem(`ph_${TOKEN}_window_id`, "w1");
    window.sessionStorage.setItem(`ph_${TOKEN}_primary_window_exists`, "1");

    clearPostHogStorage(TOKEN);

    expect(window.sessionStorage.getItem(`ph_${TOKEN}_window_id`)).toBeNull();
    expect(
      window.sessionStorage.getItem(`ph_${TOKEN}_primary_window_exists`),
    ).toBeNull();
  });

  it("leaves unrelated keys alone", () => {
    window.localStorage.setItem("gameplate:badges:v1", "keep me");

    clearPostHogStorage(TOKEN);

    expect(window.localStorage.getItem("gameplate:badges:v1")).toBe("keep me");
  });

  it("does nothing without a token, rather than clearing everything", () => {
    window.localStorage.setItem(`ph_${TOKEN}_posthog`, "x");

    clearPostHogStorage(undefined);

    expect(window.localStorage.getItem(`ph_${TOKEN}_posthog`)).toBe("x");
  });

  it("never throws when storage is blocked — revocation must still complete", () => {
    const spy = jest
      .spyOn(Storage.prototype, "removeItem")
      .mockImplementation(() => {
        throw new Error("private mode");
      });

    expect(() => clearPostHogStorage(TOKEN)).not.toThrow();

    spy.mockRestore();
  });
});
