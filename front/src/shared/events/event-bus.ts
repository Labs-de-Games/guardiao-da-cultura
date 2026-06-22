import * as Phaser from "phaser";

import type { GameEventMap } from "./game-events";

const emitter = new Phaser.Events.EventEmitter();

export const EventBus = {
  on<K extends keyof GameEventMap>(
    event: K,
    fn: (data: GameEventMap[K]) => void,
    context?: unknown,
  ) {
    emitter.on(event as string, fn, context);
    return () => {
      emitter.off(event as string, fn, context);
    };
  },

  once<K extends keyof GameEventMap>(
    event: K,
    fn: (data: GameEventMap[K]) => void,
    context?: unknown,
  ) {
    emitter.once(event as string, fn, context);
  },

  emit<K extends keyof GameEventMap>(event: K, data: GameEventMap[K]) {
    emitter.emit(event as string, data);
  },

  off<K extends keyof GameEventMap>(
    event: K,
    fn?: (data: GameEventMap[K]) => void,
    context?: unknown,
  ) {
    emitter.off(event as string, fn, context);
  },

  removeAllListeners() {
    emitter.removeAllListeners();
  },
};
