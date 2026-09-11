import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { getReport, getSummary } from "@/lib/api/edital";
import InstitutionOverviewPage from "./page";

jest.mock("@/lib/api/edital", () => ({
  getSummary: jest.fn(),
  getReport: jest.fn(),
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
};

const REPORT_DATA = {
  linked: true,
  data: {
    sessionDuration: {
      avgSeconds: 300,
      medianSeconds: 250,
      sessionsStarted: 700,
    },
    criticalErrors: { total: 5, byErrorCode: { asset_load_failed: 5 } },
    quizPassRate: { value: 0.75, numerator: 285, denominator: 380 },
  },
};

describe("InstitutionOverviewPage", () => {
  beforeEach(() => {
    (getSummary as jest.Mock).mockReset();
    (getReport as jest.Mock).mockReset();
  });

  it("shows a loading state before data resolves", () => {
    (getSummary as jest.Mock).mockReturnValue(new Promise(() => {}));
    (getReport as jest.Mock).mockReturnValue(new Promise(() => {}));

    const { container } = render(<InstitutionOverviewPage />);

    expect(container.querySelector(".MuiCircularProgress-root")).toBeTruthy();
  });

  it("renders all 8 card titles with pt-BR formatted numbers", async () => {
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
    expect(screen.getByText("Conclusões do Capítulo 1")).toBeInTheDocument();
    expect(
      screen.getByText("Taxa de conclusão do Capítulo 1"),
    ).toBeInTheDocument();
    expect(screen.getByText("Tempo médio de sessão")).toBeInTheDocument();
    expect(screen.getByText("Taxa de aprovação no quiz")).toBeInTheDocument();
    expect(screen.getByText("Erros críticos")).toBeInTheDocument();

    // pt-BR thousands separator.
    expect(screen.getByText("617")).toBeInTheDocument();
    expect(screen.getByText("700")).toBeInTheDocument();
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
      expect(screen.getByText("Falha ao carregar")).toBeInTheDocument(),
    );

    (getSummary as jest.Mock).mockResolvedValueOnce(SUMMARY_DATA);
    (getReport as jest.Mock).mockResolvedValueOnce(REPORT_DATA);

    fireEvent.click(screen.getByText("Tentar novamente"));

    await waitFor(() =>
      expect(screen.queryByText("Falha ao carregar")).toBeNull(),
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
