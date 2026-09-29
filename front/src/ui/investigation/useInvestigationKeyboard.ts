"use client";

import { useEffect } from "react";
import type { GameUIState } from "@/ui/state/game-ui-store";
import { holderOf, useGameUIStore } from "@/ui/state/game-ui-store";
import {
  type CursorContext,
  type CursorDirection,
  FOOTER_BUTTONS,
  firstCursor,
  type InvestigationCursor,
  isCursorValid,
  moveCursor,
} from "./investigation-keyboard";

type Investigation = GameUIState["investigation"];

const DIRECTION_KEYS: Record<string, CursorDirection> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};

/**
 * Whether a held clue can land here: the seat has to still be in play and the
 * slot has to be empty. A clue never displaces another one — the player takes
 * the first clue off themselves, so no move is ever made on their behalf.
 */
export function canTargetSlot(
  investigation: Investigation,
  suspectIndex: number,
  slotIndex: number,
): boolean {
  const suspect = investigation.payload?.suspects[suspectIndex];
  if (!suspect) return false;
  if (investigation.wrongSuspectIds.includes(suspect.id)) return false;
  // Mid-walkthrough the only seat that takes a clue is the one being
  // demonstrated on; the store refuses the rest outright.
  const { active, focusSuspectId } = investigation.tutorial;
  if (active && focusSuspectId && suspect.id !== focusSuspectId) return false;
  return (investigation.boards[suspect.id]?.slots[slotIndex] ?? null) === null;
}

/** The seat index the walkthrough confines the cursor to, if it is running. */
export function tutorialSeatIndex(investigation: Investigation): number | null {
  const { active, focusSuspectId } = investigation.tutorial;
  if (!active || !focusSuspectId) return null;
  const index =
    investigation.payload?.suspects.findIndex(
      (suspect) => suspect.id === focusSuspectId,
    ) ?? -1;
  return index === -1 ? null : index;
}

export function cursorContext(
  investigation: Investigation,
  railIndex: number,
): CursorContext {
  const held = investigation.heldClueKey !== null;
  return {
    clueCount: investigation.payload?.clues.length ?? 0,
    suspectCount: investigation.payload?.suspects.length ?? 0,
    mode: held ? "placing" : "browse",
    canTargetSlot: (suspectIndex, slotIndex) =>
      canTargetSlot(investigation, suspectIndex, slotIndex),
    railIndex,
    // Neither footer button is somewhere a clue goes, so they leave the cursor
    // the moment one is picked up.
    footer: !held,
    restrictToSuspectIndex: tutorialSeatIndex(investigation),
  };
}

/** The element a cursor names, found by the data attributes the board already carries. */
function cursorElement(
  cursor: InvestigationCursor,
  investigation: Investigation,
): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const payload = investigation.payload;
  if (!payload) return null;

  if (cursor.zone === "rail") {
    const clue = payload.clues[cursor.clueIndex];
    return clue
      ? document.querySelector(
          `[data-tutorial="clue-chip"][data-clue-key="${clue.key}"]`,
        )
      : null;
  }

  if (cursor.zone === "footer") {
    return document.querySelector(
      `[data-footer-button="${FOOTER_BUTTONS[cursor.index]}"]`,
    );
  }

  const suspect = payload.suspects[cursor.suspectIndex];
  if (!suspect) return null;

  if (cursor.zone === "portrait") {
    return document.querySelector(
      `[data-tutorial="suspect-portrait"][data-suspect="${suspect.id}"]`,
    );
  }
  if (cursor.zone === "accuse") {
    return document.querySelector(
      `[data-tutorial="accuse-button"][data-suspect="${suspect.id}"]`,
    );
  }
  return document.querySelector(
    `[data-tutorial="suspect-slots"][data-suspect="${suspect.id}"] [data-clue-slot="${cursor.slotIndex}"]`,
  );
}

/**
 * Keyboard play for the identification phase.
 *
 * Two modes, and which one is live is simply whether the player is carrying a
 * clue. Empty-handed they roam everything — the rail, the dossiers, the slots
 * (to take a clue back off a seat) and the accuse buttons. With a clue in hand
 * the cursor collapses to the slots that can actually take it, so the only
 * decision left is where it goes. ENTER and SPACE do the one thing the cursor
 * is sitting on; nothing is ever swapped out from under the player.
 *
 * The cursor drives real DOM focus, which is what makes the dossier and clue
 * popovers open as it passes — they already answer to `onFocus` for tab users.
 */
