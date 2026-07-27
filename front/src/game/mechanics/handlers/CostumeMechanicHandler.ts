export interface CostumePart {
  id: string;
  name: string;
  textureKey: string;
}

export const COSTUME_PARTS: Record<"head" | "torso" | "feet", CostumePart[]> = {
  head: [
    { id: "dummy_head", name: "dummy", textureKey: "dummy_head" },
    { id: "indian_head", name: "indian", textureKey: "indian_head" },
    { id: "warrior_head", name: "warrior", textureKey: "warrior_head" },
    { id: "soldier_head", name: "soldier", textureKey: "soldier_head" },
    { id: "malandro_head", name: "malandro", textureKey: "malandro_head" },
  ],
  torso: [
    { id: "dummy_torso", name: "dummy", textureKey: "dummy_torso" },
    { id: "indian_torso", name: "indian", textureKey: "indian_torso" },
    { id: "warrior_torso", name: "warrior", textureKey: "warrior_torso" },
    { id: "soldier_torso", name: "soldier", textureKey: "soldier_torso" },
    { id: "malandro_torso", name: "malandro", textureKey: "malandro_torso" },
  ],
  feet: [
    { id: "dummy_feet", name: "dummy", textureKey: "dummy_feet" },
    { id: "indian_feet", name: "indian", textureKey: "indian_feet" },
    { id: "warrior_feet", name: "warrior", textureKey: "warrior_feet" },
    { id: "soldier_feet", name: "soldier", textureKey: "soldier_feet" },
    { id: "malandro_feet", name: "malandro", textureKey: "malandro_feet" },
  ],
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
