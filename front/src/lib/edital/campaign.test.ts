import { PostHogStub } from "../posthogStub";
import {
  applyFirstTouchCampaignSource,
  applyFirstTouchTurmaSource,
  CAMPAIGN_SOURCE_PROPERTY,
  INSTITUTION_UTM_PARAM,
  TURMA_SOURCE_PROPERTY,
  TURMA_UTM_PARAM,
} from "./campaign";

describe("applyFirstTouchCampaignSource", () => {
  it("registers campaign_source when utm_institution is present and none is set yet", () => {
    const client = new PostHogStub();
    const params = new URLSearchParams({
      [INSTITUTION_UTM_PARAM]: "escola-teste",
    });

    applyFirstTouchCampaignSource(client, params);

    expect(client.get_property(CAMPAIGN_SOURCE_PROPERTY)).toBe("escola-teste");
  });

  it("does nothing when utm_institution is absent", () => {
    const client = new PostHogStub();
    const params = new URLSearchParams();

    applyFirstTouchCampaignSource(client, params);

    expect(client.get_property(CAMPAIGN_SOURCE_PROPERTY)).toBeUndefined();
  });

  it("does not overwrite an already-registered campaign_source (first-touch)", () => {
    const client = new PostHogStub();
    client.register({ [CAMPAIGN_SOURCE_PROPERTY]: "escola-primeira" });
    const params = new URLSearchParams({
      [INSTITUTION_UTM_PARAM]: "escola-segunda",
    });

    applyFirstTouchCampaignSource(client, params);

    expect(client.get_property(CAMPAIGN_SOURCE_PROPERTY)).toBe(
      "escola-primeira",
    );
  });

  it("still carries campaign_source on a bare URL once first-touch is set", () => {
    const client = new PostHogStub();
    client.register({ [CAMPAIGN_SOURCE_PROPERTY]: "escola-teste" });
    const bareParams = new URLSearchParams();

    applyFirstTouchCampaignSource(client, bareParams);

    expect(client.get_property(CAMPAIGN_SOURCE_PROPERTY)).toBe("escola-teste");
  });

  it("rejects a poisoned utm_institution value instead of registering it (#740)", () => {
    const client = new PostHogStub();
    const params = new URLSearchParams({
      [INSTITUTION_UTM_PARAM]: "<script>alert(1)</script>",
    });

    applyFirstTouchCampaignSource(client, params);

    expect(client.get_property(CAMPAIGN_SOURCE_PROPERTY)).toBeUndefined();
  });

  it("rejects an oversized utm_institution value", () => {
    const client = new PostHogStub();
    const params = new URLSearchParams({
      [INSTITUTION_UTM_PARAM]: "a".repeat(101),
    });

    applyFirstTouchCampaignSource(client, params);

    expect(client.get_property(CAMPAIGN_SOURCE_PROPERTY)).toBeUndefined();
  });

  it("rejects uppercase, underscores, and double hyphens", () => {
    const client = new PostHogStub();
    for (const bad of ["Escola-Teste", "escola_teste", "escola--teste"]) {
      const params = new URLSearchParams({ [INSTITUTION_UTM_PARAM]: bad });
      applyFirstTouchCampaignSource(client, params);
      expect(client.get_property(CAMPAIGN_SOURCE_PROPERTY)).toBeUndefined();
    }
  });

  it("accepts a well-formed slug", () => {
    const client = new PostHogStub();
    const params = new URLSearchParams({
      [INSTITUTION_UTM_PARAM]: "escola-municipal-centro-2",
    });

    applyFirstTouchCampaignSource(client, params);

    expect(client.get_property(CAMPAIGN_SOURCE_PROPERTY)).toBe(
      "escola-municipal-centro-2",
    );
  });
});

describe("applyFirstTouchTurmaSource (#807)", () => {
  it("registers turma_source when utm_source is present and none is set yet", () => {
    const client = new PostHogStub();
    const params = new URLSearchParams({ [TURMA_UTM_PARAM]: "group-a" });

    applyFirstTouchTurmaSource(client, params);

    expect(client.get_property(TURMA_SOURCE_PROPERTY)).toBe("group-a");
  });

  it("does nothing when utm_source is absent", () => {
    const client = new PostHogStub();
    const params = new URLSearchParams();

    applyFirstTouchTurmaSource(client, params);

    expect(client.get_property(TURMA_SOURCE_PROPERTY)).toBeUndefined();
  });

  it("does not overwrite an already-registered turma_source (first-touch)", () => {
    const client = new PostHogStub();
    client.register({ [TURMA_SOURCE_PROPERTY]: "group-a" });
    const params = new URLSearchParams({ [TURMA_UTM_PARAM]: "group-b" });

    applyFirstTouchTurmaSource(client, params);

    expect(client.get_property(TURMA_SOURCE_PROPERTY)).toBe("group-a");
  });

  it("rejects a poisoned utm_source value instead of registering it", () => {
    const client = new PostHogStub();
    const params = new URLSearchParams({
      [TURMA_UTM_PARAM]: "<script>alert(1)</script>",
    });

    applyFirstTouchTurmaSource(client, params);

    expect(client.get_property(TURMA_SOURCE_PROPERTY)).toBeUndefined();
  });

  it("is independent of campaign_source — both can be first-touch registered separately", () => {
    const client = new PostHogStub();
    const params = new URLSearchParams({
      [INSTITUTION_UTM_PARAM]: "escola-teste",
      [TURMA_UTM_PARAM]: "group-a",
    });

    applyFirstTouchCampaignSource(client, params);
    applyFirstTouchTurmaSource(client, params);

    expect(client.get_property(CAMPAIGN_SOURCE_PROPERTY)).toBe("escola-teste");
    expect(client.get_property(TURMA_SOURCE_PROPERTY)).toBe("group-a");
  });
});
