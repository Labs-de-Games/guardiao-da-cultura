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

  it("replays map marker state for late overlay subscribers", () => {
    EventBus.emit("map:marker-changed", {
      markerId: "brumadinho",
      title: "Instituto Inhotim",
      location: "Brumadinho - MG",
      isAvailable: true,
      isCompleted: false,
      image: "/assets/ui/map-cards/inhotim.png",
      levelId: "level_01",
      screenX: 960,
      screenY: 700,
    });

    const handler = jest.fn();
    EventBus.on("map:marker-changed", handler);

    expect(handler).toHaveBeenCalledWith({
      markerId: "brumadinho",
      title: "Instituto Inhotim",
      location: "Brumadinho - MG",
      isAvailable: true,
      isCompleted: false,
      image: "/assets/ui/map-cards/inhotim.png",
      levelId: "level_01",
      screenX: 960,
      screenY: 700,
    });
  });

  it("does not replay unrelated events without a prior emit", () => {
    const handler = jest.fn();
    EventBus.on("player:stars-changed", handler);

    expect(handler).not.toHaveBeenCalled();
  });
});
