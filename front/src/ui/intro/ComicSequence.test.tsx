import { act, render, screen, waitFor } from "@testing-library/react";
import { ComicSequence } from "./ComicSequence";
import type { PanelConfig } from "./types";

// ────────────────────────────────────────────────────────────────────
// Mocks
// ────────────────────────────────────────────────────────────────────

// Mock Image to simulate loading
class MockImage {
  static instances: MockImage[] = [];

  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  crossOrigin: string | null = null;
  complete = false;
  naturalWidth = 100;
  naturalHeight = 100;
  private _src = "";

  constructor() {
    MockImage.instances.push(this);
  }

  set src(value: string) {
    this._src = value;
    // Set complete immediately
    this.complete = true;
    // Call onload via Promise to simulate async behavior
    Promise.resolve().then(() => {
      this.onload?.();
    });
  }

  get src() {
    return this._src;
  }

  decode() {
    return Promise.resolve();
  }
}

// Mock canvas context - must be set up before any component renders
const mockContext = {
  clearRect: jest.fn(),
  drawImage: jest.fn(),
  getImageData: jest.fn(() => ({
    data: new Uint8ClampedArray(100 * 100 * 4),
  })),
  putImageData: jest.fn(),
  createImageData: jest.fn(() => ({
    data: new Uint8ClampedArray(100 * 100 * 4),
  })),
  imageSmoothingEnabled: false,
};

// Set up canvas mock immediately (before tests run)
HTMLCanvasElement.prototype.getContext = jest.fn(
  () => mockContext,
) as unknown as typeof HTMLCanvasElement.prototype.getContext;

// ────────────────────────────────────────────────────────────────────
// Test Fixtures
// ────────────────────────────────────────────────────────────────────

const createTestPanels = (count = 3): PanelConfig[] => {
  return Array.from({ length: count }, (_, i) => ({
    src: `/panel-${i}.png`,
    sliceWidth: 200,
    sliceStart: i * 100,
    revealMs: 100,
    holdMs: 50,
    shrinkMs: 100,
    title: `Panel ${i}`,
    caption: `Caption for panel ${i}`,
  }));
};

const defaultProps = {
  panels: createTestPanels(),
  fullWidth: 1024,
  height: 1024,
  blockSize: 8,
  gap: 30,
  rollOutMs: 100,
  rollStaggerMs: 50,
};

// ────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────

