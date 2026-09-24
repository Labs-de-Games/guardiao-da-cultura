import { render, screen } from "@testing-library/react";
import { MobileBlocker } from "./MobileBlocker";

describe("MobileBlocker", () => {
  it("renders a modal dialog labelled by its title", () => {
    render(<MobileBlocker />);

    const dialog = screen.getByRole("dialog", {
      name: "Melhor no computador",
      hidden: true,
    });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("stays hidden outside the mobile breakpoint", () => {
    render(<MobileBlocker />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("tells the player to use a computer", () => {
    render(<MobileBlocker />);

    expect(
      screen.getByText(
        /O Guardião da Cultura foi feito para ser jogado no computador/,
      ),
    ).toBeInTheDocument();
  });

  it("offers no actions", () => {
    render(<MobileBlocker />);

    expect(screen.queryAllByRole("button", { hidden: true })).toHaveLength(0);
  });
});
