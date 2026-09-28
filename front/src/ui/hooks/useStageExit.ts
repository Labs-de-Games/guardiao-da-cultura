"use client";

import { useCallback } from "react";
import { useDialogueStore } from "@/ui/state/dialogue-store";

// Identifies the "return to map" confirmation (vs. one shown by a
// Phaser-side GameEvents.SHOW_CONFIRMATION_REQUEST), so GameOverlay's
// response handler never accidentally reacts to a different confirmation's
// onComplete/onDismiss. Shared by the in-stage ESC handler and the
// sidebar's VOLTAR button — both request the same confirmation.
export const STAGE_EXIT_CALLBACK_ID = "stage-exit-confirm";
const STAGE_EXIT_MESSAGE =
  "Voltar para o mapa? O progresso desta fase será perdido.";

export function useRequestStageExit() {
  const showConfirmation = useDialogueStore((s) => s.showConfirmation);
  const dialogueOpen = useDialogueStore((s) => s.dialogueOpen);

  return useCallback(() => {
    if (dialogueOpen) return;
    showConfirmation(STAGE_EXIT_MESSAGE, "", STAGE_EXIT_CALLBACK_ID);
  }, [dialogueOpen, showConfirmation]);
}
