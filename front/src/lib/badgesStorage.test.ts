import {
  addGuestBadge,
  clearGuestBadges,
  getAllGuestBadgeIds,
  getGuestBadgeIds,
  getStoredGuestId,
  setGuestBadgeIds,
} from "./badgesStorage";

const STORAGE_KEY = "gameplate:badges:v1";

beforeEach(() => {
  localStorage.clear();
});

describe("badgesStorage", () => {
  describe("getGuestBadgeIds", () => {
    it("returns empty array when no data exists", () => {
      expect(getGuestBadgeIds("guest-1")).toEqual([]);
    });

    it("returns empty array when guestId does not match", () => {
      addGuestBadge("guest-1", "badge_a");
      expect(getGuestBadgeIds("guest-2")).toEqual([]);
    });

    it("returns badge IDs for matching guestId", () => {
      addGuestBadge("guest-1", "badge_a");
      addGuestBadge("guest-1", "badge_b");
      expect(getGuestBadgeIds("guest-1")).toEqual(["badge_a", "badge_b"]);
    });
  });

  describe("addGuestBadge", () => {
    it("creates a new entry when none exists", () => {
      addGuestBadge("guest-1", "badge_a");
      expect(getGuestBadgeIds("guest-1")).toEqual(["badge_a"]);
    });

    it("appends to existing entry", () => {
      addGuestBadge("guest-1", "badge_a");
      addGuestBadge("guest-1", "badge_b");
      expect(getGuestBadgeIds("guest-1")).toEqual(["badge_a", "badge_b"]);
    });

    it("does not duplicate badges", () => {
      addGuestBadge("guest-1", "badge_a");
      addGuestBadge("guest-1", "badge_a");
      expect(getGuestBadgeIds("guest-1")).toEqual(["badge_a"]);
    });

    it("overwrites when a different guestId is used", () => {
      addGuestBadge("guest-1", "badge_a");
      addGuestBadge("guest-2", "badge_b");
      expect(getGuestBadgeIds("guest-1")).toEqual([]);
      expect(getGuestBadgeIds("guest-2")).toEqual(["badge_b"]);
    });
  });

  describe("setGuestBadgeIds", () => {
    it("replaces badge IDs for an existing guest", () => {
      addGuestBadge("guest-1", "badge_a");
      addGuestBadge("guest-1", "badge_b");
      setGuestBadgeIds("guest-1", ["badge_c"]);
      expect(getGuestBadgeIds("guest-1")).toEqual(["badge_c"]);
    });

    it("does nothing if guestId is empty", () => {
      addGuestBadge("guest-1", "badge_a");
      setGuestBadgeIds("", ["badge_b"]);
      expect(getGuestBadgeIds("guest-1")).toEqual(["badge_a"]);
    });

    it("does nothing if badgeIds is empty", () => {
      addGuestBadge("guest-1", "badge_a");
      setGuestBadgeIds("guest-1", []);
      expect(getGuestBadgeIds("guest-1")).toEqual(["badge_a"]);
    });
  });

  describe("getStoredGuestId", () => {
    it("returns null when no data exists", () => {
      expect(getStoredGuestId()).toBeNull();
    });

    it("returns the stored guestId", () => {
      addGuestBadge("guest-1", "badge_a");
      expect(getStoredGuestId()).toBe("guest-1");
    });

    it("returns updated guestId after overwrite", () => {
      addGuestBadge("guest-1", "badge_a");
      addGuestBadge("guest-2", "badge_b");
      expect(getStoredGuestId()).toBe("guest-2");
    });
  });

  describe("getAllGuestBadgeIds", () => {
    it("returns empty array when no data", () => {
      expect(getAllGuestBadgeIds()).toEqual([]);
    });

    it("returns all badge IDs regardless of guestId", () => {
      addGuestBadge("guest-1", "badge_a");
      addGuestBadge("guest-1", "badge_b");
      expect(getAllGuestBadgeIds()).toEqual(["badge_a", "badge_b"]);
    });
  });

  describe("clearGuestBadges", () => {
    it("removes the storage entry", () => {
      addGuestBadge("guest-1", "badge_a");
      clearGuestBadges();
      expect(getGuestBadgeIds("guest-1")).toEqual([]);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("does not throw when no data exists", () => {
      expect(() => clearGuestBadges()).not.toThrow();
    });
  });

  describe("schema version", () => {
    it("ignores data with wrong version", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 99, guestId: "g1", badgeIds: ["x"] }),
      );
      expect(getGuestBadgeIds("g1")).toEqual([]);
    });

    it("ignores malformed JSON", () => {
      localStorage.setItem(STORAGE_KEY, "not-json");
      expect(getGuestBadgeIds("g1")).toEqual([]);
    });
  });
});
