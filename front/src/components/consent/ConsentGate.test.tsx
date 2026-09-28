import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ConsentProvider } from "@/lib/consent/ConsentContext";
import { readConsent, writeConsent } from "@/lib/consent/consentStorage";
import { ConsentGate } from "./ConsentGate";

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: {
    opt_out_capturing: jest.fn(),
    reset: jest.fn(),
  },
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

      expect(
        screen.getByRole("button", { name: "Continuar sem dados de uso" }),
      ).toHaveFocus();
    });

    it("traps Shift+Tab at the start of the dialog", async () => {
      renderGate(<button type="button">Jogar</button>);
      await screen.findByRole("dialog");

      const decline = screen.getByRole("button", {
        name: "Continuar sem dados de uso",
      });
      decline.focus();

      fireEvent.keyDown(decline, { key: "Tab", shiftKey: true });

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
});
