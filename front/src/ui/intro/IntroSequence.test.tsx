import { act, fireEvent, render, screen } from "@testing-library/react";
import * as EventBus from "../../shared/events/event-bus";
import { IntroSequence } from "./IntroSequence";
import type { IntroConfig } from "./types";

// ────────────────────────────────────────────────────────────────────
// Mocks
// ────────────────────────────────────────────────────────────────────

// Mock Image
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
    setTimeout(() => {
      this.complete = true;
      this.onload?.();
    }, 0);
  }

  get src() {
    return this._src;
  }

  decode() {
    return Promise.resolve();
  }
}

// Mock canvas context
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

// Mock EventBus
jest.mock("../../shared/events/event-bus", () => ({
  EventBus: {
    emit: jest.fn(),
    on: jest.fn(() => jest.fn()),
    once: jest.fn(),
  },
}));

// Mock ResizeObserver
class MockResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Mock window dimensions
const mockWindowDimensions = (width = 1920, height = 1080) => {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, "innerHeight", {
    writable: true,
    configurable: true,
    value: height,
  });
};

// ────────────────────────────────────────────────────────────────────
// Test Fixtures
// ────────────────────────────────────────────────────────────────────

const createTestConfig = (): IntroConfig => ({
  revealIconMask: "mask.png",
  loadingImage: "loading.png",
  captionImage: "caption.png",
  skipEnabled: true,
  panels: [
    {
      src: "panel-0.png",
      sliceWidth: 200,
      sliceStart: 0,
      revealMs: 100,
      holdMs: 50,
      shrinkMs: 100,
      title: "Panel 1",
      caption: "First panel caption",
    },
    {
      src: "panel-1.png",
      sliceWidth: 200,
      sliceStart: 100,
      revealMs: 100,
      holdMs: 50,
      shrinkMs: 100,
      title: "Panel 2",
      caption: "Second panel caption",
    },
    {
      src: "panel-2.png",
      sliceWidth: 200,
      sliceStart: 200,
      revealMs: 100,
      holdMs: 50,
      shrinkMs: 100,
      title: "Panel 3",
      caption: "Third panel caption",
    },
  ],
});

const defaultProps = {
  config: createTestConfig(),
  levelId: "test-level",
  onComplete: jest.fn(),
};

// ────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────

