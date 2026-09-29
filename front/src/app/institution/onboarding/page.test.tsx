import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { INSTITUTION_TERMS_VERSION } from "@/lib/consent/institutionTerms";
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
  acceptTerms();
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
}

/** The mandatory Terms of Use checkbox (issue #338). */
function acceptTerms(): void {
  fireEvent.click(
    screen.getByRole("checkbox", { name: "Li e aceito os Termos de Uso" }),
  );
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
      termsAccepted: true,
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

  describe("terms acceptance (issue #338)", () => {
    it("disables the submit button until the terms are accepted", () => {
      render(<InstitutionOnboardingPage />);

      expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();

      acceptTerms();

      expect(screen.getByRole("button", { name: "Continuar" })).toBeEnabled();
    });

    it("does not onboard when the terms are left unchecked", async () => {
      render(<InstitutionOnboardingPage />);

      fireEvent.change(screen.getByLabelText(/Nome da instituição/), {
        target: { value: "Escola Teste" },
      });
      // Submitting the form directly, as pressing Enter in the field does —
      // a disabled button does not stop that path.
      fireEvent.submit(screen.getByRole("button", { name: "Continuar" }));

      expect(
        await screen.findByText(
          "É necessário aceitar os Termos de Uso para continuar.",
        ),
      ).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("sends the accepted version to the proxy", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(200, { institutionSlug: "escola-teste" }),
      );
      render(<InstitutionOnboardingPage />);

      submit();

      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(body).toEqual({
        institutionName: "Escola Teste",
        termsAccepted: true,
        termsVersion: INSTITUTION_TERMS_VERSION,
      });
    });
  });
});
