import type { EffectsManager } from "../objects/EffectsManager";
import type { Game } from "../scenes/Game";
import { SwitchLightCinematicSystem } from "./SwitchLightCinematicSystem";

function setup() {
  const pending: Array<() => void> = [];
  const scene = {
    player: { x: 0, y: 0, isInDialogue: false },
    cameras: { main: { stopFollow: jest.fn(), startFollow: jest.fn() } },
    time: {
      delayedCall: jest.fn((_delay: number, cb: () => void) => {
        pending.push(cb);
      }),
    },
  };
  const effects = { panTo: jest.fn() };
  const system = new SwitchLightCinematicSystem(
    scene as unknown as Game,
    effects as unknown as EffectsManager,
  );
  const flush = () => {
    while (pending.length > 0) pending.shift()?.();
  };
  return { system, scene, effects, flush };
}

describe("SwitchLightCinematicSystem.playCinematic", () => {
  it("runs onFix and releases the player once the cinematic ends", () => {
    const { system, scene, flush } = setup();
    const onFix = jest.fn();
    system.playCinematic(10, 20, onFix);
    expect(scene.player.isInDialogue).toBe(true);

    flush();
    expect(onFix).toHaveBeenCalledTimes(1);
    expect(scene.player.isInDialogue).toBe(false);
  });

  it("queues a cinematic requested while another is running", () => {
    const { system, effects, flush } = setup();
    const first = jest.fn();
    const second = jest.fn();
    system.playCinematic(10, 20, first);
    system.playCinematic(30, 40, second);
    expect(second).not.toHaveBeenCalled();

    flush();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(effects.panTo).toHaveBeenCalledWith(30, 40, 1000, "Sine.easeInOut");
  });

  it("drops queued cinematics on destroy", () => {
    const { system, flush } = setup();
    const first = jest.fn();
    const second = jest.fn();
    system.playCinematic(10, 20, first);
    system.playCinematic(30, 40, second);
    system.destroy();

    flush();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });
});
