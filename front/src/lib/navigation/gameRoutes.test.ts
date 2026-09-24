import { isGameRoute } from "./gameRoutes";

describe("isGameRoute", () => {
  it.each([
    "/",
    "/game",
    "/game/maintenance",
    "/game/level/1",
  ])("treats %s as a game route", (path) => {
    expect(isGameRoute(path)).toBe(true);
  });

  it.each([
    "/login",
    "/institution",
    "/institution/settings",
    "/gameplay",
    "/abc",
  ])("does not treat %s as a game route", (path) => {
    expect(isGameRoute(path)).toBe(false);
  });
});
