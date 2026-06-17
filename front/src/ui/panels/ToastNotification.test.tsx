import { act, render, screen } from "@testing-library/react";

import { useGameUIStore } from "@/ui/state/game-ui-store";
import { ToastItem, ToastNotification } from "./ToastNotification";

beforeEach(() => {
  useGameUIStore.setState({
    toasts: [],
    sidebarOpen: false,
    gameStarted: false,
    stars: 0,
    totalStars: 0,
    missions: [],
    collectibles: [],
  });
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("ToastNotification", () => {
  it("renders nothing when toasts array is empty", () => {
    const { container } = render(<ToastNotification />);
    expect(container.firstChild).toBeNull();
  });

  it("renders toast with correct message", () => {
    act(() => {
      useGameUIStore.getState().addToast("Test message", 3000);
    });
    render(<ToastNotification />);
    expect(screen.getByText("Test message")).toBeDefined();
  });

  it("renders icon when iconSrc is provided", () => {
    act(() => {
      useGameUIStore
        .getState()
        .addToast("With icon", 3000, "data/badges/test.png");
    });
    render(<ToastNotification />);
    const img = screen.getByRole("presentation");
    expect(img).toBeDefined();
    expect(img.getAttribute("src")).toBe("/assets/data/badges/test.png");
  });

  it("does not render icon when iconSrc is omitted", () => {
    act(() => {
      useGameUIStore.getState().addToast("No icon", 3000);
    });
    render(<ToastNotification />);
    expect(screen.queryByRole("presentation")).toBeNull();
  });

  it("auto-dismiss calls dismissToast after duration", () => {
    const spy = jest.spyOn(useGameUIStore.getState(), "dismissToast");
    render(<ToastNotification />);

    act(() => {
      useGameUIStore.getState().addToast("Auto dismiss", 2000);
    });

    act(() => {
      jest.advanceTimersByTime(1999);
    });
    expect(spy).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(spy).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });

  it("renders multiple toasts in order", () => {
    act(() => {
      useGameUIStore.getState().addToast("First", 3000);
      useGameUIStore.getState().addToast("Second", 3000);
      useGameUIStore.getState().addToast("Third", 3000);
    });

    render(<ToastNotification />);

    const items = screen.getAllByText(/(First|Second|Third)/);
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toBe("First");
    expect(items[1].textContent).toBe("Second");
    expect(items[2].textContent).toBe("Third");
  });

  it("exit animation completes before removeToast is called", () => {
    const onDismissComplete = jest.fn();

    const { rerender } = render(
      <ToastItem
        id="exit-id"
        message="Exit test"
        duration={3000}
        exiting={false}
        onDismiss={jest.fn()}
        onDismissComplete={onDismissComplete}
      />,
    );

    rerender(
      <ToastItem
        id="exit-id"
        message="Exit test"
        duration={3000}
        exiting={true}
        onDismiss={jest.fn()}
        onDismissComplete={onDismissComplete}
      />,
    );

    expect(onDismissComplete).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(250);
    });

    expect(onDismissComplete).toHaveBeenCalledTimes(1);
    expect(onDismissComplete).toHaveBeenCalledWith("exit-id");
  });

  it("evicts oldest toast when exceeding MAX_VISIBLE_TOASTS", () => {
    act(() => {
      for (let i = 0; i < 6; i++) {
        useGameUIStore.getState().addToast(`Toast ${i}`, 3000);
      }
    });

    render(<ToastNotification />);

    expect(screen.queryByText("Toast 0")).toBeNull();
    expect(screen.getByText("Toast 1")).toBeDefined();
    expect(screen.getByText("Toast 5")).toBeDefined();
  });

  it("clamps duration: 0 becomes 1000, 999999 becomes 10000", () => {
    act(() => {
      useGameUIStore.getState().addToast("Short", 0);
      useGameUIStore.getState().addToast("Long", 999999);
    });

    const toasts = useGameUIStore.getState().toasts;
    const shortToast = toasts.find((t) => t.message === "Short");
    const longToast = toasts.find((t) => t.message === "Long");

    expect(shortToast?.duration).toBe(1000);
    expect(longToast?.duration).toBe(10000);
  });
});

describe("ToastItem", () => {
  const defaultProps = {
    id: "test-id",
    message: "Test",
    duration: 3000,
    exiting: false,
    onDismiss: jest.fn(),
    onDismissComplete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders message text", () => {
    render(<ToastItem {...defaultProps} />);
    expect(screen.getByText("Test")).toBeDefined();
  });

  it("calls onDismiss after duration", () => {
    render(<ToastItem {...defaultProps} duration={1500} />);

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(defaultProps.onDismiss).toHaveBeenCalledWith("test-id");
  });

  it("does not start auto-dismiss timer when exiting", () => {
    render(<ToastItem {...defaultProps} exiting={true} duration={1500} />);

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(defaultProps.onDismiss).not.toHaveBeenCalled();
  });

  it("calls onDismissComplete after exit animation", () => {
    render(<ToastItem {...defaultProps} exiting={true} />);

    act(() => {
      jest.advanceTimersByTime(250);
    });

    expect(defaultProps.onDismissComplete).toHaveBeenCalledWith("test-id");
  });
});
