import type {
  StepCard,
  StepSequenceData,
} from "@/ui/panels/step-sequence-types";

export const STEP_SEQUENCE_VIDEO = "/assets/artworks/dance/dance_steps.mp4";

const STEPS_DIR = "/assets/artworks/dance/steps";

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

const rng = mulberry32(SESSION_SEED);

// Cached carousel order per placeholder instance, so retrying a puzzle does not
// reshuffle the cards the player has just learned the position of.
const shuffledCache = new Map<string, string[]>();

/**
 * Tiled hands `id` over as a list property (already an array) or as a
 * comma-separated string. Mirrors how the costume placeholder is read.
 */
function normalizeIds(rawId: string | string[]): string[] {
  const ids = Array.isArray(rawId)
    ? rawId
    : String(rawId)
        .split(",")
        .map((s) => s.trim());

  return ids.filter((id) => id !== "");
}

function getStepImagePath(id: string): string {
  return `${STEPS_DIR}/${id}.gif`;
}

/**
 * Cards are labelled by their position in the shuffled carousel, never by their
 * position in the answer — `name` reaches the accessibility tree, so ordinals
 * taken from `expectedSequence` would publish the solution.
 */
function labelFor(index: number): string {
  return `Passo ${String.fromCharCode(65 + index)}`;
}

/**
 * Builds the panel payload for a `step_sequence` placeholder. The order of the
 * ids authored on the Tiled object is the expected answer.
 *
 * Returns null when the placeholder is misconfigured, so the caller can skip
 * opening rather than trap the player behind an unsolvable panel.
 */
export function buildStepSequenceData(
  instanceId: string,
  rawId: string | string[],
  filledSlots?: (string | null)[],
): StepSequenceData | null {
  const expectedSequence = normalizeIds(rawId);

  if (expectedSequence.length < 2) {
    console.warn(
      `[stepSequenceContent] Placeholder "${instanceId}" needs at least 2 step ids in its "id" property, got ${expectedSequence.length}.`,
    );
    return null;
  }

  let order = shuffledCache.get(instanceId);
  if (!order) {
    order = seededShuffle(expectedSequence, rng);
    shuffledCache.set(instanceId, order);
  }

  const availableSteps: StepCard[] = order.map((id, index) => ({
    id,
    name: labelFor(index),
    imagePath: getStepImagePath(id),
  }));

  return {
    instanceId,
    videoPath: STEP_SEQUENCE_VIDEO,
    availableSteps,
    expectedSequence,
    filledSlots,
  };
}
