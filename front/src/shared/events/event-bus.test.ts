import { EventBus } from "./event-bus";

describe("EventBus", () => {
  beforeEach(() => {
    EventBus.removeAllListeners();
  });

  it("replays the last stateful event to late subscribers", () => {
    EventBus.emit("sidebar:toggled", { open: true });

    const handler = jest.fn();
    EventBus.on("sidebar:toggled", handler);

    expect(handler).toHaveBeenCalledWith({ open: true });
  });

  it("does not replay unrelated events without a prior emit", () => {
    const handler = jest.fn();
    EventBus.on("player:stars-changed", handler);

    expect(handler).not.toHaveBeenCalled();
  });
});
