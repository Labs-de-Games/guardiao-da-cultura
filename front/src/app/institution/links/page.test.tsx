import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import posthog from "posthog-js";
import {
  createCampaignLink,
  deleteCampaignLink,
  getCampaigns,
  listCampaignLinks,
} from "@/lib/api/edital";
import InstitutionLinksPage from "./page";

jest.mock("@/lib/api/edital", () => ({
  getCampaigns: jest.fn(),
  listCampaignLinks: jest.fn(),
  createCampaignLink: jest.fn(),
  deleteCampaignLink: jest.fn(),
}));

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { capture: jest.fn() },
}));

const writeTextMock = jest.fn().mockResolvedValue(undefined);
Object.assign(navigator, { clipboard: { writeText: writeTextMock } });

const EXISTING_LINK = {
  id: "id-1",
  source: "group-a",
  url: "https://staging.example.com/?utm_institution=escola-teste&utm_source=group-a",
  createdAt: "2026-01-01T00:00:00.000Z",
};

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
    (listCampaignLinks as jest.Mock).mockReset();
    (listCampaignLinks as jest.Mock).mockResolvedValue({
      linked: true,
      data: [EXISTING_LINK],
    });
    (createCampaignLink as jest.Mock).mockReset();
    (deleteCampaignLink as jest.Mock).mockReset();
    writeTextMock.mockClear();
    (posthog.capture as jest.Mock).mockClear();
  });

  it("has no institution-slug picker — the slug is never chosen here", () => {
    render(<InstitutionLinksPage />);

    expect(screen.queryByLabelText("Slug da instituição")).toBeNull();
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

  it("lists existing campaign links on load", async () => {
    render(<InstitutionLinksPage />);

    await waitFor(() =>
      expect(screen.getByText("group-a")).toBeInTheDocument(),
    );
    expect(screen.getByText(EXISTING_LINK.url)).toBeInTheDocument();
  });

  it("disables the create button until a valid group label is entered", async () => {
    render(<InstitutionLinksPage />);

    const createButton = screen.getByRole("button", { name: "Criar link" });
    expect(createButton).toBeDisabled();

    const input = screen.getByLabelText("Nome da turma/grupo");
    fireEvent.change(input, { target: { value: "group-b" } });

    await waitFor(() => expect(createButton).not.toBeDisabled());
  });

  it("creates a new link with only the group label, then refreshes the list", async () => {
    (createCampaignLink as jest.Mock).mockResolvedValue({
      linked: true,
      data: {
        id: "id-2",
        source: "group-b",
        url: "https://staging.example.com/?utm_institution=escola-teste&utm_source=group-b",
        createdAt: "2026-01-02T00:00:00.000Z",
      },
    });

    render(<InstitutionLinksPage />);
    await waitFor(() =>
      expect(screen.getByText("group-a")).toBeInTheDocument(),
    );

    const input = screen.getByLabelText("Nome da turma/grupo");
    fireEvent.change(input, { target: { value: "group-b" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar link" }));

    await waitFor(() =>
      expect(createCampaignLink).toHaveBeenCalledWith("group-b"),
    );
    await waitFor(() => expect(listCampaignLinks).toHaveBeenCalledTimes(2));
  });

  it("asks for confirmation before deleting a link", async () => {
    render(<InstitutionLinksPage />);
    await waitFor(() =>
      expect(screen.getByText("group-a")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByLabelText("Excluir link de group-a"));

    expect(await screen.findByText("Excluir link?")).toBeInTheDocument();
    expect(deleteCampaignLink).not.toHaveBeenCalled();
  });

  it("cancelling the confirmation does not delete the link", async () => {
    render(<InstitutionLinksPage />);
    await waitFor(() =>
      expect(screen.getByText("group-a")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByLabelText("Excluir link de group-a"));
    fireEvent.click(await screen.findByText("Cancelar"));

    await waitFor(() =>
      expect(screen.queryByText("Excluir link?")).not.toBeInTheDocument(),
    );
    expect(deleteCampaignLink).not.toHaveBeenCalled();
  });

  it("confirming the dialog deletes the link and refreshes the list", async () => {
    (deleteCampaignLink as jest.Mock).mockResolvedValue(undefined);

    render(<InstitutionLinksPage />);
    await waitFor(() =>
      expect(screen.getByText("group-a")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByLabelText("Excluir link de group-a"));
    fireEvent.click(await screen.findByText("Excluir"));

    await waitFor(() =>
      expect(deleteCampaignLink).toHaveBeenCalledWith("id-1"),
    );
    await waitFor(() => expect(listCampaignLinks).toHaveBeenCalledTimes(2));
  });

  it("copies a link's URL via navigator.clipboard.writeText", async () => {
    render(<InstitutionLinksPage />);
    await waitFor(() =>
      expect(screen.getByText("group-a")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByLabelText("Copiar link de group-a"));

    await waitFor(() =>
      expect(writeTextMock).toHaveBeenCalledWith(EXISTING_LINK.url),
    );
  });

  it("never emits any PostHog event on this page", async () => {
    render(<InstitutionLinksPage />);
    await waitFor(() =>
      expect(screen.getByText("group-a")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByLabelText("Copiar link de group-a"));

    await waitFor(() => expect(writeTextMock).toHaveBeenCalled());
    expect(posthog.capture).not.toHaveBeenCalled();
  });
});
