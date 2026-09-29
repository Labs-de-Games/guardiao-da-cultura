import type posthog from "posthog-js";
import {
  applyFirstTouchCampaignSource,
  applyFirstTouchEntryOrigin,
  applyFirstTouchTurmaSource,
} from "../edital/campaign";
import type { PostHogStub } from "../posthogStub";

type PostHogLike = Pick<
  typeof posthog | PostHogStub,
  "get_property" | "register"
>;

/**
 * Module-level mutable singleton (issue #740: "singleton mutável de
 * módulo... importável tanto do React quanto do Phaser"). React code
 * (PostHogProvider) and Phaser code (game scenes/systems) both import
 * `setChapterId`/`getEventContext` directly — this is the one shared
 * place either side can read or write without needing a reference to the
 * PostHog client itself. `before_send` (beforeSend.ts) reads this to
 * stamp `chapter_id` onto every event, including ones this module never
 * sees directly.
 */
interface EventContextState {
  anonymousPlayerId: string | null;
  chapterId: string | null;
  campaignSource: string | null;
}

const state: EventContextState = {
  anonymousPlayerId: null,
  chapterId: null,
  campaignSource: null,
};

export function getEventContext(): Readonly<EventContextState> {
  return state;
}

export function setAnonymousPlayerId(id: string | null): void {
  state.anonymousPlayerId = id;
}

/** Called by game code when a chapter/level starts or ends (e.g. Game.ts). */
export function setChapterId(chapterId: string | null): void {
  state.chapterId = chapterId;
}

export function setCampaignSource(source: string | null): void {
  state.campaignSource = source;
}

/**
 * Stable-property injection via `register()`, called once from the
 * PostHog client's `loaded:` callback. This is the "for stable properties"
 * half of a two-mechanism design — `before_send` (lib/posthog/beforeSend.ts)
 * is the separate, never-throwing backstop for anything `register()` misses.
 */
export function registerEventContext(
  client: PostHogLike,
  options: {
    environment: string;
    searchParams: URLSearchParams;
  },
): void {
  client.register({ environment: options.environment });
  // Before campaign_source: it reads the entry origin (#851).
  applyFirstTouchEntryOrigin(client, options.searchParams);
  applyFirstTouchCampaignSource(client, options.searchParams);
  applyFirstTouchTurmaSource(client, options.searchParams);

  const campaignSource = client.get_property("campaign_source");
  const resolvedCampaignSource =
    typeof campaignSource === "string" && campaignSource.length > 0
      ? campaignSource
      : null;
  setCampaignSource(resolvedCampaignSource);

  // origin_label: a human-readable label for campaign_source. No registry
  // of known origins exists yet at this point in the epic (#746 adds one
  // later, in lib/edital/origins.ts) — until then this mirrors the raw
  // slug, same "never fabricate an unknown label" rule #746 later
  // formalizes, rather than guessing a name for it.
  client.register({
    origin_label: resolvedCampaignSource ?? "direto",
  });
}
