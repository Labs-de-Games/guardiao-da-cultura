import { CAMPAIGN_SOURCE_PROPERTY } from "../edital/campaign";
import { PostHogStub } from "../posthogStub";
import { registerEventContext } from "./eventContext";

describe("registerEventContext", () => {
  it("registers the environment as a super property", () => {
    const client = new PostHogStub();

    registerEventContext(client, {
      environment: "production",
      searchParams: new URLSearchParams(),
    });

    expect(client.get_property("environment")).toBe("production");
  });

  it("also applies first-touch campaign_source when present in the URL", () => {
    const client = new PostHogStub();

    registerEventContext(client, {
      environment: "production",
      searchParams: new URLSearchParams({ utm_institution: "escola-teste" }),
    });

    expect(client.get_property(CAMPAIGN_SOURCE_PROPERTY)).toBe("escola-teste");
  });
});
