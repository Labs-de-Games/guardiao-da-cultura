import { render, screen, waitFor } from "@testing-library/react";
import { ConsentProvider } from "@/lib/consent/ConsentContext";
import {
  CONSENT_STORAGE_KEY,
  writeConsent,
} from "@/lib/consent/consentStorage";
import { ConsentGuard } from "./ConsentGuard";

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { opt_out_capturing: jest.fn(), reset: jest.fn() },
}));

function renderGuard() {
  return render(
    <ConsentProvider>
      <ConsentGuard>
        <div>game</div>
      </ConsentGuard>
    </ConsentProvider>,
  );
}

describe("ConsentGuard", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.cookie = "gp_analytics_consent=; path=/; Max-Age=0";
  });

  it("does not mount the game before the player answers", async () => {
    renderGuard();

    // Even after the provider's effect has run, nothing is rendered: Phaser
    // must not boot behind an unanswered dialog, including on a direct /game hit.
    await waitFor(() => expect(screen.queryByText("game")).toBeNull());
  });

  it("mounts the game once the player accepts", async () => {
    writeConsent("accepted");

    renderGuard();

    expect(await screen.findByText("game")).toBeInTheDocument();
  });

  it("mounts the game once the player refuses — refusal never blocks play", async () => {
    writeConsent("declined");

    renderGuard();

    expect(await screen.findByText("game")).toBeInTheDocument();
  });

  it("holds the game back again when the notice retires an acceptance", async () => {
    // A stale decision has to block exactly like an absent one, or the
    // renewal dialog would sit on top of a game that already booted.
    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        status: "accepted",
        decidedAt: "2020-01-01T00:00:00.000Z",
        noticeVersion: "2020-01-01",
      }),
    );

    renderGuard();

    await waitFor(() => expect(screen.queryByText("game")).toBeNull());
  });

  it("keeps mounting the game for a stale refusal — refusals never age out", async () => {
    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        status: "declined",
        decidedAt: "2020-01-01T00:00:00.000Z",
        noticeVersion: "2020-01-01",
      }),
    );

    renderGuard();

    expect(await screen.findByText("game")).toBeInTheDocument();
  });
});
