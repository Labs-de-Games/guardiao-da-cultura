export interface CostumePart {
  id: string;
  name: string;
  textureKey: string;
}

export const COSTUME_PARTS: Record<"head" | "torso" | "feet", CostumePart[]> = {
  head: [{ id: "dummy_head", name: "dummy", textureKey: "dummy_head" }],
  torso: [{ id: "dummy_torso", name: "dummy", textureKey: "dummy_torso" }],
  feet: [{ id: "dummy_feet", name: "dummy", textureKey: "dummy_feet" }],
};

export class CostumeMechanicHandler {
  public static isCorrectPart(
    partId: string,
    partType: "head" | "torso" | "feet",
  ): boolean {
    const parts = COSTUME_PARTS[partType];
    const correctPrefix = parts[0]?.id.replace(/_head|_torso|_feet$/, "");
    return partId.startsWith(correctPrefix);
  }

  public static deriveCorrectCostume(ids: string[]): string {
    if (ids.length === 0) return "";
    const first = ids[0] as string;
    return first.replace(/_head|_torso|_feet$/, "");
  }
}
