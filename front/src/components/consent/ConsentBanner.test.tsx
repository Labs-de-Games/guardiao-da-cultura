import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ConsentProvider } from "@/lib/consent/ConsentContext";
import { readConsent, writeConsent } from "@/lib/consent/consentStorage";
import { ConsentBanner } from "./ConsentBanner";

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: {
    opt_out_capturing: jest.fn(),
    reset: jest.fn(),
  },
}));

function renderBanner() {
  return render(
    <ConsentProvider>
      <ConsentBanner />
    </ConsentProvider>,
  );
}

describe("ConsentBanner", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.cookie = "gp_analytics_consent=; path=/; Max-Age=0";
  });

  it("appears on a first visit", async () => {
    renderBanner();

    expect(
      await screen.findByRole("heading", { name: "Dados de uso do jogo" }),
    ).toBeInTheDocument();
  });

  it("offers both choices with nothing pre-selected", async () => {
    renderBanner();

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

  it("links to the privacy notice", async () => {
    renderBanner();

    expect(
      await screen.findByRole("link", { name: "Saiba mais" }),
    ).toHaveAttribute("href", "/privacidade");
  });

  it("is labelled for screen readers", async () => {
    renderBanner();

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAccessibleName("Dados de uso do jogo");
    expect(dialog).toHaveAccessibleDescription(/dados de uso/i);
  });

  it("records an acceptance and disappears", async () => {
    renderBanner();

    fireEvent.click(
      await screen.findByRole("button", { name: "Aceitar dados de uso" }),
    );

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(readConsent()?.status).toBe("accepted");
  });

  it("records a refusal and disappears", async () => {
    renderBanner();

    fireEvent.click(
      await screen.findByRole("button", { name: "Continuar sem dados de uso" }),
    );

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(readConsent()?.status).toBe("declined");
  });

  it("puts both choices and the link in the tab order", async () => {
    renderBanner();
    await screen.findByRole("dialog");

    // No positive tabIndex and no disabled state anywhere: the three controls
    // are reachable in DOM order by Tab alone.
    const controls = [
      screen.getByRole("button", { name: "Continuar sem dados de uso" }),
      screen.getByRole("button", { name: "Aceitar dados de uso" }),
      screen.getByRole("link", { name: "Saiba mais" }),
    ];

    for (const control of controls) {
      expect(control).not.toHaveAttribute("tabindex");
      expect(control).not.toHaveAttribute("aria-hidden", "true");
      control.focus();
      expect(control).toHaveFocus();
    }
  });

  it("moves focus to the banner when it appears", async () => {
    renderBanner();

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveFocus();
  });

  it("stays hidden for a player who already decided", async () => {
    writeConsent("declined");

    renderBanner();

    // Give the provider's effect a chance to run before asserting absence.
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
