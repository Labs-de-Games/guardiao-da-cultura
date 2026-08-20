import { AUTO, Game, Scale, type Types } from "phaser";
import { ConeLightPipeline } from "./pipelines/ConeLightPipeline";
import { Game as MainGame } from "./scenes/Game";
import { LevelCinematic } from "./scenes/LevelCinematic";
import { MapIntroScene } from "./scenes/MapIntroScene";
import { UIScene } from "./scenes/UIScene";

export type EntryFlow = "map" | "direct";

// Find out more information about the Game Config at:
// https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const baseConfig: Types.Core.GameConfig = {
  type: AUTO,
  width: 1920,
  height: 1080,
  parent: "game-container",
  backgroundColor: "#000000",
  pixelArt: true,
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
      tileBias: 64, // Prevents "tunneling" (passing through tiles) at high speeds
    },
  },
  scale: {
    mode: Scale.RESIZE,
    autoCenter: Scale.CENTER_BOTH,
  },
  pipeline: { Conelight: ConeLightPipeline },
  // Phaser's LightsManager defaults to 10 and silently drops the
  // farthest-from-camera lights beyond that cap. Levels combine light
  // bars, chandeliers and spotlights that can exceed 10 at once (e.g.
  // museum-mvp: 8 light bars + 9 chandeliers), so raise the ceiling
  // with headroom above the highest current per-level light count.
  render: { maxLights: 32 },
};

function getScenes(entryFlow: EntryFlow) {
  return entryFlow === "direct"
    ? [LevelCinematic, MainGame, UIScene, MapIntroScene]
    : [MapIntroScene, LevelCinematic, MainGame, UIScene];
}

const StartGame = (
  parent: string,
  userId: string,
  isGuest = false,
  entryFlow: EntryFlow = "map",
) => {
  const game = new Game({ ...baseConfig, parent, scene: getScenes(entryFlow) });
  if (userId) {
    game.registry.set("userId", userId);
  }
  game.registry.set("isGuest", isGuest);
  game.registry.set("entryFlow", entryFlow);
  return game;
};

export default StartGame;
