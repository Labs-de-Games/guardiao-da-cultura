import {
  clueEventsPredicate,
  completedEventsPredicate,
  DASHBOARD_LEVELS,
  FINAL_LEVEL,
  levelIdExpression,
  reachedEventsPredicate,
} from "./levels";

describe("DASHBOARD_LEVELS", () => {
  it("lists levels 1–4 in play order", () => {
    expect(DASHBOARD_LEVELS.map((level) => level.id)).toEqual([
      "level_01",
      "level_02",
      "level_03",
      "level_04",
    ]);
  });

  it("adds the investigation as level 4, with its own events and no quiz", () => {
    const investigation = DASHBOARD_LEVELS[3];
    expect(investigation).toMatchObject({
      levelNumber: 4,
      title: "Identificação do Suspeito",
      reachedEvent: "investigation_opened",
      completedEvent: "investigation_completed",
      hasQuiz: false,
    });
  });

  it("treats finishing the investigation as finishing the game", () => {
    expect(FINAL_LEVEL.id).toBe("level_04");
    expect(FINAL_LEVEL.completedCondition).toBe(
      "event = 'investigation_completed'",
    );
  });
});

describe("level predicates", () => {
  it("lists each event name once", () => {
    expect(reachedEventsPredicate()).toBe(
      "event IN ('game_started', 'investigation_opened')",
    );
    expect(completedEventsPredicate()).toBe(
      "event IN ('level_completed', 'investigation_completed')",
    );
  });

  it("never counts clue_used, the automatic hint", () => {
    expect(clueEventsPredicate()).not.toContain("clue_used");
  });

  it("maps investigation events to level_04, everything else by level_id", () => {
    expect(levelIdExpression()).toBe(
      "multiIf(event IN ('investigation_opened', 'investigation_completed', 'investigation_clue_placed'), 'level_04', properties.level_id)",
    );
  });
});