export function useInvestigationKeyboard({
  onDismissWrongAccusation,
}: {
  onDismissWrongAccusation: () => void;
}) {
  const cursor = useGameUIStore((s) => s.investigation.cursor);
  const payload = useGameUIStore((s) => s.investigation.payload);
  const panelUp = useGameUIStore(
    (s) =>
      Boolean(s.investigation.pendingAccusationId) ||
      Boolean(s.investigation.lastWrongSuspectId) ||
      Boolean(s.investigation.result) ||
      s.investigation.exitConfirmOpen,
  );

  useEffect(() => {
    // The rail index the board remembers, so stepping off the board's left edge
    // comes back to the clue the player left rather than to the top of the list.
    let railIndex = 0;

    const onKeyDown = (event: KeyboardEvent) => {
      const state = useGameUIStore.getState();
      const investigation = state.investigation;

      if (!investigation.payload) return;

      // The walkthrough asks for one drop and holds the board still from the
      // moment it lands. Up to then the cursor works normally — the rehearsed
      // move is rehearsed with whichever input the player is using — and after
      // it, every key belongs to the walkthrough, whose listener is downstream
      // of this one and must not be swallowed.
      const tutorial = investigation.tutorial;
      if (tutorial.active && tutorial.demoPlaced) return;

      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const direction = DIRECTION_KEYS[key];
      const isConfirm = key === "Enter" || key === " ";
      const isCancel = key === "Escape";
      if (!direction && !isConfirm && !isCancel) return;

      // A panel on top of the board answers for itself; only ESC still means
      // something out here, and it means "back out of that panel".
      if (
        investigation.pendingAccusationId ||
        investigation.lastWrongSuspectId ||
        investigation.result ||
        investigation.exitConfirmOpen
      ) {
        if (!isCancel) return;
        if (investigation.result) return;
        event.preventDefault();
        if (investigation.exitConfirmOpen) {
          state.setExitConfirmOpen(false);
          return;
        }
        if (investigation.lastWrongSuspectId) {
          onDismissWrongAccusation();
          return;
        }
        state.requestAccusation(null);
        return;
      }

      // Mid-walkthrough, ESC skips the lesson rather than leaving the phase —
      // that is the walkthrough's own key. A clue in hand comes first, though:
      // putting it back down is the more immediate thing ESC could mean.
      if (isCancel && tutorial.active && !investigation.heldClueKey) return;

      event.preventDefault();
      event.stopPropagation();

      if (isCancel) {
        // Putting a carried clue down costs nothing: it was never placed.
        if (investigation.heldClueKey) {
          state.holdClue(null);
          state.setCursor({ zone: "rail", clueIndex: railIndex });
          return;
        }
        // Leaving throws the board away, so ESC opens the gate rather than
        // the door. The panel's own keys take it from here.
        state.setExitConfirmOpen(true);
        return;
      }

      const context = cursorContext(investigation, railIndex);
      const current =
        investigation.cursor && isCursorValid(investigation.cursor, context)
          ? investigation.cursor
          : null;

      // The first key press only summons the cursor — it never also acts, so a
      // player reaching for the keyboard cannot spend a heart by accident.
      if (!current) {
        const start = firstCursor(context);
        if (start) state.setCursor(start);
        return;
      }

      if (direction) {
        const next = moveCursor(current, direction, context);
        if (next.zone === "rail") railIndex = next.clueIndex;
        state.setCursor(next);
        return;
      }

      activate(current, state, railIndex);
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [onDismissWrongAccusation]);

  // Focus follows the cursor, which is what opens the dossier and clue
  // popovers. Skipped while a panel is up so it cannot steal focus from it.
  useEffect(() => {
    if (!cursor || !payload || panelUp) return;
    const element = cursorElement(
      cursor,
      useGameUIStore.getState().investigation,
    );
    element?.focus();
  }, [cursor, payload, panelUp]);
}

/** ENTER and SPACE, resolved against whatever the cursor is sitting on. */
function activate(
  cursor: InvestigationCursor,
  state: ReturnType<typeof useGameUIStore.getState>,
  railIndex: number,
) {
  const investigation = state.investigation;
  const payload = investigation.payload;
  if (!payload) return;

  const held = investigation.heldClueKey;
  if (held) {
    if (cursor.zone !== "slot") return;
    if (!canTargetSlot(investigation, cursor.suspectIndex, cursor.slotIndex)) {
      return;
    }
    const suspect = payload.suspects[cursor.suspectIndex];
    state.placeClueInSlot(suspect.id, cursor.slotIndex, held);
    return;
  }

  if (cursor.zone === "rail") {
    const clue = payload.clues[cursor.clueIndex];
    if (!clue) return;
    // Spent clues are nailed where they sit, and one already on a seat has to
    // come off that seat first — both are the drag rules, unchanged.
    if ((investigation.clueHearts[clue.key] ?? 0) <= 0) return;
    if (holderOf(investigation.boards, clue.key)) return;

    state.holdClue(clue.key);
    const target = firstCursor(
      cursorContext({ ...investigation, heldClueKey: clue.key }, railIndex),
    );
    if (target) state.setCursor(target);
    return;
  }

  if (cursor.zone === "footer") {
    if (FOOTER_BUTTONS[cursor.index] === "tutorial") {
      state.startTutorial();
      return;
    }
    // Never straight out: leaving forfeits the board, so it asks first.
    state.setExitConfirmOpen(true);
    return;
  }

  const suspect = payload.suspects[cursor.suspectIndex];
  if (!suspect) return;

  if (cursor.zone === "slot") {
    // The same move as the slot's × button: the clue goes back to the rail,
    // and the heart it spent getting here stays spent.
    state.clearSlot(suspect.id, cursor.slotIndex);
    return;
  }

  if (cursor.zone === "accuse") {
    if (investigation.wrongSuspectIds.includes(suspect.id)) return;
    const slots = investigation.boards[suspect.id]?.slots ?? [];
    if (!slots.some((k) => k !== null)) return;
    state.requestAccusation(suspect.id);
    return;
  }

  // A dossier: the portrait is a real button that toggles its own popover, and
  // the cursor has already focused it.
  cursorElement(cursor, investigation)?.click();
}
