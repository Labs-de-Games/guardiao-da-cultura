import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { downloadReportCsv, getReport } from "@/lib/api/edital";
import InstitutionReportPage from "./page";

jest.mock("@/lib/api/edital", () => ({
  getReport: jest.fn(),
  downloadReportCsv: jest.fn(),
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
    criticalErrors: { total: 5, byErrorCode: { asset_load_failed: 5 } },
    quizPassRate: { value: 0.75, numerator: 285, denominator: 380 },
  },
};

describe("InstitutionReportPage", () => {
  beforeEach(() => {
    (getReport as jest.Mock).mockReset();
    (downloadReportCsv as jest.Mock).mockReset();
  });

  it("renders session, critical error, and quiz pass rate cards", async () => {
    (getReport as jest.Mock).mockResolvedValue(REPORT_DATA);

    render(<InstitutionReportPage />);

    await waitFor(() =>
      expect(screen.getByText("Sessões iniciadas")).toBeInTheDocument(),
    );
    expect(screen.getByText("700")).toBeInTheDocument();
    expect(screen.getByText("Taxa de aprovação no quiz")).toBeInTheDocument();
    expect(screen.getByText("Erros críticos")).toBeInTheDocument();
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
      expect(downloadReportCsv).toHaveBeenCalledWith({ type: "30d" }),
    );
  });
});
