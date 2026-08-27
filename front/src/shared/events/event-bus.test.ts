import { EventBus } from "./event-bus";

// The real EventBus drives this suite, so it needs a working EventEmitter.
// The global test-setup mock stubs every emitter method with jest.fn(), which
// would silently swallow every emit. Phaser's emitter is eventemitter3.
jest.mock("phaser", () => ({
  Events: { EventEmitter: jest.requireActual("eventemitter3") },
}));

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

  it("removes only its own listener when the returned unsubscriber is called", () => {
    const sceneHandler = jest.fn();
    const overlayHandler = jest.fn();

    const unsubscribeScene = EventBus.on("ui:label-show", sceneHandler);
    EventBus.on("ui:label-show", overlayHandler);

    unsubscribeScene();
    EventBus.emit("ui:label-show", {
      title: "Obra",
      author: "Art",
      description: "Desc",
    });

    expect(sceneHandler).not.toHaveBeenCalled();
    expect(overlayHandler).toHaveBeenCalledTimes(1);
  });

  it("removes every listener when off is called without a handler", () => {
    const sceneHandler = jest.fn();
    const overlayHandler = jest.fn();

    EventBus.on("ui:label-show", sceneHandler);
    EventBus.on("ui:label-show", overlayHandler);

    EventBus.off("ui:label-show");
    EventBus.emit("ui:label-show", {
      title: "Obra",
      author: "Art",
      description: "Desc",
    });

    expect(sceneHandler).not.toHaveBeenCalled();
    expect(overlayHandler).not.toHaveBeenCalled();
  });
});
