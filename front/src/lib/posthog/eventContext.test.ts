import {
  CAMPAIGN_SOURCE_PROPERTY,
  ENTRY_ORIGIN_DIRECT,
  ENTRY_ORIGIN_INSTITUTIONAL,
  ENTRY_ORIGIN_PROPERTY,
  TURMA_SOURCE_PROPERTY,
} from "../edital/campaign";
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

  it("locks a direct entry so a later institution link sets no campaign_source (#851)", () => {
    const client = new PostHogStub();

    registerEventContext(client, {
      environment: "production",
      searchParams: new URLSearchParams(),
    });
    registerEventContext(client, {
      environment: "production",
      searchParams: new URLSearchParams({
        utm_institution: "escola-teste",
        utm_source: "turma-teste",
      }),
    });

    expect(client.get_property(ENTRY_ORIGIN_PROPERTY)).toBe(
      ENTRY_ORIGIN_DIRECT,
    );
    expect(client.get_property(CAMPAIGN_SOURCE_PROPERTY)).toBeUndefined();
    expect(client.get_property(TURMA_SOURCE_PROPERTY)).toBeUndefined();
  });

  it("keeps an institution-attributed device institutional on a visit without the link (#851)", () => {
    const client = new PostHogStub();
    client.register({ [CAMPAIGN_SOURCE_PROPERTY]: "escola-teste" });

    registerEventContext(client, {
      environment: "production",
      searchParams: new URLSearchParams(),
    });

    expect(client.get_property(ENTRY_ORIGIN_PROPERTY)).toBe(
      ENTRY_ORIGIN_INSTITUTIONAL,
    );
    expect(client.get_property(CAMPAIGN_SOURCE_PROPERTY)).toBe("escola-teste");
  });
});
