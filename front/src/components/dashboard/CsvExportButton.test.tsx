import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { downloadReportCsv } from "@/lib/api/edital";
import { CsvExportButton } from "./CsvExportButton";

jest.mock("@/lib/api/edital", () => ({
  downloadReportCsv: jest.fn(),
}));

describe("CsvExportButton", () => {
  beforeEach(() => {
    (downloadReportCsv as jest.Mock).mockReset();
  });

  it("calls downloadReportCsv with the current date range", async () => {
    (downloadReportCsv as jest.Mock).mockResolvedValue(undefined);

    render(<CsvExportButton dateRange={{ type: "30d" }} />);
    fireEvent.click(screen.getByText("Exportar CSV"));

    await waitFor(() =>
      expect(downloadReportCsv).toHaveBeenCalledWith(
        { type: "30d" },
        undefined,
      ),
    );
  });

  it("disables the button and shows a loading label while exporting", async () => {
    let resolveDownload: () => void = () => {};
    (downloadReportCsv as jest.Mock).mockImplementation(
      () => new Promise<void>((resolve) => (resolveDownload = resolve)),
    );

    render(<CsvExportButton dateRange={{ type: "30d" }} />);
    fireEvent.click(screen.getByText("Exportar CSV"));

    expect(screen.getByText("Exportando...")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeDisabled();

    resolveDownload();
    await waitFor(() =>
      expect(screen.getByText("Exportar CSV")).toBeInTheDocument(),
    );
  });

  it("calls onError when the download fails", async () => {
    (downloadReportCsv as jest.Mock).mockRejectedValue(new Error("failed"));
    const onError = jest.fn();

    render(<CsvExportButton dateRange={{ type: "30d" }} onError={onError} />);
    fireEvent.click(screen.getByText("Exportar CSV"));

    await waitFor(() => expect(onError).toHaveBeenCalledWith("failed"));
  });
});
