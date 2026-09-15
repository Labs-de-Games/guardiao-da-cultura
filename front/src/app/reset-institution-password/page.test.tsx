import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ResetInstitutionPasswordPage from "./page";

const postMock = jest.fn();

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt as string} src={props.src as string} />
  ),
}));

jest.mock("@/lib/api/client", () => ({
  apiClient: { post: (...args: unknown[]) => postMock(...args) },
}));

describe("ResetInstitutionPasswordPage", () => {
  beforeEach(() => {
    postMock.mockReset();
    window.history.replaceState({}, "", "/reset-institution-password");
  });

  it("shows invalid token alert when no token is present", () => {
    render(<ResetInstitutionPasswordPage />);
    expect(screen.getByText("Link inválido")).toBeInTheDocument();
    expect(
      screen.getByText("Link inválido ou inexistente."),
    ).toBeInTheDocument();
  });

  it("renders the password form when token is present", () => {
    window.history.replaceState(
      {},
      "",
      "/reset-institution-password?token=abc123",
    );
    render(<ResetInstitutionPasswordPage />);
    expect(
      screen.getByRole("heading", { name: "Redefinir senha" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Nova senha/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Atualizar senha" }),
    ).toBeInTheDocument();
  });

  it("submits the new password and shows success message", async () => {
    postMock.mockResolvedValue({});
    window.history.replaceState(
      {},
      "",
      "/reset-institution-password?token=abc123",
    );
    render(<ResetInstitutionPasswordPage />);

    fireEvent.change(screen.getByLabelText(/Nova senha/), {
      target: { value: "new-password-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Atualizar senha" }));

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith("/auth/password/reset/confirm", {
        token: "abc123",
        newPassword: "new-password-123",
      }),
    );
    expect(await screen.findByText("Senha atualizada")).toBeInTheDocument();
  });

  it("shows error message on failed submission", async () => {
    postMock.mockRejectedValue(new Error("Invalid token"));
    window.history.replaceState(
      {},
      "",
      "/reset-institution-password?token=abc123",
    );
    render(<ResetInstitutionPasswordPage />);

    fireEvent.change(screen.getByLabelText(/Nova senha/), {
      target: { value: "new-password-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Atualizar senha" }));

    expect(
      await screen.findByText("Link inválido ou expirado. Solicite um novo."),
    ).toBeInTheDocument();
  });

  it("links back to login from invalid token view", () => {
    render(<ResetInstitutionPasswordPage />);
    const link = screen.getByText("Voltar ao login");
    expect(link).toHaveAttribute("href", "/login");
  });
});
