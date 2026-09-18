import type {
  CollectibleEducational,
  CollectibleMetadata,
} from "./GameDataTypes";

/**
 * A single fact the investigation reasons about.
 *
 * Every clue proves exactly one trait, and every suspect's dossier confirms it,
 * contradicts it, or says nothing. Keeping the vocabulary in
 * `assets/data/investigation/clues.json` is what lets the identification screen
 * stay free of hard-coded clue logic.
 */
export interface InvestigationTrait {
  id: string;
  label: string;
  question?: string;
}

/** Correlation between a collectible and the trait it proves. */
export interface ClueTraitLink {
  levelId: string;
  clueId: string;
  traitId: string;
}

export interface InvestigationCluesJson {
  traits: InvestigationTrait[];
  clues: ClueTraitLink[];
}

/** What a suspect's dossier says about a trait. */
export type TraitValue = "sim" | "nao" | "desconhecido";

export interface Suspect {
  id: string;
  name: string;
  age?: number;
  role: string;
  /**
   * The hover blurb. Written so the facts are in the prose but have to be read
   * for — never a checklist, because the clue drops are what confirm them.
   */
  summary: string;
  relationWithCulture: string;
  profile: string;
  /** File name under `/assets/investigation/portraits/`; falls back to initials. */
  portrait?: string;
  isCulprit: boolean;
  traits: Record<string, TraitValue>;
}

export interface SuspectsJson {
  suspects: Suspect[];
}

/**
 * Where a clue in the dossier came from.
 *
 * `player` clues were actually picked up in a level. `curator` clues are the
 * baseline the curator hands over when the player arrives with too little
 * evidence, so the deduction is always solvable.
 */
export type ClueSource = "player" | "curator";

/** A clue as the identification screen consumes it: content + trait + origin. */
export interface InvestigationClue {
  /** Stable cross-level key: `${levelId}:${clueId}`. Clue ids are not globally unique. */
  key: string;
  levelId: string;
  clueId: string;
  title: string;
  metadata: CollectibleMetadata;
  educational: CollectibleEducational;
  traitId: string;
  traitLabel: string;
  source: ClueSource;
}

export interface InvestigationPayload {
  clues: InvestigationClue[];
  suspects: Suspect[];
  traits: InvestigationTrait[];
  /** How many clues the player genuinely collected, before any curator top-up. */
  collectedCount: number;
  /** Best star result from a previous run, or 0 if never completed. */
  previousStars: number;
}

/**
 * Result of checking one clue against one suspect.
 *
 * Mirrors the trait values: a confirmed trait burns hot, a contradicted one runs
 * cold, and an unknown one sits lukewarm.
 */
export type ClueVerdict = "quente" | "morno" | "frio";

/** A suspect's own board: which clues are slotted, and how each one graded. */
export interface SuspectBoard {
  /** Fixed-length array of clue keys; `null` is an empty slot. */
  slots: (string | null)[];
  /** Verdict per slotted clue, written the moment the clue lands. */
  verdicts: Record<string, ClueVerdict>;
}

export type { CollectibleEducational, CollectibleMetadata };
