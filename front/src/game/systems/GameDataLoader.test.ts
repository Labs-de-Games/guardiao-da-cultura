import type { LevelDefinition } from "../data/LevelConfig";
import type { ContentJson } from "../types/GameDataTypes";
import { processModularData } from "./GameDataLoader";

function createLevelDef(
  overrides: Partial<LevelDefinition["data"]> = {},
): LevelDefinition {
  return {
    id: "test",
    levelNumber: 1,
    title: "Test Level",
    maxStars: 3,
    initialGrayscale: 0,
    map: {
      key: "test",
      json: "test.json",
      tileset: "tileset",
      tilesetImg: "tileset.png",
    },
    data: {
      works: ["works_0.json"],
      quizzes: ["quizzes_0.json"],
      intermediateQuizzes: ["iq_0.json"],
      npcs: ["npcs_0.json"],
      messages: ["messages_0.json"],
      collectibles: ["collectibles_0.json"],
      ...overrides,
    },
  };
}

function createContentJson(): ContentJson {
  return {
    works: { PAINTINGS: {}, SCULPTURES: {}, PHOTOS: {} },
    quizzes: {},
    intermediateQuizzes: {},
    npcs: {},
    messages: { SYSTEM_DIALOGUES: {} },
    collectibles: { CLUE_VILLAIN: {} },
  };
}

function keyedCache(responses: Record<string, unknown>) {
  return jest.fn().mockImplementation((key: string) => responses[key] ?? null);
}

describe("processModularData", () => {
  it("should merge works data into contentData", () => {
    const levelDef = createLevelDef();
    const contentData = createContentJson();
    const cacheGet = keyedCache({
      works_0: { PAINTINGS: { p1: { id: "p1", title: "Painting 1" } } },
    });

    processModularData(levelDef, contentData, cacheGet);

    expect(contentData.works.PAINTINGS).toHaveProperty("p1");
  });

  it("should merge quiz data", () => {
    const levelDef = createLevelDef();
    const contentData = createContentJson();
    const cacheGet = keyedCache({
      quizzes_0: { q1: [{ q: "Question 1?" }] },
    });

    processModularData(levelDef, contentData, cacheGet);

    expect(contentData.quizzes).toHaveProperty("q1");
  });

  it("should merge intermediate quiz data", () => {
    const levelDef = createLevelDef();
    const contentData = createContentJson();
    const cacheGet = keyedCache({
      intermediateQuizzes_0: { info_1: [{ q: "Quiz?" }] },
    });

    processModularData(levelDef, contentData, cacheGet);

    expect(contentData.intermediateQuizzes).toHaveProperty("info_1");
  });

  it("should warn for unknown intermediate quiz keys", () => {
    const levelDef = createLevelDef();
    const contentData = createContentJson();
    contentData.intermediateQuizzes.unknown_key = [{ q: "?" }];
    const cacheGet = keyedCache({});
    const consoleWarn = jest.spyOn(console, "warn").mockImplementation();

    processModularData(levelDef, contentData, cacheGet);

    expect(consoleWarn).toHaveBeenCalledWith(
      expect.stringContaining('Unknown intermediate quiz key "unknown_key"'),
    );
    consoleWarn.mockRestore();
  });

  it("should merge NPC data", () => {
    const levelDef = createLevelDef();
    const contentData = createContentJson();
    const cacheGet = keyedCache({
      npcs_0: { npcs: { npc1: { name: "Guide" } } },
    });

    processModularData(levelDef, contentData, cacheGet);

    expect(contentData.npcs).toHaveProperty("npc1");
  });

  it("should merge messages data", () => {
    const levelDef = createLevelDef();
    const contentData = createContentJson();
    const cacheGet = keyedCache({
      messages_0: { SYSTEM_DIALOGUES: { welcome: ["Hello!"] } },
    });

    processModularData(levelDef, contentData, cacheGet);

    expect(contentData.messages.SYSTEM_DIALOGUES).toHaveProperty("welcome");
  });

  it("should merge collectibles data", () => {
    const levelDef = createLevelDef();
    const contentData = createContentJson();
    const cacheGet = keyedCache({
      collectibles_0: { collectibles: { CLUE_VILLAIN: { c1: { id: "c1" } } } },
    });

    processModularData(levelDef, contentData, cacheGet);

    expect(contentData.collectibles.CLUE_VILLAIN).toHaveProperty("c1");
  });

  it("should warn when data is missing", () => {
    const levelDef = createLevelDef();
    const contentData = createContentJson();
    const cacheGet = keyedCache({});
    const consoleWarn = jest.spyOn(console, "warn").mockImplementation();

    processModularData(levelDef, contentData, cacheGet);

    expect(consoleWarn).toHaveBeenCalledWith(
      expect.stringContaining("Could not load works data"),
    );
    consoleWarn.mockRestore();
  });
});
