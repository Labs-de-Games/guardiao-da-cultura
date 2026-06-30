import { AUTO, Game, Scale, type Types } from "phaser";
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
};

function getScenes(entryFlow: EntryFlow) {
  return entryFlow === "direct"
    ? [MainGame, MapIntroScene, LevelCinematic, UIScene]
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
