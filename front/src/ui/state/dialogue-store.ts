import { create } from "zustand";
import { EventBus } from "../../shared/events/event-bus";

export type DialogueMode = "dialogue" | "confirmation";

export type DialogueQueueItem =
  | {
      mode: "dialogue";
      lines: string[];
      callbackId: string;
    }
  | {
      mode: "confirmation";
      message: string;
      speakerName: string;
      callbackId: string;
    };

export interface DialogueState {
  dialogueOpen: boolean;
  dialogueMode: DialogueMode;
  dialogueLines: string[];
  dialogueCurrentLine: number;
  dialogueConfirmMessage: string;
  dialogueConfirmSpeaker: string;
  dialogueConfirmSelected: number;
  dialogueCallbackId: string;
  dialogueQueue: DialogueQueueItem[];

  showDialogue: (lines: string[], callbackId: string) => void;
  showConfirmation: (
    message: string,
    speakerName: string,
    callbackId: string,
  ) => void;
  advanceDialogue: () => void;
  setConfirmSelection: (index: number) => void;
  moveConfirmSelection: (dir: number) => void;
  confirmDialogueSelection: () => void;
  closeDialogue: () => void;
  dequeueDialogue: () => void;
}

const getActiveState = (item: DialogueQueueItem) => {
  if (item.mode === "confirmation") {
    return {
      dialogueOpen: true,
      dialogueMode: "confirmation" as const,
      dialogueLines: [],
      dialogueCurrentLine: 0,
      dialogueCallbackId: item.callbackId,
      dialogueConfirmMessage: item.message,
      dialogueConfirmSpeaker: item.speakerName,
      dialogueConfirmSelected: 0,
    };
  }
  return {
    dialogueOpen: true,
    dialogueMode: "dialogue" as const,
    dialogueLines: item.lines,
    dialogueCurrentLine: 0,
    dialogueCallbackId: item.callbackId,
    dialogueConfirmMessage: "",
    dialogueConfirmSpeaker: "",
    dialogueConfirmSelected: 0,
  };
};

export const useDialogueStore = create<DialogueState>()((set) => ({
  dialogueOpen: false,
  dialogueMode: "dialogue",
  dialogueLines: [],
  dialogueCurrentLine: 0,
  dialogueConfirmMessage: "",
  dialogueConfirmSpeaker: "",
  dialogueConfirmSelected: 0,
  dialogueCallbackId: "",
  dialogueQueue: [],

  showDialogue: (lines, callbackId) =>
    set((s) => {
      const item: DialogueQueueItem = { mode: "dialogue", lines, callbackId };
      if (s.dialogueOpen) {
        return {
          dialogueQueue: [...s.dialogueQueue, item],
        };
      }
      return getActiveState(item);
    }),

  showConfirmation: (message, speakerName, callbackId) =>
    set((s) => {
      const item: DialogueQueueItem = {
        mode: "confirmation",
        message,
        speakerName,
        callbackId,
      };
      if (s.dialogueOpen) {
        return {
          dialogueQueue: [...s.dialogueQueue, item],
        };
      }
      return getActiveState(item);
    }),

  advanceDialogue: () =>
    set((s) => {
      if (!s.dialogueOpen || s.dialogueMode !== "dialogue") return s;
      const nextLine = s.dialogueCurrentLine + 1;
      if (nextLine >= s.dialogueLines.length) {
        return {
          dialogueOpen: false,
          dialogueLines: [],
          dialogueCurrentLine: 0,
          dialogueCallbackId: "",
        };
      }
      return { dialogueCurrentLine: nextLine };
    }),

  setConfirmSelection: (index) => set({ dialogueConfirmSelected: index }),

  moveConfirmSelection: (dir) =>
    set((s) => ({
      dialogueConfirmSelected: (s.dialogueConfirmSelected + dir + 2) % 2,
    })),

  confirmDialogueSelection: () =>
    set((s) => {
      if (!s.dialogueOpen || s.dialogueMode !== "confirmation") return s;
      return {
        dialogueOpen: false,
        dialogueConfirmMessage: "",
        dialogueConfirmSpeaker: "",
        dialogueConfirmSelected: 0,
        dialogueCallbackId: "",
      };
    }),

  closeDialogue: () =>
    set(() => {
      EventBus.emit("dialogue:queue-cleared", undefined);
      return {
        dialogueOpen: false,
        dialogueLines: [],
        dialogueCurrentLine: 0,
        dialogueConfirmMessage: "",
        dialogueConfirmSpeaker: "",
        dialogueConfirmSelected: 0,
        dialogueCallbackId: "",
        dialogueQueue: [],
      };
    }),

  dequeueDialogue: () =>
    set((s) => {
      const next = s.dialogueQueue[0];
      if (!next) return s;
      return {
        dialogueQueue: s.dialogueQueue.slice(1),
        ...getActiveState(next),
      };
    }),
}));
