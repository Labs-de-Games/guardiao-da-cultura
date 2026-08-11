import { CallbackRegistry } from "./CallbackRegistry";

const listeners = new Map<string, Set<(...args: unknown[]) => void>>();

jest.mock("../../shared/events/event-bus", () => ({
  EventBus: {
    on: jest.fn((event: string, fn: (...args: unknown[]) => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)?.add(fn);
      return () => {
        listeners.get(event)?.delete(fn);
      };
    }),
    emit: jest.fn((event: string, data: unknown) => {
      listeners.get(event)?.forEach((fn) => {
        fn(data);
      });
    }),
    off: jest.fn(),
    once: jest.fn(),
    removeAllListeners: jest.fn(() => {
      listeners.clear();
    }),
  },
}));

describe("CallbackRegistry", () => {
  let registry: CallbackRegistry;

  beforeEach(() => {
    listeners.clear();
    registry = new CallbackRegistry();
    registry.setupListeners();
  });

  afterEach(() => {
    registry.cleanup();
  });

  it("should call onYes when dialogue:completed with confirmed=true", () => {
    const onYes = jest.fn();
    const onNo = jest.fn();
    registry.registerConfirm("cb-1", onYes, onNo);

    const { EventBus } = require("../../shared/events/event-bus");
    EventBus.emit("dialogue:completed", {
      callbackId: "cb-1",
      confirmed: true,
    });

    expect(onYes).toHaveBeenCalledTimes(1);
    expect(onNo).not.toHaveBeenCalled();
  });

  it("should call onNo when dialogue:completed with confirmed=false", () => {
    const onYes = jest.fn();
    const onNo = jest.fn();
    registry.registerConfirm("cb-2", onYes, onNo);

    const { EventBus } = require("../../shared/events/event-bus");
    EventBus.emit("dialogue:completed", {
      callbackId: "cb-2",
      confirmed: false,
    });

    expect(onNo).toHaveBeenCalledTimes(1);
    expect(onYes).not.toHaveBeenCalled();
  });

  it("should call onDismiss when dialogue:dismissed", () => {
    const onYes = jest.fn();
    const onNo = jest.fn();
    const onDismiss = jest.fn();
    registry.registerConfirm("cb-3", onYes, onNo, onDismiss);

    const { EventBus } = require("../../shared/events/event-bus");
    EventBus.emit("dialogue:dismissed", { callbackId: "cb-3" });

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onYes).not.toHaveBeenCalled();
    expect(onNo).not.toHaveBeenCalled();
  });

  it("should not call onDismiss when dialogue:completed", () => {
    const onDismiss = jest.fn();
    registry.registerConfirm("cb-4", jest.fn(), jest.fn(), onDismiss);

    const { EventBus } = require("../../shared/events/event-bus");
    EventBus.emit("dialogue:completed", {
      callbackId: "cb-4",
      confirmed: true,
    });

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("should handle dismiss without onDismiss gracefully", () => {
    registry.registerConfirm("cb-5", jest.fn(), jest.fn());

    const { EventBus } = require("../../shared/events/event-bus");
    expect(() => {
      EventBus.emit("dialogue:dismissed", { callbackId: "cb-5" });
    }).not.toThrow();
  });

  it("should call onDismiss for all queued confirmations on queue-cleared", () => {
    const onDismiss1 = jest.fn();
    const onDismiss2 = jest.fn();
    registry.registerConfirm("cb-6", jest.fn(), jest.fn(), onDismiss1);
    registry.registerConfirm("cb-7", jest.fn(), jest.fn(), onDismiss2);

    const { EventBus } = require("../../shared/events/event-bus");
    EventBus.emit("dialogue:queue-cleared");

    expect(onDismiss1).toHaveBeenCalledTimes(1);
    expect(onDismiss2).toHaveBeenCalledTimes(1);
  });

  it("should not call onDismiss twice on double dismiss", () => {
    const onDismiss = jest.fn();
    registry.registerConfirm("cb-8", jest.fn(), jest.fn(), onDismiss);

    const { EventBus } = require("../../shared/events/event-bus");
    EventBus.emit("dialogue:dismissed", { callbackId: "cb-8" });
    EventBus.emit("dialogue:dismissed", { callbackId: "cb-8" });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("should not call dialogue callback on dismiss", () => {
    const cb = jest.fn();
    registry.registerDialogue("dlg-1", cb);

    const { EventBus } = require("../../shared/events/event-bus");
    EventBus.emit("dialogue:dismissed", { callbackId: "dlg-1" });

    expect(cb).not.toHaveBeenCalled();
  });
});
