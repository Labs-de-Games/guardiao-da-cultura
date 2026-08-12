import { EventBus } from "../../shared/events/event-bus";

type DialogueCallback = () => void;
type ConfirmCallbacks = {
  onYes: () => void;
  onNo: () => void;
  onDismiss?: () => void;
};

export class CallbackRegistry {
  private dialogueCallbacks = new Map<string, DialogueCallback>();
  private confirmCallbacks = new Map<string, ConfirmCallbacks>();
  private cleanupFn: (() => void) | null = null;

  registerDialogue(id: string, cb: DialogueCallback) {
    this.dialogueCallbacks.set(id, cb);
  }

  registerConfirm(
    id: string,
    onYes: () => void,
    onNo: () => void,
    onDismiss?: () => void,
  ) {
    this.confirmCallbacks.set(id, { onYes, onNo, onDismiss });
  }

  setupListeners() {
    const unsubCompleted = EventBus.on(
      "dialogue:completed",
      ({ callbackId, confirmed }) => {
        if (confirmed !== undefined) {
          const cbs = this.confirmCallbacks.get(callbackId);
          if (cbs) {
            (confirmed ? cbs.onYes : cbs.onNo)();
            this.confirmCallbacks.delete(callbackId);
          }
        } else {
          const cb = this.dialogueCallbacks.get(callbackId);
          if (cb) {
            cb();
            this.dialogueCallbacks.delete(callbackId);
          }
        }
      },
    );

    const unsubDismissed = EventBus.on(
      "dialogue:dismissed",
      ({ callbackId }) => {
        const confirmCbs = this.confirmCallbacks.get(callbackId);
        if (confirmCbs?.onDismiss) {
          confirmCbs.onDismiss();
        }
        this.dialogueCallbacks.delete(callbackId);
        this.confirmCallbacks.delete(callbackId);
      },
    );

    const unsubCleared = EventBus.on("dialogue:queue-cleared", () => {
      for (const cb of this.confirmCallbacks.values()) {
        cb.onDismiss?.();
      }
      this.dialogueCallbacks.clear();
      this.confirmCallbacks.clear();
    });

    this.cleanupFn = () => {
      unsubCompleted();
      unsubDismissed();
      unsubCleared();
    };
  }

  cleanup() {
    this.dialogueCallbacks.clear();
    this.confirmCallbacks.clear();
    this.cleanupFn?.();
    this.cleanupFn = null;
  }
}
