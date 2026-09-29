import fs from "node:fs";
import path from "node:path";

import {
  FLOOR_COMPLETE_KEYS,
  MissionIds,
  MissionKeys,
} from "../constants/MissionConstants";
import { LEVEL_REGISTRY } from "./LevelConfig";
import { MissionRegistry, MissionRequirements } from "./MissionRegistry";

const PUBLIC_ASSETS = path.join(process.cwd(), "public", "assets");

describe("missao_curador_l3", () => {
  const requirement = MissionRequirements.find(
    (r) => r.id === MissionIds.CURATOR_L3,
  );
  const mission = MissionRegistry[MissionIds.CURATOR_L3];

  it("requires the dance, switches, stage, and genius sequence objectives", () => {
    expect(requirement?.requiredInfos).toEqual([
      MissionKeys.DANCE_DONE,
      MissionKeys.SWITCHES_DONE,
      MissionKeys.STAGE_DONE,
      MissionKeys.GENIUS_DONE,
    ]);
  });

  it("exposes a step for each required key", () => {
    expect(mission.steps).toHaveLength(4);
    expect(mission.steps.map((s) => s.infoKey)).toEqual([
      MissionKeys.DANCE_DONE,
      MissionKeys.SWITCHES_DONE,
      MissionKeys.STAGE_DONE,
      MissionKeys.GENIUS_DONE,
    ]);
  });

  it("counts as a floor completion, so the curator relocates after the quiz", () => {
    expect(FLOOR_COMPLETE_KEYS.has(MissionKeys.DANCE_DONE)).toBe(true);
    expect(FLOOR_COMPLETE_KEYS.has(MissionKeys.STAGE_DONE)).toBe(true);
  });

  it("does not treat switches as its own floor completion or quiz trigger", () => {
    expect(FLOOR_COMPLETE_KEYS.has(MissionKeys.SWITCHES_DONE)).toBe(false);
  });
});

describe("every mission step maps to a required info", () => {
  it.each(MissionRequirements.map((r) => r.id))("%s", (missionId) => {
    const required = new Set(
      MissionRequirements.find((r) => r.id === missionId)?.requiredInfos ?? [],
    );

    for (const step of MissionRegistry[missionId].steps) {
      expect(required.has(step.infoKey)).toBe(true);
    }
  });
});

describe("intermediate quiz files", () => {
  const knownKeys = new Set<string>(Object.values(MissionKeys));

  const quizFiles = Object.values(LEVEL_REGISTRY).flatMap((level) =>
    level.data.intermediateQuizzes.map((rel) => ({
      rel,
      abs: path.join(PUBLIC_ASSETS, rel),
    })),
  );

  it("finds a file for every registered level", () => {
    expect(quizFiles.length).toBeGreaterThan(0);
  });

  // GameDataLoader only console.warns on an unknown key, so a typo silently
  // produces a quiz that can never trigger. Fail the build instead.
  it.each(
    quizFiles.map((f) => f.rel),
  )("%s uses only known info keys", (rel) => {
    const abs = quizFiles.find((f) => f.rel === rel)?.abs as string;
    const data = JSON.parse(fs.readFileSync(abs, "utf8")) as Record<
      string,
      unknown
    >;

    for (const key of Object.keys(data)) {
      expect(knownKeys.has(key)).toBe(true);
    }
  });

  it("gives every question at least two distinct options", () => {
    // prepareQuizQuestions treats options[0] as the answer before shuffling,
    // so a question with fewer than two options has no wrong answer to offer,
    // and a duplicated option makes indexOf pick the wrong correct index.
    for (const { abs } of quizFiles) {
      const data = JSON.parse(fs.readFileSync(abs, "utf8")) as Record<
        string,
        { question: string; options: string[] }[]
      >;

      for (const questions of Object.values(data)) {
        for (const q of questions) {
          expect(q.options.length).toBeGreaterThan(1);
          expect(new Set(q.options).size).toBe(q.options.length);
        }
      }
    }
  });
});

describe("step_sequence placeholder assets", () => {
  const STEPS_DIR = path.join(PUBLIC_ASSETS, "artworks", "dance", "steps");

  type TiledProperty = {
    name: string;
    value: unknown;
  };
  type TiledObject = {
    name?: string;
    properties?: TiledProperty[];
  };
  type TiledLayer = {
    objects?: TiledObject[];
    layers?: TiledLayer[];
  };

  function collectObjects(layers: TiledLayer[]): TiledObject[] {
    return layers.flatMap((layer) => [
      ...(layer.objects ?? []),
      ...collectObjects(layer.layers ?? []),
    ]);
  }

  const map = JSON.parse(
    fs.readFileSync(
      path.join(PUBLIC_ASSETS, LEVEL_REGISTRY.level_03.map.json),
      "utf-8",
    ),
  ) as TiledLayer;

  const placeholders = collectObjects(map.layers ?? []).filter((obj) =>
    obj.properties?.some(
      (p) => p.name === "type" && p.value === "step_sequence",
    ),
  );

  it("finds at least one step_sequence placeholder in the level 3 map", () => {
    expect(placeholders.length).toBeGreaterThan(0);
  });

  it("finds at least one genius_sequence placeholder in the level 3 map", () => {
    const geniusPlaceholders = collectObjects(map.layers ?? []).filter((obj) =>
      obj.properties?.some(
        (p) => p.name === "type" && p.value === "genius_sequence",
      ),
    );
    expect(geniusPlaceholders.length).toBeGreaterThan(0);
  });

  // The card and slot images are resolved by convention from the ids authored
  // on the Tiled object, so a renamed id silently becomes a broken image.
  it.each(
    placeholders.map((obj) => obj.name ?? "unnamed"),
  )("%s: every authored step id has a matching gif on disk", (name) => {
    const placeholder = placeholders.find(
      (obj) => (obj.name ?? "unnamed") === name,
    );
    const raw = placeholder?.properties?.find((p) => p.name === "id")?.value;

    const ids = Array.isArray(raw)
      ? (raw as { value: string }[]).map((entry) => entry.value)
      : String(raw)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

    expect(ids.length).toBeGreaterThanOrEqual(2);

    for (const id of ids) {
      expect(fs.existsSync(path.join(STEPS_DIR, `${id}.gif`))).toBe(true);
    }
  });
});
