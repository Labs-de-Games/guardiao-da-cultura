import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  downloadReportCsv,
  getReport,
  getSummary,
  listCampaignLinks,
} from "@/lib/api/edital";
import InstitutionReportPage from "./page";

jest.mock("@/lib/api/edital", () => ({
  getReport: jest.fn(),
  getSummary: jest.fn(),
  downloadReportCsv: jest.fn(),
  listCampaignLinks: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const REPORT_DATA = {
  linked: true,
  data: {
    sessionDuration: {
      avgSeconds: 300,
      medianSeconds: 250,
      sessionsStarted: 700,
    },
    quizPassRate: { value: 0.75, numerator: 285, denominator: 380 },
    completionRate: { value: 0.4, numerator: 40, denominator: 100 },
  },
};

const SUMMARY_DATA = {
  linked: true,
  data: {
    landing_page_viewed: 1000,
    gameplay_started: 700,
  },
  completionRate: { value: 0.4, numerator: 40, denominator: 100 },
  quizPassRate: [
    {
      levelId: "level_01",
      levelNumber: 1,
      label: "Museu",
      rate: { value: 0.75, numerator: 285, denominator: 380 },
    },
  ],
};

describe("InstitutionReportPage", () => {
  beforeEach(() => {
    (getReport as jest.Mock).mockReset();
    (getSummary as jest.Mock).mockReset();
    (downloadReportCsv as jest.Mock).mockReset();
    (listCampaignLinks as jest.Mock).mockReset();
    (listCampaignLinks as jest.Mock).mockResolvedValue({
      linked: true,
      data: [],
    });
    // The page fetches report + summary together (Promise.all); every test
    // below drives its assertions off getReport, so a single shared summary
    // default keeps each case to the one mock it actually cares about.
    (getSummary as jest.Mock).mockResolvedValue(SUMMARY_DATA);
  });

  it("renders session cards — the aggregate quiz pass rate card was retired, now superseded by the per-phase breakdown in the exported CSV", async () => {
    (getReport as jest.Mock).mockResolvedValue(REPORT_DATA);

    render(<InstitutionReportPage />);

    await waitFor(() =>
      expect(screen.getByText("Sessões iniciadas")).toBeInTheDocument(),
    );
    expect(screen.getByText("700")).toBeInTheDocument();
    // "Taxa de conclusão" and its value render twice on a loaded page: once
    // as a KPI card, once as a row of the "Detalhamento" table below it
    // (toDetailRows always emits it). Both are expected — assert presence
    // without asserting uniqueness.
    expect(screen.getAllByText("Taxa de conclusão").length).toBeGreaterThan(0);
    expect(screen.getAllByText("40%").length).toBeGreaterThan(0);
    expect(screen.queryByText("Taxa de aprovação no quiz")).toBeNull();
  });

  it("shows the CSV export button only when linked", async () => {
    (getReport as jest.Mock).mockResolvedValue(REPORT_DATA);

    render(<InstitutionReportPage />);

    await waitFor(() =>
      expect(screen.getByText("Exportar CSV")).toBeInTheDocument(),
    );
  });

  it("does not show the CSV export button when unlinked", async () => {
    (getReport as jest.Mock).mockResolvedValue({ linked: false, data: null });

    render(<InstitutionReportPage />);

    await waitFor(() =>
      expect(
        screen.getByText("Instituição ainda não vinculada"),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByText("Exportar CSV")).toBeNull();
  });

  it("clicking export calls downloadReportCsv with the current filter", async () => {
    (getReport as jest.Mock).mockResolvedValue(REPORT_DATA);
    (downloadReportCsv as jest.Mock).mockResolvedValue(undefined);

    render(<InstitutionReportPage />);

    await waitFor(() =>
      expect(screen.getByText("Exportar CSV")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Exportar CSV"));

    await waitFor(() =>
      expect(downloadReportCsv).toHaveBeenCalledWith({ type: "30d" }, ""),
    );
  });
});
