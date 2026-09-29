import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import posthog from "posthog-js";
import { ConsentProvider } from "@/lib/consent/ConsentContext";
import { readConsent, writeConsent } from "@/lib/consent/consentStorage";
import { reloadPage } from "@/lib/consent/posthogTeardown";
import { EventBus } from "@/shared/events/event-bus";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { PrivacySettings } from "./PrivacySettings";

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: {
    opt_out_capturing: jest.fn(),
    reset: jest.fn(),
  },
}));

jest.mock("@/lib/env", () => ({
  env: { client: { posthogKey: "phc_test_key" } },
}));

// Only the reload is faked; the real storage sweep still runs so this suite
// asserts it for real.
jest.mock("@/lib/consent/posthogTeardown", () => ({
  ...jest.requireActual("@/lib/consent/posthogTeardown"),
  reloadPage: jest.fn(),
}));

function renderPanel() {
  return render(
    <ConsentProvider>
      <PrivacySettings />
    </ConsentProvider>,
  );
}

async function openPanel() {
  renderPanel();
  fireEvent.click(await screen.findByRole("button", { name: "Privacidade" }));
  return screen.findByRole("dialog");
}

describe("PrivacySettings", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.cookie = "gp_analytics_consent=; path=/; Max-Age=0";
    useGameUIStore.setState({ privacyOpen: false });
    jest.clearAllMocks();
  });

  it("offers an entry point on the map", async () => {
    renderPanel();
    expect(
      await screen.findByRole("button", { name: "Privacidade" }),
    ).toBeInTheDocument();
  });

  it("reports that no choice has been made yet", async () => {
    await openPanel();
    expect(screen.getByText(/ainda não escolheu/i)).toBeInTheDocument();
  });

  /**
   * The map's 10s auto-start countdown can only stand down if it hears about
   * the panel. Without this the player reading a consent notice was dropped
   * into level 01 mid-sentence, with the panel still holding focus so their
   * movement keys went nowhere.
   */
  it("announces that it is open so the map can halt its countdown", async () => {
    const emit = jest.spyOn(EventBus, "emit");
    await openPanel();

    expect(emit).toHaveBeenCalledWith("privacy:open", undefined);
    expect(useGameUIStore.getState().privacyOpen).toBe(true);
  });

  it("announces that it closed", async () => {
    await openPanel();
    const emit = jest.spyOn(EventBus, "emit");

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));

    expect(emit).toHaveBeenCalledWith("privacy:close", undefined);
    expect(useGameUIStore.getState().privacyOpen).toBe(false);
  });

  /**
   * Following "Ler o Aviso de Privacidade" leaves the game entirely. The open
   * flag lives in a module-level store that survives client-side navigation,
   * so without a cleanup it would still read true on the player's return and
   * the map would boot with an invisible modal blocking every way to start.
   */
  it("releases the open flag when it is unmounted mid-navigation", async () => {
    const { unmount } = renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: "Privacidade" }));
    expect(useGameUIStore.getState().privacyOpen).toBe(true);

    unmount();

    expect(useGameUIStore.getState().privacyOpen).toBe(false);
  });

  it("lets a player who refused authorise later", async () => {
    writeConsent("declined");
    await openPanel();

    fireEvent.click(
      screen.getByRole("button", { name: "Autorizar dados de uso" }),
    );

    await waitFor(() => expect(readConsent()?.status).toBe("accepted"));
  });

  it("offers revocation only once consent was given", async () => {
    writeConsent("accepted");
    await openPanel();

    expect(
      screen.getByRole("button", { name: "Revogar autorização" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Autorizar dados de uso" }),
    ).toBeNull();
  });

  it("revoking stops capture, clears PostHog storage and records the refusal", async () => {
    writeConsent("accepted");
    window.localStorage.setItem(
      "ph_phc_test_key_posthog",
      '{"distinct_id":"x"}',
    );
    await openPanel();

    fireEvent.click(
      screen.getByRole("button", { name: "Revogar autorização" }),
    );

    await waitFor(() => expect(readConsent()?.status).toBe("declined"));
    expect(posthog.opt_out_capturing).toHaveBeenCalled();
    expect(posthog.reset).toHaveBeenCalledWith(true);
    expect(window.localStorage.getItem("ph_phc_test_key_posthog")).toBeNull();
    // The reload is what actually silences the modules holding the singleton.
    expect(reloadPage).toHaveBeenCalled();
  });

  it("shows when the choice was recorded and under which notice version", async () => {
    writeConsent("accepted");
    await openPanel();

    expect(screen.getByText(/Escolha registrada em/i)).toBeInTheDocument();
  });

  it("links to the privacy notice", async () => {
    await openPanel();
    expect(
      screen.getByRole("link", { name: "Ler o Aviso de Privacidade" }),
    ).toHaveAttribute("href", "/privacidade");
  });

  it("closes on Escape", async () => {
    await openPanel();

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("is labelled for screen readers", async () => {
    const dialog = await openPanel();
    expect(dialog).toHaveAccessibleName("Configurações de privacidade");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });
});
