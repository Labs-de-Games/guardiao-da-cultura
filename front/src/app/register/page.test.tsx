import {
  fireEvent,
  render,
  screen,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import { INSTITUTION_TERMS_VERSION } from "@/lib/consent/institutionTerms";
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

/** The mandatory Terms of Use checkbox (issue #338). */
function acceptTerms() {
  fireEvent.click(
    screen.getByRole("checkbox", { name: "Li e aceito os Termos de Uso" }),
  );
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
    acceptTerms();
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
      termsAccepted: true,
      termsVersion: INSTITUTION_TERMS_VERSION,
    });
  });

  describe("terms acceptance (issue #338)", () => {
    it("disables the submit button until the terms are accepted", () => {
      render(<RegisterPage />);

      expect(screen.getByRole("button", { name: "Cadastrar" })).toBeDisabled();

      acceptTerms();

      expect(
        screen.getByRole("button", { name: "Cadastrar" }),
      ).not.toBeDisabled();
    });

    it("does not register when the terms are left unchecked", async () => {
      render(<RegisterPage />);

      fillRequiredFields();
      fireEvent.change(screen.getByLabelText("Senha *"), {
        target: { value: "new-password-123" },
      });
      fireEvent.change(screen.getByLabelText("Confirmar senha *"), {
        target: { value: "new-password-123" },
      });
      // Submitting the form directly, not clicking the button: pressing Enter
      // in a field does exactly this, and a disabled button does not stop it.
      fireEvent.submit(screen.getByRole("button", { name: "Cadastrar" }));

      expect(
        await screen.findByText(
          "É necessário aceitar os Termos de Uso para se cadastrar.",
        ),
      ).toBeInTheDocument();
      expect(postMock).not.toHaveBeenCalled();
    });

    it("opens the terms in a modal without leaving the form", () => {
      render(<RegisterPage />);

      fillRequiredFields();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Termos de Uso" }));

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
      // Never a navigation: the half-filled form is still behind the modal.
      expect(screen.getByLabelText("Nome da instituição *")).toHaveValue(
        "Escola Municipal",
      );
    });

    it("closes without having touched acceptance", async () => {
      // The trigger sits beside the checkbox rather than inside its label —
      // inside, a click would open the modal and silently tick the box, since
      // a click anywhere in a <label> activates the control it names.
      render(<RegisterPage />);

      fireEvent.click(screen.getByRole("button", { name: "Termos de Uso" }));
      fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
      await waitForElementToBeRemoved(() => screen.queryByRole("dialog"));

      expect(
        screen.getByRole("checkbox", { name: "Li e aceito os Termos de Uso" }),
      ).not.toBeChecked();
      expect(screen.getByRole("button", { name: "Cadastrar" })).toBeDisabled();
    });

    it("offers no accept action inside the modal", () => {
      // Acceptance is a single deliberate act on the form's own checkbox —
      // the modal is read-only so the decision has one entry point.
      render(<RegisterPage />);

      fireEvent.click(screen.getByRole("button", { name: "Termos de Uso" }));

      expect(
        screen.queryByRole("button", { name: /aceitar/i }),
      ).not.toBeInTheDocument();
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
