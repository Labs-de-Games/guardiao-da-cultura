import * as Phaser from "phaser";
import { DefaultKeymap } from "../constants/KeyBindings";

const registry = new WeakMap<Phaser.Scene, Map<string, Set<() => void>>>();

function getOrCreateSceneReg(
  scene: Phaser.Scene,
): Map<string, Set<() => void>> {
  let sceneReg = registry.get(scene);
  if (!sceneReg) {
    sceneReg = new Map();
    registry.set(scene, sceneReg);
  }
  return sceneReg;
}

function getOrCreateActionReg(
  sceneReg: Map<string, Set<() => void>>,
  action: string,
): Set<() => void> {
  let actionReg = sceneReg.get(action);
  if (!actionReg) {
    actionReg = new Set();
    sceneReg.set(action, actionReg);
  }
  return actionReg;
}

export function onKeyDown(
  scene: Phaser.Scene,
  action: string,
  callback: () => void,
): void {
  const keyNames = DefaultKeymap[action];
  if (!keyNames) return;

  const sceneReg = getOrCreateSceneReg(scene);
  const actionReg = getOrCreateActionReg(sceneReg, action);
  actionReg.add(callback);

  for (const name of keyNames) {
    scene.input.keyboard?.on(`keydown-${name}`, callback);
  }
}

export function offKeyDown(
  scene: Phaser.Scene,
  action: string,
  callback: () => void,
): void {
  const keyNames = DefaultKeymap[action];
  if (!keyNames) return;

  const sceneReg = registry.get(scene);
  if (!sceneReg) return;

  const actionReg = sceneReg.get(action);
  if (!actionReg) return;

  actionReg.delete(callback);
  if (actionReg.size === 0) sceneReg.delete(action);
  if (sceneReg.size === 0) registry.delete(scene);

  for (const name of keyNames) {
    scene.input.keyboard?.off(`keydown-${name}`, callback);
  }
}

export function getKeys(
  scene: Phaser.Scene,
  actions: string[],
): Record<string, Phaser.Input.Keyboard.Key> {
  const keyNames = new Set<string>();
  for (const action of actions) {
    const names = DefaultKeymap[action];
    if (names) {
      for (const n of names) {
        keyNames.add(n);
      }
    }
  }

  const config: Record<string, number> = {};
  for (const name of keyNames) {
    const code =
      Phaser.Input.Keyboard.KeyCodes[
        name as keyof typeof Phaser.Input.Keyboard.KeyCodes
      ];
    if (code !== undefined) {
      config[name.toLowerCase()] = code;
    }
  }

  const keyboard = scene.input.keyboard;
  if (!keyboard) return {};

  return keyboard.addKeys(config) as Record<string, Phaser.Input.Keyboard.Key>;
}

export function registerScene(scene: Phaser.Scene): void {
  // Capture every configured game key to suppress browser defaults.
  // This fixes issues like the tab key moving focus out of the game canvas,
  // or space/arrow keys scrolling the page.
  const captureKeys = [...new Set(Object.values(DefaultKeymap).flat())];
  scene.input.keyboard?.addCapture(captureKeys);

  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    cleanupScene(scene);
  });
}

export function cleanupScene(scene: Phaser.Scene): void {
  const sceneReg = registry.get(scene);
  if (!sceneReg) return;

  for (const [action, callbacks] of sceneReg) {
    const keyNames = DefaultKeymap[action];
    if (!keyNames) continue;
    for (const callback of callbacks) {
      for (const name of keyNames) {
        scene.input.keyboard?.off(`keydown-${name}`, callback);
      }
    }
  }

  registry.delete(scene);
}
