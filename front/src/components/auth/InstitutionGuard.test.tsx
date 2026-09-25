import { render, screen } from "@testing-library/react";
import { useSession } from "next-auth/react";
import InstitutionGuard from "./InstitutionGuard";

const pushMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));

jest.mock("@/components/dashboard/DashboardLoadingScreen", () => ({
  DashboardLoadingScreen: () => <div>loading-screen</div>,
}));

describe("InstitutionGuard", () => {
  beforeEach(() => {
    pushMock.mockClear();
    (useSession as jest.Mock).mockReset();
  });

  it("shows the loading screen while the session is loading", () => {
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: "loading",
    });

    render(
      <InstitutionGuard>
        <div>protected content</div>
      </InstitutionGuard>,
    );

    expect(screen.getByText("loading-screen")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("redirects to /login when unauthenticated", () => {
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(
      <InstitutionGuard>
        <div>protected content</div>
      </InstitutionGuard>,
    );

    expect(pushMock).toHaveBeenCalledWith("/login");
  });

  it("redirects to / when the session role is not institution", () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { role: "player" } },
      status: "authenticated",
    });

    render(
      <InstitutionGuard>
        <div>protected content</div>
      </InstitutionGuard>,
    );

    expect(pushMock).toHaveBeenCalledWith("/");
  });

  it("renders children for a valid institution session", () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { role: "institution", institutionSlug: "escola-teste" } },
      status: "authenticated",
    });

    render(
      <InstitutionGuard>
        <div>protected content</div>
      </InstitutionGuard>,
    );

    expect(screen.getByText("protected content")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
