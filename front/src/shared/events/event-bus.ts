import * as Phaser from "phaser";

import type { GameEventMap } from "./game-events";

const emitter = new Phaser.Events.EventEmitter();
const replayableEvents = new Set<keyof GameEventMap>([
  "intro:start",
  "game:started",
  "game:ended",
  "sidebar:toggled",
  "player:stars-changed",
  "quest:progress-changed",
  "collectible:collectibles-sync",
  "map:marker-changed",
  "dialogue:camera-sync",
]);

const lastEventPayloads = new Map<
  keyof GameEventMap,
  GameEventMap[keyof GameEventMap]
>();

export const EventBus = {
  on<K extends keyof GameEventMap>(
    event: K,
    fn: (data: GameEventMap[K]) => void,
    context?: unknown,
  ) {
    emitter.on(event as string, fn, context);
    if (replayableEvents.has(event) && lastEventPayloads.has(event)) {
      fn(lastEventPayloads.get(event) as GameEventMap[K]);
    }
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
    if (replayableEvents.has(event)) {
      lastEventPayloads.set(event, data);
    }
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
    lastEventPayloads.clear();
  },
};