describe("ComicSequence E2E", () => {
  const originalImage = global.Image;
  const originalRAF = global.requestAnimationFrame;
  const originalCancelRAF = global.cancelAnimationFrame;
  const originalPerformanceNow = global.performance.now;

  beforeEach(() => {
    MockImage.instances = [];
    global.Image = MockImage as unknown as typeof Image;

    // Mock requestAnimationFrame to execute callbacks immediately
    global.requestAnimationFrame = ((cb: (time: number) => void) => {
      setTimeout(() => cb(performance.now()), 0);
      return 1;
    }) as unknown as typeof requestAnimationFrame;

    global.cancelAnimationFrame = jest.fn();
    global.performance.now = () => Date.now();

    jest.useFakeTimers();
  });

  afterEach(() => {
    global.Image = originalImage;
    global.requestAnimationFrame = originalRAF;
    global.cancelAnimationFrame = originalCancelRAF;
    global.performance.now = originalPerformanceNow;
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render without crashing", async () => {
      const { container } = render(<ComicSequence {...defaultProps} />);

      // Wait for preloading to complete
      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(container).toBeTruthy();
    });

    it("should render first panel after preloading", async () => {
      const onPanelStart = jest.fn();

      render(<ComicSequence {...defaultProps} onPanelStart={onPanelStart} />);

      // Wait for preload to complete and first panel to mount
      await act(async () => {
        await jest.runAllTimersAsync();
      });

      // First panel should be mounted
      expect(onPanelStart).toHaveBeenCalledWith(0);
    });

    it("should preload all panel images", async () => {
      render(<ComicSequence {...defaultProps} />);

      // Wait for images to be created
      await act(async () => {
        await jest.runAllTimersAsync();
      });

      // At least the panel images should be created (PixelRevealCanvas may create more)
      expect(MockImage.instances.length).toBeGreaterThanOrEqual(
        defaultProps.panels.length,
      );

      // First N instances should have panel srcs set
      const panelSrcs = defaultProps.panels.map((p) => p.src);
      const instanceSrcs = MockImage.instances.map((img) => img.src);

      // All panel srcs should be present in the instances
      panelSrcs.forEach((src) => {
        expect(instanceSrcs).toContain(src);
      });
    });
  });

  describe("Skip Functionality", () => {
    it("should mount all panels instantly when skip is true", async () => {
      const onComplete = jest.fn();
      const onPanelStart = jest.fn();

      render(
        <ComicSequence
          {...defaultProps}
          skip={true}
          onComplete={onComplete}
          onPanelStart={onPanelStart}
        />,
      );

      // Wait for onComplete to be called
      await act(async () => {
        await jest.runAllTimersAsync();
      });

      // onComplete should be called
      expect(onComplete).toHaveBeenCalled();
      // onPanelStart should NOT be called in skip mode
      expect(onPanelStart).not.toHaveBeenCalled();
    });

    it("should skip transitions when skip is true", async () => {
      const { container } = render(
        <ComicSequence {...defaultProps} skip={true} />,
      );

      // Wait for component to render
      await act(async () => {
        await jest.runAllTimersAsync();
      });

      // Check that transition is set to "none"
      const wrapper = container.querySelector('[style*="transition: none"]');
      expect(wrapper).toBeTruthy();
    });
  });

  describe("RollOut Functionality", () => {
    it("should apply roll-out animation when rollOut is true", async () => {
      const { container } = render(
        <ComicSequence {...defaultProps} rollOut={true} />,
      );

      // Wait for component to render and roll-out to start
      await act(async () => {
        await jest.runAllTimersAsync();
      });

      // Check for translateY transform (roll-out animation)
      const panel = container.querySelector('[style*="translateY"]');
      expect(panel).toBeTruthy();
    });
  });

  describe("Navigation", () => {
    it("should navigate to specific panel", async () => {
      const onPanelStart = jest.fn();

      const { rerender } = render(
        <ComicSequence
          {...defaultProps}
          navigateToPanel={-1}
          onPanelStart={onPanelStart}
        />,
      );

      // Wait for initial render
      await act(async () => {
        await jest.runAllTimersAsync();
      });

      // Navigate to panel 2
      rerender(
        <ComicSequence
          {...defaultProps}
          navigateToPanel={2}
          onPanelStart={onPanelStart}
        />,
      );

      // Wait for navigation to complete
      await act(async () => {
        await jest.runAllTimersAsync();
      });

      // Panels should be mounted
      expect(onPanelStart).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty panels array", async () => {
      const { container } = render(
        <ComicSequence {...defaultProps} panels={[]} />,
      );

      // Should render without crashing
      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(container).toBeTruthy();
    });

    it("should handle single panel", async () => {
      const panels = createTestPanels(1);
      const { container } = render(
        <ComicSequence {...defaultProps} panels={panels} />,
      );

      // Wait for render
      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(container).toBeTruthy();
    });

    it("should cleanup on unmount", async () => {
      const { unmount } = render(<ComicSequence {...defaultProps} />);

      // Wait for render
      await act(async () => {
        await jest.runAllTimersAsync();
      });

      // Should not throw on unmount
      expect(() => unmount()).not.toThrow();
    });

    it("should handle image load errors gracefully", async () => {
      // Mock image that fails to load
      class FailingImage extends MockImage {
        set src(value: string) {
          this._src = value;
          // Set complete immediately
          this.complete = true;
          // Trigger error via Promise
          Promise.resolve().then(() => {
            this.onerror?.();
          });
        }
      }

      global.Image = FailingImage as unknown as typeof Image;

      const { container } = render(<ComicSequence {...defaultProps} />);

      // Wait for images to be created
      await act(async () => {
        await jest.runAllTimersAsync();
      });

      // Should not crash
      expect(container).toBeTruthy();
    });
  });
});
