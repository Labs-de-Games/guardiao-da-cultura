import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { signIn } from "next-auth/react";
import LoginPage from "./page";

const pushMock = jest.fn();
const postMock = jest.fn();

jest.mock("next-auth/react", () => ({
  signIn: jest.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt as string} src={props.src as string} />
  ),
}));

jest.mock("@/components/ToastProvider", () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

jest.mock("@/lib/api/client", () => ({
  apiClient: { post: (...args: unknown[]) => postMock(...args) },
}));

describe("LoginPage", () => {
  beforeEach(() => {
    (signIn as jest.Mock).mockReset();
    postMock.mockReset();
    pushMock.mockReset();
    sessionStorage.clear();
  });

  it("renders the login form with email and password fields", () => {
    render(<LoginPage />);
    expect(screen.getByRole("heading", { name: "Entrar" })).toBeInTheDocument();
    expect(screen.getByLabelText(/E-mail/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Senha/)).toBeInTheDocument();
  });

  it("calls signIn with the google provider on button click", () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByText("Entrar com Google"));
    expect(signIn).toHaveBeenCalledWith("google", {
      callbackUrl: "/institution",
    });
  });

  it("submits email/password via the credentials provider", async () => {
    (signIn as jest.Mock).mockResolvedValue({ error: undefined });
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/E-mail/), {
      target: { value: "escola@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Senha/), {
      target: { value: "correct-password" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Entrar", exact: true }),
    );

    await waitFor(() =>
      expect(signIn).toHaveBeenCalledWith("credentials", {
        email: "escola@example.com",
        password: "correct-password",
        redirect: false,
      }),
    );
  });

  it("navigates to /institution on successful login", async () => {
    (signIn as jest.Mock).mockResolvedValue({ error: undefined });
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/E-mail/), {
      target: { value: "escola@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Senha/), {
      target: { value: "correct-password" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Entrar", exact: true }),
    );

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/institution"));
  });

  it("shows error message on invalid credentials", async () => {
    (signIn as jest.Mock).mockResolvedValue({ error: "CredentialsSignin" });
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/E-mail/), {
      target: { value: "escola@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Senha/), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Entrar", exact: true }),
    );

    expect(
      await screen.findByText("E-mail ou senha inválidos."),
    ).toBeInTheDocument();
  });

  it("links to register page", () => {
    render(<LoginPage />);
    const link = screen.getByText("Cadastre-se");
    expect(link).toHaveAttribute("href", "/register");
  });

  it("shows forgot password form when link is clicked", () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByText("Esqueci minha senha"));
    expect(
      screen.getByRole("heading", { name: "Esqueci minha senha" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/E-mail/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Enviar link" }),
    ).toBeInTheDocument();
  });

  it("submits forgot password request and shows success message", async () => {
    postMock.mockResolvedValue({});
    render(<LoginPage />);

    fireEvent.click(screen.getByText("Esqueci minha senha"));
    fireEvent.change(screen.getByLabelText(/E-mail/), {
      target: { value: "escola@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar link" }));

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith("/auth/password/reset/request", {
        email: "escola@example.com",
      }),
    );
    expect(
      await screen.findByText("Verifique seu e-mail para redefinir sua senha."),
    ).toBeInTheDocument();
  });

  it("allows going back to login from forgot password form", () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByText("Esqueci minha senha"));
    fireEvent.click(screen.getByText("Voltar ao login"));
    expect(screen.getByRole("heading", { name: "Entrar" })).toBeInTheDocument();
  });
});
