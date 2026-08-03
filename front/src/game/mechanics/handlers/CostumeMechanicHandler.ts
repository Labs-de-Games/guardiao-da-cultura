export interface CostumePart {
  id: string;
  name: string;
  textureKey: string;
}

export type CostumePartType = "head" | "torso" | "feet";

export interface CostumeState extends Record<string, unknown> {
  equippedParts: Record<CostumePartType, string | null>;
  lockedParts: Record<CostumePartType, boolean>;
}

export const COSTUME_PARTS: Record<CostumePartType, CostumePart[]> = {
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

// Session seed — generated once at module load, stable for the entire page session
const SESSION_SEED = Date.now() + Math.floor(Math.random() * 1000000);

// Mulberry32 seeded PRNG
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Seeded Fisher-Yates shuffle (returns new array)
function seededShuffle<T>(arr: T[], rng: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Cached shuffled orders per part type
const shuffledCache: Record<CostumePartType, CostumePart[] | null> = {
  head: null,
  torso: null,
  feet: null,
};

// Shared RNG instance for this session
const rng = mulberry32(SESSION_SEED);

export class CostumeMechanicHandler {
  public static createInitialState(): CostumeState {
    return {
      equippedParts: { head: null, torso: null, feet: null },
      lockedParts: { head: false, torso: false, feet: false },
    };
  }

  public static isCorrectPart(partId: string, correctCostume: string): boolean {
    return partId.startsWith(`${correctCostume}_`);
  }

  public static deriveCorrectCostume(ids: string[]): string {
    if (ids.length === 0) return "";
    const first = ids[0] as string;
    return first.replace(/_head|_torso|_feet$/, "");
  }

  /**
   * Returns a session-stable shuffled copy of COSTUME_PARTS[partType].
   * Dummy always stays at index 0. Other items are shuffled
   * using a seed generated once at module load time.
   */
  public static getShuffledCostumeParts(
    partType: CostumePartType,
  ): CostumePart[] {
    if (shuffledCache[partType]) return shuffledCache[partType]!;

    const original = COSTUME_PARTS[partType];
    const dummy = original[0];
    const rest = original.slice(1);
    const shuffledRest = seededShuffle(rest, rng);
    const result = [dummy, ...shuffledRest];

    shuffledCache[partType] = result;
    return result;
  }
}
