import { PostHogStub } from "../posthogStub";
import {
  applyFirstTouchCampaignSource,
  applyFirstTouchEntryOrigin,
  applyFirstTouchTurmaSource,
  CAMPAIGN_SOURCE_PROPERTY,
  ENTRY_ORIGIN_DIRECT,
  ENTRY_ORIGIN_INSTITUTIONAL,
  ENTRY_ORIGIN_PROPERTY,
  INSTITUTION_UTM_PARAM,
  TURMA_SOURCE_PROPERTY,
  TURMA_UTM_PARAM,
} from "./campaign";

describe("applyFirstTouchEntryOrigin (#851)", () => {
  it("registers direct on a first visit without utm_institution", () => {
    const client = new PostHogStub();

    applyFirstTouchEntryOrigin(client, new URLSearchParams());

    expect(client.get_property(ENTRY_ORIGIN_PROPERTY)).toBe(
      ENTRY_ORIGIN_DIRECT,
    );
  });

  it("registers institutional on a first visit with a valid utm_institution", () => {
    const client = new PostHogStub();
    const params = new URLSearchParams({
      [INSTITUTION_UTM_PARAM]: "escola-teste",
    });

    applyFirstTouchEntryOrigin(client, params);

    expect(client.get_property(ENTRY_ORIGIN_PROPERTY)).toBe(
      ENTRY_ORIGIN_INSTITUTIONAL,
    );
  });

  it("registers direct when utm_institution is invalid", () => {
    const client = new PostHogStub();
    const params = new URLSearchParams({
      [INSTITUTION_UTM_PARAM]: "<script>alert(1)</script>",
    });

    applyFirstTouchEntryOrigin(client, params);

    expect(client.get_property(ENTRY_ORIGIN_PROPERTY)).toBe(
      ENTRY_ORIGIN_DIRECT,
    );
  });

  it("does not overwrite a direct entry when an institution link is opened later", () => {
    const client = new PostHogStub();
    applyFirstTouchEntryOrigin(client, new URLSearchParams());
    const params = new URLSearchParams({
      [INSTITUTION_UTM_PARAM]: "escola-teste",
    });

    applyFirstTouchEntryOrigin(client, params);
    applyFirstTouchCampaignSource(client, params);

    expect(client.get_property(ENTRY_ORIGIN_PROPERTY)).toBe(
      ENTRY_ORIGIN_DIRECT,
    );
    expect(client.get_property(CAMPAIGN_SOURCE_PROPERTY)).toBeUndefined();
  });

  it("registers institutional for a device already attributed to an institution, even without the link", () => {
    const client = new PostHogStub();
    client.register({ [CAMPAIGN_SOURCE_PROPERTY]: "escola-teste" });

    applyFirstTouchEntryOrigin(client, new URLSearchParams());

    expect(client.get_property(ENTRY_ORIGIN_PROPERTY)).toBe(
      ENTRY_ORIGIN_INSTITUTIONAL,
    );
  });

  it("keeps institutional and the first slug when a bare or different link follows", () => {
    const client = new PostHogStub();
    const first = new URLSearchParams({
      [INSTITUTION_UTM_PARAM]: "escola-primeira",
    });
    applyFirstTouchEntryOrigin(client, first);
    applyFirstTouchCampaignSource(client, first);

    for (const later of [
      new URLSearchParams(),
      new URLSearchParams({ [INSTITUTION_UTM_PARAM]: "escola-segunda" }),
    ]) {
      applyFirstTouchEntryOrigin(client, later);
      applyFirstTouchCampaignSource(client, later);
    }

    expect(client.get_property(ENTRY_ORIGIN_PROPERTY)).toBe(
      ENTRY_ORIGIN_INSTITUTIONAL,
    );
    expect(client.get_property(CAMPAIGN_SOURCE_PROPERTY)).toBe(
      "escola-primeira",
    );
  });
});

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

  it("does not register turma_source for a device whose first entry was direct (#851)", () => {
    const client = new PostHogStub();
    applyFirstTouchEntryOrigin(client, new URLSearchParams());
    const params = new URLSearchParams({
      [INSTITUTION_UTM_PARAM]: "escola-teste",
      [TURMA_UTM_PARAM]: "group-a",
    });

    applyFirstTouchEntryOrigin(client, params);
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
