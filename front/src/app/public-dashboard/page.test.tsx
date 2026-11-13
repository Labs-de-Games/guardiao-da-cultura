import { render, screen, waitFor } from "@testing-library/react";
import { getPublicDashboard } from "@/lib/api/edital";
import PublicDashboardPage from "./page";

jest.mock("@/lib/api/edital", () => ({
  getPublicDashboard: jest.fn(),
}));

describe("PublicDashboardPage", () => {
  beforeEach(() => {
    (getPublicDashboard as jest.Mock).mockReset();
    // Never resolves: this suite only checks the initial filter state.
    (getPublicDashboard as jest.Mock).mockReturnValue(new Promise(() => {}));
  });

  it("loads the whole period by default", async () => {
    render(<PublicDashboardPage />);

    await waitFor(() =>
      expect(getPublicDashboard).toHaveBeenCalledWith({ type: "all-time" }),
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("Acumulado");
  });
});
