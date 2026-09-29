import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { getReport, getSummary, listCampaignLinks } from "@/lib/api/edital";
import InstitutionOverviewPage from "./page";

jest.mock("@/lib/api/edital", () => ({
  getSummary: jest.fn(),
  getReport: jest.fn(),
  listCampaignLinks: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const SUMMARY_DATA = {
  linked: true,
  data: {
    landing_page_viewed: 1000,
    play_clicked: 800,
    gameplay_started: 617,
    chapter_1_started: 500,
    quiz_started: 400,
    quiz_completed: 380,
    chapter_1_completed: 300,
  },
  completionRate: { value: 0.4, numerator: 240, denominator: 600 },
  averageProgress: { value: 0.83, numerator: 500, denominator: 600 },
  phaseProgress: [
    {
      levelId: "level_01",
      levelNumber: 1,
      label: "Museu",
      reached: 600,
      completed: 500,
    },
  ],
  quizPassRate: [
    {
      levelId: "level_01",
      levelNumber: 1,
      label: "Museu",
      rate: { value: 0.9, numerator: 450, denominator: 500 },
    },
  ],
  clueUsage: [
    { levelId: "level_01", levelNumber: 1, label: "Museu", clues: 42 },
  ],
  phaseStars: [
    {
      levelId: "level_01",
      levelNumber: 1,
      label: "Museu",
      avgStars: 3.5,
      players: 450,
    },
  ],
};

const REPORT_DATA = {
  linked: true,
  data: {
    sessionDuration: {
      avgSeconds: 300,
      medianSeconds: 250,
      sessionsStarted: 700,
    },
    quizPassRate: { value: 0.75, numerator: 285, denominator: 380 },
  },
};

describe("InstitutionOverviewPage", () => {
  beforeEach(() => {
    (getSummary as jest.Mock).mockReset();
    (getReport as jest.Mock).mockReset();
    (listCampaignLinks as jest.Mock).mockReset();
    (listCampaignLinks as jest.Mock).mockResolvedValue({
      linked: true,
      data: [],
    });
  });

  it("shows a loading state before data resolves", () => {
    (getSummary as jest.Mock).mockReturnValue(new Promise(() => {}));
    (getReport as jest.Mock).mockReturnValue(new Promise(() => {}));

    const { container } = render(<InstitutionOverviewPage />);

    expect(container.querySelector(".MuiSkeleton-root")).toBeTruthy();
  });

  it("renders the overview cards, the turma filter, and the per-phase table", async () => {
    (getSummary as jest.Mock).mockResolvedValue(SUMMARY_DATA);
    (getReport as jest.Mock).mockResolvedValue(REPORT_DATA);

    render(<InstitutionOverviewPage />);

    await waitFor(() =>
      expect(
        screen.getByText("Usuários únicos em gameplay"),
      ).toBeInTheDocument(),
    );

    expect(screen.getByText("Sessões iniciadas")).toBeInTheDocument();
    expect(screen.getByText("Taxa de entrada na gameplay")).toBeInTheDocument();
    expect(screen.getByText("Taxa de conclusão")).toBeInTheDocument();
    expect(screen.getByText("Tempo médio de sessão")).toBeInTheDocument();
    expect(screen.getByText("Progresso médio")).toBeInTheDocument();

    // pt-BR thousands separator.
    expect(screen.getByText("617")).toBeInTheDocument();
    expect(screen.getByText("700")).toBeInTheDocument();

    // Turma filter, present on every screen (issue #807).
    expect(screen.getByText("Toda a instituição")).toBeInTheDocument();

    // Per-phase quiz pass-rate bar chart, one bar per level. The
    // reached→completed funnel now lives on the Funil page instead.
    expect(screen.getAllByText("Fase 1 — Museu").length).toBeGreaterThan(0);

    // Stars per phase: the average of each player's best run, out of the max.
    expect(
      screen.getByText("Média de estrelas por jogador"),
    ).toBeInTheDocument();
    expect(screen.getByText("3,5 / 5 ★")).toBeInTheDocument();
  });

  it("passes the selected turma through to getSummary/getReport", async () => {
    (getSummary as jest.Mock).mockResolvedValue(SUMMARY_DATA);
    (getReport as jest.Mock).mockResolvedValue(REPORT_DATA);

    render(<InstitutionOverviewPage />);

    await waitFor(() =>
      expect(getSummary).toHaveBeenCalledWith(expect.anything(), ""),
    );
  });

  it("shows an error state with a retry button that clears the error and re-fetches", async () => {
    (getSummary as jest.Mock).mockRejectedValueOnce(
      new Error("Falha ao carregar"),
    );
    (getReport as jest.Mock).mockRejectedValueOnce(
      new Error("Falha ao carregar"),
    );

    render(<InstitutionOverviewPage />);

    await waitFor(() =>
      expect(
        screen.getByText("Não foi possível carregar os dados"),
      ).toBeInTheDocument(),
    );
    // The raw error message never reaches the screen.
    expect(screen.queryByText("Falha ao carregar")).toBeNull();

    (getSummary as jest.Mock).mockResolvedValueOnce(SUMMARY_DATA);
    (getReport as jest.Mock).mockResolvedValueOnce(REPORT_DATA);

    fireEvent.click(screen.getByText("Tentar novamente"));

    await waitFor(() =>
      expect(
        screen.queryByText("Não foi possível carregar os dados"),
      ).toBeNull(),
    );
    await waitFor(() =>
      expect(
        screen.getByText("Usuários únicos em gameplay"),
      ).toBeInTheDocument(),
    );
  });

  it("shows the awaiting-linkage empty state when unlinked", async () => {
    (getSummary as jest.Mock).mockResolvedValue({ linked: false, data: null });
    (getReport as jest.Mock).mockResolvedValue({ linked: false, data: null });

    render(<InstitutionOverviewPage />);

    await waitFor(() =>
      expect(
        screen.getByText("Instituição ainda não vinculada"),
      ).toBeInTheDocument(),
    );
  });
});
