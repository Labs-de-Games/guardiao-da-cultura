import { PostHogStub } from "../posthogStub";
import {
  applyFirstTouchCampaignSource,
  CAMPAIGN_SOURCE_PROPERTY,
  INSTITUTION_UTM_PARAM,
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
});
