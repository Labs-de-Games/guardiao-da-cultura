import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import posthog from "posthog-js";
import { ConsentProvider } from "@/lib/consent/ConsentContext";
import {
  CONSENT_STORAGE_KEY,
  readConsent,
  writeConsent,
} from "@/lib/consent/consentStorage";
import { reloadPage } from "@/lib/consent/posthogTeardown";
import { PRIVACY_NOTICE_VERSION } from "@/lib/consent/privacyNotice";
import { ConsentGate } from "./ConsentGate";

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: {
    opt_out_capturing: jest.fn(),
    reset: jest.fn(),
  },
}));

// Refusing a renewal goes through `revoke`, which reloads the page — jsdom
// cannot redefine `window.location`, so the seam is mocked instead.
jest.mock("@/lib/consent/posthogTeardown", () => ({
  ...jest.requireActual("@/lib/consent/posthogTeardown"),
  reloadPage: jest.fn(),
}));

function renderGate(children?: React.ReactNode) {
  return render(
    <ConsentProvider>
      {children}
      <ConsentGate />
    </ConsentProvider>,
  );
}

describe("ConsentGate", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.cookie = "gp_analytics_consent=; path=/; Max-Age=0";
    jest.clearAllMocks();
  });

  it("appears on a first visit", async () => {
    renderGate();

    expect(
      await screen.findByRole("heading", { name: "Dados de uso do jogo" }),
    ).toBeInTheDocument();
  });

  it("is a real modal dialog", async () => {
    renderGate();

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("Dados de uso do jogo");
    expect(dialog).toHaveAccessibleDescription(/dados de uso/i);
  });

  it("offers both choices with nothing pre-selected", async () => {
    renderGate();

    const decline = await screen.findByRole("button", {
      name: "Continuar sem dados de uso",
    });
    const accept = screen.getByRole("button", { name: "Aceitar dados de uso" });

    for (const button of [decline, accept]) {
      expect(button).not.toHaveAttribute("aria-pressed", "true");
      expect(button).not.toHaveAttribute("autofocus");
      expect(button).toBeEnabled();
    }
  });

  it("puts accept first and decline second", async () => {
    // A product decision, and a departure from #864's "destaque visual
    // equivalente" — pinned here so the order cannot drift back unnoticed.
    renderGate();
    await screen.findByRole("dialog");

    const labels = screen
      .getAllByRole("button")
      .map((button) => button.textContent);

    expect(labels).toEqual([
      "Aceitar dados de uso",
      "Continuar sem dados de uso",
    ]);
  });

  it("keeps both choices reachable and clickable despite the styling", async () => {
    // Accept is visually dominant now; refusing must stay exactly as cheap —
    // one click, same row, no extra step.
    renderGate();

    const decline = await screen.findByRole("button", {
      name: "Continuar sem dados de uso",
    });

    fireEvent.click(decline);

    expect(readConsent()?.status).toBe("declined");
  });

  it("links to the privacy notice", async () => {
    renderGate();

    expect(
      await screen.findByRole("link", { name: "Saiba mais" }),
    ).toHaveAttribute("href", "/privacidade");
  });

  it("moves focus into the dialog when it appears", async () => {
    renderGate();

    expect(await screen.findByRole("dialog")).toHaveFocus();
  });

  describe("forcing a response (#864)", () => {
    it("cannot be dismissed with Escape — there is no default choice", async () => {
      renderGate();
      const dialog = await screen.findByRole("dialog");

      fireEvent.keyDown(dialog, { key: "Escape" });

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(readConsent()).toBeNull();
    });

    it("cannot be dismissed by clicking the backdrop", async () => {
      const { container } = renderGate();
      await screen.findByRole("dialog");

      // The backdrop is the dialog's parent — the only thing a click outside
      // the panel can land on.
      const backdrop = container.firstElementChild as HTMLElement;
      fireEvent.click(backdrop);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(readConsent()).toBeNull();
    });

    it("traps Tab at the end of the dialog", async () => {
      renderGate(<button type="button">Jogar</button>);
      await screen.findByRole("dialog");

      const link = screen.getByRole("link", { name: "Saiba mais" });
      link.focus();

      fireEvent.keyDown(link, { key: "Tab" });

      // Wraps to the first control, which is the accept button — it leads the
      // row now that the two choices are ordered accept-then-decline.
      expect(
        screen.getByRole("button", { name: "Aceitar dados de uso" }),
      ).toHaveFocus();
    });

    it("traps Shift+Tab at the start of the dialog", async () => {
      renderGate(<button type="button">Jogar</button>);
      await screen.findByRole("dialog");

      const accept = screen.getByRole("button", {
        name: "Aceitar dados de uso",
      });
      accept.focus();

      fireEvent.keyDown(accept, { key: "Tab", shiftKey: true });

      expect(screen.getByRole("link", { name: "Saiba mais" })).toHaveFocus();
    });

    it("wraps Shift+Tab from the dialog container rather than escaping it", async () => {
      renderGate(<button type="button">Jogar</button>);
      const dialog = await screen.findByRole("dialog");

      // Focus starts on the container, which sits before the controls.
      fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });

      expect(screen.getByRole("link", { name: "Saiba mais" })).toHaveFocus();
    });
  });

  describe("either answer lets the player through", () => {
    it("records an acceptance and disappears", async () => {
      renderGate();

      fireEvent.click(
        await screen.findByRole("button", { name: "Aceitar dados de uso" }),
      );

      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(readConsent()?.status).toBe("accepted");
    });

    it("records a refusal and disappears — refusing never costs access", async () => {
      renderGate();

      fireEvent.click(
        await screen.findByRole("button", {
          name: "Continuar sem dados de uso",
        }),
      );

      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(readConsent()?.status).toBe("declined");
    });
  });

  it("stays hidden for a player who already decided", async () => {
    writeConsent("declined");

    renderGate();

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  /**
   * A material revision of the privacy notice retires every acceptance taken
   * under the old text, and the gate comes back to ask again (issue #864).
   */
  describe("renewal after the notice changes", () => {
    function storeAgedAcceptance() {
      window.localStorage.setItem(
        CONSENT_STORAGE_KEY,
        JSON.stringify({
          status: "accepted",
          decidedAt: "2020-01-01T00:00:00.000Z",
          noticeVersion: "2020-01-01",
        }),
      );
    }

    it("re-asks a player whose acceptance went stale", async () => {
      storeAgedAcceptance();

      renderGate();

      expect(
        await screen.findByRole("heading", {
          name: "Atualizamos nosso aviso de privacidade",
        }),
      ).toBeInTheDocument();
    });

    it("says why it is asking again, and that nothing is being collected", async () => {
      storeAgedAcceptance();

      renderGate();

      const dialog = await screen.findByRole("dialog");
      expect(dialog).toHaveAccessibleDescription(
        /aviso de privacidade mudou desde a sua última escolha/i,
      );
      expect(dialog).toHaveAccessibleDescription(/nada está sendo coletado/i);
    });

    it("still offers both choices, both usable", async () => {
      storeAgedAcceptance();

      renderGate();

      expect(
        await screen.findByRole("button", { name: "Aceitar dados de uso" }),
      ).toBeEnabled();
      expect(
        screen.getByRole("button", { name: "Continuar sem dados de uso" }),
      ).toBeEnabled();
    });

    it("re-stamps the current notice version on a renewed acceptance", async () => {
      storeAgedAcceptance();

      renderGate();
      fireEvent.click(
        await screen.findByRole("button", { name: "Aceitar dados de uso" }),
      );

      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(readConsent()?.noticeVersion).toBe(PRIVACY_NOTICE_VERSION);
    });

    it("wipes PostHog's storage when the renewal is refused", async () => {
      // Unlike a first-time refusal, this player accepted once — identifiers
      // from those earlier sessions are still in the browser and merely
      // recording the new choice would leave them behind.
      storeAgedAcceptance();

      renderGate();
      fireEvent.click(
        await screen.findByRole("button", {
          name: "Continuar sem dados de uso",
        }),
      );

      await waitFor(() => expect(readConsent()?.status).toBe("declined"));
      expect(posthog.opt_out_capturing).toHaveBeenCalled();
      expect(posthog.reset).toHaveBeenCalledWith(true);
      expect(reloadPage).toHaveBeenCalled();
    });
  });
});
