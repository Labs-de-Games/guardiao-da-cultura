import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { INSTITUTION_TERMS_VERSION } from "@/lib/consent/institutionTerms";
import InstitutionTermsPage from "./page";

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

function acceptTerms(): void {
  fireEvent.click(
    screen.getByRole("checkbox", { name: "Li e aceito os Termos de Uso" }),
  );
}

function submit(): void {
  acceptTerms();
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
}

function jsonResponse(status: number, body: unknown = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("InstitutionTermsPage", () => {
  beforeEach(() => {
    updateMock.mockReset().mockResolvedValue(undefined);
    hardNavigateMock.mockReset();
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("disables the submit button until the terms are accepted", () => {
    render(<InstitutionTermsPage />);

    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();

    acceptTerms();

    expect(screen.getByRole("button", { name: "Continuar" })).toBeEnabled();
  });

  it("records the acceptance, refreshes the session, then navigates", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { termsAccepted: true }));
    render(<InstitutionTermsPage />);

    submit();

    await waitFor(() =>
      expect(hardNavigateMock).toHaveBeenCalledWith("/institution"),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/institution/terms",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toEqual({
      termsAccepted: true,
      termsVersion: INSTITUTION_TERMS_VERSION,
    });
    expect(updateMock).toHaveBeenCalledWith({ termsAccepted: true });
    // The session must carry the consent before the dashboard is requested,
    // or middleware bounces the user straight back here.
    expect(updateMock.mock.invocationCallOrder[0]).toBeLessThan(
      hardNavigateMock.mock.invocationCallOrder[0],
    );
  });

  it("does not submit when the terms are left unchecked", async () => {
    render(<InstitutionTermsPage />);

    fireEvent.submit(screen.getByRole("button", { name: "Continuar" }));

    expect(
      await screen.findByText(
        "É necessário aceitar os Termos de Uso para continuar.",
      ),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("tells the user to reload when the server reports a stale version", async () => {
    // 400 is the version mismatch. Retrying the same payload can never
    // succeed, so the message has to point at the only thing that helps.
    fetchMock.mockResolvedValue(jsonResponse(400));
    render(<InstitutionTermsPage />);

    submit();

    expect(
      await screen.findByText(
        "Os termos foram atualizados enquanto esta página estava aberta. Recarregue para ver a versão atual.",
      ),
    ).toBeInTheDocument();
    expect(hardNavigateMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("shows a generic error and stays put on other failures", async () => {
    fetchMock.mockResolvedValue(jsonResponse(502));
    render(<InstitutionTermsPage />);

    submit();

    expect(
      await screen.findByText(
        "Não foi possível registrar o aceite. Tente novamente.",
      ),
    ).toBeInTheDocument();
    expect(hardNavigateMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Continuar" })).toBeEnabled();
  });

  it("shows an error when the request itself fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    render(<InstitutionTermsPage />);

    submit();

    expect(
      await screen.findByText(
        "Não foi possível registrar o aceite. Tente novamente.",
      ),
    ).toBeInTheDocument();
    expect(hardNavigateMock).not.toHaveBeenCalled();
  });

  it("still navigates when the session update throws", async () => {
    // The consent is already recorded server-side; a resubmit is idempotent
    // and repeats the update, so stranding the user here helps nobody.
    fetchMock.mockResolvedValue(jsonResponse(200, { termsAccepted: true }));
    updateMock.mockRejectedValue(new Error("network"));
    render(<InstitutionTermsPage />);

    submit();

    await waitFor(() =>
      expect(hardNavigateMock).toHaveBeenCalledWith("/institution"),
    );
  });
});
