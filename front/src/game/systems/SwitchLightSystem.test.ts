import * as Phaser from "phaser";
import { GameEvents } from "../constants/GameEvents";
import {
  SWITCH_LIGHT_ANIM_KEY,
  type SwitchLightInstance,
  SwitchLightSystem,
} from "./SwitchLightSystem";

jest.mock("phaser", () => ({
  Animations: { Events: { ANIMATION_COMPLETE: "animationcomplete" } },
}));

jest.mock("../audio", () => ({
  AudioManager: { playSfx: jest.fn() },
}));

function fakeInstance(isActivated: boolean): SwitchLightInstance {
  return {
    sprite: {} as SwitchLightInstance["sprite"],
    instanceId: "sw",
    interaction: {} as SwitchLightInstance["interaction"],
    isActivated,
  };
}

function createSystemWithSwitches(activated: boolean[]): SwitchLightSystem {
  const system = new SwitchLightSystem(
    {} as ConstructorParameters<typeof SwitchLightSystem>[0],
  );
  (system as unknown as { switches: SwitchLightInstance[] }).switches =
    activated.map(fakeInstance);
  return system;
}

describe("SwitchLightSystem.getProgress", () => {
  it("reports 0/0 when no switches are registered", () => {
    const system = createSystemWithSwitches([]);
    expect(system.getProgress()).toEqual({ filled: 0, total: 0 });
  });

  it("counts only activated switches as filled", () => {
    const system = createSystemWithSwitches([true, false, false]);
    expect(system.getProgress()).toEqual({ filled: 1, total: 3 });
  });

  it("reports full progress once every switch is activated", () => {
    const system = createSystemWithSwitches([true, true, true]);
    expect(system.getProgress()).toEqual({ filled: 3, total: 3 });
  });
});

describe("SwitchLightSystem.allActivated", () => {
  it("is false when no switches are registered", () => {
    const system = createSystemWithSwitches([]);
    expect(system.allActivated()).toBe(false);
  });

  it("is false while any switch is still inactive", () => {
    const system = createSystemWithSwitches([true, true, false]);
    expect(system.allActivated()).toBe(false);
  });

  it("is true once every switch is activated", () => {
    const system = createSystemWithSwitches([true, true, true]);
    expect(system.allActivated()).toBe(true);
  });
});

describe("SwitchLightSystem.activate", () => {
  function setup(options: { animFrames?: number; lightBarName?: string }) {
    const emit = jest.fn();
    const scene = {
      anims: {
        get: jest.fn((key: string) =>
          key === SWITCH_LIGHT_ANIM_KEY && options.animFrames !== undefined
            ? { frames: new Array(options.animFrames).fill({}) }
            : undefined,
        ),
      },
      events: { emit },
    };
    const listeners: Record<string, () => void> = {};
    const sprite = {
      play: jest.fn(),
      once: jest.fn((event: string, cb: () => void) => {
        listeners[event] = cb;
      }),
    };
    const interaction = { destroy: jest.fn() };
    const instance = {
      sprite,
      instanceId: "sw",
      interaction,
      lightBarName: options.lightBarName,
      isActivated: false,
    } as unknown as SwitchLightInstance;

    const system = new SwitchLightSystem(
      scene as unknown as ConstructorParameters<typeof SwitchLightSystem>[0],
    );
    const activate = () =>
      (
        system as unknown as {
          activate: (i: SwitchLightInstance) => void;
        }
      ).activate(instance);

    return { activate, emit, sprite, interaction, instance, listeners };
  }

  it("emits immediately and skips play when the animation is missing", () => {
    const { activate, emit, sprite, interaction, instance } = setup({
      lightBarName: "LB_1",
    });
    activate();
    expect(instance.isActivated).toBe(true);
    expect(interaction.destroy).toHaveBeenCalledTimes(1);
    expect(sprite.play).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith(GameEvents.SWITCH_LIGHT_ACTIVATED, {
      lightBarName: "LB_1",
    });
  });

  it("emits immediately and skips play when the animation has no frames", () => {
    const { activate, emit, sprite } = setup({
      animFrames: 0,
      lightBarName: "LB_1",
    });
    activate();
    expect(sprite.play).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it("plays the animation and emits once it completes", () => {
    const { activate, emit, sprite, listeners } = setup({
      animFrames: 4,
      lightBarName: "LB_1",
    });
    activate();
    expect(sprite.play).toHaveBeenCalledWith(SWITCH_LIGHT_ANIM_KEY);
    expect(emit).not.toHaveBeenCalled();

    listeners[Phaser.Animations.Events.ANIMATION_COMPLETE]();
    expect(emit).toHaveBeenCalledWith(GameEvents.SWITCH_LIGHT_ACTIVATED, {
      lightBarName: "LB_1",
    });
  });

  it("ignores a second activation", () => {
    const { activate, emit, interaction } = setup({ lightBarName: "LB_1" });
    activate();
    activate();
    expect(interaction.destroy).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it("does not emit when the switch has no linked light bar", () => {
    const { activate, emit } = setup({});
    activate();
    expect(emit).not.toHaveBeenCalled();
  });
});
