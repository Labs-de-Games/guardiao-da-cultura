import { INVESTIGATION_CLUE_HEARTS } from "@/game/constants/Investigation";

/**
 * Tags placed on the real screen so the walkthrough can find what it is talking
 * about without threading refs through five components.
 */
export const TUTORIAL_ANCHOR = {
  rail: '[data-tutorial="clue-rail"]',
  chip: '[data-tutorial="clue-chip"]',
  portrait: '[data-tutorial="suspect-portrait"]',
  slots: '[data-tutorial="suspect-slots"]',
  accuse: '[data-tutorial="accuse-button"]',
} as const;

/** What the walkthrough is currently pointing at — the player's own demo move. */
export interface TutorialContext {
  suspectId: string | null;
  clueKey: string | null;
}

export interface TutorialStep {
  id: string;
  /** One line. The highlight says where; this says only what to do about it. */
  text: string;
  /**
   * Elements to cut out of the dim. The first selector also anchors the
   * caption, so the most relevant one goes first.
   */
  anchors: (ctx: TutorialContext) => string[];
  /**
   * `"click"` waits for the caption's button; `"drop"` waits for the player to
   * actually land a clue on a suspect, which is the one thing worth rehearsing.
   */
  advance: "click" | "drop";
  cta?: string;
}

/** Narrows a seat-scoped anchor to one suspect, or falls back to all of them. */
function seat(selector: string, suspectId: string | null): string {
  return suspectId ? `${selector}[data-suspect="${suspectId}"]` : selector;
}

/**
 * The curator's walkthrough.
 *
 * Deliberately four lines. The screen already names the rail, marks the
 * portraits as hoverable and prints each verdict in words, and the confirmation
 * dialog already spells out what a wrong accusation costs — so the walkthrough
 * covers only what nothing on screen can say for itself: that clues are dragged,
 * and that dragging one spends something that does not come back.
 */
export const INVESTIGATION_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "drop",
    text: "Arraste uma pista até um espaço do suspeito, ou use as setas e ENTER.",
    anchors: (ctx) => [
      seat(TUTORIAL_ANCHOR.slots, ctx.suspectId),
      TUTORIAL_ANCHOR.rail,
    ],
    advance: "drop",
  },
  {
    id: "verdict",
    text: "🔥 combina · 🌡 não dá para saber · ❄ contradiz",
    anchors: (ctx) => [seat(TUTORIAL_ANCHOR.slots, ctx.suspectId)],
    advance: "click",
  },
  {
    id: "hearts",
    text: `${INVESTIGATION_CLUE_HEARTS} usos por pista. No último, ela fica presa ali.`,
    anchors: (ctx) => [
      ctx.clueKey
        ? `${TUTORIAL_ANCHOR.chip}[data-clue-key="${ctx.clueKey}"]`
        : TUTORIAL_ANCHOR.chip,
    ],
    advance: "click",
  },
  {
    id: "accuse",
    text: "Só dá para acusar quem tem pista no tabuleiro.",
    anchors: (ctx) => [seat(TUTORIAL_ANCHOR.accuse, ctx.suspectId)],
    advance: "click",
    cta: "COMEÇAR",
  },
];
