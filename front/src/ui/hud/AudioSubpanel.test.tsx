import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AudioSubpanel } from "./AudioSubpanel";

// Mock AudioManager
jest.mock("@/game/audio/AudioManager", () => ({
  AudioManager: {
    getSettings: jest.fn(() => ({
      musicVolume: 0.7,
      sfxVolume: 0.8,
      muted: false,
    })),
    setMusicVolume: jest.fn(),
    setSfxVolume: jest.fn(),
  },
}));

// Mock AudioAccessibilityService
jest.mock("@/lib/audio/AudioAccessibilityService", () => ({
  AudioAccessibilityService: {
    getVolume: jest.fn(() => 0.6),
    setVolume: jest.fn(),
  },
}));

// Mock LayoutConfig
jest.mock("@/game/constants/LayoutConfig", () => ({
  LayoutConfig: {
    FONTS: { BODY: "Arial" },
    COLORS: { PANEL_INNER_BG_CSS: "#252726" },
  },
}));

// Import mocked modules after mocks are defined
import { AudioManager } from "@/game/audio/AudioManager";
import { AudioAccessibilityService } from "@/lib/audio/AudioAccessibilityService";

// Helper to get the title element
const getTitleElement = () => {
  const somElements = screen.getAllByText("Som");
  return somElements.find((el) => el.tagName.toLowerCase() === "p");
};

