import { notFound } from "next/navigation";
import GameCatchAll from "./page";

jest.mock("next/navigation", () => ({ notFound: jest.fn() }));

describe("GameCatchAll", () => {
  it("renders the game 404 through notFound()", () => {
    GameCatchAll();
    expect(notFound).toHaveBeenCalledTimes(1);
  });
});
