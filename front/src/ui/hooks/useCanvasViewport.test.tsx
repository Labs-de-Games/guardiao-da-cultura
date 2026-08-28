import { act, renderHook } from "@testing-library/react";
import { LayoutConfig } from "@/game/constants/LayoutConfig";
import { EventBus } from "@/shared/events/event-bus";
import { useCanvasViewport } from "./useCanvasViewport";

// Mock EventBus to behave as a real, functional event emitter in this test
// suite — the real Phaser-backed EventBus does not dispatch reliably here.
// biome-ignore lint/suspicious/noExplicitAny: Event mock handles various event payloads
const mockListeners: Record<string, ((data: any) => void)[]> = {};
const lastPayloads: Record<string, unknown> = {};

jest.mock("@/shared/events/event-bus", () => ({
  EventBus: {
    // biome-ignore lint/suspicious/noExplicitAny: Event mock signature matches diverse callbacks
    on: jest.fn((event: string, fn: (data: any) => void) => {
      if (!mockListeners[event]) {
        mockListeners[event] = [];
      }
      mockListeners[event].push(fn);
      if (event in lastPayloads) {
        fn(lastPayloads[event]);
      }
      return jest.fn(() => {
        mockListeners[event] = (mockListeners[event] || []).filter(
          (f) => f !== fn,
        );
      });
    }),
    // biome-ignore lint/suspicious/noExplicitAny: Event mock handles generic payload emissions
    emit: jest.fn((event: string, data: any) => {
      lastPayloads[event] = data;
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
      for (const key of Object.keys(lastPayloads)) {
        delete lastPayloads[key];
      }
    }),
  },
}));

describe("useCanvasViewport", () => {
  afterEach(() => {
    EventBus.removeAllListeners();
  });

  it("defaults to the base game resolution with no offset/scale", () => {
    const { result } = renderHook(() => useCanvasViewport());

    expect(result.current).toEqual({
      left: 0,
      top: 0,
      width: LayoutConfig.GAME.WIDTH,
      height: LayoutConfig.GAME.HEIGHT,
      scaleX: 1,
      scaleY: 1,
    });
  });

  it("updates when canvas:viewport-changed is emitted", () => {
    const { result } = renderHook(() => useCanvasViewport());

    act(() => {
      EventBus.emit("canvas:viewport-changed", {
        left: 100,
        top: 0,
        width: 1600,
        height: 900,
        scaleX: 1600 / LayoutConfig.GAME.WIDTH,
        scaleY: 900 / LayoutConfig.GAME.HEIGHT,
      });
    });

    expect(result.current).toEqual({
      left: 100,
      top: 0,
      width: 1600,
      height: 900,
      scaleX: 1600 / LayoutConfig.GAME.WIDTH,
      scaleY: 900 / LayoutConfig.GAME.HEIGHT,
    });
  });

  it("replays the last known viewport to a newly mounted consumer", () => {
    EventBus.emit("canvas:viewport-changed", {
      left: 50,
      top: 25,
      width: 800,
      height: 450,
      scaleX: 800 / LayoutConfig.GAME.WIDTH,
      scaleY: 450 / LayoutConfig.GAME.HEIGHT,
    });

    const { result } = renderHook(() => useCanvasViewport());

    expect(result.current.left).toBe(50);
    expect(result.current.top).toBe(25);
  });
});
