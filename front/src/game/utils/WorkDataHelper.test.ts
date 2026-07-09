import type { ContentJson, WorkData } from "../types/GameDataTypes";
import {
  buildLabelInfo,
  findWorkDataById,
  resolveWorkIdFromPlaceholder,
} from "./WorkDataHelper";

function makeContentData(
  works: Record<string, Record<string, WorkData>> = {},
): ContentJson {
  return {
    works: works as ContentJson["works"],
    quizzes: {},
    intermediateQuizzes: {},
    npcs: {},
    messages: { SYSTEM_DIALOGUES: {} },
    collectibles: { CLUE_VILLAIN: {} },
  };
}

function makeWork(overrides: Partial<WorkData> = {}): WorkData {
  return {
    id: "work-1",
    type: "painting",
    metadata: { title: "Test Work", author: "Artist", description: "A test" },
    educational: { feedbackError: "Wrong!" },
    assets: { sprite: "spr" },
    ...overrides,
  };
}

describe("WorkDataHelper", () => {
  describe("findWorkDataById", () => {
    it("finds a work in PAINTINGS category", () => {
      const work = makeWork({ id: "mona-lisa" });
      const data = makeContentData({ PAINTINGS: { "mona-lisa": work } });

      expect(findWorkDataById("mona-lisa", data)).toBe(work);
    });

    it("finds a work in SCULPTURES category", () => {
      const work = makeWork({ id: "david" });
      const data = makeContentData({ SCULPTURES: { david: work } });

      expect(findWorkDataById("david", data)).toBe(work);
    });

    it("returns null for non-existent ID", () => {
      const data = makeContentData({ PAINTINGS: { "mona-lisa": makeWork() } });

      expect(findWorkDataById("unknown", data)).toBeNull();
    });

    it("returns null when works is empty", () => {
      const data = makeContentData();

      expect(findWorkDataById("anything", data)).toBeNull();
    });

    it("searches across multiple categories", () => {
      const painting = makeWork({ id: "work-a" });
      const sculpture = makeWork({ id: "work-b" });
      const data = makeContentData({
        PAINTINGS: { "work-a": painting },
        SCULPTURES: { "work-b": sculpture },
      });

      expect(findWorkDataById("work-a", data)).toBe(painting);
      expect(findWorkDataById("work-b", data)).toBe(sculpture);
    });
  });

  describe("resolveWorkIdFromPlaceholder", () => {
    const data = makeContentData({
      PAINTINGS: { "painting-1": makeWork({ id: "painting-1" }) },
    });

    it("returns null for undefined", () => {
      expect(resolveWorkIdFromPlaceholder(undefined, data)).toBeNull();
    });

    it("resolves a single string ID", () => {
      expect(resolveWorkIdFromPlaceholder("painting-1", data)).toBe(
        "painting-1",
      );
    });

    it("returns first valid ID from array", () => {
      expect(resolveWorkIdFromPlaceholder(["painting-1", "other"], data)).toBe(
        "painting-1",
      );
    });

    it("returns first ID if none match (fallback)", () => {
      expect(
        resolveWorkIdFromPlaceholder(["unknown-a", "unknown-b"], data),
      ).toBe("unknown-a");
    });

    it("returns null for empty array", () => {
      expect(resolveWorkIdFromPlaceholder([], data)).toBeNull();
    });
  });

  describe("buildLabelInfo", () => {
    it("builds label from work metadata", () => {
      const work = makeWork({
        id: "test",
        metadata: {
          title: "Mona Lisa",
          author: "Da Vinci",
          description: "A portrait",
          year: "1503",
          dimensions: "77x53cm",
          medium: "Oil",
          place: "Louvre",
        },
        educational: { description: "Famous painting" },
      });

      const result = buildLabelInfo(work, () => null);

      expect(result).toEqual({
        title: "Mona Lisa",
        author: "Da Vinci",
        description: "Famous painting",
        year: "1503",
        dimensions: "77x53cm",
        medium: "Oil",
        place: "Louvre",
      });
    });

    it("uses educational.description over metadata.description", () => {
      const work = makeWork({
        metadata: { title: "T", author: "A", description: "meta desc" },
        educational: { description: "edu desc" },
      });

      const result = buildLabelInfo(work, () => null);
      expect(result.description).toBe("edu desc");
    });

    it("falls back to metadata.dimensions when educational has none", () => {
      const work = makeWork({
        metadata: { title: "T", author: "A", dimensions: "10x20" },
        educational: {},
      });

      const result = buildLabelInfo(work, () => null);
      expect(result.dimensions).toBe("10x20");
    });

    it("uses work.id when title is missing", () => {
      const work = makeWork({
        id: "fallback-id",
        metadata: { title: "", author: "" },
      });

      const result = buildLabelInfo(work, () => null);
      expect(result.title).toBe("fallback-id");
    });

    it("follows parent_id reference", () => {
      const parent = makeWork({
        id: "parent",
        metadata: { title: "Parent Work", author: "P" },
        educational: { description: "Parent desc" },
      });
      const child = makeWork({
        id: "child",
        metadata: { title: "Child", author: "C" },
      });
      (child as unknown as Record<string, unknown>).parent_id = "parent";

      const findFn = jest.fn().mockReturnValue(parent);
      const result = buildLabelInfo(child, findFn);

      expect(findFn).toHaveBeenCalledWith("parent");
      expect(result.title).toBe("Parent Work");
      expect(result.description).toBe("Parent desc");
    });

    it("falls back to child data when parent not found", () => {
      const child = makeWork({
        id: "orphan",
        metadata: { title: "Orphan Work", author: "O" },
      });
      (child as unknown as Record<string, unknown>).parent_id =
        "missing-parent";

      const result = buildLabelInfo(child, () => null);

      expect(result.title).toBe("Orphan Work");
      expect(result.author).toBe("O");
    });
  });
});
