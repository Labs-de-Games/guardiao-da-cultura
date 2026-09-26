import { homeLinkFor } from "./dashboardRoutes";

describe("homeLinkFor", () => {
  it.each([
    ["/institution/dasdas", "/institution", "Voltar ao painel"],
    ["/institution", "/institution", "Voltar ao painel"],
    ["/public-dashboard/xyz", "/public-dashboard", "Voltar ao painel"],
    ["/xyz", "/", "Voltar ao início"],
    ["/institutional", "/", "Voltar ao início"],
  ])("maps %s to %s", (path, href, label) => {
    expect(homeLinkFor(path)).toEqual({ href, label });
  });
});
