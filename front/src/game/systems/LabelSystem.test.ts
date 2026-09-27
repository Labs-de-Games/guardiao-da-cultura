import { LabelSystem } from "./LabelSystem";

function createSystem(): LabelSystem {
  const sprite = { setScale: jest.fn(), setDepth: jest.fn() };
  const scene = { add: { sprite: jest.fn(() => sprite) } };
  return new LabelSystem(
    scene as unknown as ConstructorParameters<typeof LabelSystem>[0],
  );
}

function labelObject(
  name: string,
  properties: { name: string; value: string }[],
) {
  return { name, type: "Label", x: 10, y: 20, properties };
}

function registerLayer(system: LabelSystem, objects: unknown[]): void {
  system.registerAllFromLayer(
    { objects } as unknown as Parameters<
      LabelSystem["registerAllFromLayer"]
    >[0],
    1,
  );
}

describe("LabelSystem.registerAllFromLayer", () => {
  it("keeps the work_id property so a label can name its own work", () => {
    const system = createSystem();
    registerLayer(system, [
      labelObject("L_2", [
        { name: "placeholder_id", value: "PH_2" },
        { name: "work_id", value: "band" },
      ]),
    ]);

    expect(system.getLabelByInstanceId("L_2")?.workId).toBe("band");
  });

  it("leaves workId undefined when the label has no work_id", () => {
    const system = createSystem();
    registerLayer(system, [
      labelObject("L_4", [{ name: "placeholder_id", value: "PH_4" }]),
    ]);

    const label = system.getLabelByInstanceId("L_4");
    expect(label?.placeholderId).toBe("PH_4");
    expect(label?.workId).toBeUndefined();
  });
});
