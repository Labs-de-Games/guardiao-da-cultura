import { fireEvent, render, screen } from "@testing-library/react";
import RegisterPage from "./page";

const postMock = jest.fn();

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

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText("Nome da instituição *"), {
    target: { value: "Escola Municipal" },
  });
  fireEvent.change(screen.getByLabelText("E-mail *"), {
    target: { value: "contato@escola.com" },
  });
  fireEvent.change(screen.getByLabelText("Slug da instituição *"), {
    target: { value: "escola-municipal" },
  });
}

describe("RegisterPage", () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it("renders the registration form", () => {
    render(<RegisterPage />);
    expect(
      screen.getByRole("heading", { name: "Cadastre-se" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Senha *")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirmar senha *")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cadastrar" }),
    ).toBeInTheDocument();
  });

  it("submits and shows the success message when passwords match", async () => {
    postMock.mockResolvedValue({});
    render(<RegisterPage />);

    fillRequiredFields();
    fireEvent.change(screen.getByLabelText("Senha *"), {
      target: { value: "new-password-123" },
    });
    fireEvent.change(screen.getByLabelText("Confirmar senha *"), {
      target: { value: "new-password-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(
      await screen.findByText(
        "Cadastro realizado. Verifique seu e-mail para confirmar sua conta.",
      ),
    ).toBeInTheDocument();
    expect(postMock).toHaveBeenCalledWith("/auth/password/register", {
      email: "contato@escola.com",
      password: "new-password-123",
      institutionSlug: "escola-municipal",
      nickname: "Escola Municipal",
    });
  });

  it("shows an error and does not submit when passwords don't match", async () => {
    render(<RegisterPage />);

    fillRequiredFields();
    fireEvent.change(screen.getByLabelText("Senha *"), {
      target: { value: "new-password-123" },
    });
    fireEvent.change(screen.getByLabelText("Confirmar senha *"), {
      target: { value: "different-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(
      await screen.findAllByText("As senhas não coincidem."),
    ).not.toHaveLength(0);
    expect(postMock).not.toHaveBeenCalled();
  });

  it("marks Senha as invalid (red) when too short, valid (green) at 12+ chars", () => {
    render(<RegisterPage />);
    const passwordField = screen.getByLabelText("Senha *");

    fireEvent.change(passwordField, { target: { value: "short" } });
    expect(passwordField).toHaveAttribute("aria-invalid", "true");
    expect(
      screen.getByText("A senha deve ter ao menos 12 caracteres."),
    ).toBeInTheDocument();

    fireEvent.change(passwordField, {
      target: { value: "long-enough-password" },
    });
    expect(passwordField).toHaveAttribute("aria-invalid", "false");
    expect(
      screen.queryByText("A senha deve ter ao menos 12 caracteres."),
    ).not.toBeInTheDocument();
  });

  it("marks Confirmar senha as valid (green, no error) once it matches a valid Senha", () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText("Senha *"), {
      target: { value: "long-enough-password" },
    });
    const confirmField = screen.getByLabelText("Confirmar senha *");
    fireEvent.change(confirmField, {
      target: { value: "long-enough-password" },
    });

    expect(confirmField).toHaveAttribute("aria-invalid", "false");
    expect(
      screen.queryByText("As senhas não coincidem."),
    ).not.toBeInTheDocument();
  });

  it("marks Nome da instituição as valid (green) once filled in", () => {
    render(<RegisterPage />);
    const nicknameField = screen.getByLabelText("Nome da instituição *");
    fireEvent.change(nicknameField, { target: { value: "Escola Municipal" } });
    expect(nicknameField).toHaveAttribute("aria-invalid", "false");
  });

  it("marks E-mail as invalid (red) for a malformed address, valid (green) for a real one", () => {
    render(<RegisterPage />);
    const emailField = screen.getByLabelText("E-mail *");

    fireEvent.change(emailField, { target: { value: "not-an-email" } });
    expect(emailField).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("E-mail inválido.")).toBeInTheDocument();

    fireEvent.change(emailField, { target: { value: "contato@escola.com" } });
    expect(emailField).toHaveAttribute("aria-invalid", "false");
    expect(screen.queryByText("E-mail inválido.")).not.toBeInTheDocument();
  });

  it("marks Slug da instituição as invalid (red) for bad characters, valid (green) for a proper slug", () => {
    render(<RegisterPage />);
    const slugField = screen.getByLabelText("Slug da instituição *");

    fireEvent.change(slugField, { target: { value: "Escola Municipal!" } });
    expect(slugField).toHaveAttribute("aria-invalid", "true");
    expect(
      screen.getByText(
        "Apenas letras minúsculas, números e hífens (máx. 64 caracteres).",
      ),
    ).toBeInTheDocument();

    fireEvent.change(slugField, { target: { value: "escola-municipal" } });
    expect(slugField).toHaveAttribute("aria-invalid", "false");
    expect(
      screen.getByText("Apenas letras minúsculas, números e hífens."),
    ).toBeInTheDocument();
  });

  it("links to login for existing accounts", () => {
    render(<RegisterPage />);
    const link = screen.getByText("Entrar");
    expect(link).toHaveAttribute("href", "/login");
  });
});
