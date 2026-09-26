import { act, renderHook } from "@testing-library/react";
import { EventBus } from "@/shared/events/event-bus";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { useEventBridge } from "./useEventBridge";

// Mock EventBus to behave as a real, functional event emitter in this test suite
// biome-ignore lint/suspicious/noExplicitAny: Event mock handles various event payloads
const mockListeners: Record<string, ((data: any) => void)[]> = {};

jest.mock("@/shared/events/event-bus", () => ({
  EventBus: {
    // biome-ignore lint/suspicious/noExplicitAny: Event mock signature matches diverse callbacks
    on: jest.fn((event: string, fn: (data: any) => void) => {
      if (!mockListeners[event]) {
        mockListeners[event] = [];
      }
      mockListeners[event].push(fn);
      return jest.fn(() => {
        mockListeners[event] = (mockListeners[event] || []).filter(
          (f) => f !== fn,
        );
      });
    }),
    // biome-ignore lint/suspicious/noExplicitAny: Event mock handles generic payload emissions
    emit: jest.fn((event: string, data: any) => {
      if (mockListeners[event]) {
        for (const fn of mockListeners[event]) {
          fn(data);
        }
      }
    }),
    removeAllListeners: jest.fn(() => {
      for (const key of Object.keys(mockListeners)) {
        delete mockListeners[key];
      }
    }),
  },
}));

describe("useEventBridge", () => {
  beforeEach(() => {
    useGameUIStore.setState({
      gameStarted: false,
      sidebarOpen: false,
      stars: 0,
      totalStars: 0,
      missions: [],
      collectibles: [],
    });
    EventBus.removeAllListeners();
  });

  const flushEffects = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  };

  it("should not initialize gameStarted to true on mount", async () => {
    renderHook(() => useEventBridge());
    await flushEffects();
    expect(useGameUIStore.getState().gameStarted).toBe(false);
  });

  it("should set gameStarted to true when game:started event is emitted", async () => {
    renderHook(() => useEventBridge());
    await flushEffects();
    expect(useGameUIStore.getState().gameStarted).toBe(false);

    await act(async () => {
      EventBus.emit("game:started", undefined);
    });
    expect(useGameUIStore.getState().gameStarted).toBe(true);
  });

  it("should set gameStarted and sidebarOpen to false when game:ended event is emitted", async () => {
    useGameUIStore.setState({
      gameStarted: true,
      sidebarOpen: true,
      missions: [
        {
          missionId: "m1",
          title: "Mission 1",
          steps: [{ text: "Step 1", done: true }],
        },
      ],
      collectibles: [
        {
          id: "c1",
          name: "Collectible 1",
          collected: true,
          category: "test",
        },
      ],
    });
    renderHook(() => useEventBridge());
    await flushEffects();

    await act(async () => {
      EventBus.emit("game:ended", undefined);
    });
    expect(useGameUIStore.getState().gameStarted).toBe(false);
    expect(useGameUIStore.getState().sidebarOpen).toBe(false);
    expect(useGameUIStore.getState().missions).toEqual([]);
    expect(useGameUIStore.getState().collectibles).toEqual([]);
  });

  it("should update sidebarOpen when sidebar:toggled event is emitted", async () => {
    renderHook(() => useEventBridge());
    await flushEffects();
    expect(useGameUIStore.getState().sidebarOpen).toBe(false);

    await act(async () => {
      EventBus.emit("sidebar:toggled", { open: true });
    });
    expect(useGameUIStore.getState().sidebarOpen).toBe(true);

    await act(async () => {
      EventBus.emit("sidebar:toggled", { open: false });
    });
    expect(useGameUIStore.getState().sidebarOpen).toBe(false);
  });

  it("should sync stars when player:stars-changed event is emitted", async () => {
    renderHook(() => useEventBridge());
    await flushEffects();

    await act(async () => {
      EventBus.emit("player:stars-changed", {
        current: 5,
        total: 10,
        score: 20,
      });
    });
    expect(useGameUIStore.getState().stars).toBe(5);
    expect(useGameUIStore.getState().totalStars).toBe(10);
    expect(useGameUIStore.getState().score).toBe(20);
  });

  it("should update mission progress when quest:progress-changed event is emitted", async () => {
    renderHook(() => useEventBridge());
    await flushEffects();

    await act(async () => {
      EventBus.emit("quest:progress-changed", {
        missionId: "m1",
        missionTitle: "Mission 1",
        collectedInfos: ["info1"],
        totalSteps: 2,
      });
    });
    const mission = useGameUIStore
      .getState()
      .missions.find((m) => m.missionId === "m1");
    expect(mission).toBeDefined();
    expect(mission?.title).toBe("Mission 1");
  });

  it("should unsubscribe from events on unmount", async () => {
    const { unmount } = renderHook(() => useEventBridge());
    await flushEffects();
    unmount();
    await flushEffects();

    await act(async () => {
      EventBus.emit("game:started", undefined);
    });
    expect(useGameUIStore.getState().gameStarted).toBe(false);
  });
});