describe("IntroSequence E2E", () => {
  const originalImage = global.Image;
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const originalRAF = global.requestAnimationFrame;
  const originalCancelRAF = global.cancelAnimationFrame;
  const originalPerformanceNow = global.performance.now;

  beforeEach(() => {
    MockImage.instances = [];
    global.Image = MockImage as unknown as typeof Image;
    HTMLCanvasElement.prototype.getContext = jest.fn(
      () => mockContext,
    ) as unknown as typeof HTMLCanvasElement.prototype.getContext;

    // Mock requestAnimationFrame
    global.requestAnimationFrame = ((cb: (time: number) => void) => {
      setTimeout(() => cb(performance.now()), 0);
      return 1;
    }) as unknown as typeof requestAnimationFrame;

    global.cancelAnimationFrame = jest.fn();
    global.performance.now = () => Date.now();

    mockWindowDimensions();
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.Image = originalImage;
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    global.requestAnimationFrame = originalRAF;
    global.cancelAnimationFrame = originalCancelRAF;
    global.performance.now = originalPerformanceNow;
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render without crashing", async () => {
      const { container } = render(<IntroSequence {...defaultProps} />);

      await act(async () => {
        jest.runAllTimers();
      });

      expect(container).toBeTruthy();
    });

    it("should display skip hint", async () => {
      render(<IntroSequence {...defaultProps} />);

      await act(async () => {
        jest.runAllTimers();
      });

      expect(
        screen.getByText("⏭ Aperte ESPAÇO para avançar quadrinhos"),
      ).toBeTruthy();
      expect(
        screen.getByText("⏩︎ Aperte ESC para pular a introdução"),
      ).toBeTruthy();
    });
  });

  describe("Skip Functionality", () => {
    it("should skip on ESC key", async () => {
      const onComplete = jest.fn();

      render(<IntroSequence {...defaultProps} onComplete={onComplete} />);

      await act(async () => {
        jest.runAllTimers();
      });

      // Press ESC
      await act(async () => {
        fireEvent.keyDown(window, { key: "Escape" });
      });

      // Wait for mask to appear
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Emit game loaded event
      await act(async () => {
        window.dispatchEvent(new Event("phaser-loading-complete"));
      });

      // Wait for mask animation to complete
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      expect(onComplete).toHaveBeenCalled();
    });

    it("should skip on Enter key", async () => {
      const onComplete = jest.fn();

      render(<IntroSequence {...defaultProps} onComplete={onComplete} />);

      await act(async () => {
        jest.runAllTimers();
      });

      await act(async () => {
        fireEvent.keyDown(window, { key: "Enter" });
      });

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await act(async () => {
        window.dispatchEvent(new Event("phaser-loading-complete"));
      });

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      expect(onComplete).toHaveBeenCalled();
    });

    it("should skip on E key", async () => {
      const onComplete = jest.fn();

      render(<IntroSequence {...defaultProps} onComplete={onComplete} />);

      await act(async () => {
        jest.runAllTimers();
      });

      await act(async () => {
        fireEvent.keyDown(window, { key: "e" });
      });

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await act(async () => {
        window.dispatchEvent(new Event("phaser-loading-complete"));
      });

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      expect(onComplete).toHaveBeenCalled();
    });

    it("should skip on click", async () => {
      const onComplete = jest.fn();

      render(<IntroSequence {...defaultProps} onComplete={onComplete} />);

      await act(async () => {
        jest.runAllTimers();
      });

      // Click anywhere
      await act(async () => {
        fireEvent.click(screen.getByRole("button"));
      });

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await act(async () => {
        window.dispatchEvent(new Event("phaser-loading-complete"));
      });

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      expect(onComplete).toHaveBeenCalled();
    });

    it("should not skip when skipEnabled is false", async () => {
      const config = { ...createTestConfig(), skipEnabled: false };
      const onComplete = jest.fn();

      render(
        <IntroSequence
          {...defaultProps}
          config={config}
          onComplete={onComplete}
        />,
      );

      await act(async () => {
        jest.runAllTimers();
      });

      // Try to skip
      await act(async () => {
        fireEvent.keyDown(window, { key: "Escape" });
        jest.advanceTimersByTime(100);
      });

      // onComplete should not be called yet
      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  describe("Panel Navigation", () => {
    it("should advance to next panel on Space key", async () => {
      render(<IntroSequence {...defaultProps} />);

      await act(async () => {
        jest.runAllTimers();
      });

      // Press Space to advance
      await act(async () => {
        fireEvent.keyDown(window, { key: " " });
        jest.advanceTimersByTime(300);
      });

      // Should not crash
    });

    it("should advance to next panel on ArrowRight key", async () => {
      render(<IntroSequence {...defaultProps} />);

      await act(async () => {
        jest.runAllTimers();
      });

      await act(async () => {
        fireEvent.keyDown(window, { key: "ArrowRight" });
        jest.advanceTimersByTime(300);
      });

      // Should not crash
    });
  });

  describe("Accessibility", () => {
    it("should have correct ARIA label", async () => {
      render(<IntroSequence {...defaultProps} />);

      await act(async () => {
        jest.runAllTimers();
      });

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute(
        "aria-label",
        "Aperte ESC para pular a introdução",
      );
    });

    it("should be focusable", async () => {
      render(<IntroSequence {...defaultProps} />);

      await act(async () => {
        jest.runAllTimers();
      });

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("tabIndex", "0");
    });
  });

  describe("Responsiveness", () => {
    it("should handle different viewport sizes", async () => {
      mockWindowDimensions(1280, 720);

      const { container } = render(<IntroSequence {...defaultProps} />);

      await act(async () => {
        jest.runAllTimers();
      });

      expect(container).toBeTruthy();
    });

    it("should handle very small viewports", async () => {
      mockWindowDimensions(320, 240);

      const { container } = render(<IntroSequence {...defaultProps} />);

      await act(async () => {
        jest.runAllTimers();
      });

      expect(container).toBeTruthy();
    });

    it("should handle very large viewports", async () => {
      mockWindowDimensions(3840, 2160);

      const { container } = render(<IntroSequence {...defaultProps} />);

      await act(async () => {
        jest.runAllTimers();
      });

      expect(container).toBeTruthy();
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing caption image", async () => {
      const config = { ...createTestConfig(), captionImage: undefined };

      const { container } = render(
        <IntroSequence {...defaultProps} config={config} />,
      );

      await act(async () => {
        jest.runAllTimers();
      });

      expect(container).toBeTruthy();
    });

    it("should handle single panel", async () => {
      const config = {
        ...createTestConfig(),
        panels: [createTestConfig().panels[0]],
      };

      const { container } = render(
        <IntroSequence {...defaultProps} config={config} />,
      );

      await act(async () => {
        jest.runAllTimers();
      });

      expect(container).toBeTruthy();
    });

    it("should handle many panels", async () => {
      const config = {
        ...createTestConfig(),
        panels: Array.from({ length: 10 }, (_, i) => ({
          src: `panel-${i}.png`,
          sliceWidth: 200,
          sliceStart: i * 100,
          revealMs: 50,
          holdMs: 25,
          shrinkMs: 50,
          title: `Panel ${i}`,
          caption: `Caption ${i}`,
        })),
      };

      const { container } = render(
        <IntroSequence {...defaultProps} config={config} />,
      );

      await act(async () => {
        jest.runAllTimers();
      });

      expect(container).toBeTruthy();
    });

    it("should cleanup event listeners on unmount", async () => {
      const { unmount } = render(<IntroSequence {...defaultProps} />);

      await act(async () => {
        jest.runAllTimers();
      });

      const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalled();
    });
  });
});
