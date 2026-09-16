import {
  type SwitchLightInstance,
  SwitchLightSystem,
} from "./SwitchLightSystem";

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
