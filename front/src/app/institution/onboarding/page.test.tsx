import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import InstitutionOnboardingPage from "./page";

const updateMock = jest.fn();
jest.mock("next-auth/react", () => ({
  useSession: () => ({ update: updateMock }),
}));

const hardNavigateMock = jest.fn();
jest.mock("@/lib/hardNavigate", () => ({
  hardNavigate: (path: string) => hardNavigateMock(path),
}));

const fetchMock = jest.fn();
const originalFetch = global.fetch;

function submit(name = "Escola Teste"): void {
  fireEvent.change(screen.getByLabelText(/Nome da instituição/), {
    target: { value: name },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
}

function jsonResponse(status: number, body: unknown = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("InstitutionOnboardingPage", () => {
  beforeEach(() => {
    updateMock.mockReset().mockResolvedValue(undefined);
    hardNavigateMock.mockReset();
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("updates the session, then does a full navigation to the dashboard", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { institutionSlug: "escola-teste" }),
    );
    render(<InstitutionOnboardingPage />);

    submit();

    await waitFor(() =>
      expect(hardNavigateMock).toHaveBeenCalledWith("/institution"),
    );
    expect(updateMock).toHaveBeenCalledWith({
      institutionSlug: "escola-teste",
    });
    expect(updateMock.mock.invocationCallOrder[0]).toBeLessThan(
      hardNavigateMock.mock.invocationCallOrder[0],
    );
  });

  it("shows an error for a 403 (not an institution account)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(403));
    render(<InstitutionOnboardingPage />);

    submit();

    expect(
      await screen.findByText(
        "Não foi possível concluir o cadastro. Tente novamente.",
      ),
    ).toBeInTheDocument();
    expect(hardNavigateMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("shows an error and stays on the page for other failures", async () => {
    fetchMock.mockResolvedValue(jsonResponse(502));
    render(<InstitutionOnboardingPage />);

    submit();

    expect(
      await screen.findByText(
        "Não foi possível concluir o cadastro. Tente novamente.",
      ),
    ).toBeInTheDocument();
    expect(hardNavigateMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Continuar" })).toBeEnabled();
  });

  it("still navigates when the session update throws", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { institutionSlug: "escola-teste" }),
    );
    updateMock.mockRejectedValue(new Error("network"));
    render(<InstitutionOnboardingPage />);

    submit();

    await waitFor(() =>
      expect(hardNavigateMock).toHaveBeenCalledWith("/institution"),
    );
  });

  it("shows an error and re-enables the button when the request fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    render(<InstitutionOnboardingPage />);

    submit();

    expect(
      await screen.findByText(
        "Não foi possível concluir o cadastro. Tente novamente.",
      ),
    ).toBeInTheDocument();
    expect(hardNavigateMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Continuar" })).toBeEnabled();
  });
});
