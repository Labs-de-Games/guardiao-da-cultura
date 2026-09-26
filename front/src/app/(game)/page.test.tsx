import { render, screen } from "@testing-library/react";
import HomePage from "./page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(() => {}), replace: jest.fn(() => {}) }),
  useSearchParams: () => new URLSearchParams(""),
}));

describe("HomePage", () => {
  it("renders the landing page", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { name: /Guardião da Cultura/i }),
    ).toBeDefined();
  });

  it("renders the play button", () => {
    render(<HomePage />);
    expect(screen.getByRole("button", { name: /Jogar/i })).toBeDefined();
  });
});
