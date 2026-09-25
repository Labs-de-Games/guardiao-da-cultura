import { render, screen, waitFor } from "@testing-library/react";
import { signIn } from "next-auth/react";
import { StrictMode } from "react";
import ConfirmVerificationPage from "./page";

const pushMock = jest.fn();

jest.mock("next-auth/react", () => ({
  signIn: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt as string} src={props.src as string} />
  ),
}));

describe("ConfirmVerificationPage", () => {
  beforeEach(() => {
    (signIn as jest.Mock).mockReset();
    pushMock.mockReset();
    window.history.replaceState({}, "", "/confirm-verification");
  });

  it("shows invalid token alert when no token is present", () => {
    render(<ConfirmVerificationPage />);
    expect(screen.getByText("Link inválido")).toBeInTheDocument();
    expect(
      screen.getByText("Link inválido ou inexistente."),
    ).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("confirms the token and redirects to /institution on success", async () => {
    (signIn as jest.Mock).mockResolvedValue({ error: undefined });
    window.history.replaceState({}, "", "/confirm-verification?token=abc123");

    render(<ConfirmVerificationPage />);

    expect(
      screen.getByRole("heading", { name: "Confirmando e-mail" }),
    ).toBeInTheDocument();

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/institution"));
    expect(signIn).toHaveBeenCalledWith("email-verification", {
      token: "abc123",
      redirect: false,
    });
  });

  it("shows an expired-link message when the token is rejected", async () => {
    (signIn as jest.Mock).mockResolvedValue({ error: "CredentialsSignin" });
    window.history.replaceState({}, "", "/confirm-verification?token=bad");

    render(<ConfirmVerificationPage />);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Link expirado" }),
      ).toBeInTheDocument(),
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("calls signIn only once under React StrictMode's dev double-invoke", async () => {
    (signIn as jest.Mock).mockResolvedValue({ error: undefined });
    window.history.replaceState({}, "", "/confirm-verification?token=abc123");

    render(
      <StrictMode>
        <ConfirmVerificationPage />
      </StrictMode>,
    );

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/institution"));
    expect(signIn).toHaveBeenCalledTimes(1);
  });
});
