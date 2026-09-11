import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import posthog from "posthog-js";
import { getCampaigns } from "@/lib/api/edital";
import InstitutionLinksPage from "./page";

jest.mock("@/lib/api/edital", () => ({
  getCampaigns: jest.fn(),
}));

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { capture: jest.fn() },
}));

const writeTextMock = jest.fn().mockResolvedValue(undefined);
Object.assign(navigator, { clipboard: { writeText: writeTextMock } });

describe("InstitutionLinksPage", () => {
  beforeEach(() => {
    (getCampaigns as jest.Mock).mockReset();
    (getCampaigns as jest.Mock).mockResolvedValue({
      linked: true,
      data: [
        { source: "instagram", uniquePlayers: 30 },
        { source: "direto", uniquePlayers: 12 },
      ],
    });
    writeTextMock.mockClear();
    (posthog.capture as jest.Mock).mockClear();
  });

  it("renders the origins table with pt-BR formatted counts", async () => {
    render(<InstitutionLinksPage />);

    await waitFor(() =>
      expect(screen.getByText("instagram")).toBeInTheDocument(),
    );
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("direto")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("resolves an unknown source to its raw value, never 'Desconhecido'", async () => {
    (getCampaigns as jest.Mock).mockResolvedValue({
      linked: true,
      data: [{ source: "origem-nao-registrada", uniquePlayers: 5 }],
    });

    render(<InstitutionLinksPage />);

    await waitFor(() =>
      expect(screen.getByText("origem-nao-registrada")).toBeInTheDocument(),
    );
    expect(screen.queryByText("Desconhecido")).toBeNull();
  });

  it("disables the copy button until a valid slug is entered", async () => {
    render(<InstitutionLinksPage />);

    const copyButton = screen.getByText("Copiar link").closest("button");
    expect(copyButton).toBeDisabled();

    const slugInput = screen.getByLabelText("Slug da instituição");
    fireEvent.change(slugInput, { target: { value: "escola-teste" } });

    await waitFor(() => expect(copyButton).not.toBeDisabled());
  });

  it("copies the generated link via navigator.clipboard.writeText and shows a snackbar", async () => {
    render(<InstitutionLinksPage />);

    const slugInput = screen.getByLabelText("Slug da instituição");
    fireEvent.change(slugInput, { target: { value: "escola-teste" } });

    const copyButton = await screen.findByText("Copiar link");
    await waitFor(() =>
      expect(copyButton.closest("button")).not.toBeDisabled(),
    );
    fireEvent.click(copyButton);

    await waitFor(() =>
      expect(writeTextMock).toHaveBeenCalledWith(
        "https://guardiaodacultura.42.rio/?utm_institution=escola-teste",
      ),
    );
    expect(
      await screen.findByText("Link copiado para a área de transferência!"),
    ).toBeInTheDocument();
  });

  it("generates a link that always points at the landing page, never /game", async () => {
    render(<InstitutionLinksPage />);

    const slugInput = screen.getByLabelText("Slug da instituição");
    fireEvent.change(slugInput, { target: { value: "escola-teste" } });

    const linkField = await screen.findByLabelText("Link gerado");
    await waitFor(() =>
      expect((linkField as HTMLInputElement).value).toContain(
        "guardiaodacultura.42.rio",
      ),
    );
    expect((linkField as HTMLInputElement).value).not.toContain("/game");
  });

  it("never emits any PostHog event on this page", async () => {
    render(<InstitutionLinksPage />);

    const slugInput = screen.getByLabelText("Slug da instituição");
    fireEvent.change(slugInput, { target: { value: "escola-teste" } });

    const copyButton = await screen.findByText("Copiar link");
    await waitFor(() =>
      expect(copyButton.closest("button")).not.toBeDisabled(),
    );
    fireEvent.click(copyButton);

    await waitFor(() => expect(writeTextMock).toHaveBeenCalled());
    expect(posthog.capture).not.toHaveBeenCalled();
  });
});