describe("AudioSubpanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock return values to defaults
    (AudioManager.getSettings as jest.Mock).mockReturnValue({
      musicVolume: 0.7,
      sfxVolume: 0.8,
      muted: false,
    });
    (AudioAccessibilityService.getVolume as jest.Mock).mockReturnValue(0.6);
  });

  it("renders the audio panel with title", () => {
    render(<AudioSubpanel />);

    // Use getAllByText and check the Typography element specifically
    const somElements = screen.getAllByText("Som");
    const titleElement = somElements.find(
      (el) => el.tagName.toLowerCase() === "p",
    );
    expect(titleElement).toBeInTheDocument();
  });

  it("expands to show volume controls when clicked", () => {
    render(<AudioSubpanel />);

    // Get the title element to click
    const somElements = screen.getAllByText("Som");
    const titleElement = somElements.find(
      (el) => el.tagName.toLowerCase() === "p",
    );
    expect(titleElement).toBeInTheDocument();

    // Initially collapsed - volume sliders should not be in the document
    expect(
      screen.queryByRole("slider", { name: /música/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("slider", { name: /efeitos/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("slider", { name: /narração/i }),
    ).not.toBeInTheDocument();

    // Click to expand
    if (!titleElement) throw new Error("Title element not found");
    fireEvent.click(titleElement);

    // Now volume sliders should be in the document
    expect(screen.getByRole("slider", { name: /música/i })).toBeInTheDocument();
    expect(
      screen.getByRole("slider", { name: /efeitos/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("slider", { name: /narração/i }),
    ).toBeInTheDocument();
  });

  it("collapses when clicked again", async () => {
    render(<AudioSubpanel />);

    // Get the title element
    const somElements = screen.getAllByText("Som");
    const titleElement = somElements.find(
      (el) => el.tagName.toLowerCase() === "p",
    );

    // Expand first
    if (!titleElement) throw new Error("Title element not found");
    fireEvent.click(titleElement);
    expect(screen.getByRole("slider", { name: /música/i })).toBeInTheDocument();

    // Collapse
    fireEvent.click(titleElement);

    // Wait for collapse animation
    await waitFor(() => {
      expect(
        screen.queryByRole("slider", { name: /música/i }),
      ).not.toBeInTheDocument();
    });
  });

  it("initializes volume sliders from AudioManager settings", () => {
    (AudioManager.getSettings as jest.Mock).mockReturnValue({
      musicVolume: 0.5,
      sfxVolume: 0.6,
      muted: false,
    });

    render(<AudioSubpanel />);
    const somElements = screen.getAllByText("Som");
    const titleElement = somElements.find(
      (el) => el.tagName.toLowerCase() === "p",
    );
    if (!titleElement) throw new Error("Title element not found");
    fireEvent.click(titleElement);

    // Verify the sliders are rendered with correct aria-labels
    const musicSlider = screen.getByRole("slider", { name: /música/i });
    const effectsSlider = screen.getByRole("slider", { name: /efeitos/i });
    expect(musicSlider).toBeInTheDocument();
    expect(effectsSlider).toBeInTheDocument();
    expect(musicSlider).toHaveAttribute("value", "50");
    expect(effectsSlider).toHaveAttribute("value", "60");
  });

  it("updates music volume when slider changes", () => {
    render(<AudioSubpanel />);
    const somElements = screen.getAllByText("Som");
    const titleElement = somElements.find(
      (el) => el.tagName.toLowerCase() === "p",
    );
    if (!titleElement) throw new Error("Title element not found");
    fireEvent.click(titleElement);

    // Find the slider by role and aria-label
    const musicSlider = screen.getByRole("slider", { name: /música/i });
    fireEvent.change(musicSlider, { target: { value: "30" } });

    expect(AudioManager.setMusicVolume).toHaveBeenCalledWith(0.3);
  });

  it("updates SFX volume when effects slider changes", () => {
    render(<AudioSubpanel />);
    const somElements = screen.getAllByText("Som");
    const titleElement = somElements.find(
      (el) => el.tagName.toLowerCase() === "p",
    );
    if (!titleElement) throw new Error("Title element not found");
    fireEvent.click(titleElement);
    fireEvent.click(titleElement);

    const effectsSlider = screen.getByRole("slider", { name: /efeitos/i });
    fireEvent.change(effectsSlider, { target: { value: "40" } });

    expect(AudioManager.setSfxVolume).toHaveBeenCalledWith(0.4);
  });

  it("updates TTS volume when voice slider changes", () => {
    render(<AudioSubpanel />);
    const somElements = screen.getAllByText("Som");
    const titleElement = somElements.find(
      (el) => el.tagName.toLowerCase() === "p",
    );
    if (!titleElement) throw new Error("Title element not found");
    fireEvent.click(titleElement);

    const voiceSlider = screen.getByRole("slider", { name: /narração/i });

    // Change to a different value to trigger onChange
    fireEvent.change(voiceSlider, { target: { value: "75" } });

    expect(AudioAccessibilityService.setVolume).toHaveBeenCalledWith(0.75);
  });

  describe("Mute/Unmute via Icon Click", () => {
    // Helper to find the icon box (clickable icon container) for a control
    const findIconBox = (controlName: string): HTMLElement => {
      // Get all elements with the label (SVG and slider), filter for the SVG icon
      const elements = screen.getAllByLabelText(controlName);
      const icon = elements.find((el) => el.tagName.toLowerCase() === "svg");
      // The icon box is the parent element that has the click handler
      return icon?.parentElement as HTMLElement;
    };

    it("mutes music when music icon is clicked", () => {
      render(<AudioSubpanel />);
      const title = getTitleElement();
      if (!title) throw new Error("Title element not found");
      fireEvent.click(title);

      const iconBox = findIconBox("Música");
      expect(iconBox).toBeTruthy();

      fireEvent.click(iconBox);

      // Music should be muted (volume set to 0)
      expect(AudioManager.setMusicVolume).toHaveBeenCalledWith(0);
    });

    it("unmutes music when muted music icon is clicked", () => {
      render(<AudioSubpanel />);
      const title = getTitleElement();
      if (!title) throw new Error("Title element not found");
      fireEvent.click(title);

      const iconBox = findIconBox("Música");

      // First click to mute
      fireEvent.click(iconBox);
      jest.clearAllMocks();

      // Second click to unmute
      fireEvent.click(iconBox);

      // Should restore to previous volume (70% default)
      expect(AudioManager.setMusicVolume).toHaveBeenCalledWith(0.7);
    });

    it("mutes effects when effects icon is clicked", () => {
      render(<AudioSubpanel />);
      const title = getTitleElement();
      if (!title) throw new Error("Title element not found");
      fireEvent.click(title);

      const iconBox = findIconBox("Efeitos");
      expect(iconBox).toBeTruthy();

      fireEvent.click(iconBox);

      expect(AudioManager.setSfxVolume).toHaveBeenCalledWith(0);
    });

    it("unmutes effects when muted effects icon is clicked", () => {
      render(<AudioSubpanel />);
      fireEvent.click(getTitleElement()!);

      const iconBox = findIconBox("Efeitos");

      // First click to mute
      fireEvent.click(iconBox);
      jest.clearAllMocks();

      // Second click to unmute
      fireEvent.click(iconBox);

      // Should restore to previous volume (80% default)
      expect(AudioManager.setSfxVolume).toHaveBeenCalledWith(0.8);
    });

    it("mutes voice when voice icon is clicked", () => {
      render(<AudioSubpanel />);
      fireEvent.click(getTitleElement()!);

      const iconBox = findIconBox("Narração");
      expect(iconBox).toBeTruthy();

      fireEvent.click(iconBox);

      expect(AudioAccessibilityService.setVolume).toHaveBeenCalledWith(0);
    });

    it("unmutes voice when muted voice icon is clicked", () => {
      render(<AudioSubpanel />);
      fireEvent.click(getTitleElement()!);

      const iconBox = findIconBox("Narração");

      // First click to mute
      fireEvent.click(iconBox);
      jest.clearAllMocks();

      // Second click to unmute
      fireEvent.click(iconBox);

      // Should restore to previous volume (60% default from AudioAccessibilityService)
      expect(AudioAccessibilityService.setVolume).toHaveBeenCalledWith(0.6);
    });

    it("restores to 50% when unmuting and previous volume was 0", () => {
      render(<AudioSubpanel />);
      fireEvent.click(getTitleElement()!);

      const iconBox = findIconBox("Música");
      const musicSlider = screen.getByRole("slider", { name: /música/i });

      // First set volume to 0 via slider
      fireEvent.change(musicSlider, { target: { value: "0" } });
      jest.clearAllMocks();

      // Then mute (saves 0 as previous volume)
      fireEvent.click(iconBox);
      jest.clearAllMocks();

      // Now unmute - should restore to 50% since previous was 0
      fireEvent.click(iconBox);

      expect(AudioManager.setMusicVolume).toHaveBeenCalledWith(0.5);
    });

    it("shows reduced opacity when muted", () => {
      render(<AudioSubpanel />);
      fireEvent.click(getTitleElement()!);

      const iconBox = findIconBox("Música");

      // Initially not muted
      expect(iconBox).toHaveStyle("opacity: 1");

      // Click to mute
      fireEvent.click(iconBox);

      // Should have reduced opacity
      expect(iconBox).toHaveStyle("opacity: 0.5");
    });

    it("unmutes when slider is adjusted while muted", () => {
      render(<AudioSubpanel />);
      fireEvent.click(getTitleElement()!);

      const iconBox = findIconBox("Música");
      const musicSlider = screen.getByRole("slider", { name: /música/i });

      // First mute
      fireEvent.click(iconBox);
      jest.clearAllMocks();

      // Then adjust slider
      fireEvent.change(musicSlider, { target: { value: "45" } });

      // Should unmute with new volume
      expect(AudioManager.setMusicVolume).toHaveBeenCalledWith(0.45);
    });
  });

  describe("Accessibility", () => {
    const getTitleElement = () => {
      const somElements = screen.getAllByText("Som");
      return somElements.find((el) => el.tagName.toLowerCase() === "p");
    };

    it("has proper ARIA labels for all controls", () => {
      render(<AudioSubpanel />);
      fireEvent.click(getTitleElement()!);

      // Both the icon SVG and slider have the same aria-label
      expect(screen.getAllByLabelText("Música").length).toBeGreaterThanOrEqual(
        1,
      );
      expect(screen.getAllByLabelText("Efeitos").length).toBeGreaterThanOrEqual(
        1,
      );
      expect(
        screen.getAllByLabelText("Narração").length,
      ).toBeGreaterThanOrEqual(1);
    });

    it("has proper ARIA labels for icons", () => {
      render(<AudioSubpanel />);
      fireEvent.click(getTitleElement()!);

      expect(screen.getByRole("img", { name: "Música" })).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "Efeitos" })).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "Narração" })).toBeInTheDocument();
    });

    it("has expand/collapse button with proper labeling", () => {
      render(<AudioSubpanel />);

      const expandButton = screen.getByRole("img", { name: "Expandir" });
      expect(expandButton).toBeInTheDocument();

      fireEvent.click(getTitleElement()!);

      const collapseButton = screen.getByRole("img", { name: "Recolher" });
      expect(collapseButton).toBeInTheDocument();
    });
  });
});
