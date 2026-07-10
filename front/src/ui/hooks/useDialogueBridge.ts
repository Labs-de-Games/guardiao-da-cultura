"use client";

import { useCallback, useEffect } from "react";

import { EventBus } from "@/shared/events/event-bus";
import { useDialogueStore } from "@/ui/state/dialogue-store";

export function useDialogueBridge() {
  const showDialogue = useDialogueStore((s) => s.showDialogue);
  const showConfirmation = useDialogueStore((s) => s.showConfirmation);

  useEffect(() => {
    const unsubShow = EventBus.on("dialogue:show", (data) => {
      showDialogue(data.lines, data.callbackId, data.screenPosition);
    });
    const unsubConfirm = EventBus.on("dialogue:confirm", (data) => {
      showConfirmation(
        data.message,
        data.speakerName,
        data.callbackId,
        data.screenPosition,
      );
    });
    return () => {
      unsubShow();
      unsubConfirm();
    };
  }, [showDialogue, showConfirmation]);

  const emitComplete = useCallback(
    (callbackId: string, confirmed?: boolean) => {
      EventBus.emit("dialogue:completed", { callbackId, confirmed });
    },
    [],
  );

  const emitDismiss = useCallback((callbackId: string) => {
    EventBus.emit("dialogue:dismissed", { callbackId });
  }, []);

  return { emitComplete, emitDismiss };
}
