import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { signIn } from "next-auth/react";
import InstitutionSignIn from "./InstitutionSignIn";

const pushMock = jest.fn();

jest.mock("next-auth/react", () => ({
  signIn: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe("InstitutionSignIn", () => {
  beforeEach(() => {
    (signIn as jest.Mock).mockReset();
    pushMock.mockReset();
  });

  it("calls signIn with the google provider on button click", () => {
    render(<InstitutionSignIn />);
    fireEvent.click(screen.getByText("Entrar com Google"));
    expect(signIn).toHaveBeenCalledWith("google", {
      callbackUrl: "/institution",
    });
  });

  it("submits email/password via the credentials provider", async () => {
    (signIn as jest.Mock).mockResolvedValue({ error: undefined });
    render(<InstitutionSignIn />);

    fireEvent.change(screen.getByLabelText(/E-mail/), {
      target: { value: "escola@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Senha/), {
      target: { value: "correct-password" },
    });
    fireEvent.click(screen.getByText("Entrar"));

    await waitFor(() =>
      expect(signIn).toHaveBeenCalledWith("credentials", {
        email: "escola@example.com",
        password: "correct-password",
        redirect: false,
      }),
    );
  });

  it("shows a generic error message on invalid credentials", async () => {
    (signIn as jest.Mock).mockResolvedValue({ error: "CredentialsSignin" });
    render(<InstitutionSignIn />);

    fireEvent.change(screen.getByLabelText(/E-mail/), {
      target: { value: "escola@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Senha/), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByText("Entrar"));

    expect(
      await screen.findByText("E-mail ou senha inválidos."),
    ).toBeInTheDocument();
  });
});
