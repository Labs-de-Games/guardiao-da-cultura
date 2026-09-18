import { render, screen, waitFor } from "@testing-library/react";
import { getFunnel, listCampaignLinks } from "@/lib/api/edital";
import InstitutionFunnelPage from "./page";

jest.mock("@/lib/api/edital", () => ({
  getFunnel: jest.fn(),
  listCampaignLinks: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("InstitutionFunnelPage", () => {
  beforeEach(() => {
    (getFunnel as jest.Mock).mockReset();
    (listCampaignLinks as jest.Mock).mockReset();
    (listCampaignLinks as jest.Mock).mockResolvedValue({
      linked: true,
      data: [],
    });
  });

  it("renders a monotonically non-increasing funnel", async () => {
    (getFunnel as jest.Mock).mockResolvedValue({
      linked: true,
      data: [
        { label: "landing_page_viewed", value: 1000 },
        { label: "play_clicked", value: 800 },
        { label: "gameplay_started", value: 600 },
        { label: "chapter_1_started", value: 500 },
        { label: "quiz_started", value: 400 },
        { label: "quiz_completed", value: 380 },
        { label: "chapter_1_completed", value: 300 },
      ],
    });

    render(<InstitutionFunnelPage />);

    await waitFor(() =>
      expect(screen.getByText("Visualizou a landing page")).toBeInTheDocument(),
    );

    // Absolute counts render alongside the labels.
    expect(screen.getByText("(1.000)")).toBeInTheDocument();
    expect(screen.getByText("(300)")).toBeInTheDocument();

    // Percentages relative to step 1 (1000), non-increasing:
    // 100%, 80%, 60%, 50%, 40%, 38%, 30%.
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(screen.getByText("38%")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument();
  });

  it("shows the awaiting-linkage empty state when unlinked", async () => {
    (getFunnel as jest.Mock).mockResolvedValue({ linked: false, data: null });

    render(<InstitutionFunnelPage />);

    await waitFor(() =>
      expect(
        screen.getByText("Instituição ainda não vinculada"),
      ).toBeInTheDocument(),
    );
  });
});
