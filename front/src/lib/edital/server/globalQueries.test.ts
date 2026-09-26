/**
 * @jest-environment node
 */
jest.mock("server-only", () => ({}));

import * as globalQueries from "./globalQueries";
import {
  buildGlobalOriginSplitQuery,
  buildInstitutionCountQuery,
  buildTurmaCountQuery,
} from "./globalQueries";
import type { HogQLQueryPlan } from "./queries";

const range = {
  from: new Date("2026-01-01T03:00:00.000Z"),
  to: new Date("2026-01-31T02:59:59.999Z"),
};

const BUILDERS = Object.entries(globalQueries).filter(
  ([name, value]) => name.startsWith("build") && typeof value === "function",
) as [string, (r: typeof range) => HogQLQueryPlan][];

describe("public dashboard queries — unset optional properties", () => {
  it("classifies a player without campaign_source (NULL) as direct, not institutional", () => {
    const { query } = buildGlobalOriginSplitQuery(range);
    expect(query).toContain(
      "coalesce(properties.campaign_source, '') != '') AS institutional",
    );
    expect(query).toContain(
      "coalesce(properties.campaign_source, '') = '') AS spontaneous",
    );
  });

  it("guards the institution and turma counts the same way", () => {
    expect(buildInstitutionCountQuery(range).query).toContain(
      "coalesce(properties.campaign_source, '') != ''",
    );
    expect(buildTurmaCountQuery(range).query).toContain(
      "coalesce(properties.turma_source, '') != ''",
    );
  });

  it.each(
    BUILDERS,
  )("%s: never compares an optional property to '' without coalesce", (_name, build) => {
    const { query } = build(range);
    expect(query).not.toMatch(
      /(?<!coalesce\()properties\.(campaign_source|turma_source)\s*!?=\s*''/,
    );
  });
});
