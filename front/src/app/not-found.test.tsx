import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import NotFound from "./not-found";

jest.mock("next/navigation", () => ({ usePathname: jest.fn() }));
jest.mock("@/lib/errors/reportError", () => ({ reportErrorPage: jest.fn() }));
jest.mock("@/components/dashboard/DashboardFooter", () => ({
  DashboardFooter: () => <footer>dashboard-footer</footer>,
}));

describe("site-wide NotFound", () => {
  it.each([
    ["/institution/dasdas", "Voltar ao painel", "/institution"],
    ["/public-dashboard/xyz", "Voltar ao painel", "/public-dashboard"],
    ["/xyz", "Voltar ao início", "/"],
  ])("on %s links %s to %s", (path, label, href) => {
    (usePathname as jest.Mock).mockReturnValue(path);
    render(<NotFound />);

    expect(screen.getByText(label).closest("a")).toHaveAttribute("href", href);
    expect(screen.getByText("dashboard-footer")).toBeInTheDocument();
  });
});
